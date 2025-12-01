// src/services/shopee/ingest-runner.ts
import { ingestConversionReport, ingestValidatedReport } from "./ingestReports";
async function main() {
  const arg = process.argv[2] || "conversion";
  if (arg === "conversion") {
    console.log("Starting conversionReport ingest...");
    const res = await ingestConversionReport({ limit: 500 });
    console.log("Done:", res);
  } else if (arg === "validated") {
    console.log("Starting validatedReport ingest...");
    const res = await ingestValidatedReport({ limit: 500 });
    console.log("Done:", res);
  } else {
    console.log("Unknown command. Use 'conversion' or 'validated'");
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});