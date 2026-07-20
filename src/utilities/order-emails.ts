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
    default:
      return 'Online Payment'
  }
}

function buildLineItemsTable(order: Order): string {
  const rows = order.lineItems
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e7e5e4;font-size:13px;color:#1c1917;">${escapeHTML(item.productName)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e7e5e4;font-size:13px;color:#57534e;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e7e5e4;font-size:13px;color:#57534e;text-align:right;">${formatNPR(item.lineTotal)}</td>
        </tr>`,
    )
    .join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        <th align="left" style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#a8a29e;padding-bottom:8px;">Item</th>
        <th align="center" style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#a8a29e;padding-bottom:8px;">Qty</th>
        <th align="right" style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#a8a29e;padding-bottom:8px;">Total</th>
      </tr>
      ${rows}
    </table>`
}

function buildTotalsBlock(order: Order): string {
  const discount = order.discount ?? 0
  const shipping = order.shippingCost ?? 0

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      <tr><td style="font-size:13px;color:#57534e;padding:4px 0;">Subtotal</td><td align="right" style="font-size:13px;color:#1c1917;padding:4px 0;">${formatNPR(order.subtotal)}</td></tr>
      ${discount > 0 ? `<tr><td style="font-size:13px;color:#57534e;padding:4px 0;">Discount${order.couponCode ? ` (${escapeHTML(order.couponCode)})` : ''}</td><td align="right" style="font-size:13px;color:#1c1917;padding:4px 0;">−${formatNPR(discount)}</td></tr>` : ''}
      <tr><td style="font-size:13px;color:#57534e;padding:4px 0;">Shipping</td><td align="right" style="font-size:13px;color:#1c1917;padding:4px 0;">${shipping > 0 ? formatNPR(shipping) : 'Complimentary'}</td></tr>
      <tr><td style="font-size:14px;color:#1c1917;padding:8px 0 0;font-weight:600;">Total</td><td align="right" style="font-size:14px;color:#1c1917;padding:8px 0 0;font-weight:600;">${formatNPR(order.total)}</td></tr>
    </table>`
}

function buildShippingBlock(order: Order): string {
  const lines = [
    `${order.guestFirstName} ${order.guestLastName}`,
    order.shippingAddress,
    order.shippingApartment || null,
    `${order.shippingCity}, ${order.shippingState}`,
    getCountryName(order.shippingCountry),
    order.shippingPostalCode || null,
    `Phone: ${order.guestPhone}`,
    order.orderNotes ? `Notes: ${order.orderNotes}` : null,
  ].filter(Boolean)

  return lines.map((line) => `<p style="margin:0 0 4px;font-size:13px;color:#57534e;">${escapeHTML(String(line))}</p>`).join('')
}

function orderEmailLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e7e5e4;">
        <tr><td style="padding:32px 28px 8px;text-align:center;">
          <p style="margin:0;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#78716c;">Sulux Centre</p>
          <h1 style="margin:12px 0 0;font-size:22px;font-weight:400;color:#1c1917;">${title}</h1>
        </td></tr>
        <tr><td style="padding:8px 28px 32px;font-size:14px;line-height:1.6;color:#57534e;font-family:system-ui,sans-serif;">
          ${body}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function buildCustomerOrderEmailHTML(order: Order): string {
  const name = escapeHTML(order.guestFirstName)
  const payment = paymentLabel(order.paymentMethod)

  return orderEmailLayout(
    'Thank You for Your Order',
    `
      <p>Welcome, ${name}.</p>
      <p>Thank you for shopping with <strong>Sulux Centre</strong>. Your order has been received and our team will contact you as soon as possible to confirm delivery details.</p>
      <p style="margin:20px 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#a8a29e;">Order #${escapeHTML(order.orderNumber)}</p>
      <p style="margin:0 0 16px;font-size:13px;color:#57534e;">Payment: <strong>${payment}</strong></p>
      ${buildLineItemsTable(order)}
      ${buildTotalsBlock(order)}
      <p style="margin:24px 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#a8a29e;">Shipping To</p>
      ${buildShippingBlock(order)}
      <p style="margin:24px 0 0;">If you have any questions, reply to this email or contact us at contact@arkshfood.com.</p>
      <p style="margin:16px 0 0;">Regards,<br />Sulux Centre</p>
    `,
  )
}

export function buildAdminOrderEmailHTML(order: Order): string {
  const customer = escapeHTML(`${order.guestFirstName} ${order.guestLastName}`)
  const payment = paymentLabel(order.paymentMethod)

  return orderEmailLayout(
    `New Order — #${escapeHTML(order.orderNumber)}`,
    `
      <p>A new storefront order has been placed.</p>
      <p style="margin:16px 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#a8a29e;">Customer</p>
      <p style="margin:0 0 4px;font-size:13px;color:#57534e;">${customer}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#57534e;">${escapeHTML(order.guestEmail)}</p>
      <p style="margin:0 0 16px;font-size:13px;color:#57534e;">${escapeHTML(order.guestPhone)}</p>
      <p style="margin:0 0 16px;font-size:13px;color:#57534e;">Payment: <strong>${payment}</strong> · Status: <strong>${escapeHTML(order.status)}</strong></p>
      ${buildLineItemsTable(order)}
      ${buildTotalsBlock(order)}
      <p style="margin:24px 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#a8a29e;">Ship To</p>
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

  try {
    await payload.sendEmail({
      to: adminEmail,
      subject: `New order #${order.orderNumber} — ${paymentLabel(order.paymentMethod)}`,
      text: `New order #${order.orderNumber}\nCustomer: ${order.guestFirstName} ${order.guestLastName} (${order.guestEmail})\nTotal: ${formatNPR(order.total)}\nPayment: ${paymentLabel(order.paymentMethod)}`,
      html: buildAdminOrderEmailHTML(order),
    })
  } catch (error) {
    payload.logger.error({
      err: error,
      msg: `Failed to send admin order notification to ${adminEmail}`,
    })
  }
}
