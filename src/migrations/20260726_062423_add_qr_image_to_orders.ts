import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_orders_payment_method" ADD VALUE 'qr';
  ALTER TABLE "orders" ADD COLUMN "payment_details_qr_image_id" integer;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_details_qr_image_id_media_id_fk" FOREIGN KEY ("payment_details_qr_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "orders_payment_details_payment_details_qr_image_idx" ON "orders" USING btree ("payment_details_qr_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" DROP CONSTRAINT "orders_payment_details_qr_image_id_media_id_fk";
  
  ALTER TABLE "orders" ALTER COLUMN "payment_method" SET DATA TYPE text;
  DROP TYPE "public"."enum_orders_payment_method";
  CREATE TYPE "public"."enum_orders_payment_method" AS ENUM('cod', 'pickup', 'online');
  ALTER TABLE "orders" ALTER COLUMN "payment_method" SET DATA TYPE "public"."enum_orders_payment_method" USING "payment_method"::"public"."enum_orders_payment_method";
  DROP INDEX "orders_payment_details_payment_details_qr_image_idx";
  ALTER TABLE "orders" DROP COLUMN "payment_details_qr_image_id";`)
}
