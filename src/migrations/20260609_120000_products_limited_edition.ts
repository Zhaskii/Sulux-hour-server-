import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "is_limited_edition" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "limited_edition_order" numeric DEFAULT 0;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products"
      DROP COLUMN IF EXISTS "is_limited_edition",
      DROP COLUMN IF EXISTS "limited_edition_order";
  `)
}
