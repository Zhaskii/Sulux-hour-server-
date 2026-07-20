import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "discount_percentage" numeric DEFAULT 0;
  `)

  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'price_percentage'
      ) THEN
        UPDATE "products"
        SET "discount_percentage" = CASE
          WHEN "price_percentage" < 0 THEN ABS("price_percentage")
          WHEN "price_percentage" > 0 AND "price_percentage" <= 100 THEN "price_percentage"
          ELSE COALESCE("discount_percentage", 0)
        END;

        ALTER TABLE "products" DROP COLUMN "price_percentage";
      END IF;
    END $$;
  `)

  await db.execute(sql`
    UPDATE "products"
    SET "discount_percentage" = COALESCE("discount_percentage", 0)
    WHERE "discount_percentage" IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "price_percentage" numeric DEFAULT 0;
  `)

  await db.execute(sql`
    UPDATE "products"
    SET "price_percentage" = -ABS(COALESCE("discount_percentage", 0))
    WHERE COALESCE("discount_percentage", 0) > 0;
  `)

  await db.execute(sql`
    ALTER TABLE "products"
      DROP COLUMN IF EXISTS "discount_percentage";
  `)
}
