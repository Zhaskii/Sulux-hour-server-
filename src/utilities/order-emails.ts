import type { Payload } from 'payload'

import type { Order } from '@/payload-types'

const COUNTRY_NAMES: Record<string, string> = {
  NP: 'Nepal',
  IN: 'India',
  CN: 'China',
  US: 'United States',
  GB: 'United Kingdom',
  AE: 'United Arab Emirates',
  AU: 'Australia',
  CA: 'Canada',
  DE: 'Germany',
  FR: 'France',
  JP: 'Japan',
  SG: 'Singapore',
  TH: 'Thailand',
  MY: 'Malaysia',
  QA: 'Qatar',
  SA: 'Saudi Arabia',
  HK: 'Hong Kong',
  CH: 'Switzerland',
}

function escapeHTML(value = ''): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatNPR(amount: number): string {
  return `NPR ${Math.round(amount).toLocaleString('en-NP')}`
}

function getCountryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] ?? code
}

function paymentLabel(method: Order['paymentMethod']): string {
  switch (method) {
    case 'cod':
      return 'Cash on Delivery'
    case 'pickup':
      return 'Pick from Store'
    case 'online':
      return 'Online Payment'
    case 'qr':
      return 'QR Scan Payment'
    default:
      return 'Online Payment'
  }
}

