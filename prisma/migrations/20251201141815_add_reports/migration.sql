/*
  Warnings:

  - You are about to drop the `click_event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `execution_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `monitored_category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `posted_products` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `short_links` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `validated_report` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `validated_report_item` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "validated_report_item" DROP CONSTRAINT "validated_report_item_validated_report_id_fkey";

-- DropTable
DROP TABLE "click_event";

-- DropTable
DROP TABLE "execution_log";

-- DropTable
DROP TABLE "monitored_category";

-- DropTable
DROP TABLE "posted_products";

-- DropTable
DROP TABLE "short_links";

-- DropTable
DROP TABLE "user_settings";

-- DropTable
DROP TABLE "validated_report";

-- DropTable
DROP TABLE "validated_report_item";

-- CreateTable
CREATE TABLE "ConversionReport" (
    "id" SERIAL NOT NULL,
    "conversionId" BIGINT NOT NULL,
    "purchaseTime" INTEGER,
    "clickTime" INTEGER,
    "orderId" TEXT,
    "buyerType" TEXT,
    "attributionType" TEXT,
    "device" TEXT,
    "utmContent" TEXT,
    "referrer" TEXT,
    "totalCommission" DECIMAL(28,8),
    "sellerCommission" DECIMAL(28,8),
    "netCommission" DECIMAL(28,8),
    "fraudStatus" TEXT,
    "campaignType" TEXT,
    "campaignPartnerName" TEXT,
    "orders" JSONB,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversionReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversionOrder" (
    "id" SERIAL NOT NULL,
    "conversionId" BIGINT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderStatus" TEXT,
    "shopId" BIGINT,
    "shopName" TEXT,
    "shopType" TEXT,
    "completeTime" INTEGER,
    "items" JSONB,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversionOrderItem" (
    "id" SERIAL NOT NULL,
    "conversionOrderId" INTEGER NOT NULL,
    "itemId" BIGINT,
    "itemName" TEXT,
    "itemPrice" DECIMAL(28,8),
    "actualAmount" DECIMAL(28,8),
    "qty" INTEGER,
    "itemTotalCommission" DECIMAL(28,8),
    "itemSellerCommission" DECIMAL(28,8),
    "itemShopeeCommission" DECIMAL(28,8),
    "itemSellerCommissionRate" TEXT,
    "itemShopeeCommissionRate" TEXT,
    "modelId" BIGINT,
    "promotionId" TEXT,
    "globalCategoryLv1Name" TEXT,
    "globalCategoryLv2Name" TEXT,
    "globalCategoryLv3Name" TEXT,
    "fraudStatus" TEXT,
    "displayItemStatus" TEXT,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversionOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidatedReport" (
    "id" SERIAL NOT NULL,
    "conversionId" BIGINT NOT NULL,
    "purchaseTime" INTEGER,
    "clickTime" INTEGER,
    "totalCommission" DECIMAL(28,8),
    "sellerCommission" DECIMAL(28,8),
    "shopeeCommissionCapped" DECIMAL(28,8),
    "netCommission" DECIMAL(28,8),
    "buyerType" TEXT,
    "utmContent" TEXT,
    "device" TEXT,
    "referrer" TEXT,
    "orders" JSONB,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidatedReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConversionReport_conversionId_key" ON "ConversionReport"("conversionId");

-- CreateIndex
CREATE INDEX "ConversionOrder_conversionId_idx" ON "ConversionOrder"("conversionId");

-- CreateIndex
CREATE INDEX "ConversionOrderItem_conversionOrderId_idx" ON "ConversionOrderItem"("conversionOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ValidatedReport_conversionId_key" ON "ValidatedReport"("conversionId");
