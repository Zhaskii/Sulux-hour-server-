import 'dotenv/config';
import { syncOdooStock } from '../src/utilities/odoo-stock-sync.js';

const intervalMinutes = parseInt(process.env.SYNC_INTERVAL_MINUTES || '15', 10);
const intervalMs = intervalMinutes * 60 * 1000;

console.log(`=================================================`);
console.log(`⏰ Automated Odoo Stock Sync Cron Scheduler`);
console.log(`Interval: Every ${intervalMinutes} minutes`);
console.log(`Method: GET https://sulux.nexusgurus.com/reset`);
console.log(`=================================================\n`);

async function runScheduledSync() {
  console.log(`\n[${new Date().toISOString()}] 🔄 Executing scheduled stock sync from Odoo ERP...`);
  const result = await syncOdooStock({ dryRun: false });

  if (result.success) {
    console.log(`✅ Sync Completed: Matched=${result.matchedCount}, Updated=${result.updatedCount}, In-Sync=${result.unchangedCount}`);
    if (result.updatedCount > 0) {
      console.log(`📝 Updated ${result.updatedCount} stock quantities:`);
      result.changes.forEach((c) => {
        console.log(`   - ID ${c.id} (${c.name}): Barcode ${c.barcode} -> Stock changed from ${c.oldStock} to ${c.newStock}`);
      });
    }
  } else {
    console.error(`❌ Sync Failed: ${result.error}`);
  }
}

// Execute immediately on startup
runScheduledSync();

// Schedule recurring executions
setInterval(runScheduledSync, intervalMs);
