// app/api/send-offer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db/prisma';
import { sendTelegramMessage } from '@/src/lib/telegram/telegram.client';
import { fetchProductOffers } from '@/src/lib/shopee/shopee.offers';
import { getCurrentSortType, saveNextSortType } from '@/src/lib/db/settings';
import { PET_CATEGORIES } from '@/src/lib/shopee/categories';
import type { ProductOfferV2Node } from '@/src/lib/shopee/shopee.types';

// ====== HELPER PARA CARREGAR SETTINGS COM SEGURANÇA ======
async function getEffectiveUserSettings(prisma: any) {
  const defaultSettings = {
    minPrice: 1.0,
    maxPrice: 100.0,
    minCommissionRate: 2.5,
    maxCommissionRate: 15.0,
    itemsPerPage: 100,
    maxPagesPerRun: 5,
  };

  try {
    const row = await prisma.user_settings.findUnique({
      where: { user_identifier: 'default' },
    });

    return {
      minPrice: row?.min_price ? Number(row.min_price) : defaultSettings.minPrice,
      maxPrice: row?.max_price ? Number(row.max_price) : defaultSettings.maxPrice,
      minCommissionRate: row?.min_commission_rate
        ? Number(row.min_commission_rate)
        : defaultSettings.minCommissionRate,
      maxCommissionRate: row?.max_commission_rate
        ? Number(row.max_commission_rate)
        : defaultSettings.maxCommissionRate,
      itemsPerPage: row?.items_per_page ?? defaultSettings.itemsPerPage,
      maxPagesPerRun: row?.max_pages_per_run ?? defaultSettings.maxPagesPerRun,
    };
  } catch (err: any) {
    console.warn('⚠️ user_settings lookup failed, using defaults:', err?.code ?? err?.message);
    return defaultSettings;
  }
}

// ====== CONFIGURAÇÕES DINÂMICAS ======
const SORT_PRIORITY: number[] = [1, 4, 2, 5];
const BLOCKED_KEYWORDS = [
  'feno',
  'coast cross',
  'lagomorfos',
  'coelhos',
  'coelho',
  'porquinho da índia',
  'porquinho da india',
  'pássaro',
  'pássaros',
  'passaro',
  'passaros',
  'calopsita',
  'periquito',
  'papagaio',
  'canário',
  'canario',
  'ave',
  'aves',
];

type ProductKind = 'FOOD' | 'SNACK' | 'TOY' | 'HYGIENE' | 'ACCESSORY' | 'GENERIC';

function detectProductKind(nameRaw: string | null | undefined): ProductKind {
  if (!nameRaw) return 'GENERIC';
  const name = nameRaw.toLowerCase();

  if (
    name.includes('ração') ||
    name.includes('raçao') ||
    name.includes('alimento completo') ||
    name.includes('alimento úmido') ||
    name.includes('alimento umido') ||
    name.includes('ração úmida') ||
    name.includes('ração umida') ||
    name.includes('sachê') ||
    name.includes('sache') ||
    name.includes('pedigree') ||
    name.includes('whiskas') ||
    name.includes('golden') ||
    name.includes('premier')
  ) {
    return 'FOOD';
  }

  if (
    name.includes('petisco') ||
    name.includes('bifinho') ||
    name.includes('snack') ||
    name.includes('biscuits') ||
    name.includes('biscoito') ||
    name.includes('ossinho') ||
    name.includes('stick')
  ) {
    return 'SNACK';
  }

  if (
    name.includes('brinquedo') ||
    name.includes('bola') ||
    name.includes('mordedor') ||
    name.includes('pelúcia') ||
    name.includes('pelucia') ||
    name.includes('frisbee') ||
    name.includes('varinha') ||
    name.includes('catnip') ||
    name.includes('arranhador') ||
    name.includes('laser')
  ) {
    return 'TOY';
  }

  if (
    name.includes('tapete higiênico') ||
    name.includes('tapete higienico') ||
    name.includes('banho') ||
    name.includes('shampoo') ||
    name.includes('condicionador') ||
    name.includes('areia higiênica') ||
    name.includes('areia higienica') ||
    name.includes('cata coco') ||
    name.includes('cata-coco') ||
    name.includes('higiênico') ||
    name.includes('higienico') ||
    name.includes('saquinho') ||
    name.includes('sacola') ||
    name.includes('refil')
  ) {
    return 'HYGIENE';
  }

  if (
    name.includes('coleira') ||
    name.includes('peitoral') ||
    name.includes('guia') ||
    name.includes('cama') ||
    name.includes('casinha') ||
    name.includes('comedouro') ||
    name.includes('bebedouro') ||
    name.includes('roupa') ||
    name.includes('camiseta') ||
    name.includes('pote') ||
    name.includes('tigela') ||
    name.includes('fonte') ||
    name.includes('cortador de unha') ||
    name.includes('escova')
  ) {
    return 'ACCESSORY';
  }

  return 'GENERIC';
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function parsePrice(price: string | number | null | undefined): number {
  if (!price) return 0;
  const priceStr = typeof price === 'string' ? price.replace(',', '.') : String(price);
  const num = parseFloat(priceStr);
  return Number.isNaN(num) ? 0 : num;
}

function buildPriceText(priceMin: number, priceMax: number, discountRate?: number | null): string {
  const minStr = `R$ ${priceMin.toFixed(2)}`;
  const maxStr = `R$ ${priceMax.toFixed(2)}`;
  const discountStr =
    typeof discountRate === 'number' && !Number.isNaN(discountRate) && discountRate > 0
      ? `${discountRate.toFixed(0)}% OFF`
      : '';

  if (priceMax > priceMin && priceMax > 0) {
    return discountStr
      ? `💸 *De:* ${maxStr}\n💥 *Por:* ${minStr}  (_${discountStr}_)`
      : `💸 *De:* ${maxStr}\n💥 *Por:* ${minStr}`;
  }

  return `💥 *Por apenas:* ${minStr}`;
}

// ====== NORMALIZAÇÃO SIMPLES (SOMENTE STRING) ======
function toItemIdString(raw: any): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  return s.length ? s : null;
}

