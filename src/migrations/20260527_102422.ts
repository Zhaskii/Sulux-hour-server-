import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Drops categories.parent_id (field removed from collection config).
 * Enum role values (editor/viewer) are skipped — already present from dev push.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_parent_id_categories_id_fk";
    DROP INDEX IF EXISTS "categories_parent_idx";
    ALTER TABLE "categories" DROP COLUMN IF EXISTS "parent_id";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "parent_id" integer;
    ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_parent_id_categories_id_fk";
    ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk"
      FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id")
      ON DELETE set null ON UPDATE no action;
    CREATE INDEX IF NOT EXISTS "categories_parent_idx" ON "categories" USING btree ("parent_id");
  `)
}
