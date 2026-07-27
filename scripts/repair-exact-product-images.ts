import 'dotenv/config'

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import pg from 'pg'
import sharp from 'sharp'

type Repair = {
  mediaId: number
  productId: number
  productName: string
  filename: string
  sourcePage: string
  sourceImage: string
}

const repairs: Repair[] = [
  {
    mediaId: 977,
    productId: 680,
    productName: 'Traser: H3 P68 Pathfinder Automatik Herrenuhr 46mm 10ATM 109034',
    filename: 'product-traser-p68-pathfinder-109034.webp',
    sourcePage:
      'https://www.idealo.de/preisvergleich/OffersOfProduct/201876272_-p68-pathfinder-gmt-109034-traser-h3.html',
    sourceImage:
      'https://cdn.idealo.com/folder/Product/201876/2/201876272/s1_produktbild_max_7/traser-h3-p68-pathfinder-gmt-109034.jpg',
  },
  {
    mediaId: 999,
    productId: 702,
    productName: "Tissot Women's T-Classic Quartz Watch T24311141",
    filename: 'product-tissot-t24311141.webp',
    sourcePage: 'https://www.baoanhwatch.com/dong-ho-nu-tissot-t24311141',
    sourceImage: 'https://www.baoanhwatch.com/upload/images/2025/10/T24311141-1.jpg',
  },
  {
    mediaId: 1001,
    productId: 704,
    productName: 'Tissot Fun Pocket T84.1.481.42',
    filename: 'product-tissot-t84-1-481-42.webp',
    sourcePage: 'https://www.xmaibu.com/goods/7003744',
    // The retailer's original file has expired; this is the search index's cached
    // copy of that exact-reference image.
    sourceImage: 'https://tse3.mm.bing.net/th/id/OIP.xA0cz3Ghbl-fc-LZAPBD_AHaHa?r=0&pid=Api',
  },
  {
    mediaId: 1004,
    productId: 707,
    productName: 'Tissot Odaci-T Quartz Silver Dial Ladies Watch T020.309.16.031.01',
    filename: 'product-tissot-t020-309-16-031-01.webp',
    sourcePage: 'https://watchbase.com/tissot/odaci-t/t0203091603101',
    sourceImage: 'https://cdn.watchbase.com/watch/lg/tissot/t-trend/t0203091603101-77.jpg',
  },
  {
    mediaId: 1005,
    productId: 708,
    productName: 'Tissot T-Lady T03.1.085.80',
    filename: 'product-tissot-t03-1-085-80.webp',
    sourcePage:
      'https://www.jomashop.com/tissot-t-lady-flower-quartz-blue-mother-of-pearl-dial-ladies-watch-t03-1-085-80.html',
    sourceImage:
      'https://cdn2.jomashop.com/media/catalog/product/t/i/tissot-tlady-flower-quartz-blue-mother-of-pearl-dial-ladies-watch-t03108580-t03108580.jpg',
  },
  {
    mediaId: 1009,
    productId: 712,
    productName: 'Tissot PR 100 Chronograph T049.417.11.037.00',
    filename: 'product-tissot-t049-417-11-037-00.webp',
    sourcePage:
      'https://donghohaitrieu.com/san-pham/tissot-t049-417-11-037-00-nam-kinh-sapphire-quartz-pin-day-kim-loai',
    sourceImage:
      'https://image.donghohaitrieu.com/wp-content/uploads/2023/09/177_T049.417.11.037.00.jpg',
  },
  {
    mediaId: 1011,
    productId: 714,
    productName: 'Tissot Touch Collection T001.520.47.361.00',
    filename: 'product-tissot-t001-520-47-361-00.webp',
    sourcePage: 'https://www.watchmaxx.com/tissot-watch-t001-520-47-361-00',
    sourceImage:
      'https://res.cloudinary.com/dp9dnliwc/image/upload/w_650,h_800,c_pad/q_auto:best/f_auto/wmmedia/watch_images/large/t0015204736100.jpg',
  },
  {
    mediaId: 1012,
    productId: 715,
    productName: "Tissot T-Trend Couturier Men's Watch T035.614.36.051.00",
    filename: 'product-tissot-t035-614-36-051-00.webp',
    sourcePage:
      'https://www.zegarek.net/zegarki/tissot/zegarek_tissot_t035.614.36.051.00.html',
    sourceImage: 'https://www.zegarek.net/imageslib/T035.614.36.051.00_5m.jpg',
  },
  {
    mediaId: 1033,
    productId: 736,
    productName: 'Tissot T65.7.188.31',
    filename: 'product-tissot-t65-7-188-31.webp',
    sourcePage: 'https://www.watchmaxx.com/tissot-watch-t65-7-188-31',
    sourceImage:
      'https://res.cloudinary.com/dp9dnliwc/image/upload/c_pad,h_900,w_900/f_auto/q_auto/wmmedia/watch_images/large/t65718831.jpg',
  },
]