// ====== BLOQUEIO POR PALAVRAS (igual) ======
function isBlockedByKeyword(offer: ProductOfferV2Node): boolean {
  const name = (offer.productName ?? '').toLowerCase();
  for (const keyword of BLOCKED_KEYWORDS) {
    if (!keyword) continue;
    if (name.includes(keyword.toLowerCase())) {
      console.log(`     🚫 Item ${offer.itemId} bloqueado por palavra-chave "${keyword}" no título.`);
      return true;
    }
  }
  return false;
}

// ====== SEQUÊNCIA DE SORTTYPE (igual) ======
function buildSortSequenceFromCurrent(current: number): number[] {
  const priority = [...SORT_PRIORITY];
  const idx = priority.indexOf(current);
  if (idx === -1) {
    console.log(`SortType atual (${current}) não está na prioridade [${priority.join(', ')}]. Usando prioridade padrão.`);
    return priority;
  }
  return [...priority.slice(idx), ...priority.slice(0, idx)];
}

// ====== ABERTURAS / CTA / URGENCY (mantive suas listas originais) ======
const OPENING_BY_KIND: Record<ProductKind, string[]> = {
  FOOD: [
    '🍽️ *Economia na ração pro seu pet:*',
    '🐾 *Olha essa oferta de ração pra cuidar bem do seu pet:*',
    '🥣 *Ração em promoção pra manter o potinho sempre cheio:*',
    '🍖 *Alimento de qualidade com preço de oferta:*',
  ],
  SNACK: [
    '🦴 *Mimo gostoso pro seu pet sem pesar no bolso:*',
    '🍖 *Petisco em oferta pra alegrar o dia do seu pet:*',
    '😋 *Hora do snack! Olha esse petisco em promoção:*',
    '🎁 *Agrado especial pro seu pet com desconto:*',
  ],
  TOY: [
    '🎾 *Hora de brincar! Olha esse brinquedo em oferta:*',
    '🐶 *Brinquedo novo pro seu pet gastar energia:*',
    '🎉 *Promo de brinquedo pra acabar com o tédio do seu pet:*',
    '🧸 *Diversão garantida com esse brinquedo em oferta:*',
  ],
  HYGIENE: [
    '🧼 *Cuidar da higiene do pet também pode ser barato:*',
    '🚿 *Oferta pra manter seu pet limpinho e cheiroso:*',
    '🧴 *Produto de higiene em promoção pro seu pet:*',
    '✨ *Limpeza e praticidade com preço especial:*',
  ],
  ACCESSORY: [
    '🎀 *Acessório em promoção pra deixar seu pet ainda mais estiloso:*',
    '📦 *Acessório útil pro dia a dia do seu pet com desconto:*',
    '🛏️ *Conforto e praticidade pro seu pet com preço de oferta:*',
    '⭐ *Item essencial pro seu pet em promoção:*',
  ],
  GENERIC: [
    '🐾 *Olha essa pra hoje pro seu pet:*',
    '✨ *Oferta selecionada pra quem ama pet:*',
    '🎁 *Achamos uma promoção legal pro seu pet:*',
    '💚 *Mais uma chance de economizar no seu pet:*',
    '🔥 *Promo boa pra cuidar do seu pet sem pesar no bolso:*',
    '⭐ *Dica rápida de economia pra tutores:*',
    '🐶 *Seu pet merece, e o seu bolso agradece:*',
    '📣 *Oferta fresca que acabou de sair:*',
  ],
};

