import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "original_price" numeric,
      ADD COLUMN IF NOT EXISTS "price_percentage" numeric DEFAULT 0;
  `)

  await db.execute(sql`
    UPDATE "products"
    SET
      "original_price" = "price",
      "price_percentage" = COALESCE("price_percentage", 0)
    WHERE "original_price" IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products"
      DROP COLUMN IF EXISTS "original_price",
      DROP COLUMN IF EXISTS "price_percentage";
  `)
}
