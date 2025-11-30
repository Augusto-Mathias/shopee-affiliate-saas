import crypto from "crypto";

// URL da API GraphQL da Shopee
const SHOPEE_API_URL = "https://open-api.affiliate.shopee.com.br/graphql";

/**
 * Gera a assinatura SHA256 para a requisição da Shopee.
 * @param appId O App ID da Shopee.
 * @param secret O Secret Key da Shopee.
 * @param payload O corpo da requisição GraphQL (JSON stringificado).
 * @param timestamp O timestamp Unix em segundos.
 * @returns A assinatura SHA256 em formato hexadecimal minúsculo.
 */
function generateShopeeSignature(
  appId: string,
  secret: string,
  payload: string,
  timestamp: number
): string {
  const factor = appId + timestamp.toString() + payload + secret;
  const hash = crypto.createHash("sha256").update(factor).digest("hex");
  return hash;
}

/**
 * Faz uma requisição genérica para a API GraphQL da Shopee.
 * @param query A string da query GraphQL.
 * @param appId O App ID da Shopee.
 * @param secret O Secret Key da Shopee.
 * @returns Os dados da resposta da API da Shopee.
 * @throws Erro se a requisição falhar ou a API retornar erros.
 */
export async function shopeeGraphQLRequest<T>(
  query: string,
  appId: string,
  secret: string
): Promise<T> {
  const timestamp = Math.floor(Date.now() / 1000); // Timestamp Unix em segundos
  const payloadObj = { query };
  const payload = JSON.stringify(payloadObj);

  const signature = generateShopeeSignature(appId, secret, payload, timestamp);

  const authHeader =
    `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`;

  const response = await fetch(SHOPEE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader,
    },
    body: payload,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Shopee API HTTP error! Status: ${response.status}, Body: ${errorText}`
    );
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(
      `Shopee API GraphQL error: ${JSON.stringify(result.errors)}`
    );
  }

  return result.data;
}