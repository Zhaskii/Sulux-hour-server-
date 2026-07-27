import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders_line_items"
      ALTER COLUMN "product_id" DROP NOT NULL;
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Deleted products leave null references in historical order snapshots.
  // Restoring NOT NULL would make those preserved orders invalid.
}