function getOpeningByKind(kind: ProductKind): string {
  const list = OPENING_BY_KIND[kind] ?? OPENING_BY_KIND.GENERIC;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

const CTA_BY_KIND: Record<ProductKind, string[]> = {
  FOOD: [
    '🍽️ Veja os sabores e tamanhos disponíveis aqui:',
    '🐕 Confira as avaliações de quem já comprou essa ração:',
    '🥣 Clique pra ver se o pacote ideal pro seu pet está em oferta:',
    '📦 Veja frete, prazo e mais detalhes da ração aqui:',
  ],
  SNACK: [
    '🦴 Veja os sabores e quantidades disponíveis aqui:',
    '😋 Confira o que outros tutores acharam desse petisco:',
    '🍖 Clique pra ver mais detalhes desse snack pro seu pet:',
    '🎁 Garanta já esse mimo pro seu pet:',
  ],
  TOY: [
    '🎾 Veja as fotos e tamanhos desse brinquedo:',
    '🐾 Confira como esse brinquedo pode entreter seu pet:',
    '🎉 Clique pra ver mais modelos e cores disponíveis:',
    '🧸 Veja as avaliações e garanta diversão pro seu pet:',
  ],
  HYGIENE: [
    '🧼 Veja como usar e as avaliações de outros tutores:',
    '🚿 Clique pra ver detalhes e componentes do produto:',
    '🧴 Confira instruções de uso e mais informações aqui:',
    '✨ Veja quantidades e opções disponíveis:',
  ],
  ACCESSORY: [
    '📏 Veja medidas, tamanhos e cores disponíveis aqui:',
    '🎀 Confira as fotos e comentários de quem já comprou:',
    '🛏️ Clique pra ver mais detalhes desse acessório:',
    '⭐ Veja as avaliações e garanta o seu:',
  ],
  GENERIC: [
    '🛒 Clique para ver fotos, avaliações e cores disponíveis:',
    '🐶 Veja os detalhes e tamanhos disponíveis aqui:',
    '🐾 Confira as fotos e os comentários de quem já comprou:',
    '💚 Clique e veja se ainda está disponível na promoção:',
    '📦 Veja o frete, prazo de entrega e mais detalhes aqui:',
    '🔥 Aproveite enquanto ainda está com desconto:',
    '⭐ Veja as avaliações e descubra por que esse produto é tão bem avaliado:',
    '🎯 Clique para ver mais fotos e escolher o modelo ideal:',
    '💥 Confira o preço atualizado e condições de pagamento:',
  ],
};

function getCtaByKind(kind: ProductKind): string {
  const list = CTA_BY_KIND[kind] ?? CTA_BY_KIND.GENERIC;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

const URGENCY_MESSAGES: string[] = [
  '⚠️ Oferta por tempo limitado!',
  '⏰ Corre! Promoção válida apenas hoje!',
  '🔥 Últimas unidades com esse preço!',
  '⚡ Estoque limitado! Garanta o seu agora!',
  '🎯 Oferta relâmpago! Pode acabar a qualquer momento!',
  '💨 Não perca! Essa promoção não vai durar muito!',
  '🚨 Atenção! Preço promocional por tempo limitado!',
  '⏳ Aproveite antes que o desconto acabe!',
  '🔔 Alerta de oferta! Pode sair do ar a qualquer momento!',
  '💥 Promoção imperdível! Estoque acabando rápido!',
  '🎁 Última chance de garantir com esse desconto!',
  '⚠️ Pouquíssimas unidades restantes!',
  '🏃‍♂️ Corre! Outros compradores já estão de olho!',
  '🔥 Oferta quente! Pode acabar nas próximas horas!',
  '⭐ Preço especial que não vai se repetir tão cedo!',
  '💎 Oportunidade única! Garanta já!',
  '🚀 Voa! Essa oferta é por tempo limitado!',
  '⏰ Tick‑tock! O desconto pode acabar a qualquer momento!',
  '🎯 Não deixe para depois! Estoque limitado!',
  '💰 Economia real! Mas só enquanto durar o estoque!',
];

function getRandomUrgencyMessage(): string {
  const idx = Math.floor(Math.random() * URGENCY_MESSAGES.length);
  return URGENCY_MESSAGES[idx];
}

// ====== HANDLER PRINCIPAL ======
export async function GET(req: NextRequest) {
  try {
    const settings = await getEffectiveUserSettings(prisma);
    const dbSortType = await getCurrentSortType();

    console.log('=== /api/send-offer INÍCIO ===');
    console.log('SortType inicial salvo no banco:', dbSortType);
    console.log(`Faixa de preço: R$ ${settings.minPrice} - R$ ${settings.maxPrice}`);
    console.log(`Categorias de Pet: ${PET_CATEGORIES.length} IDs`);
    console.log(`Limite de requisições por execução: ${settings.maxPagesPerRun}`);

    const shuffledCategories = shuffleArray(PET_CATEGORIES);
    const sortSequence = buildSortSequenceFromCurrent(dbSortType);

    let chosenOffer: ProductOfferV2Node | null = null;
    let chosenCategory: number | null = null;
    let sortTypeUsed: number = dbSortType;
    let totalRequests = 0;
    const maxSortsToTry = Math.min(4, sortSequence.length);
    const MAX_SHOPEE_PAGE_LIMIT = 50;

    for (let sortTry = 0; sortTry < maxSortsToTry; sortTry++) {
      const currentSortType = sortSequence[sortTry];
      if (totalRequests >= settings.maxPagesPerRun) {
        console.log(`⚠️ Atingiu limite total de ${settings.maxPagesPerRun} requisições antes de tentar sortType=${currentSortType}.`);
        break;
      }

      console.log(`\n--- Tentando sortType=${currentSortType} (tentativa ${sortTry + 1}) ---`);

      for (const categoryId of shuffledCategories) {
        console.log(`\n  >> Categoria ${categoryId}`);

       const MAX_SHOPEE_PAGE_LIMIT = 50;
const maxPages = Math.min(settings.maxPagesPerRun, MAX_SHOPEE_PAGE_LIMIT);

if (settings.maxPagesPerRun > MAX_SHOPEE_PAGE_LIMIT) {
  console.warn(`⚠️ settings.maxPagesPerRun (${settings.maxPagesPerRun}) excede o limite da Shopee (${MAX_SHOPEE_PAGE_LIMIT}). Usando ${maxPages} páginas.`);
}

// Garante que page nunca ultrapasse o limite da Shopee
for (let page = 1; page <= maxPages; page++) {
  if (totalRequests >= settings.maxPagesPerRun) {
    console.log(`⚠️ Atingiu limite total de ${settings.maxPagesPerRun} requisições nesta execução. Parando.`);
    break;
  }

          console.log(`     Buscando página ${page} (cat=${categoryId}, sortType=${currentSortType})...`);
          const { nodes, pageInfo } = await fetchProductOffers({
            appId: process.env.SHOPEE_APP_ID!,
            secret: process.env.SHOPEE_SECRET!,
            productCatId: categoryId,
            listType: 0,
            sortType: currentSortType,
            isAMSOffer: true,
            limit: settings.itemsPerPage,
            page,
          });

          totalRequests++;
          console.log(`     Retornados ${nodes.length} itens. (Total de requisições: ${totalRequests})`);

          if (nodes.length === 0) {
            console.log('     Nenhum item retornado nesta página. Pulando para próxima categoria.');
            break;
          }

          for (const offer of nodes) {
            const itemIdStr = toItemIdString(offer.itemId);
            if (!itemIdStr) {
              console.warn(`     ⚠️ Item sem ID válido (offer.itemId=${offer.itemId}). Pulando.`);
              continue;
            }

            // consulta por string (seu schema usa String)
            let alreadyPosted = null;
            try {
              alreadyPosted = await prisma.posted_products.findUnique({
                where: { item_id: itemIdStr },
              });
            } catch (err) {
              console.error('Erro ao consultar posted_products por string:', err);
              continue;
            }

            if (alreadyPosted) {
              console.log(`     ⏭️  Item ${offer.itemId} já postado. Pulando.`);
              continue;
            }

            const priceMin = parsePrice(offer.priceMin);
            const priceMax = parsePrice(offer.priceMax);
            const price = priceMin > 0 ? priceMin : priceMax;

            if (price < settings.minPrice || price > settings.maxPrice) {
              console.log(`     💰 Item ${offer.itemId} fora da faixa (R$ ${price.toFixed(2)}). Pulando.`);
              continue;
            }

            if (isBlockedByKeyword(offer)) {
              continue;
            }

            console.log(`     ✅ Oferta nova encontrada: itemId=${offer.itemId}, productName=${offer.productName}`);
            chosenOffer = offer;
            chosenCategory = categoryId;
            sortTypeUsed = currentSortType;
            break;
          }

          if (chosenOffer) break;
          if (!pageInfo.hasNextPage) {
            console.log('     Não há mais páginas nesta categoria.');
            break;
          }
        }

        if (chosenOffer || totalRequests >= settings.maxPagesPerRun) break;
      }

      if (chosenOffer || totalRequests >= settings.maxPagesPerRun) break;

      console.log(`Nenhuma oferta nova encontrada com sortType=${currentSortType}. Indo para o próximo sortType.`);
    }

    if (!chosenOffer) {
      console.log('❌ Nenhuma nova oferta encontrada após todas as tentativas.');
      console.log(`Total de requisições realizadas: ${totalRequests}`);
      console.log('=== /api/send-offer FIM (sem nova oferta) ===');
      return NextResponse.json(
        {
          message: 'Não foi encontrada nova oferta diferente na faixa de preço e categorias selecionadas.',
          totalRequests,
        },
        { status: 200 }
      );
    }

    const currentIndexInSeq = sortSequence.indexOf(sortTypeUsed);
    const nextSortTypeToPersist = sortSequence[(currentIndexInSeq + 1) % sortSequence.length];
    await saveNextSortType(nextSortTypeToPersist);

    const productName = chosenOffer.productName ?? 'Oferta Shopee';
    const offerLink = chosenOffer.offerLink ?? 'https://shopee.com.br';
    const priceMinNumber = parsePrice(chosenOffer.priceMin);
    const priceMaxNumber = parsePrice(chosenOffer.priceMax);
    const effectiveMin = priceMinNumber > 0 ? priceMinNumber : priceMaxNumber;
    const effectiveMax = priceMaxNumber > 0 ? priceMaxNumber : priceMinNumber;

    let priceBlock = 'Preço indisponível';
    if (effectiveMin > 0) {
      priceBlock = buildPriceText(
        effectiveMin,
        effectiveMax > 0 ? effectiveMax : effectiveMin,
        typeof chosenOffer.priceDiscountRate === 'number' ? chosenOffer.priceDiscountRate : null
      );
    }

    const kind = detectProductKind(productName);
    const opening = getOpeningByKind(kind);
    const cta = getCtaByKind(kind);
    const urgency = getRandomUrgencyMessage();

    console.log(`     🏷️  Tipo de produto detectado: ${kind}`);

    const message = `${opening}

*✨ ${productName}*

${priceBlock}

${cta}
${offerLink}

${urgency}`;

    console.log('Mensagem montada:', message);

    await sendTelegramMessage({
      botToken: process.env.TELEGRAM_BOT_TOKEN!,
      chatId: process.env.TELEGRAM_CHAT_ID!,
      text: message,
      parseMode: 'Markdown',
    });

    console.log('Mensagem enviada para o Telegram.');

    // registrar chosenOffer como STRING (schema posted_products.item_id é String)
    const itemIdToSave = toItemIdString(chosenOffer.itemId);
    if (itemIdToSave) {
      try {
        await prisma.posted_products.create({
          data: {
            item_id: itemIdToSave,
            posted_at: new Date(),
          },
        });
        console.log('Item registrado em posted_products com sucesso.');
      } catch (err) {
        console.error('Erro ao criar posted_products (string):', err);
      }
    } else {
      console.warn('chosenOffer sem itemId válido, não foi possível registrar em posted_products.');
    }

    console.log(`Total de requisições realizadas: ${totalRequests}`);
    console.log('=== /api/send-offer FIM (sucesso) ===');

    return NextResponse.json(
      {
        message: 'Oferta enviada com sucesso',
        itemId: String(chosenOffer.itemId),
        categoryId: chosenCategory,
        sortTypeUsed,
        nextSortTypeSaved: nextSortTypeToPersist,
        totalRequests,
        productKind: kind,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Erro em /api/send-offer:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar oferta', details: error?.message || 'Erro desconhecido' },
      { status: 500 }
    );
  }
}