import type { Payload } from 'payload'

export type OrderStatusCount = {
  label: string
  status: string
  count: number
}

export type MonthlySalesPoint = {
  label: string
  total: number
}

export type DashboardStats = {
  products: number
  orders: number
  brands: number
  categories: number
  users: number
  salesTotal: number
  monthSales: number
  pendingOrders: number
  orderStatusCounts: OrderStatusCount[]
  monthlySales: MonthlySalesPoint[]
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  cod_pending: 'COD Pending',
  paid: 'Paid',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
}

const buildMonthlySales = (
  orders: Array<{ createdAt: string; total?: number | null }>,
  months: number,
): MonthlySalesPoint[] => {
  const now = new Date()
  const points: MonthlySalesPoint[] = []

  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)

    const total = orders.reduce((sum, order) => {
      const createdAt = new Date(order.createdAt)

      if (createdAt < monthStart || createdAt > monthEnd) {
        return sum
      }

      return sum + (order.total ?? 0)
    }, 0)

    points.push({
      label: date.toLocaleDateString('en-US', { month: 'short' }),
      total,
    })
  }

  return points
}

export async function getDashboardStats(payload: Payload): Promise<DashboardStats> {
  const orderStatuses = [
    'pending_payment',
    'cod_pending',
    'paid',
    'fulfilled',
    'cancelled',
  ] as const

  const [
    products,
    orders,
    brands,
    categories,
    users,
    paidOrdersResult,
    ...statusCounts
  ] = await Promise.all([
    payload.count({ collection: 'products' }),
    payload.count({ collection: 'orders' }),
    payload.count({ collection: 'brands' }),
    payload.count({ collection: 'categories' }),
    payload.count({ collection: 'users' }),
    payload.find({
      collection: 'orders',
      depth: 0,
      pagination: false,
      select: {
        total: true,
        createdAt: true,
        status: true,
      },
      where: {
        status: {
          in: ['paid', 'fulfilled'],
        },
      },
    }),
    ...orderStatuses.map((status) =>
      payload.count({
        collection: 'orders',
        where: {
          status: {
            equals: status,
          },
        },
      }),
    ),
  ])

  const paidOrders = paidOrdersResult.docs
  const salesTotal = paidOrders.reduce((sum, order) => sum + (order.total ?? 0), 0)

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const monthSales = paidOrders.reduce((sum, order) => {
    if (new Date(order.createdAt) < monthStart) {
      return sum
    }

    return sum + (order.total ?? 0)
  }, 0)

  const orderStatusCounts: OrderStatusCount[] = orderStatuses.map((status, index) => ({
    status,
    label: ORDER_STATUS_LABELS[status] ?? status,
    count: statusCounts[index].totalDocs,
  }))

  const pendingOrders = orderStatusCounts
    .filter((item) => item.status === 'pending_payment' || item.status === 'cod_pending')
    .reduce((sum, item) => sum + item.count, 0)

  return {
    products: products.totalDocs,
    orders: orders.totalDocs,
    brands: brands.totalDocs,
    categories: categories.totalDocs,
    users: users.totalDocs,
    salesTotal,
    monthSales,
    pendingOrders,
    orderStatusCounts,
    monthlySales: buildMonthlySales(paidOrders, 6),
  }
}

export function formatNPR(value: number): string {
  return `Rs. ${Math.round(value).toLocaleString('en-IN')}`
}
