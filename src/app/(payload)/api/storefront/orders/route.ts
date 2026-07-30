import config from '@payload-config'
import { getPayload } from 'payload'

import { generateOrderNumber } from '@/utilities/generate-order-number'

const MAX_ITEMS = 20
const MAX_QUANTITY_PER_LINE = 10
const VALID_COUPONS: Record<string, number> = {
  SULUX10: 0.1,
}
const VALID_COUNTRY_CODES = new Set([
  'NP',
  'IN',
  'CN',
  'US',
  'GB',
  'AE',
  'AU',
  'CA',
  'DE',
  'FR',
  'JP',
  'SG',
  'TH',
  'MY',
  'QA',
  'SA',
  'HK',
  'CH',
])

type OrderItemInput = {
  productId?: unknown
  quantity?: unknown
}

type ShippingInput = {
  email?: unknown
  firstName?: unknown
  lastName?: unknown
  phone?: unknown
  country?: unknown
  address?: unknown
  apartment?: unknown
  city?: unknown
  state?: unknown
  postalCode?: unknown
  orderNotes?: unknown
}

type CreateOrderBody = {
  items?: OrderItemInput[]
  shipping?: ShippingInput
  paymentMethod?: unknown
  couponCode?: unknown
  transactionId?: unknown
  bankRemarks?: unknown
  qrImage?: unknown
}

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function parsePaymentMethod(value: unknown): 'cod' | 'pickup' | 'online' | 'qr' | null {
  if (value === 'cod' || value === 'pickup' || value === 'online' || value === 'qr') return value
  return null
}

function parseItems(items: OrderItemInput[] | undefined) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Your cart is empty.')
  }

  if (items.length > MAX_ITEMS) {
    throw new Error(`A maximum of ${MAX_ITEMS} line items is allowed per order.`)
  }

  const merged = new Map<number, number>()

  for (const item of items) {
    const productId = Number(item.productId)
    const quantity = Math.floor(Number(item.quantity))

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new Error('Invalid product in cart.')
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Invalid quantity in cart.')
    }

    if (quantity > MAX_QUANTITY_PER_LINE) {
      throw new Error(`Maximum ${MAX_QUANTITY_PER_LINE} units per product.`)
    }

    merged.set(productId, (merged.get(productId) ?? 0) + quantity)
  }

  return [...merged.entries()].map(([productId, quantity]) => ({
    productId,
    quantity: Math.min(quantity, MAX_QUANTITY_PER_LINE),
  }))
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateOrderBody
    const payload = await getPayload({ config })

    const parsedItems = parseItems(body.items)
    const shipping = body.shipping ?? {}
    const paymentMethod = parsePaymentMethod(body.paymentMethod)

    const guestEmail = cleanText(shipping.email, 254).toLowerCase()
    const guestFirstName = cleanText(shipping.firstName, 80)
    const guestLastName = cleanText(shipping.lastName, 80)
    const guestPhone = cleanText(shipping.phone, 30)
    const shippingCountry = cleanText(shipping.country, 2).toUpperCase()
    const shippingAddress = cleanText(shipping.address, 200)
    const shippingApartment = cleanText(shipping.apartment, 120)
    const shippingCity = cleanText(shipping.city, 80)
    const shippingState = cleanText(shipping.state, 80)
    const shippingPostalCode = cleanText(shipping.postalCode, 20)
    const orderNotes = cleanText(shipping.orderNotes, 500)
    const couponCode = cleanText(body.couponCode, 40).toUpperCase()

    if (!paymentMethod) {
      return Response.json({ message: 'Please select a payment method.' }, { status: 400 })
    }


    if (!guestEmail || !isValidEmail(guestEmail)) {
      return Response.json({ message: 'A valid email address is required.' }, { status: 400 })
    }

    if (!guestFirstName || !guestLastName) {
      return Response.json({ message: 'First and last name are required.' }, { status: 400 })
    }

    if (!guestPhone) {
      return Response.json({ message: 'Phone number is required.' }, { status: 400 })
    }

    if (!shippingCountry || !VALID_COUNTRY_CODES.has(shippingCountry)) {
      return Response.json({ message: 'A valid country is required.' }, { status: 400 })
    }

    if (!shippingAddress || !shippingCity || !shippingState) {
      return Response.json(
        { message: 'Address, city, and state/province are required.' },
        { status: 400 },
      )
    }

    if (shippingCountry !== 'NP' && !shippingPostalCode) {
      return Response.json({ message: 'Postal code is required for international orders.' }, { status: 400 })
    }

    const lineItems: {
      product: number
      productName: string
      productSku: string
      unitPrice: number
      quantity: number
      lineTotal: number
    }[] = []

    let subtotal = 0

    for (const item of parsedItems) {
      const product = await payload.findByID({
        collection: 'products',
        id: item.productId,
        depth: 0,
        overrideAccess: true,
      })

      if (!product || product.status !== 'active') {
        return Response.json(
          { message: 'One or more products are no longer available.' },
          { status: 400 },
        )
      }

      const stockQuantity = Number(product.stockQuantity)
      const unitPrice = Number(product.price)

      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return Response.json(
          { message: 'One or more products have invalid pricing.' },
          { status: 400 },
        )
      }

      if (!Number.isFinite(stockQuantity) || stockQuantity < item.quantity) {
        return Response.json(
          {
            message: `Insufficient stock for ${product.name}. Only ${Math.max(0, stockQuantity)} available.`,
          },
          { status: 400 },
        )
      }

      const lineTotal = unitPrice * item.quantity
      subtotal += lineTotal

      lineItems.push({
        product: product.id,
        productName: product.name,
        productSku: product.sku ?? "",
        unitPrice,
        quantity: item.quantity,
        lineTotal,
      })
    }

    const discountRate = couponCode ? VALID_COUPONS[couponCode] : undefined
    const discount =
      discountRate != null ? Math.round(subtotal * discountRate) : 0
    const shippingCost = 0
    const total = Math.max(0, subtotal - discount + shippingCost)
    const orderStatus = (paymentMethod === 'online' || paymentMethod === 'qr') ? 'pending_payment' : 'cod_pending'

    const order = await payload.create({
      collection: 'orders',
      overrideAccess: true,
      data: {
        orderNumber: generateOrderNumber(),
        status: orderStatus,
        paymentMethod,
        guestEmail,
        guestFirstName,
        guestLastName,
        guestPhone,
        shippingAddress,
        shippingApartment: shippingApartment || undefined,
        shippingCity,
        shippingState,
        shippingCountry,
        shippingPostalCode: shippingPostalCode || undefined,
        orderNotes: orderNotes || undefined,
        lineItems,
        subtotal,
        discount,
        shippingCost,
        total,
        couponCode: discount > 0 ? couponCode : undefined,
        paymentDetails: paymentMethod === 'qr' ? {
          gateway: 'Static QR',
          status: 'pending_verification',
          qrImage: body.qrImage ? Number(body.qrImage) : undefined
        } : undefined
      },
    })

    return Response.json({
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      discount: order.discount,
      shippingCost: order.shippingCost,
      total: order.total,
      couponCode: order.couponCode ?? undefined,
      shipping: {
        email: guestEmail,
        firstName: guestFirstName,
        lastName: guestLastName,
        phone: guestPhone,
        country: shippingCountry,
        address: shippingAddress,
        apartment: shippingApartment,
        city: shippingCity,
        state: shippingState,
        postalCode: shippingPostalCode,
        orderNotes,
      },
      lineItems: lineItems.map((item) => ({
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to create order.'

    return Response.json({ message }, { status: 400 })
  }
}
