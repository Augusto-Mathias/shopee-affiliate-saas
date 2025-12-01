// app/api/admin/settings/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/db/prisma";

type Body = {
  min_price?: number | string;
  max_price?: number | string;
  min_commission_rate?: number | string;
  max_commission_rate?: number | string;
  items_per_page?: number | string;
};

function toNumberOrNull(value: any): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET() {
  try {
    const settings = await prisma.user_settings.findUnique({
      where: { user_identifier: "default" },
    });
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error("GET /api/admin/settings error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Body;

    const min_price = toNumberOrNull(body.min_price);
    const max_price = toNumberOrNull(body.max_price);
    const min_commission_rate = toNumberOrNull(body.min_commission_rate);
    const max_commission_rate = toNumberOrNull(body.max_commission_rate);
    const items_per_page = toNumberOrNull(body.items_per_page);

    const upsertData: any = {
      min_price,
      max_price,
      min_commission_rate,
      max_commission_rate,
      items_per_page,
    };

    Object.keys(upsertData).forEach((k) => {
      if (upsertData[k] === undefined) delete upsertData[k];
    });

    const settings = await prisma.user_settings.upsert({
      where: { user_identifier: "default" },
      update: upsertData,
      create: {
        user_identifier: "default",
        ...upsertData,
      },
    });

    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error("PUT /api/admin/settings error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}