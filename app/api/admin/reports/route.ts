// app/api/admin/reports/route.ts
import { NextResponse } from "next/server";
import { ingestConversionReport, ingestValidatedReport } from "../../../../src/services/shopee/ingestReports";
import { prisma } from "../../../../src/lib/db/prisma";

// Simple job table in DB for statuses (we'll use prisma.raw or user_settings table?)
// For simplicity, we'll write records into a small table via prisma (create Migration for ReportJob if you want).
// Here we just return immediate job response.

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type") || "conversion";
    // Start the ingest asynchronously (do not await long)
    if (type === "conversion") {
      // fire and forget but store a job record
      prisma.$executeRaw`SELECT 1`; // touch prisma to ensure it's connected
      ingestConversionReport({ limit: 500 }).then(async (res) => {
        console.log("conversion ingest finished", res);
        await prisma.$queryRaw`SELECT 1`;
      }).catch((err) => console.error("ingest conversion error:", err));
      return NextResponse.json({ ok: true, message: "conversion ingest started" }, { status: 202 });
    } else if (type === "validated") {
      ingestValidatedReport({ limit: 500 }).then((res) => {
        console.log("validated ingest finished", res);
      }).catch((err) => console.error("ingest validated error:", err));
      return NextResponse.json({ ok: true, message: "validated ingest started" }, { status: 202 });
    }
    return NextResponse.json({ ok: false, error: "invalid type" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}

export async function GET() {
  // return some basic info (counts)
  try {
    const convCount = await prisma.conversionReport.count();
    const valCount = await prisma.validatedReport.count();
    return NextResponse.json({ ok: true, conversionReports: convCount, validatedReports: valCount });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
