import { shopeeGraphQLRequest } from "./shopee.client";
import type { ProductOfferV2Connection, ProductOfferV2Node } from "./shopee.types";

export type FetchOffersParams = {
  appId: string;
  secret: string;

  // parâmetros principais da query
  productCatId?: number; // ex: 101926
  listType?: number;     // ex: 0 (ALL)
  sortType?: number;     // ex: 5 (COMMISSION_DESC)
  isAMSOffer?: boolean;  // ex: true (somente ofertas com comissão do seller)
  limit?: number;        // padrão: 20
  page?: number;         // padrão: 1
};

/**
 * Monta a string da query GraphQL productOfferV2 de forma dinâmica
 * com base nos parâmetros informados.
 */
function buildProductOfferV2Query(params: FetchOffersParams): string {
  const {
    productCatId,
    listType = 0,
    sortType = 5,
    isAMSOffer = true,
    limit = 20,
    page = 1,
  } = params;

  const filters: string[] = [];

  filters.push(`listType: ${listType}`);
  filters.push(`sortType: ${sortType}`);
  filters.push(`limit: ${limit}`);
  filters.push(`page: ${page}`);
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
 * Busca uma lista de ofertas da Shopee usando productOfferV2.
 * Retorna { nodes, pageInfo }.
 */
export async function fetchProductOffers(
  params: FetchOffersParams
): Promise<{
  nodes: ProductOfferV2Node[];
  pageInfo: { page: number; limit: number; hasNextPage: boolean };
}> {
  const { appId, secret } = params;

  const query = buildProductOfferV2Query(params);

  const data = await shopeeGraphQLRequest<{ productOfferV2: ProductOfferV2Connection }>(
    query,
    appId,
    secret
  );

  const nodes = data?.productOfferV2?.nodes ?? [];
  const pageInfo = data?.productOfferV2?.pageInfo ?? {
    page: 1,
    limit: 20,
    hasNextPage: false,
  };

  return { nodes, pageInfo };
}