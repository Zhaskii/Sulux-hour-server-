import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

async function archiveZeroStockProducts() {
  await client.connect();
  
  try {
    console.log('Starting to archive products with zero stock or zero SKU...');
    
    // Update all products with stock_quantity = 0 OR sku = '0'/'o' and status = 'active' to 'archived'
    const result = await client.query(
      `UPDATE products 
       SET status = 'archived', updated_at = NOW() 
       WHERE (stock_quantity = 0 OR sku = '0' OR LOWER(TRIM(sku)) = 'o') AND status = 'active'`
    );

    console.log(`\u2705 Archived ${result.rowCount} products with zero stock or zero SKU`);
    
  } catch (error) {
    console.error('\u274C Error:', error);
  } finally {
    await client.end();
  }
}

archiveZeroStockProducts();
