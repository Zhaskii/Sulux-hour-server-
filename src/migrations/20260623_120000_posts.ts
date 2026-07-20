import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_media_folder" ADD VALUE IF NOT EXISTS 'blog';

    DO $$ BEGIN
      CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published', 'archived');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_posts_meta_robots" AS ENUM('index,follow', 'noindex,nofollow', 'noindex,follow');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_products_meta_robots" AS ENUM('index,follow', 'noindex,nofollow', 'noindex,follow');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "posts_tags" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "tag" varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "posts_gallery" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "image_id" integer NOT NULL,
      "caption" varchar
    );

    CREATE TABLE IF NOT EXISTS "posts" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "status" "enum_posts_status" DEFAULT 'draft' NOT NULL,
      "excerpt" varchar NOT NULL,
      "content" jsonb NOT NULL,
      "author_id" integer,
      "published_at" timestamp(3) with time zone,
      "reading_time_minutes" numeric,
      "is_featured" boolean DEFAULT false,
      "featured_image_id" integer,
      "meta_title" varchar,
      "meta_description" varchar,
      "meta_image_id" integer,
      "meta_keywords" varchar,
      "meta_canonical_u_r_l" varchar,
      "meta_robots" "enum_posts_meta_robots" DEFAULT 'index,follow',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "meta_keywords" varchar,
      ADD COLUMN IF NOT EXISTS "meta_canonical_u_r_l" varchar,
      ADD COLUMN IF NOT EXISTS "meta_robots" "enum_products_meta_robots" DEFAULT 'index,follow';

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "posts_id" integer;

    ALTER TABLE "posts_tags" DROP CONSTRAINT IF EXISTS "posts_tags_parent_id_fk";
    ALTER TABLE "posts_tags" ADD CONSTRAINT "posts_tags_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "posts_gallery" DROP CONSTRAINT IF EXISTS "posts_gallery_image_id_media_id_fk";
    ALTER TABLE "posts_gallery" ADD CONSTRAINT "posts_gallery_image_id_media_id_fk"
      FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "posts_gallery" DROP CONSTRAINT IF EXISTS "posts_gallery_parent_id_fk";
    ALTER TABLE "posts_gallery" ADD CONSTRAINT "posts_gallery_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_author_id_users_id_fk";
    ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk"
      FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_featured_image_id_media_id_fk";
    ALTER TABLE "posts" ADD CONSTRAINT "posts_featured_image_id_media_id_fk"
      FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_meta_image_id_media_id_fk";
    ALTER TABLE "posts" ADD CONSTRAINT "posts_meta_image_id_media_id_fk"
      FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_posts_fk";
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk"
      FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;

    CREATE UNIQUE INDEX IF NOT EXISTS "posts_slug_idx" ON "posts" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "posts_tags_order_idx" ON "posts_tags" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "posts_tags_parent_id_idx" ON "posts_tags" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "posts_gallery_order_idx" ON "posts_gallery" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "posts_gallery_parent_id_idx" ON "posts_gallery" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "posts_gallery_image_idx" ON "posts_gallery" USING btree ("image_id");
    CREATE INDEX IF NOT EXISTS "posts_author_idx" ON "posts" USING btree ("author_id");
    CREATE INDEX IF NOT EXISTS "posts_featured_image_idx" ON "posts" USING btree ("featured_image_id");
    CREATE INDEX IF NOT EXISTS "posts_meta_meta_image_idx" ON "posts" USING btree ("meta_image_id");
    CREATE INDEX IF NOT EXISTS "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "posts_created_at_idx" ON "posts" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "posts_status_published_at_idx" ON "posts" USING btree ("status", "published_at");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_posts_fk";
    ALTER TABLE "posts_gallery" DROP CONSTRAINT IF EXISTS "posts_gallery_parent_id_fk";
    ALTER TABLE "posts_gallery" DROP CONSTRAINT IF EXISTS "posts_gallery_image_id_media_id_fk";
    ALTER TABLE "posts_tags" DROP CONSTRAINT IF EXISTS "posts_tags_parent_id_fk";
    ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_meta_image_id_media_id_fk";
    ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_featured_image_id_media_id_fk";
    ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_author_id_users_id_fk";

    DROP INDEX IF EXISTS "payload_locked_documents_rels_posts_id_idx";
    DROP INDEX IF EXISTS "posts_status_published_at_idx";
    DROP INDEX IF EXISTS "posts_created_at_idx";
    DROP INDEX IF EXISTS "posts_updated_at_idx";
    DROP INDEX IF EXISTS "posts_meta_meta_image_idx";
    DROP INDEX IF EXISTS "posts_featured_image_idx";
    DROP INDEX IF EXISTS "posts_author_idx";
    DROP INDEX IF EXISTS "posts_gallery_image_idx";
    DROP INDEX IF EXISTS "posts_gallery_parent_id_idx";
    DROP INDEX IF EXISTS "posts_gallery_order_idx";
    DROP INDEX IF EXISTS "posts_tags_parent_id_idx";
    DROP INDEX IF EXISTS "posts_tags_order_idx";
    DROP INDEX IF EXISTS "posts_slug_idx";

    DROP TABLE IF EXISTS "posts_gallery" CASCADE;
    DROP TABLE IF EXISTS "posts_tags" CASCADE;
    DROP TABLE IF EXISTS "posts" CASCADE;

    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "posts_id";

    ALTER TABLE "products"
      DROP COLUMN IF EXISTS "meta_robots",
      DROP COLUMN IF EXISTS "meta_canonical_u_r_l",
      DROP COLUMN IF EXISTS "meta_keywords";

    DROP TYPE IF EXISTS "public"."enum_posts_meta_robots";
    DROP TYPE IF EXISTS "public"."enum_posts_status";
  `)
}
