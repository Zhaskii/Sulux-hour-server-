import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "compare_at_price" numeric;

    UPDATE "products"
    SET "compare_at_price" = "original_price"
    WHERE COALESCE("discount_percentage", 0) > 0
      AND COALESCE("original_price", 0) > 0
      AND COALESCE("compare_at_price", 0) <= 0;
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // This repairs a column from the base schema. Keep it on rollback so the
  // Products collection remains queryable in databases where it pre-existed.
}
