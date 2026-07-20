import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_orders_status" ADD VALUE IF NOT EXISTS 'cod_pending';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "payment_method" varchar,
      ADD COLUMN IF NOT EXISTS "shipping_country" varchar,
      ADD COLUMN IF NOT EXISTS "shipping_state" varchar,
      ADD COLUMN IF NOT EXISTS "order_notes" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "payment_method",
      DROP COLUMN IF EXISTS "shipping_country",
      DROP COLUMN IF EXISTS "shipping_state",
      DROP COLUMN IF EXISTS "order_notes";
  `)
}
