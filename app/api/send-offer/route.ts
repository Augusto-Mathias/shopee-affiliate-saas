import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db/prisma';
import { sendTelegramMessage } from '@/src/lib/telegram/telegram.client';
import { fetchProductOffers } from '@/src/lib/shopee/shopee.offers';
import { getCurrentSortType, saveNextSortType } from '@/src/lib/db/settings';
import { PET_CATEGORIES } from '@/src/lib/shopee/categories';
import type { ProductOfferV2Node } from '@/src/lib/shopee/shopee.types';

const MAX_SORT_TRIES = 5;      // quantos sortTypes diferentes tentar
const MAX_PAGES_PER_SORT = 5;  // quantas páginas por sortType+categoria (pode ajustar)

// Faixa de preço (em reais) – por enquanto fixa; depois podemos ler do banco/front
const MIN_PRICE = 1;
const MAX_PRICE = 100;

// Palavras que queremos evitar para não ficar sempre “mais do mesmo”
// (você pode ajustar/expandir essa lista facilmente)
const BLOCKED_KEYWORDS = [
  'feno',
  'coast cross',
  'lagomorfos',
  'coelhos',
  'coelho',
  'porquinho da índia',
  'porquinho da india',
];
// ================== Helpers de preço ==================

/**
 * Converte priceMin/priceMax (string ou number) para número em reais
 */
function parsePrice(price: string | number | null | undefined): number {
  if (!price) return 0;
  const priceStr = typeof price === 'string' ? price.replace(',', '.') : String(price);
  const num = parseFloat(priceStr);
  return Number.isNaN(num) ? 0 : num;
}

/**
 * Verifica se o preço do produto está dentro da faixa permitida
 */
function isPriceInRange(offer: ProductOfferV2Node): boolean {
  const priceMin = parsePrice(offer.priceMin);
  const priceMax = parsePrice(offer.priceMax);

  // usa o menor preço válido
  const price = priceMin > 0 ? priceMin : priceMax;
  if (price === 0) return false; // sem preço válido

  return price >= MIN_PRICE && price <= MAX_PRICE;
}

/**
 * Monta o texto de preço:
 * - se priceMax > priceMin -> "💸 De: R$ X,XX\n💥 Por: R$ Y,YY  (Z% OFF)"
 * - senão -> "💥 Por apenas: R$ Y,YY"
 */
function buildPriceText(priceMin: number, priceMax: number, discountRate?: number | null): string {
  const minStr = `R$ ${priceMin.toFixed(2)}`;
  const maxStr = `R$ ${priceMax.toFixed(2)}`;
  const discountStr =
    typeof discountRate === 'number' && !Number.isNaN(discountRate) && discountRate > 0
      ? `${discountRate.toFixed(0)}% OFF`
      : '';

  if (priceMax > priceMin && priceMax > 0) {
    return discountStr
      ? `💸 De: ${maxStr}\n💥 Por: ${minStr}  (${discountStr})`
      : `💸 De: ${maxStr}\n💥 Por: ${minStr}`;
  }

  // preço único
  return `💥 Por apenas: ${minStr}`;
}

// ================== Helpers de mensagem / CTA ==================

/**
 * Frases randômicas de call-to-action para o link
 */
const CTA_MESSAGES: string[] = [
  '🛒 Clique para ver fotos, avaliações e cores disponíveis:',
  '🐶 Veja os detalhes e tamanhos disponíveis aqui:',
  '🐾 Confira as fotos e os comentários de quem já comprou:',
  '💚 Clique e veja se ainda está disponível na promoção:',
  '📦 Veja o frete, prazo de entrega e mais detalhes aqui:',
  '🔥 Aproveite enquanto ainda está com desconto:',
  '⭐ Veja as avaliações e descubra por que esse produto é tão bem avaliado:',
  '🎯 Clique para ver mais fotos e escolher o modelo ideal:',
  '💥 Confira o preço atualizado e condições de pagamento:',
  '🐕‍🦺 Seu pet merece esse mimo, veja mais detalhes aqui:',
  '🎁 Garanta já o seu antes que acabe o estoque:',
  '✨ Clique e veja todas as opções disponíveis:',
  '🚀 Aproveite essa oferta imperdível:',
  '💝 Dê esse presente especial para o seu pet:',
  '🏆 Produto com ótimas avaliações, confira:',
];

