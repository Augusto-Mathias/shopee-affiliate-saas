import { NextResponse } from "next/server";
import { fetchSingleProductOffer } from "@/src/lib/shopee/shopee.offers";

export async function GET() {
  try {
    const appId = process.env.SHOPEE_APP_ID;
    const secret = process.env.SHOPEE_SECRET;

    if (!appId || !secret) {
      return NextResponse.json(
        { error: "SHOPEE_APP_ID ou SHOOPEE_SECRET não definidos no .env.local" },
        { status: 500 }
      );
    }

    const offer = await fetchSingleProductOffer({
      appId,
      secret,
      // aqui você pode ajustar depois:
      productCatId: 101926, // exemplo (a categoria que você usava)
      listType: 0,
      sortType: 5,
      isAMSOffer: true,
      limit: 1,
    });

    if (!offer) {
      return NextResponse.json(
        { error: "Nenhuma oferta encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      productName: offer.productName,
      priceMin: offer.priceMin,
      priceMax: offer.priceMax,
      offerLink: offer.offerLink,
      imageUrl: offer.imageUrl,
      raw: offer,
    });
  } catch (error: any) {
    console.error("Erro ao chamar Shopee:", error);
    return NextResponse.json(
      { error: "Erro ao chamar Shopee", details: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}