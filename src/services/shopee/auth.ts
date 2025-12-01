// src/services/shopee/auth.ts
import crypto from "crypto";

/**
 * Gera o header Authorization exatamente como exigido pela Shopee.
 *
 * Formato:
 * Authorization: SHA256 Credential={AppId}, Timestamp={Timestamp}, Signature={SHA256(AppId+Timestamp+Payload+Secret)}
 */
export function getShopeeAuthHeader(apiUrlPath: string, method: string, body?: any) {
  const appId = process.env.SHOPEE_APP_ID;
  const appSecret = process.env.SHOPEE_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Missing SHOPEE_APP_ID or SHOPEE_APP_SECRET env vars.");
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyString = body ? (typeof body === "string" ? body : JSON.stringify(body)) : "";

  // Concatenação exata exigida pela Shopee
  const signatureFactor = `${appId}${timestamp}${bodyString}${appSecret}`;
  const signature = crypto.createHash("sha256").update(signatureFactor).digest("hex");

  // Formato exato do header
  return `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`;
}