function buildLineItemsTable(order: Order): string {
  const rows = order.lineItems
    .map(
      (item) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #F0EDE8;font-size:13px;color:#0D0D0B;font-weight:500;line-height:1.4;">
            ${escapeHTML(item.productName)}
            <div style="font-size:11px;color:#8E8A80;font-weight:normal;margin-top:3px;font-family:monospace;">SKU: ${escapeHTML(item.productSku || '')}</div>
          </td>
          <td style="padding:14px 0;border-bottom:1px solid #F0EDE8;font-size:13px;color:#4A4842;text-align:center;font-family:monospace;">
            ${item.quantity}
          </td>
          <td style="padding:14px 0;border-bottom:1px solid #F0EDE8;font-size:13px;color:#0D0D0B;font-weight:600;text-align:right;font-family:monospace;">
            ${formatNPR(item.lineTotal)}
          </td>
        </tr>`,
    )
    .join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 16px;border-top:1px solid #0D0D0B;">
      <thead>
        <tr>
          <th align="left" style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8A7855;font-weight:600;padding:12px 0 8px;border-bottom:1px solid #0D0D0B;">Item</th>
          <th align="center" style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8A7855;font-weight:600;padding:12px 0 8px;border-bottom:1px solid #0D0D0B;">Qty</th>
          <th align="right" style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8A7855;font-weight:600;padding:12px 0 8px;border-bottom:1px solid #0D0D0B;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`
}

function buildTotalsBlock(order: Order): string {
  const discount = order.discount ?? 0
  const shipping = order.shippingCost ?? 0

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;margin-bottom:24px;background-color:#F8F7F4;padding:16px 20px;border:1px solid #E2DED8;">
      <tr>
        <td style="font-size:13px;color:#4A4842;padding:4px 0;">Subtotal</td>
        <td align="right" style="font-size:13px;color:#0D0D0B;padding:4px 0;font-family:monospace;">${formatNPR(order.subtotal)}</td>
      </tr>
      ${discount > 0 ? `
      <tr>
        <td style="font-size:13px;color:#B91C1C;padding:4px 0;">Coupon Discount${order.couponCode ? ` (${escapeHTML(order.couponCode)})` : ''}</td>
        <td align="right" style="font-size:13px;color:#B91C1C;padding:4px 0;font-family:monospace;">−${formatNPR(discount)}</td>
      </tr>` : ''}
      <tr>
        <td style="font-size:13px;color:#4A4842;padding:4px 0;">Insured Shipping</td>
        <td align="right" style="font-size:11px;color:#8A7855;padding:4px 0;text-transform:uppercase;font-weight:600;letter-spacing:0.05em;">${shipping > 0 ? formatNPR(shipping) : 'Complimentary'}</td>
      </tr>
      <tr>
        <td style="font-size:14px;color:#0D0D0B;padding:12px 0 0;font-weight:600;border-top:1px solid #E2DED8;margin-top:8px;">Final Settlement</td>
        <td align="right" style="font-size:15px;color:#0D0D0B;padding:12px 0 0;font-weight:700;border-top:1px solid #E2DED8;margin-top:8px;font-family:monospace;">${formatNPR(order.total)}</td>
      </tr>
    </table>`
}

function buildShippingBlock(order: Order): string {
  const lines = [
    `<strong>${order.guestFirstName} ${order.guestLastName}</strong>`,
    order.shippingAddress,
    order.shippingApartment || null,
    `${order.shippingCity}, ${order.shippingState}`,
    getCountryName(order.shippingCountry),
    order.shippingPostalCode ? `Zip Code: ${order.shippingPostalCode}` : null,
    `Phone: ${order.guestPhone}`,
  ].filter(Boolean)

  return `
    <div style="background-color:#FFFFFF;padding:16px 20px;border:1px dashed #E2DED8;margin-top:8px;line-height:1.5;">
      ${lines.map((line) => `<p style="margin:0 0 6px;font-size:13px;color:#4A4842;line-height:1.4;">${String(line)}</p>`).join('')}
    </div>`
}

function orderEmailLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F8F7F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F7F4;padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Wrapper -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#FFFFFF;border:1px solid #E2DED8;box-shadow:0 4px 12px rgba(0,0,0,0.03);">
          
          <!-- Top Colored Brand Header Bar -->
          <tr>
            <td style="background-color:#0D0D0B;padding:24px 32px;text-align:center;">
              <p style="margin:0;font-size:13px;letter-spacing:0.3em;text-transform:uppercase;color:#C9C3B8;font-weight:500;">
                S U L U X &nbsp; C E N T R E
              </p>
            </td>
          </tr>

          <!-- Title Block -->
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;border-bottom:1px solid #F0EDE8;">
              <h1 style="margin:0;font-family:Georgia,serif;font-size:24px;font-weight:normal;color:#0D0D0B;letter-spacing:-0.01em;">
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:32px 40px 40px;font-size:14px;line-height:1.6;color:#4A4842;">
              ${body}
            </td>
          </tr>

          <!-- Footer Bar -->
          <tr>
            <td style="background-color:#F8F7F4;padding:24px 40px;text-align:center;border-top:1px solid #E2DED8;font-size:11px;color:#8A7855;letter-spacing:0.05em;">
              <p style="margin:0 0 4px;">SULUX CENTRE &copy; ${new Date().getFullYear()}</p>
              <p style="margin:0;color:#8E8A80;font-size:10px;">Secured vault transaction terminal · Escrow Protected</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildCustomerOrderEmailHTML(order: Order): string {
  const name = escapeHTML(order.guestFirstName)
  const payment = paymentLabel(order.paymentMethod)

  let statusText = 'Paid &middot; Confirmed'
  let statusColor = '#16A34A' // Green
  let introText = 'Thank you for choosing <strong>Sulux Centre</strong>. Your order has been placed successfully and your payment has been processed securely. We are preparing your order for immediate dispatch.'

  if (order.paymentMethod === 'qr') {
    statusText = 'Pending Payment Verification'
    statusColor = '#D97706' // Amber
    introText = 'Thank you for choosing <strong>Sulux Centre</strong>. Your order details and payment reference have been received. We will process and dispatch your watch as soon as our team manually matches the transaction.'
  } else if (order.paymentMethod === 'cod') {
    statusText = 'Payment Upon Arrival (COD)'
    statusColor = '#2563EB' // Blue
    introText = 'Thank you for choosing <strong>Sulux Centre</strong>. Your Cash on Delivery order has been successfully placed. You can settle the payment directly upon the arrival of your parcel.'
  } else if (order.paymentMethod === 'pickup') {
    statusText = 'Reserve for Store Pickup'
    statusColor = '#7C3AED' // Purple
    introText = 'Thank you for choosing <strong>Sulux Centre</strong>. Your watch has been reserved for store pickup at our Kathmandu boutique. You can pay directly at the store during collection.'
  }

  return orderEmailLayout(
    'Thank You for Your Order',
    `
      <p style="margin-top:0;font-size:15px;color:#0D0D0B;font-family:Georgia,serif;">Dear ${name},</p>
      <p>${introText}</p>
      
      <div style="margin-top:24px;border-bottom:1px solid #E2DED8;padding-bottom:12px;margin-bottom:8px;">
        <span style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8A7855;font-weight:600;">Transaction Details</span>
      </div>
      <p style="margin:6px 0;font-size:13px;color:#4A4842;">Order Reference: <strong style="color:#0D0D0B;font-family:monospace;">#${escapeHTML(order.orderNumber)}</strong></p>
      <p style="margin:6px 0;font-size:13px;color:#4A4842;">Payment Method: <strong>${payment}</strong></p>
      <p style="margin:6px 0;font-size:13px;color:#4A4842;">Payment Status: <strong style="color:${statusColor};text-transform:uppercase;font-size:11px;letter-spacing:0.05em;">${statusText}</strong></p>
      
      ${buildLineItemsTable(order)}
      ${buildTotalsBlock(order)}
      
      <div style="margin-top:24px;border-bottom:1px solid #E2DED8;padding-bottom:12px;margin-bottom:8px;">
        <span style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8A7855;font-weight:600;">Delivery Address</span>
      </div>
      ${buildShippingBlock(order)}
      
      <p style="margin:28px 0 0;font-size:13px;color:#8E8A80;line-height:1.5;">If you have any questions regarding your order or shipment, please reply directly to this email or contact our support team at <a href="mailto:contact@arkshfood.com" style="color:#8A7855;text-decoration:underline;">contact@arkshfood.com</a>.</p>
    `,
  )
}

export function buildAdminOrderEmailHTML(order: Order, qrImageUrl?: string): string {
  const customer = escapeHTML(`${order.guestFirstName} ${order.guestLastName}`)
  const payment = paymentLabel(order.paymentMethod)

  let statusText = 'PAID / CONFIRMED'
  let statusColor = '#16A34A'
  let adminNote = 'A new storefront order has been placed and paid successfully.'

  if (order.paymentMethod === 'qr') {
    statusText = 'PENDING VERIFICATION'
    statusColor = '#D97706'
    adminNote = `A new QR payment order has been placed. Please match the payment proof screenshot against your statement:<br/><br/>`
    if (qrImageUrl) {
      const serverUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || ''
      adminNote += `<a href="${serverUrl}${qrImageUrl}" target="_blank" style="display:inline-block;padding:10px 18px;background-color:#0D0D0B;color:#FFFFFF;text-decoration:none;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;border-radius:2px;">View Payment Proof</a>`
    } else {
      adminNote += `<em>No payment proof uploaded.</em>`
    }
  } else if (order.paymentMethod === 'cod') {
    statusText = 'COD PENDING'
    statusColor = '#2563EB'
    adminNote = 'A new Cash on Delivery order has been placed and is pending processing.'
  } else if (order.paymentMethod === 'pickup') {
    statusText = 'STORE PICKUP RESERVATION'
    statusColor = '#7C3AED'
    adminNote = 'A new store pickup reservation has been placed and is pending store collection.'
  }

  return orderEmailLayout(
    `New Order Confirmed — #${escapeHTML(order.orderNumber)}`,
    `
      <p style="margin-top:0;font-size:15px;color:#0D0D0B;font-family:Georgia,serif;">Admin Notice,</p>
      <p>${adminNote}</p>
      
      <div style="margin-top:24px;border-bottom:1px solid #E2DED8;padding-bottom:12px;margin-bottom:8px;">
        <span style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8A7855;font-weight:600;">Customer Info</span>
      </div>
      <p style="margin:4px 0;font-size:13px;color:#4A4842;">Name: <strong>${customer}</strong></p>
      <p style="margin:4px 0;font-size:13px;color:#4A4842;">Email: <a href="mailto:${order.guestEmail}" style="color:#8A7855;text-decoration:none;">${escapeHTML(order.guestEmail)}</a></p>
      <p style="margin:4px 0;font-size:13px;color:#4A4842;">Phone: <strong>${escapeHTML(order.guestPhone)}</strong></p>
      
      <div style="margin-top:24px;border-bottom:1px solid #E2DED8;padding-bottom:12px;margin-bottom:8px;">
        <span style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8A7855;font-weight:600;">Billing details</span>
      </div>
      <p style="margin:4px 0;font-size:13px;color:#4A4842;">Method: <strong>${payment}</strong></p>
      <p style="margin:4px 0;font-size:13px;color:#4A4842;">Status: <strong style="color:${statusColor};text-transform:uppercase;font-size:11px;letter-spacing:0.05em;">${statusText}</strong></p>
      
      ${buildLineItemsTable(order)}
      ${buildTotalsBlock(order)}
      
      <div style="margin-top:24px;border-bottom:1px solid #E2DED8;padding-bottom:12px;margin-bottom:8px;">
        <span style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8A7855;font-weight:600;">Shipping info</span>
      </div>
      ${buildShippingBlock(order)}
    `,
  )
}

