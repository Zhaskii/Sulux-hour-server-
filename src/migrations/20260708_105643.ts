import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_reels_platform" AS ENUM('instagram');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_reels_status" AS ENUM('active', 'inactive');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "reels" (
      "id" serial PRIMARY KEY NOT NULL,
      "platform" "enum_reels_platform" NOT NULL,
      "url" varchar NOT NULL,
      "order" numeric DEFAULT 1,
      "status" "enum_reels_status" DEFAULT 'active',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "reels_updated_at_idx" ON "reels" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "reels_created_at_idx" ON "reels" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "reels_id" integer;

    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_reels_fk";
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reels_fk"
      FOREIGN KEY ("reels_id") REFERENCES "public"."reels"("id") ON DELETE cascade ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_reels_id_idx" ON "payload_locked_documents_rels" USING btree ("reels_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_reels_fk";

    DROP INDEX IF EXISTS "payload_locked_documents_rels_reels_id_idx";
    DROP INDEX IF EXISTS "reels_created_at_idx";
    DROP INDEX IF EXISTS "reels_updated_at_idx";

    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "reels_id";

    DROP TABLE IF EXISTS "reels" CASCADE;

    DROP TYPE IF EXISTS "public"."enum_reels_status";
    DROP TYPE IF EXISTS "public"."enum_reels_platform";
  `)
}
