import 'dotenv/config';
import { syncOdooStock } from '../src/utilities/odoo-stock-sync.js';

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log(`=================================================`);
  console.log(`📦 Odoo Stock Quantity Sync CLI Script`);
  console.log(`Direction: Odoo ERP (GET) ---> Local Database`);
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (No DB updates)' : '🚀 LIVE EXECUTION'}`);
  console.log(`=================================================\n`);

  console.log('1. Starting stock synchronization...');
  const result = await syncOdooStock({ dryRun: isDryRun });

  if (!result.success) {
    console.error('❌ Stock sync failed:', result.error);
    process.exit(1);
  }

  console.log(`=================================================`);
  console.log(`📊 SYNCHRONIZATION RESULTS SUMMARY`);
  console.log(`=================================================`);
  console.log(`Timestamp                 : ${result.timestamp}`);
  console.log(`Total Odoo Items Returned : ${result.totalOdooItems}`);
  console.log(`Total Local DB Products   : ${result.totalLocalProducts}`);
  console.log(`Matched Products          : ${result.matchedCount}`);
  console.log(`Stock Quantities Updated  : ${result.updatedCount}`);
  console.log(`Already In-Sync           : ${result.unchangedCount}`);
  console.log(`=================================================\n`);

  if (result.changes.length > 0) {
    console.log(`📝 Stock Quantity Changes (${result.changes.length} products updated from Odoo into Local DB):`);
    console.table(
      result.changes.map((c) => ({
        ID: c.id,
        Name: c.name.length > 35 ? c.name.substring(0, 32) + '...' : c.name,
        Barcode: c.barcode,
        'Old DB Stock': c.oldStock,
        'New DB Stock (from Odoo)': c.newStock
      }))
    );
  } else {
    console.log('✨ All matched products in local database are already in sync with Odoo!');
  }

  if (isDryRun) {
    console.log(`\n🔍 DRY RUN COMPLETE: No database modifications were committed.`);
  } else {
    console.log(`\n🚀 LIVE UPDATE COMPLETE: Local database updated successfully.`);
  }
}

main();
