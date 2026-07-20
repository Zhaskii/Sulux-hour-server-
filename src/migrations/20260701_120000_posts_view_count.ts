import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "view_count" numeric DEFAULT 0;

    UPDATE "posts"
    SET "view_count" = COALESCE("view_count", 0)
    WHERE "view_count" IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts"
      DROP COLUMN IF EXISTS "view_count";
  `)
}