const apply = process.argv.includes('--apply')

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

async function prepareImage(repair: Repair) {
  const response = await fetch(repair.sourceImage, {
    headers: {
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; SuluxCatalogRepair/1.0)',
    },
  })

  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok || !contentType.toLowerCase().startsWith('image/')) {
    throw new Error(
      `Could not download ${repair.productName}: ${response.status} ${contentType}`,
    )
  }

  const original = Buffer.from(await response.arrayBuffer())
  if (original.byteLength < 10_000) {
    throw new Error(`Downloaded image is unexpectedly small for ${repair.productName}`)
  }

  const converted = await sharp(original)
    .rotate()
    .resize({
      width: 1200,
      height: 1200,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 90, effort: 5 })
    .toBuffer({ resolveWithObject: true })

  return {
    body: converted.data,
    height: converted.info.height,
    width: converted.info.width,
  }
}

async function main() {
  const databaseURL = requiredEnv('DATABASE_URL')
  const endpoint = requiredEnv('MINIO_ENDPOINT').replace(/\/+$/, '')
  const bucket = requiredEnv('MINIO_BUCKET')

  const database = new pg.Client({ connectionString: databaseURL })
  await database.connect()

  try {
    const prepared = []

    for (const repair of repairs) {
      const existing = await database.query<{
        media_id: number
        name: string
      }>(
        `SELECT p.name, p.featured_image_id AS media_id
         FROM products p
         WHERE p.id = $1`,
        [repair.productId],
      )

      const row = existing.rows[0]
      if (
        !row ||
        row.name !== repair.productName ||
        Number(row.media_id) !== repair.mediaId
      ) {
        throw new Error(
          `Catalog record changed for product ${repair.productId}; refusing to update it`,
        )
      }

      const image = await prepareImage(repair)
      prepared.push({ image, repair })
      console.log(
        `[verified] ${repair.productName} (${image.width}x${image.height}, ${image.body.byteLength} bytes)`,
      )
    }

    if (!apply) {
      console.log(`Dry run complete: ${prepared.length} exact-reference images are ready`)
      console.log('Run again with --apply to upload them and update the media records')
      return
    }

    const storage = new S3Client({
      endpoint,
      region: requiredEnv('MINIO_REGION'),
      credentials: {
        accessKeyId: requiredEnv('MINIO_ACCESS_KEY_ID'),
        secretAccessKey: requiredEnv('MINIO_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: true,
    })

    for (const { image, repair } of prepared) {
      await storage.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: repair.filename,
          Body: image.body,
          CacheControl: 'public, max-age=31536000, immutable',
          ContentType: 'image/webp',
          Metadata: {
            'source-page': repair.sourcePage,
          },
        }),
      )
      console.log(`[uploaded] ${repair.filename}`)
    }

    await database.query('BEGIN')
    try {
      for (const { image, repair } of prepared) {
        const publicURL = `${endpoint}/${bucket}/${repair.filename}`
        const updated = await database.query(
          `UPDATE media
           SET alt = $1,
               folder = 'products',
               url = $2,
               thumbnail_u_r_l = NULL,
               filename = $3,
               mime_type = 'image/webp',
               filesize = $4,
               width = $5,
               height = $6,
               updated_at = NOW()
           WHERE id = $7`,
          [
            repair.productName,
            publicURL,
            repair.filename,
            image.body.byteLength,
            image.width,
            image.height,
            repair.mediaId,
          ],
        )

        if (updated.rowCount !== 1) {
          throw new Error(`Media ${repair.mediaId} was not updated`)
        }
      }
      await database.query('COMMIT')
    } catch (error) {
      await database.query('ROLLBACK')
      throw error
    }

    console.log(`Applied ${prepared.length} exact-reference product image repairs`)
  } finally {
    await database.end()
  }
}

await main()
