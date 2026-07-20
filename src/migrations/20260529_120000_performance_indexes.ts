import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Speed up storefront filters: active products, brand/category slugs, category relations.
 * Slug columns already have unique indexes from initial migration.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "products_status_idx"
      ON "products" USING btree ("status");

    CREATE INDEX IF NOT EXISTS "products_status_brand_idx"
      ON "products" USING btree ("status", "brand_id");

    CREATE INDEX IF NOT EXISTS "products_rels_categories_parent_idx"
      ON "products_rels" USING btree ("categories_id", "parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "products_rels_categories_parent_idx";
    DROP INDEX IF EXISTS "products_status_brand_idx";
    DROP INDEX IF EXISTS "products_status_idx";
  `)
}
