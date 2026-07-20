import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_author_id_users_id_fk";
    DROP INDEX IF EXISTS "posts_author_idx";
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "author_id";
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "author" varchar DEFAULT 'Sulux Centre';
    UPDATE "posts" SET "author" = 'Sulux Centre' WHERE "author" IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "author";
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "author_id" integer;
    ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_author_id_users_id_fk";
    ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk"
      FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX IF NOT EXISTS "posts_author_idx" ON "posts" USING btree ("author_id");
  `)
}
