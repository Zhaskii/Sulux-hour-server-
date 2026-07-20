import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_newsletter_status" AS ENUM('active', 'unsubscribed');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_newsletter_source" AS ENUM('footer', 'other');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "newsletter" (
      "id" serial PRIMARY KEY NOT NULL,
      "email" varchar NOT NULL,
      "status" "enum_newsletter_status" DEFAULT 'active' NOT NULL,
      "source" "enum_newsletter_source" DEFAULT 'footer',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_email_idx" ON "newsletter" USING btree ("email");
    CREATE INDEX IF NOT EXISTS "newsletter_updated_at_idx" ON "newsletter" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "newsletter_created_at_idx" ON "newsletter" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "newsletter_id" integer;

    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_newsletter_fk";
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_newsletter_fk"
      FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletter"("id") ON DELETE cascade ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_newsletter_id_idx" ON "payload_locked_documents_rels" USING btree ("newsletter_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_newsletter_fk";

    DROP INDEX IF EXISTS "payload_locked_documents_rels_newsletter_id_idx";
    DROP INDEX IF EXISTS "newsletter_created_at_idx";
    DROP INDEX IF EXISTS "newsletter_updated_at_idx";
    DROP INDEX IF EXISTS "newsletter_email_idx";

    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "newsletter_id";

    DROP TABLE IF EXISTS "newsletter" CASCADE;

    DROP TYPE IF EXISTS "public"."enum_newsletter_source";
    DROP TYPE IF EXISTS "public"."enum_newsletter_status";
  `)
}
