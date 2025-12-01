// src/services/shopee/ingestReports.ts
import { fetch } from "undici";
import { prisma } from "../../lib/db/prisma";
import { randomUUID } from "crypto";
import { getShopeeAuthHeader } from "./auth";

type GraphQLResp = any;

const API_URL = process.env.SHOPEE_API_URL || "https://open-api.affiliate.shopee.com.br/graphql";

/**
 * Gera headers dinamicamente usando appId/appSecret.
 * DEBUG_SHOPEE_AUTH=1 para imprimir o header em logs locais (não usar em prod).
 */
function buildHeaders(body?: any) {
  const path = new URL(API_URL).pathname || "/";
  const authValue = getShopeeAuthHeader(path, "POST", body);

  if (process.env.DEBUG_SHOPEE_AUTH === "1") {
    console.log("DEBUG Shopee Authorization header:", authValue);
  }

  return {
    "Content-Type": "application/json",
    Authorization: authValue,
  };
}

async function graphqlRequest(query: string, variables: any): Promise<GraphQLResp> {
  const bodyObj = { query, variables };
  const bodyStr = JSON.stringify(bodyObj);

  const res = await fetch(API_URL, {
    method: "POST",
    headers: buildHeaders(bodyObj),
    body: bodyStr,
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} - body: ${text}`);
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch (parseErr) {
    throw new Error(`Failed to parse JSON response (HTTP ${res.status}). Body:\n${text}`);
  }

  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  if (!json.data) {
    throw new Error(`No "data" field in GraphQL response. Body:\n${text}`);
  }

  return json.data;
}

/**
 * Generic scroll handler:
 * - initialQuery must return nodes and pageInfo.scrollId
 * - then call follow-up query with scrollId until hasNextPage is false
 *
 * Note: scrollId may expire quickly. We fetch pages immediately while cursor valid.
 */
async function fetchAllWithScroll(initialQuery: string, initialVariables: any, scrollQuery?: string) {
  const results: any[] = [];
  // first request
  const data = await graphqlRequest(initialQuery, initialVariables);
  // extract nodes and pageInfo in a tolerant way
  const connectionKey = Object.keys(data).find((k) => data[k] && data[k].nodes);
  if (!connectionKey) return results;
  const conn = data[connectionKey];
  results.push(...(conn.nodes || []));
  let pageInfo = conn.pageInfo ?? null;
  let scrollId = pageInfo?.scrollId ?? null;

  while (pageInfo?.hasNextPage && scrollId && scrollQuery) {
    try {
      const nextData = await graphqlRequest(scrollQuery, { scrollId });
      const nextKey = Object.keys(nextData).find((k) => nextData[k] && nextData[k].nodes);
      if (!nextKey) break;
      const nextConn = nextData[nextKey];
      results.push(...(nextConn.nodes || []));
      pageInfo = nextConn.pageInfo ?? null;
      scrollId = pageInfo?.scrollId ?? null;
    } catch (err) {
      console.error("fetchAllWithScroll error:", err);
      break;
    }
  }

  return results;
}

export async function ingestConversionReport(params: {
  purchaseTimeStart?: number;
  purchaseTimeEnd?: number;
  completeTimeStart?: number;
  completeTimeEnd?: number;
  limit?: number;
}) {
  const initialQuery = `
    query conversionReport(
      $purchaseTimeStart: Int64,
      $purchaseTimeEnd: Int64,
      $completeTimeStart: Int64,
      $completeTimeEnd: Int64,
      $limit: Int
    ) {
      conversionReport(
        purchaseTimeStart: $purchaseTimeStart,
        purchaseTimeEnd: $purchaseTimeEnd,
        completeTimeStart: $completeTimeStart,
        completeTimeEnd: $completeTimeEnd,
        limit: $limit
      ) {
        nodes {
          conversionId
          purchaseTime
          clickTime
          totalCommission
          sellerCommission
          netCommission
          buyerType
          utmContent
          device
          referrer
          orders {
            orderStatus
            shopType
            items {
              itemId
              itemName
              itemPrice
              actualAmount
              qty
              imageUrl
              itemTotalCommission
              itemSellerCommission
              itemSellerCommissionRate
              itemShopeeCommissionCapped
              itemShopeeCommissionRate
              itemNotes
              channelType
              attributionType
              globalCategoryLv1Name
              globalCategoryLv2Name
              globalCategoryLv3Name
              refundAmount
              fraudStatus
              modelId
              promotionId
            }
          }
        }
        pageInfo {
          limit
          hasNextPage
          scrollId
        }
      }
    }
  `;

  const scrollQuery = `
    query conversionReportScroll($scrollId: String!) {
      conversionReport(scrollId: $scrollId) {
        nodes {
          conversionId
          purchaseTime
          clickTime
          totalCommission
          sellerCommission
          netCommission
          buyerType
          utmContent
          device
          referrer
          orders {
            orderStatus
            shopType
            items {
              itemId
              itemName
              itemPrice
              actualAmount
              qty
              imageUrl
              itemTotalCommission
              itemSellerCommission
              itemSellerCommissionRate
              itemShopeeCommissionCapped
              itemShopeeCommissionRate
              itemNotes
              channelType
              attributionType
              globalCategoryLv1Name
              globalCategoryLv2Name
              globalCategoryLv3Name
              refundAmount
              fraudStatus
              modelId
              promotionId
            }
          }
        }
        pageInfo {
          limit
          hasNextPage
          scrollId
        }
      }
    }
  `;

  const variables = {
    purchaseTimeStart: params.purchaseTimeStart,
    purchaseTimeEnd: params.purchaseTimeEnd,
    completeTimeStart: params.completeTimeStart,
    completeTimeEnd: params.completeTimeEnd,
    limit: params.limit ?? 500,
  };

  const nodes = await fetchAllWithScroll(initialQuery, variables, scrollQuery);

  let processed = 0;
  for (const node of nodes) {
    try {
      const rawConvId = node?.conversionId;
      if (rawConvId == null) {
        console.warn("Skipping node without conversionId:", JSON.stringify(node).slice(0, 200));
        continue;
      }

      let convId: bigint;
      try {
        convId = typeof rawConvId === "bigint" ? rawConvId : BigInt(rawConvId);
      } catch (convErr) {
        console.error("Invalid conversionId, skipping node:", rawConvId, convErr);
        continue;
      }

      await prisma.conversionReport.upsert({
        where: { conversionId: convId as any },
        update: {
          purchaseTime: node.purchaseTime ?? null,
          clickTime: node.clickTime ?? null,
          totalCommission: node.totalCommission ?? null,
          sellerCommission: node.sellerCommission ?? null,
          netCommission: node.netCommission ?? null,
          buyerType: node.buyerType ?? null,
          utmContent: node.utmContent ?? null,
          device: node.device ?? null,
          referrer: node.referrer ?? null,
          orders: node.orders ?? null,
          rawJson: node,
        },
        create: {
          conversionId: convId as any,
          purchaseTime: node.purchaseTime ?? null,
          clickTime: node.clickTime ?? null,
          totalCommission: node.totalCommission ?? null,
          sellerCommission: node.sellerCommission ?? null,
          netCommission: node.netCommission ?? null,
          buyerType: node.buyerType ?? null,
          utmContent: node.utmContent ?? null,
          device: node.device ?? null,
          referrer: node.referrer ?? null,
          orders: node.orders ?? null,
          rawJson: node,
        },
      });

      processed++;
    } catch (err) {
      console.error("Error upserting conversion:", err, node?.conversionId);
    }
  }

  return { processed, total: nodes.length };
}

export async function ingestValidatedReport(params: { validationId?: number; limit?: number }) {
  const initialQuery = `
    query validatedReport($validationId: Int64, $limit: Int) {
      validatedReport(validationId: $validationId, limit: $limit) {
        nodes {
          conversionId
          purchaseTime
          clickTime
          totalCommission
          sellerCommission
          shopeeCommissionCapped
          netCommission
          buyerType
          utmContent
          device
          referrer
          orders {
            orderStatus
            shopType
            items {
              itemId
              itemName
              itemPrice
              actualAmount
              qty
              imageUrl
              itemTotalCommission
              itemSellerCommission
              itemSellerCommissionRate
              itemShopeeCommissionCapped
              itemShopeeCommissionRate
              itemNotes
              channelType
              attributionType
              globalCategoryLv1Name
              globalCategoryLv2Name
              globalCategoryLv3Name
              refundAmount
              fraudStatus
              modelId
              promotionId
            }
          }
        }
        pageInfo {
          limit
          hasNextPage
          scrollId
        }
      }
    }
  `;

  const scrollQuery = `
    query validatedReportScroll($scrollId: String!) {
      validatedReport(scrollId: $scrollId) {
        nodes {
          conversionId
          purchaseTime
          clickTime
          totalCommission
          sellerCommission
          shopeeCommissionCapped
          netCommission
          buyerType
          utmContent
          device
          referrer
          orders {
            orderStatus
            shopType
            items {
              itemId
              itemName
              itemPrice
              actualAmount
              qty
              imageUrl
              itemTotalCommission
              itemSellerCommission
              itemSellerCommissionRate
              itemShopeeCommissionCapped
              itemShopeeCommissionRate
              itemNotes
              channelType
              attributionType
              globalCategoryLv1Name
              globalCategoryLv2Name
              globalCategoryLv3Name
              refundAmount
              fraudStatus
              modelId
              promotionId
            }
          }
        }
        pageInfo {
          limit
          hasNextPage
          scrollId
        }
      }
    }
  `;

  const variables = {
    validationId: params.validationId ?? null,
    limit: params.limit ?? 500,
  };

  const nodes = await fetchAllWithScroll(initialQuery, variables, scrollQuery);

  let processed = 0;
  for (const node of nodes) {
    try {
      const rawConvId = node?.conversionId;
      if (rawConvId == null) {
        console.warn("Skipping node without conversionId:", JSON.stringify(node).slice(0, 200));
        continue;
      }
      let convId: bigint;
      try {
        convId = typeof rawConvId === "bigint" ? rawConvId : BigInt(rawConvId);
      } catch (convErr) {
        console.error("Invalid conversionId, skipping node:", rawConvId, convErr);
        continue;
      }

      await prisma.validatedReport.upsert({
        where: { conversionId: convId as any },
        update: {
          purchaseTime: node.purchaseTime ?? null,
          clickTime: node.clickTime ?? null,
          totalCommission: node.totalCommission ?? null,
          sellerCommission: node.sellerCommission ?? null,
          shopeeCommissionCapped: node.shopeeCommissionCapped ?? null,
          netCommission: node.netCommission ?? null,
          buyerType: node.buyerType ?? null,
          utmContent: node.utmContent ?? null,
          device: node.device ?? null,
          referrer: node.referrer ?? null,
          orders: node.orders ?? null,
          rawJson: node,
        },
        create: {
          conversionId: convId as any,
          purchaseTime: node.purchaseTime ?? null,
          clickTime: node.clickTime ?? null,
          totalCommission: node.totalCommission ?? null,
          sellerCommission: node.sellerCommission ?? null,
          shopeeCommissionCapped: node.shopeeCommissionCapped ?? null,
          netCommission: node.netCommission ?? null,
          buyerType: node.buyerType ?? null,
          utmContent: node.utmContent ?? null,
          device: node.device ?? null,
          referrer: node.referrer ?? null,
          orders: node.orders ?? null,
          rawJson: node,
        },
      });

      processed++;
    } catch (err) {
      console.error("Error upserting validated:", err, node?.conversionId);
    }
  }

  return { processed, total: nodes.length };
}