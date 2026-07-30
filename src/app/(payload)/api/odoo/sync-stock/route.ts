import { NextRequest } from 'next/server';
import { syncOdooStock } from '../../../../../utilities/odoo-stock-sync';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret') || request.headers.get('x-sync-secret');
    const dryRunParam = searchParams.get('dryRun');
    const isDryRun = dryRunParam === 'true' || dryRunParam === '1';

    const requiredSecret = process.env.STOCK_SYNC_SECRET;
    if (requiredSecret && secret !== requiredSecret) {
      return Response.json(
        { error: 'Unauthorized. Invalid sync secret token.' },
        { status: 401 }
      );
    }

    console.log(`[API /api/odoo/sync-stock] Triggering stock sync (dryRun: ${isDryRun})...`);
    const result = await syncOdooStock({ dryRun: isDryRun });

    if (!result.success) {
      return Response.json(result, { status: 500 });
    }

    return Response.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[API /api/odoo/sync-stock] Error:', error);
    return Response.json(
      { success: false, error: error?.message || 'Failed to sync stock from Odoo ERP' },
      { status: 500 }
    );
  }
}
