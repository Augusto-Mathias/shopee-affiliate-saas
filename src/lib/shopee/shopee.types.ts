// Tipos relacionados à query productOfferV2 (Get Product Offer List)

export type ProductOfferV2Node = {
  itemId: number;
  commissionRate: string;
  sellerCommissionRate: string;
  shopeeCommissionRate: string;
  commission: string;
  priceMax: string;
  priceMin: string;
  productCatIds: number[];
  ratingStar: string;
  priceDiscountRate: number;
  imageUrl: string;
  productName: string;
  shopId: number;
  shopName: string;
  shopType: number[];
  productLink: string;
  offerLink: string;
  periodStartTime: number;
  periodEndTime: number;
};

export type ProductOfferV2Connection = {
  productOfferV2: {
    nodes: ProductOfferV2Node[];
    pageInfo: {
      page: number;
      limit: number;
      hasNextPage: boolean;
    };
  };
};