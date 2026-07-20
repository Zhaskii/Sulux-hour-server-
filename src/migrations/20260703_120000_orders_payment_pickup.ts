import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_orders_payment_method" ADD VALUE IF NOT EXISTS 'pickup';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // PostgreSQL does not support removing individual enum values safely.
}
