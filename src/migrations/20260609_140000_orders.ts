import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_orders_status" AS ENUM('pending_payment', 'paid', 'cancelled', 'fulfilled');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS "orders" (
      "id" serial PRIMARY KEY NOT NULL,
      "order_number" varchar NOT NULL,
      "status" "enum_orders_status" DEFAULT 'pending_payment' NOT NULL,
      "guest_email" varchar NOT NULL,
      "guest_first_name" varchar NOT NULL,
      "guest_last_name" varchar NOT NULL,
      "guest_phone" varchar NOT NULL,
      "shipping_address" varchar NOT NULL,
      "shipping_apartment" varchar,
      "shipping_city" varchar NOT NULL,
      "shipping_postal_code" varchar,
      "subtotal" numeric NOT NULL,
      "discount" numeric DEFAULT 0,
      "shipping_cost" numeric DEFAULT 0,
      "total" numeric NOT NULL,
      "coupon_code" varchar,
      "user_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "orders_line_items" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "product_id" integer NOT NULL,
      "product_name" varchar NOT NULL,
      "product_sku" varchar NOT NULL,
      "unit_price" numeric NOT NULL,
      "quantity" numeric NOT NULL,
      "line_total" numeric NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "orders_order_number_idx" ON "orders" USING btree ("order_number");
    CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "orders" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "orders_user_idx" ON "orders" USING btree ("user_id");

    ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_user_id_users_id_fk";
    ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
      ON DELETE set null ON UPDATE no action;

    ALTER TABLE "orders_line_items" DROP CONSTRAINT IF EXISTS "orders_line_items_parent_id_fk";
    ALTER TABLE "orders_line_items" ADD CONSTRAINT "orders_line_items_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id")
      ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "orders_line_items" DROP CONSTRAINT IF EXISTS "orders_line_items_product_id_products_id_fk";
    ALTER TABLE "orders_line_items" ADD CONSTRAINT "orders_line_items_product_id_products_id_fk"
      FOREIGN KEY ("product_id") REFERENCES "public"."products"("id")
      ON DELETE restrict ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "orders_line_items_order_idx" ON "orders_line_items" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "orders_line_items_parent_id_idx" ON "orders_line_items" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "orders_line_items_product_idx" ON "orders_line_items" USING btree ("product_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "orders_line_items" CASCADE;
    DROP TABLE IF EXISTS "orders" CASCADE;
    DROP TYPE IF EXISTS "enum_orders_status";
  `)
}
