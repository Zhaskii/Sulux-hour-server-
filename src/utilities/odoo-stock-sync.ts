import pg from 'pg';

const DEFAULT_ODOO_API_URL = 'https://sulux.nexusgurus.com/reset?BrCode=WH&api_key=Huzxlr9VXlel6w';

export interface OdooProduct {
  sku?: string;
  barCode?: string;
  productName?: string;
  stockQuantity?: number | string;
}

export interface LocalProduct {
  id: number;
  name: string;
  sku: string;
  stock_quantity: string | number;
}

export interface StockChangeLog {
  id: number;
  name: string;
  barcode: string;
  oldStock: number;
  newStock: number;
}

export interface SyncStockOptions {
  dryRun?: boolean;
  odooUrl?: string;
  apiKey?: string;
}

export interface SyncStockResult {
  success: boolean;
  totalOdooItems: number;
  totalLocalProducts: number;
  matchedCount: number;
  updatedCount: number;
  unchangedCount: number;
  changes: StockChangeLog[];
  timestamp: string;
  error?: string;
}

export async function syncOdooStock(options: SyncStockOptions = {}): Promise<SyncStockResult> {
  const isDryRun = !!options.dryRun;
  const apiUrl = options.odooUrl || process.env.ODOO_API_URL || DEFAULT_ODOO_API_URL;
  const apiKey = options.apiKey || process.env.ODOO_API_KEY || 'Huzxlr9VXlel6w';

  try {
    // 1. Fetch live product catalog from Odoo ERP using GET method
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`Odoo API Error ${res.status}: ${res.statusText}`);
    }

    const responseData = await res.json();
    const odooProducts: OdooProduct[] = responseData.data || [];

    // Map Odoo stock quantities by Barcode
    const odooStockMap = new Map<string, { stock: number; productName: string }>();
    odooProducts.forEach((item) => {
      if (item.barCode) {
        const barcodeStr = String(item.barCode).trim();
        const qty = parseFloat(String(item.stockQuantity ?? 0));
        odooStockMap.set(barcodeStr, { stock: isNaN(qty) ? 0 : qty, productName: item.productName || '' });
      }
    });

    // 2. Connect to local PostgreSQL database
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL
    });
    await client.connect();

    try {
      const dbRes = await client.query<LocalProduct>(
        'SELECT id, name, sku, stock_quantity FROM products'
      );
      const localProducts = dbRes.rows;

      let matchedCount = 0;
      let updatedCount = 0;
      let unchangedCount = 0;
      const changesLog: StockChangeLog[] = [];

      for (const prod of localProducts) {
        const barcode = String(prod.sku || '').trim();
        if (!barcode || !odooStockMap.has(barcode)) {
          continue;
        }

        matchedCount++;
        const odooData = odooStockMap.get(barcode)!;
        const currentStock = parseFloat(String(prod.stock_quantity ?? 0));
        const newStock = odooData.stock;

        if (currentStock !== newStock) {
          changesLog.push({
            id: prod.id,
            name: prod.name,
            barcode,
            oldStock: currentStock,
            newStock
          });

          if (!isDryRun) {
            await client.query(
              'UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2',
              [newStock, prod.id]
            );
          }
          updatedCount++;
        } else {
          unchangedCount++;
        }
      }

      return {
        success: true,
        totalOdooItems: odooProducts.length,
        totalLocalProducts: localProducts.length,
        matchedCount,
        updatedCount,
        unchangedCount,
        changes: changesLog,
        timestamp: new Date().toISOString()
      };
    } finally {
      await client.end();
    }
  } catch (err: any) {
    return {
      success: false,
      totalOdooItems: 0,
      totalLocalProducts: 0,
      matchedCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
      changes: [],
      timestamp: new Date().toISOString(),
      error: err?.message || String(err)
    };
  }
}
