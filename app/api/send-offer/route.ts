import { NextResponse } from "next/server";
import { fetchSingleProductOffer } from "@/src/lib/shopee/shopee.offers";
import { sendOfferToTelegram } from "@/src/lib/telegram/telegram.client";

export async function GET() {
  try {
    const appId = process.env.SHOPEE_APP_ID;
    const secret = process.env.SHOPEE_SECRET;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!appId || !secret) {
      return NextResponse.json(
        { error: "SHOPEE_APP_ID ou SHOPEE_SECRET não definidos no .env.local" },
        { status: 500 }
      );
    }

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: "TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não definidos no .env.local" },
        { status: 500 }
      );
    }

    // 1) Buscar uma oferta na Shopee
    const offer = await fetchSingleProductOffer({
      appId,
      secret,
      productCatId: 101926, // depois ajustamos para suas categorias
      listType: 0,
      sortType: 5,
      isAMSOffer: true,
      limit: 1,
    });

    if (!offer) {
      return NextResponse.json(
        { error: "Nenhuma oferta encontrada na Shopee" },
        { status: 404 }
      );
    }

    // 2) Montar a legenda da mensagem
    const priceMin = Number(offer.priceMin).toFixed(2).replace(".", ",");
    const originalPrice = Number(offer.priceMax).toFixed(2).replace(".", ",");

    const caption =
      `🐾 *${offer.productName}*\n` +
      `\n` +
      `💰 De R$ ${originalPrice} por *R$ ${priceMin}*\n` +
      `📈 Comissão: ${(Number(offer.commissionRate) * 100).toFixed(0)}%\n` +
      `\n` +
      `🛒 Compre aqui: ${offer.offerLink}`;

    // 3) Enviar para o Telegram
    const telegramResponse = await sendOfferToTelegram({
      botToken,
      chatId,
      imageUrl: offer.imageUrl,
      caption,
      parseMode: "Markdown",
    });

    return NextResponse.json({
      message: "Oferta enviada para o Telegram com sucesso",
      offerSent: {
        productName: offer.productName,
        priceMin: offer.priceMin,
        priceMax: offer.priceMax,
        offerLink: offer.offerLink,
        imageUrl: offer.imageUrl,
      },
      telegramResponse,
    });
  } catch (error: any) {
    console.error("Erro ao enviar oferta para o Telegram:", error);
    return NextResponse.json(
      {
        error: "Erro ao enviar oferta para o Telegram",
        details: String(error?.message ?? error),
      },
      { status: 500 }
    );
  }
}