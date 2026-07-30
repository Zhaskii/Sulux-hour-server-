import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" ALTER COLUMN "sku" DROP NOT NULL;
  ALTER TABLE "brands" ADD COLUMN "discount_percentage" numeric DEFAULT 0;
  ALTER TABLE "products" DROP COLUMN "compare_at_price";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" ALTER COLUMN "sku" SET NOT NULL;
  ALTER TABLE "products" ADD COLUMN "compare_at_price" numeric;
  ALTER TABLE "brands" DROP COLUMN "discount_percentage";`)
}
