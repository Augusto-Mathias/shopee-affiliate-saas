import { shopeeGraphQLRequest } from "./shopee.client";
import type { ProductOfferV2Connection, ProductOfferV2Node } from "./shopee.types";

export type FetchSingleOfferParams = {
  appId: string;
  secret: string;

  // parâmetros principais da query
  productCatId?: number; // ex: 101926
  listType?: number;     // ex: 0 (ALL)
  sortType?: number;     // ex: 5 (COMMISSION_DESC)
  isAMSOffer?: boolean;  // ex: true (somente ofertas com comissão do seller)
  limit?: number;        // padrão: 1
};

/**
 * Monta a string da query GraphQL productOfferV2 de forma dinâmica
 * com base nos parâmetros informados.
 */
function buildProductOfferV2Query(params: FetchSingleOfferParams): string {
  const {
    productCatId,
    listType = 0,
    sortType = 5,
    isAMSOffer = true,
    limit = 1,
  } = params;

  const filters: string[] = [];

  filters.push(`listType: ${listType}`);
  filters.push(`sortType: ${sortType}`);
  filters.push(`limit: ${limit}`);
  filters.push(`isAMSOffer: ${isAMSOffer ? "true" : "false"}`);

  if (typeof productCatId === "number") {
    filters.push(`productCatId: ${productCatId}`);
  }

  const filterString = filters.join(", ");

  const query = `
    {
      productOfferV2(${filterString}) {
        nodes {
          itemId
          commissionRate
          sellerCommissionRate
          shopeeCommissionRate
          commission
          priceMin
          priceMax
          priceDiscountRate
          imageUrl
          offerLink
          productName
          shopId
          shopName
          shopType
          periodStartTime
          periodEndTime
        }
        pageInfo {
          page
          limit
          hasNextPage
        }
      }
    }
  `;

  return query;
}

/**
 * Busca UMA oferta da Shopee usando productOfferV2, semelhante ao que
 * seu workflow do n8n faz hoje (limit: 1).
 */
export async function fetchSingleProductOffer(
  params: FetchSingleOfferParams
): Promise<ProductOfferV2Node | null> {
  const { appId, secret } = params;

  const query = buildProductOfferV2Query(params);

  const data = await shopeeGraphQLRequest<ProductOfferV2Connection>(
    query,
    appId,
    secret
  );

  const nodes = data.productOfferV2?.nodes ?? [];

  if (!nodes.length) {
    return null;
  }

  // retornamos sempre a primeira oferta
  return nodes[0];
}