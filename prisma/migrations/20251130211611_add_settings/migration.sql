-- CreateTable
CREATE TABLE "posted_products" (
    "item_id" BIGINT NOT NULL,
    "posted_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "posted_products_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);
