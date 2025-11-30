// Tipos relacionados à query productOfferV2 (Get Product Offer List)

export type ProductOfferV2Node = {
  itemId: string; // mudei de number para string, porque a API retorna como string
  commissionRate?: string | null;
  sellerCommissionRate?: string | null;
  shopeeCommissionRate?: string | null;
  commission?: string | null;
  priceMax?: string | null;
  priceMin?: string | null;
  productCatIds?: number[] | null;
  ratingStar?: string | null;
  priceDiscountRate?: number | null;
  imageUrl?: string | null;
  productName?: string | null;
  shopId?: number | null;
  shopName?: string | null;
  shopType?: number[] | null;
  productLink?: string | null;
  offerLink?: string | null;
  periodStartTime?: number | null;
  periodEndTime?: number | null;
};

export type ProductOfferV2PageInfo = {
  page: number;
  limit: number;
  hasNextPage: boolean;
};

export type ProductOfferV2Connection = {
  nodes: ProductOfferV2Node[];
  pageInfo: ProductOfferV2PageInfo;
};