import config from '@payload-config'
import { getPayload } from 'payload'

type ConfirmBody = {
  orderNumber?: unknown
  tokenInfo?: unknown
  res?: unknown
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConfirmBody
    const orderNumber = typeof body.orderNumber === 'string' ? body.orderNumber.trim() : ''
    const tokenInfo = typeof body.tokenInfo === 'string' ? body.tokenInfo.trim() : ''

    if (!orderNumber) {
      return Response.json({ message: 'Order number is required.' }, { status: 400 })
    }

    const oprKey = process.env.GETPAY_OPRKEY
    const baseUrl = process.env.GETPAY_BASE_URL

    if (!oprKey || !baseUrl) {
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

    // If already marked as paid, return success (idempotent)
    if (order.status === 'paid') {
      return Response.json({
        success: true,
        orderNumber: order.orderNumber,
        status: order.status,
      })
    }

    if (order.status !== 'pending_payment') {
      return Response.json(
        { message: `Order cannot be confirmed. Current status is '${order.status}'.` },
        { status: 400 },
      )
    }

    let paymentDetails: any = {
      gateway: 'GetPay',
      status: 'SUCCESS',
      verifiedAt: new Date().toISOString(),
    }

    // Call NCHL GetPay merchant status verification API
    if (tokenInfo) {
      // Decode or parse token ID and secret
      let tokenId = tokenInfo
      let oprSecret = ''
      try {
        const parsed = JSON.parse(tokenInfo)
        if (parsed && parsed.id) tokenId = String(parsed.id)
        if (parsed && parsed.oprSecret) oprSecret = String(parsed.oprSecret)
      } catch {}
      try {
        const decoded = Buffer.from(tokenInfo, 'base64').toString('utf-8')
        const parsed = JSON.parse(decoded)
        if (parsed && parsed.id) tokenId = String(parsed.id)
        if (parsed && parsed.oprSecret) oprSecret = String(parsed.oprSecret)
      } catch {}

      const verificationUrl = `${baseUrl.replace(/\/$/, '')}/merchant-status`
      const authKey = oprSecret || oprKey
      console.log('GetPay: Verifying transaction with NCHL...', { verificationUrl, tokenId, usingSecret: !!oprSecret })

      const statusRes = await fetch(verificationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authKey}`,
        },
        body: JSON.stringify({ id: tokenId }),
      })

      if (!statusRes.ok) {
        const errText = await statusRes.text()
        console.error('GetPay: Verification request failed:', statusRes.status, errText)
        return Response.json(
          { message: `Payment verification failed (Bank returned status ${statusRes.status}).` },
          { status: 400 },
        )
      }

      const statusData = await statusRes.json()
      console.log('GetPay: Bank response data:', statusData)

      // Support NCHL response nested data block structure if present
      const responseBlock = statusData.data || statusData
      const statusValue = responseBlock.status
      const statusStr = typeof statusValue === 'string'
        ? statusValue.toUpperCase()
        : statusValue && typeof statusValue === 'object' && 'code' in statusValue
        ? String((statusValue as any).code || '').toUpperCase()
        : String(statusValue || '').toUpperCase()

      const isSuccess =
        statusStr === 'SUCCESS' ||
        statusStr === 'PAID' ||
        statusStr === 'APPROVED' ||
        String(responseBlock.responseCode || '').toUpperCase() === '00' ||
        String(responseBlock.responseCode || '').toUpperCase() === 'SUCCESS' ||
        (statusData.status === 0 && statusStr === 'SUCCESS')

      if (!isSuccess) {
        return Response.json(
          { message: `Payment was not successful. Bank status: ${typeof statusValue === 'object' ? JSON.stringify(statusValue) : (statusValue || responseBlock.responseMessage || statusData.message || 'Failed')}` },
          { status: 400 },
        )
      }

      paymentDetails = {
        gateway: 'GetPay',
        status: statusStr,
        transactionId: responseBlock.crrn || responseBlock.stan || '',
        tokenId: tokenId,
        amount: typeof responseBlock.amount === 'number'
          ? responseBlock.amount
          : responseBlock.amount
          ? Number(responseBlock.amount)
          : undefined,
        bankRemarks: responseBlock.remarks || responseBlock.responseMessage || '',
        verifiedAt: new Date().toISOString(),
      }
    } else {
      if (process.env.NODE_ENV === 'production') {
        return Response.json({ message: 'Token info is required for payment verification.' }, { status: 400 })
      }
      console.log('GetPay: Skipping verification in development since tokenInfo is missing.')
      paymentDetails.tokenId = 'DEV_MOCK_TOKEN'
      paymentDetails.bankRemarks = 'Bypassed verification in development mode'
    }

    // Update order status to paid
    const updatedOrder = await payload.update({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
      data: {
        status: 'paid',
        paymentDetails,
      },
    })

    return Response.json({
      success: true,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to confirm payment.'
    return Response.json({ message }, { status: 500 })
  }
}
