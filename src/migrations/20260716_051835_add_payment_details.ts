import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" ADD COLUMN "payment_details_gateway" varchar;
  ALTER TABLE "orders" ADD COLUMN "payment_details_status" varchar;
  ALTER TABLE "orders" ADD COLUMN "payment_details_transaction_id" varchar;
  ALTER TABLE "orders" ADD COLUMN "payment_details_token_id" varchar;
  ALTER TABLE "orders" ADD COLUMN "payment_details_amount" numeric;
  ALTER TABLE "orders" ADD COLUMN "payment_details_bank_remarks" varchar;
  ALTER TABLE "orders" ADD COLUMN "payment_details_verified_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" DROP COLUMN "payment_details_gateway";
  ALTER TABLE "orders" DROP COLUMN "payment_details_status";
  ALTER TABLE "orders" DROP COLUMN "payment_details_transaction_id";
  ALTER TABLE "orders" DROP COLUMN "payment_details_token_id";
  ALTER TABLE "orders" DROP COLUMN "payment_details_amount";
  ALTER TABLE "orders" DROP COLUMN "payment_details_bank_remarks";
  ALTER TABLE "orders" DROP COLUMN "payment_details_verified_at";`)
}