export async function sendOrderConfirmationEmails(
  payload: Payload,
  order: Order,
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim()

  try {
    await payload.sendEmail({
      to: order.guestEmail,
      subject: `Thank you for your order — #${order.orderNumber}`,
      text: `Hi ${order.guestFirstName},\n\nThank you for your order at Sulux Centre. We will contact you as soon as possible.\n\nOrder #${order.orderNumber}\nTotal: ${formatNPR(order.total)}\nPayment: ${paymentLabel(order.paymentMethod)}\n\nRegards,\nSulux Centre`,
      html: buildCustomerOrderEmailHTML(order),
    })
  } catch (error) {
    payload.logger.error({
      err: error,
      msg: `Failed to send order confirmation email to ${order.guestEmail}`,
    })
  }

  if (!adminEmail) {
    payload.logger.warn({ msg: 'ADMIN_EMAIL is not set — skipping admin order notification.' })
    return
  }

  let qrImageUrl: string | undefined = undefined
  if (order.paymentMethod === 'qr' && order.paymentDetails?.qrImage) {
    try {
      const qrImgRef = order.paymentDetails.qrImage
      if (typeof qrImgRef === 'object' && qrImgRef !== null && 'url' in qrImgRef) {
        qrImageUrl = (qrImgRef as any).url || undefined
      } else if (typeof qrImgRef === 'number' || typeof qrImgRef === 'string') {
        const media = await payload.findByID({
          collection: 'media',
          id: qrImgRef,
        })
        qrImageUrl = media.url || undefined
      }
    } catch (e) {
      payload.logger.error({
        err: e,
        msg: `Failed to fetch QR proof media for order ${order.orderNumber}`,
      })
    }
  }

  try {
    await payload.sendEmail({
      to: adminEmail,
      subject: `New order #${order.orderNumber} — ${paymentLabel(order.paymentMethod)}`,
      text: `New order #${order.orderNumber}\nCustomer: ${order.guestFirstName} ${order.guestLastName} (${order.guestEmail})\nTotal: ${formatNPR(order.total)}\nPayment: ${paymentLabel(order.paymentMethod)}`,
      html: buildAdminOrderEmailHTML(order, qrImageUrl),
    })
  } catch (error) {
    payload.logger.error({
      err: error,
      msg: `Failed to send admin order notification to ${adminEmail}`,
    })
  }
}
