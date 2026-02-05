-- Add international support for producers

-- Add new columns to producers table
ALTER TABLE "producers" ADD COLUMN "country_code" VARCHAR(2) NOT NULL DEFAULT 'BR';
ALTER TABLE "producers" ADD COLUMN "subject_type" VARCHAR(10) NOT NULL DEFAULT 'person';

-- Make cpf nullable (required only for BR via application logic)
ALTER TABLE "producers" ALTER COLUMN "cpf" DROP NOT NULL;

-- Create index for country_code
CREATE INDEX "producers_country_code_idx" ON "producers"("country_code");

-- Create producer_identifiers table
CREATE TABLE "producer_identifiers" (
    "id" TEXT NOT NULL,
    "producer_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "id_type" TEXT NOT NULL,
    "id_value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "producer_identifiers_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for producer + category
CREATE UNIQUE INDEX "producer_identifiers_producer_id_category_key" ON "producer_identifiers"("producer_id", "category");

-- Create index for id_type + id_value
CREATE INDEX "producer_identifiers_id_type_id_value_idx" ON "producer_identifiers"("id_type", "id_value");

-- Add foreign key
ALTER TABLE "producer_identifiers" ADD CONSTRAINT "producer_identifiers_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create agricultural_registries table
CREATE TABLE "agricultural_registries" (
    "id" TEXT NOT NULL,
    "producer_id" TEXT NOT NULL,
    "registry_type" TEXT NOT NULL,
    "registry_value" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agricultural_registries_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for producer
CREATE UNIQUE INDEX "agricultural_registries_producer_id_key" ON "agricultural_registries"("producer_id");

-- Add foreign key
ALTER TABLE "agricultural_registries" ADD CONSTRAINT "agricultural_registries_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add new columns to property_maps table
ALTER TABLE "property_maps" ADD COLUMN "name" TEXT;
ALTER TABLE "property_maps" ADD COLUMN "country_code" VARCHAR(2) NOT NULL DEFAULT 'BR';
ALTER TABLE "property_maps" ADD COLUMN "source_type" VARCHAR(10) NOT NULL DEFAULT 'car';
ALTER TABLE "property_maps" ADD COLUMN "area_ha" DOUBLE PRECISION;
ALTER TABLE "property_maps" ADD COLUMN "uploaded_file_url" TEXT;
ALTER TABLE "property_maps" ADD COLUMN "uploaded_file_type" VARCHAR(10);

-- Create index for country_code on property_maps
CREATE INDEX "property_maps_country_code_idx" ON "property_maps"("country_code");

-- Migrate existing Brazilian CPFs to producer_identifiers table
INSERT INTO "producer_identifiers" ("id", "producer_id", "category", "id_type", "id_value", "created_at")
SELECT 
    gen_random_uuid()::text,
    "id",
    'personal',
    'cpf',
    "cpf",
    CURRENT_TIMESTAMP
FROM "producers"
WHERE "cpf" IS NOT NULL;
