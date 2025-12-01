/*
  Warnings:

  - The primary key for the `posted_products` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `settings` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[item_id]` on the table `posted_products` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "posted_products" DROP CONSTRAINT "posted_products_pkey",
ADD COLUMN     "category_id" INTEGER,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "price" DECIMAL(12,2),
ADD COLUMN     "product_name" TEXT,
ALTER COLUMN "posted_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "posted_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "posted_products_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "settings";

-- CreateTable
CREATE TABLE "user_settings" (
    "id" SERIAL NOT NULL,
    "user_identifier" TEXT NOT NULL,
    "min_price" DECIMAL(12,2),
    "max_price" DECIMAL(12,2),
    "min_commission_rate" DECIMAL(5,2),
    "max_commission_rate" DECIMAL(5,2),
    "items_per_page" INTEGER DEFAULT 100,
    "max_pages_per_run" INTEGER DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "click_event" (
    "id" SERIAL NOT NULL,
    "item_id" BIGINT,
    "short_hash" TEXT,
    "referer" TEXT,
    "user_agent" TEXT,
    "ip" TEXT,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "click_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validated_report" (
    "id" SERIAL NOT NULL,
    "conversion_id" BIGINT NOT NULL,
    "purchase_time" TIMESTAMP(3) NOT NULL,
    "click_time" TIMESTAMP(3),
    "total_commission" DECIMAL(12,2),
    "buyer_type" TEXT,
    "utm_content" TEXT,
    "orders" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validated_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validated_report_item" (
    "id" SERIAL NOT NULL,
    "validated_report_id" INTEGER NOT NULL,
    "order_id" TEXT,
    "item_id" BIGINT NOT NULL,
    "item_name" TEXT,
    "item_price" DECIMAL(12,2),
    "qty" INTEGER,
    "item_total_commission" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validated_report_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_links" (
    "id" SERIAL NOT NULL,
    "hash" TEXT NOT NULL,
    "target_url" TEXT NOT NULL,
    "item_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "short_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitored_category" (
    "id" SERIAL NOT NULL,
    "cat_id" INTEGER NOT NULL,
    "name" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitored_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_log" (
    "id" SERIAL NOT NULL,
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "item_id" BIGINT,
    "total_requests" INTEGER NOT NULL,
    "details" JSONB,

    CONSTRAINT "execution_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_identifier_key" ON "user_settings"("user_identifier");

-- CreateIndex
CREATE UNIQUE INDEX "validated_report_conversion_id_key" ON "validated_report"("conversion_id");

-- CreateIndex
CREATE UNIQUE INDEX "short_links_hash_key" ON "short_links"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "monitored_category_cat_id_key" ON "monitored_category"("cat_id");

-- CreateIndex
CREATE UNIQUE INDEX "posted_products_item_id_key" ON "posted_products"("item_id");

-- AddForeignKey
ALTER TABLE "validated_report_item" ADD CONSTRAINT "validated_report_item_validated_report_id_fkey" FOREIGN KEY ("validated_report_id") REFERENCES "validated_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
