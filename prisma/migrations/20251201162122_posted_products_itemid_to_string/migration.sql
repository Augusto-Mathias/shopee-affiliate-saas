-- CreateTable
CREATE TABLE "posted_products" (
    "id" SERIAL NOT NULL,
    "item_id" TEXT NOT NULL,
    "posted_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posted_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "posted_products_item_id_key" ON "posted_products"("item_id");