/**
 * Escolhe uma CTA aleatória do array
 */
function getRandomCtaMessage(): string {
  const idx = Math.floor(Math.random() * CTA_MESSAGES.length);
  return CTA_MESSAGES[idx];
}

// ================== Filtro de palavras ==================

/**
 * Verifica se o nome do produto contém alguma palavra bloqueada
 */
function isBlockedByKeyword(offer: ProductOfferV2Node): boolean {
  const name = (offer.productName ?? '').toLowerCase();

  for (const keyword of BLOCKED_KEYWORDS) {
    if (!keyword) continue;
    if (name.includes(keyword.toLowerCase())) {
      console.log(
        `     🚫 Item ${offer.itemId} bloqueado por palavra-chave "${keyword}" no título.`
      );
      return true;
    }
  }

  return false;
}

// ================== Handler ==================

export async function GET(req: NextRequest) {
  try {
    let currentSortType = await getCurrentSortType();

    console.log('=== /api/send-offer INÍCIO ===');
    console.log('SortType inicial:', currentSortType);
    console.log(`Faixa de preço: R$ ${MIN_PRICE} - R$ ${MAX_PRICE}`);
    console.log(`Categorias de Pet: ${PET_CATEGORIES.length} IDs`);

    let chosenOffer: ProductOfferV2Node | null = null;
    let chosenCategory: number | null = null;

    // Loop pelos sortTypes
    for (let sortTry = 0; sortTry < MAX_SORT_TRIES; sortTry++) {
      console.log(`\n--- Tentando sortType=${currentSortType} (tentativa ${sortTry + 1}) ---`);

      // Loop pelas categorias de PET
      for (const categoryId of PET_CATEGORIES) {
        console.log(`\n  >> Categoria ${categoryId}`);

        // Loop pelas páginas desse sortType + categoria
        for (let page = 1; page <= MAX_PAGES_PER_SORT; page++) {
          console.log(`     Buscando página ${page} (cat=${categoryId}, sortType=${currentSortType})...`);

          const { nodes, pageInfo } = await fetchProductOffers({
            appId: process.env.SHOPEE_APP_ID!,
            secret: process.env.SHOPEE_SECRET!,
            productCatId: categoryId,
            listType: 0,
            sortType: currentSortType,
            isAMSOffer: true,
            limit: 20,
            page,
          });

          console.log(`     Retornados ${nodes.length} itens.`);

          if (nodes.length === 0) {
            console.log('     Nenhum item retornado nesta página. Pulando para próxima categoria.');
            break; // não tem mais itens nessa categoria
          }

          // Procurar o primeiro item que:
          // - ainda não foi postado
          // - está na faixa de preço
          // - NÃO está bloqueado por palavra-chave
          for (const offer of nodes) {
            const itemIdBigInt = BigInt(offer.itemId);

            // 1. Verificar se já foi postado
            const alreadyPosted = await prisma.posted_products.findUnique({
              where: { item_id: itemIdBigInt },
            });

            if (alreadyPosted) {
              console.log(`     ⏭️  Item ${offer.itemId} já postado. Pulando.`);
              continue;
            }

            // 2. Verificar se está na faixa de preço
            if (!isPriceInRange(offer)) {
              const price =
                parsePrice(offer.priceMin) || parsePrice(offer.priceMax);
              console.log(
                `     💰 Item ${offer.itemId} fora da faixa (R$ ${price.toFixed(
                  2
                )}). Pulando.`
              );
              continue;
            }

            // 3. Verificar se passa no filtro de palavras-chave
            if (isBlockedByKeyword(offer)) {
              // log já é feito dentro da função
              continue;
            }

            // Encontrou um item válido!
            console.log(
              `     ✅ Oferta nova encontrada: itemId=${offer.itemId}, productName=${offer.productName}`
            );
            chosenOffer = offer;
            chosenCategory = categoryId;
            break;
          }

          if (chosenOffer) {
            // encontramos uma oferta nova, sair de todos os loops
            break;
          }

          // Se não tem próxima página, sair do loop de páginas
          if (!pageInfo.hasNextPage) {
            console.log('     Não há mais páginas nesta categoria.');
            break;
          }
        }

        if (chosenOffer) {
          // encontramos, sair do loop de categorias
          break;
        }
      }

      if (chosenOffer) {
        // encontramos, sair do loop de sortTypes
        break;
      }

      // Não encontrou nada nesse sortType, tentar o próximo
      console.log(
        `Nenhuma oferta nova encontrada com sortType=${currentSortType}. Indo para o próximo sortType.`
      );
      currentSortType = await saveNextSortType(currentSortType);
    }

    // Se depois de tudo não achou nada
    if (!chosenOffer) {
      console.log('❌ Nenhuma nova oferta encontrada após todas as tentativas.');
      console.log('=== /api/send-offer FIM (sem nova oferta) ===');
      return NextResponse.json(
        {
          message:
            'Não foi encontrada nova oferta diferente na faixa de preço e categorias selecionadas.',
        },
        { status: 200 }
      );
    }

    // Atualiza sortType para a próxima vez (rodízio contínuo)
    await saveNextSortType(currentSortType);

    // 3) Montar mensagem com preço e CTA randômica
    const productName = chosenOffer.productName ?? 'Oferta Shopee';
    const offerLink = chosenOffer.offerLink ?? 'https://shopee.com.br';

    // Normalizar priceMin / priceMax
    const priceMinNumber = parsePrice(chosenOffer.priceMin);
    const priceMaxNumber = parsePrice(chosenOffer.priceMax);

    // Se não tiver preço válido, evita quebrar a mensagem
    const effectiveMin = priceMinNumber > 0 ? priceMinNumber : priceMaxNumber;
    const effectiveMax = priceMaxNumber > 0 ? priceMaxNumber : priceMinNumber;

    let priceBlock = 'Preço indisponível';
    if (effectiveMin > 0) {
      priceBlock = buildPriceText(
        effectiveMin,
        effectiveMax > 0 ? effectiveMax : effectiveMin,
        typeof chosenOffer.priceDiscountRate === 'number'
          ? chosenOffer.priceDiscountRate
          : null
      );
    }

    // CTA randômica
    const cta = getRandomCtaMessage();

    const message = `*✨ ${productName}*

${priceBlock}

${cta}
${offerLink}

⚠️ Oferta por tempo limitado!`;

    console.log('Mensagem montada:', message);

    // 4) Enviar mensagem para Telegram
    await sendTelegramMessage({
      botToken: process.env.TELEGRAM_BOT_TOKEN!,
      chatId: process.env.TELEGRAM_CHAT_ID!,
      text: message,
    });

    console.log('Mensagem enviada para o Telegram.');

    // 5) Registrar que esse item foi postado
    const itemIdBigInt = BigInt(chosenOffer.itemId);
    await prisma.posted_products.create({
      data: {
        item_id: itemIdBigInt,
        posted_at: new Date(),
      },
    });

    console.log('Item registrado em posted_products com sucesso.');
    console.log('=== /api/send-offer FIM (sucesso) ===');

    return NextResponse.json(
      {
        message: 'Oferta enviada com sucesso',
        itemId: chosenOffer.itemId,
        categoryId: chosenCategory,
        sortTypeUsed: currentSortType,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro em /api/send-offer:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar oferta' },
      { status: 500 }
    );
  }
}