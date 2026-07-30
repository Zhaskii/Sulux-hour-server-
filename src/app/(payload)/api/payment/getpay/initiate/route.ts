import config from '@payload-config'
import { getPayload } from 'payload'
import { getStorefrontURL } from '@/utilities/urls'

const COUNTRY_MAP_3_LETTER: Record<string, string> = {
  NP: 'NPL',
  IN: 'IND',
  CN: 'CHN',
  US: 'USA',
  GB: 'GBR',
  AE: 'ARE',
  AU: 'AUS',
  CA: 'CAN',
  DE: 'DEU',
  FR: 'FRA',
  JP: 'JPN',
  SG: 'SGP',
  TH: 'THA',
  MY: 'MYS',
  QA: 'QAT',
  SA: 'SAU',
  HK: 'HKG',
  CH: 'CHE',
}

function get3LetterCountryCode(code: string | undefined | null): string {
  const normalized = String(code || '').toUpperCase().trim()
  return COUNTRY_MAP_3_LETTER[normalized] || 'NPL'
}

type InitiateBody = {
  orderNumber?: unknown
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InitiateBody
    const orderNumber = typeof body.orderNumber === 'string' ? body.orderNumber.trim() : ''

    if (!orderNumber) {
      return Response.json({ message: 'Order number is required.' }, { status: 400 })
    }

    const papInfo = process.env.GETPAY_PAPINFO
    const oprKey = process.env.GETPAY_OPRKEY
    const baseUrl = process.env.GETPAY_BASE_URL
    const bundleUrl = process.env.GETPAY_TEST_BUNDLE || 'https://minio-getpay.nchl.com.np/getpay-cdn/webcheckout/v5/bundle.js'

    if (!papInfo || !oprKey || !baseUrl || !bundleUrl) {
      return Response.json(
        { message: 'GetPay credentials are not configured on the server.' },
        { status: 500 },
      )
    }

    const payload = await getPayload({ config })

    const ordersRes = await payload.find({
      collection: 'orders',
      where: {
        orderNumber: { equals: orderNumber },
      },
      depth: 0,
      overrideAccess: true,
    })

    const order = ordersRes.docs[0]
    if (!order) {
      return Response.json({ message: 'Order not found.' }, { status: 404 })
    }

    if (order.paymentMethod !== 'online') {
      return Response.json({ message: 'Order payment method is not online payment.' }, { status: 400 })
    }

    if (order.status !== 'pending_payment') {
      if (order.status === 'paid') {
        return Response.json({
          alreadyPaid: true,
          message: 'Order is already paid.',
        })
      }
      return Response.json(
        { message: `Order status is '${order.status}'. Payment can only be initiated for pending orders.` },
        { status: 400 },
      )
    }

    const storefrontURL = getStorefrontURL()

    // Generate dynamic orderInformationUI HTML for GetPay iframe left column display
    const itemsHtml = (order.lineItems as any[])?.map((item: any) => {
      const lineTotalStr = item.lineTotal ? `Rs. ${item.lineTotal.toLocaleString()}` : ''
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px dashed #e2ded8; padding-bottom: 8px;">
          <div>
            <div style="font-size: 13px; font-weight: 500; color: #0d0d0b;">${item.productName}</div>
            <div style="font-size: 11px; color: #6b6860; margin-top: 2px;">Ref. ${item.productSku || ''} &times; ${item.quantity}</div>
          </div>
          <span style="font-size: 12px; font-weight: 600; color: #0d0d0b; font-family: monospace;">${lineTotalStr}</span>
        </div>
      `
    }).join('')

    const orderInformationUI = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0d0d0b; padding: 15px 5px;">
        <h3 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 600; margin-top: 0; margin-bottom: 20px; border-bottom: 1px solid #0d0d0b; padding-bottom: 10px;">
          Order Summary
        </h3>
        <div style="margin-bottom: 20px; font-size: 12px; color: #6b6860; line-height: 1.5;">
          <div><strong>Order Ref:</strong> ${order.orderNumber}</div>
        </div>
        <div style="margin-bottom: 20px;">
          ${itemsHtml}
        </div>
        ${order.discount && order.discount > 0 ? `
        <div style="display: flex; justify-content: space-between; font-size: 13px; color: #6b6860; margin-bottom: 8px;">
          <span>Subtotal</span>
          <span style="font-family: monospace;">Rs. ${order.subtotal?.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; color: #b91c1c; margin-bottom: 8px;">
          <span>Discount${order.couponCode ? ` (${order.couponCode})` : ''}</span>
          <span style="font-family: monospace;">-Rs. ${order.discount?.toLocaleString()}</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 600; border-top: 1px solid #0d0d0b; padding-top: 15px; margin-top: 15px;">
          <span>Total Amount</span>
          <span style="font-family: monospace; font-size: 15px;">Rs. ${order.total?.toLocaleString()}</span>
        </div>
      </div>
    `

    const browserBaseUrl = baseUrl.split('/v1/')[0]

    return Response.json({
      bundleUrl,
      options: {
        baseUrl,
        papInfo,
        oprKey,
        insKey: '',
        websiteDomain: process.env.GETPAY_WEBSITE_DOMAIN || 'http://localhost:3000',
        clientRequestId: order.orderNumber,
        price: order.total,
        currency: 'NPR',
        businessName: 'Sulux Centre',
        imageUrl: (process.env.GETPAY_WEBSITE_DOMAIN || '').includes('localhost')
          ? 'http://localhost:3000/logo.png'
          : 'https://www.suluxcentre.com/logo.png',
        allowBillingAddressFields: true,
        userInfo: {
          name: `${order.guestFirstName || ''} ${order.guestLastName || ''}`.trim() || 'John Doe',
          email: order.guestEmail || 'customer@example.com',
          state: order.shippingState || 'Bagmati',
          country: get3LetterCountryCode(order.shippingCountry),
          zipcode: order.shippingPostalCode || '44600',
          city: order.shippingCity || 'Kathmandu',
          address: order.shippingAddress || 'Chabahil',
        },
        prefill: {
          name: true,
          email: true,
          state: true,
          city: true,
          address: true,
          zipcode: true,
          country: true,
        },
        disableFields: {
          address: false,
          state: false,
        },
        themeColor: '#0d0d0b',
        orderInformationUI,
        callbackUrl: {
          successUrl: `${storefrontURL}/payment/getpay/success?orderNumber=${order.orderNumber}`,
          failUrl: `${storefrontURL}/payment/getpay/fail?orderNumber=${order.orderNumber}`,
        },
      },
      order: {
        orderNumber: order.orderNumber,
        total: order.total,
        subtotal: order.subtotal,
        discount: order.discount,
        shippingCost: order.shippingCost,
        lineItems: order.lineItems,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to initiate payment.'
    return Response.json({ message }, { status: 500 })
  }
}
