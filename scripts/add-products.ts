import 'dotenv/config';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

interface ProductData {
  name: string;
  slug: string;
  price: number;
  original_price: number;
  sku: string;
  stock_quantity: number;
  brand: string;
  gender: string;
  movement: string;
  case_material: string;
  strap_material: string;
  dial_color: string;
  case_size_mm: number;
  water_resistance: string;
  warranty: string;
  short_description: string;
  status: string;
}

// Function to read CSV file manually
function readCSV(filePath: string): ProductData[] {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const results: ProductData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;

    const product: any = {};
    headers.forEach((header, index) => {
      product[header] = values[index];
    });

    // Convert to ProductData
    results.push({
      name: product.name,
      slug: product.slug,
      price: parseFloat(product.price),
      original_price: parseFloat(product.original_price),
      sku: product.sku,
      stock_quantity: parseInt(product.stock_quantity),
      brand: product.brand,
      gender: product.gender,
      movement: product.movement,
      case_material: product.case_material,
      strap_material: product.strap_material,
      dial_color: product.dial_color,
      case_size_mm: parseFloat(product.case_size_mm),
      water_resistance: product.water_resistance,
      warranty: product.warranty,
      short_description: product.short_description,
      status: product.status
    });
  }

  return results;
}

// Function to get or create brand
async function getOrCreateBrand(brandName: string): Promise<number> {
  // Check if brand exists by name
  const checkResult = await client.query(
    'SELECT id FROM brands WHERE name = $1',
    [brandName]
  );

  if (checkResult.rows.length > 0) {
    return checkResult.rows[0].id;
  }

  // Check if brand exists by slug (handle case where brand name differs but slug is same)
  const slug = brandName.toLowerCase().replace(/\s+/g, '-');
  const slugCheckResult = await client.query(
    'SELECT id FROM brands WHERE slug = $1',
    [slug]
  );

  if (slugCheckResult.rows.length > 0) {
    return slugCheckResult.rows[0].id;
  }

  // Create new brand
  try {
    const insertResult = await client.query(
      `INSERT INTO brands (name, slug, is_active, order_index, description, tagline, created_at, updated_at)
       VALUES ($1, $2, true, 0, $3, $4, NOW(), NOW())
       RETURNING id`,
      [brandName, slug, `${brandName} watches - Premium Swiss timepieces`, `Authentic ${brandName} Watches`]
    );
    return insertResult.rows[0].id;
  } catch (error: any) {
    // If duplicate slug error, try to find the existing brand
    if (error.code === '23505') {
      const fallbackResult = await client.query(
        'SELECT id FROM brands WHERE slug = $1',
        [slug]
      );
      if (fallbackResult.rows.length > 0) {
        return fallbackResult.rows[0].id;
      }
    }
    throw error;
  }
}

// Function to create placeholder media
async function createPlaceholderMedia(productName: string): Promise<number> {
  const filename = `${productName.toLowerCase().replace(/\s+/g, '-')}.jpg`;
  
  // Check if media already exists
  const checkResult = await client.query(
    'SELECT id FROM media WHERE filename = $1',
    [filename]
  );

  if (checkResult.rows.length > 0) {
    return checkResult.rows[0].id;
  }

  // Create a placeholder media entry
  try {
    const insertResult = await client.query(
      `INSERT INTO media (alt, filename, folder, url, thumbnail_u_r_l, mime_type, created_at, updated_at)
       VALUES ($1, $2, 'products', $3, $4, 'image/jpeg', NOW(), NOW())
       RETURNING id`,
      [productName, filename, `/images/products/${filename}`, `/images/products/thumbnails/${filename}`]
    );
    return insertResult.rows[0].id;
  } catch (error: any) {
    // If duplicate filename error, try to find the existing media
    if (error.code === '23505') {
      const fallbackResult = await client.query(
        'SELECT id FROM media WHERE filename = $1',
        [filename]
      );
      if (fallbackResult.rows.length > 0) {
        return fallbackResult.rows[0].id;
      }
    }
    throw error;
  }
}

// Main function to add products
async function addProducts() {
  await client.connect();
  
  try {
    console.log('Starting to add products...');
    
    // Read the processed CSV file
    const csvPath = path.join(process.cwd(), '../processed_products.csv');
    const products = readCSV(csvPath);
    console.log(`Read ${products.length} products from CSV`);

    let successCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        console.log(`Processing product: ${product.name}`);

        // Get or create brand
        const brandId = await getOrCreateBrand(product.brand);
        console.log(`Brand ID: ${brandId}`);

        // Create placeholder media for featured image
        const featuredImageId = await createPlaceholderMedia(product.name);
        console.log(`Featured Image ID: ${featuredImageId}`);

        // Map gender to enum
        const genderMap: Record<string, 'men' | 'women' | 'unisex'> = {
          'men': 'men',
          'women': 'women',
          'unisex': 'unisex'
        };
        const gender = genderMap[product.gender] || 'unisex';

        // Map movement to enum
        const movementMap: Record<string, 'automatic' | 'quartz' | 'mechanical' | 'smart'> = {
          'automatic': 'automatic',
          'quartz': 'quartz',
          'mechanical': 'mechanical',
          'smart': 'smart'
        };
        const movement = movementMap[product.movement] || 'quartz';

        // Map status to enum
        const statusMap: Record<string, 'draft' | 'active' | 'archived'> = {
          'draft': 'draft',
          'active': 'active',
          'archived': 'archived'
        };
        const status = statusMap[product.status] || 'draft';

        // Check if product already exists
        const existingProduct = await client.query(
          'SELECT id FROM products WHERE slug = $1 OR sku = $2',
          [product.slug, product.sku]
        );

        if (existingProduct.rows.length > 0) {
          console.log(`⏭️  Product already exists: ${product.name} (ID: ${existingProduct.rows[0].id})`);
          successCount++;
          continue;
        }

        // Create product using SQL
        const insertProductResult = await client.query(
          `INSERT INTO products (
            name, slug, status, brand_id, short_description, 
            original_price, price, sku, stock_quantity, featured_image_id,
            gender, movement, case_material, strap_material, dial_color,
            case_size_mm, water_resistance, warranty, is_featured,
            discount_percentage, is_limited_edition, showcase_order,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, false, 0, false, 0, NOW(), NOW()
          ) RETURNING id`,
          [
            product.name,
            product.slug,
            status,
            brandId,
            product.short_description,
            product.original_price,
            product.price,
            product.sku,
            product.stock_quantity,
            featuredImageId,
            gender,
            movement,
            product.case_material,
            product.strap_material,
            product.dial_color,
            product.case_size_mm,
            product.water_resistance,
            product.warranty
          ]
        );

        console.log(`✅ Created product: ${product.name} (ID: ${insertProductResult.rows[0].id})`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error processing product ${product.name}:`, error);
        errorCount++;
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Successfully added: ${successCount} products`);
    console.log(`Failed: ${errorCount} products`);
    console.log(`Total processed: ${products.length} products`);

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await client.end();
  }
}

// Run the script
addProducts();
