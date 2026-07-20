import Link from 'next/link'

import type { DashboardStats as DashboardStatsData } from '../utilities/dashboard-stats'
import { formatNPR } from '../utilities/dashboard-stats'
import DashboardStatIcon from './DashboardStatIcon'

type DashboardStatsProps = {
  stats: DashboardStatsData
}

type StatCard = {
  href: string
  hint?: string
  label: string
  slug: string
  value: string
}

const DashboardStats = ({ stats }: DashboardStatsProps) => {
  const statCards: StatCard[] = [
    {
      slug: 'products',
      href: '/admin/collections/products',
      label: 'Products',
      value: stats.products.toLocaleString('en-IN'),
      hint: 'Catalogue items',
    },
    {
      slug: 'orders',
      href: '/admin/collections/orders',
      label: 'Orders',
      value: stats.orders.toLocaleString('en-IN'),
      hint: `${stats.pendingOrders} pending`,
    },
    {
      slug: 'brands',
      href: '/admin/collections/brands',
      label: 'Brands',
      value: stats.brands.toLocaleString('en-IN'),
      hint: 'Watch brands',
    },
    {
      slug: 'categories',
      href: '/admin/collections/categories',
      label: 'Categories',
      value: stats.categories.toLocaleString('en-IN'),
      hint: 'Collections',
    },
    {
      slug: 'users',
      href: '/admin/collections/users',
      label: 'Users',
      value: stats.users.toLocaleString('en-IN'),
      hint: 'Registered accounts',
    },
    {
      slug: 'orders',
      href: '/admin/collections/orders',
      label: 'Total Sales',
      value: formatNPR(stats.salesTotal),
      hint: `${formatNPR(stats.monthSales)} this month`,
    },
  ]

  const maxStatusCount = Math.max(...stats.orderStatusCounts.map((item) => item.count), 1)
  const maxMonthlySales = Math.max(...stats.monthlySales.map((item) => item.total), 1)
  const peakMonth = stats.monthlySales.reduce(
    (best, item) => (item.total > best.total ? item : best),
    stats.monthlySales[0],
  )

  return (
    <section className="sulux-dashboard-stats">
      <div className="sulux-dashboard-stats__header">
        <div className="sulux-dashboard-stats__intro">
          <p className="sulux-dashboard-stats__eyebrow">
            <span className="sulux-dashboard-stats__eyebrow-line" />
            Store overview
          </p>
          <h2 className="sulux-dashboard-stats__title">Statistics</h2>
          <p className="sulux-dashboard-stats__subtitle">
            Live counts and sales from your Sulux Centre store.
          </p>
        </div>

        <div className="sulux-dashboard-stats__highlights">
          <div className="sulux-highlight-pill">
            <span className="sulux-highlight-pill__label">This month</span>
            <span className="sulux-highlight-pill__value">{formatNPR(stats.monthSales)}</span>
          </div>
          <div className="sulux-highlight-pill">
            <span className="sulux-highlight-pill__label">Pending orders</span>
            <span className="sulux-highlight-pill__value">{stats.pendingOrders}</span>
          </div>
        </div>
      </div>

      <div className="sulux-dashboard-stats__grid">
        {statCards.map((card, index) => (
          <Link
            key={`${card.label}-${index}`}
            className="sulux-stat-card"
            href={card.href}
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <span className="sulux-stat-card__accent" aria-hidden="true" />
            <div className="sulux-stat-card__top">
              <DashboardStatIcon slug={card.slug} />
              <span className="sulux-stat-card__label">{card.label}</span>
            </div>
            <span className="sulux-stat-card__value">{card.value}</span>
            {card.hint ? <span className="sulux-stat-card__hint">{card.hint}</span> : null}
          </Link>
        ))}
      </div>

      <div className="sulux-dashboard-charts">
        <article className="sulux-chart-card card">
          <div className="sulux-chart-card__header">
            <div className="sulux-chart-card__title-row">
              <span className="sulux-chart-card__badge" aria-hidden="true">
                <DashboardStatIcon slug="orders" />
              </span>
              <div>
                <h3 className="sulux-chart-card__title">Order status</h3>
                <p className="sulux-chart-card__description">
                  Breakdown of all orders by status
                </p>
              </div>
            </div>
            <span className="sulux-chart-card__metric">{stats.orders} total</span>
          </div>

          <div className="sulux-bar-chart">
            {stats.orderStatusCounts.map((item) => (
              <div className="sulux-bar-chart__row" key={item.status}>
                <span className="sulux-bar-chart__label">{item.label}</span>
                <div className="sulux-bar-chart__track">
                  <div
                    className={`sulux-bar-chart__fill sulux-bar-chart__fill--${item.status}`}
                    style={{ width: `${(item.count / maxStatusCount) * 100}%` }}
                  />
                </div>
                <span className="sulux-bar-chart__value">{item.count}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="sulux-chart-card card">
          <div className="sulux-chart-card__header">
            <div className="sulux-chart-card__title-row">
              <span className="sulux-chart-card__badge sulux-chart-card__badge--sales" aria-hidden="true">
                <DashboardStatIcon slug="products" />
              </span>
              <div>
                <h3 className="sulux-chart-card__title">Sales trend</h3>
                <p className="sulux-chart-card__description">
                  Paid &amp; fulfilled revenue — last 6 months
                </p>
              </div>
            </div>
            {peakMonth?.total ? (
              <span className="sulux-chart-card__metric">
                Peak: {peakMonth.label} · {formatNPR(peakMonth.total)}
              </span>
            ) : null}
          </div>

          <div className="sulux-column-chart">
            <div className="sulux-column-chart__grid" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>

            {stats.monthlySales.map((item) => {
              const heightPercent = (item.total / maxMonthlySales) * 100
              const isPeak = item.label === peakMonth?.label && item.total > 0

              return (
                <div
                  className={`sulux-column-chart__item${isPeak ? ' sulux-column-chart__item--peak' : ''}`}
                  key={item.label}
                >
                  <div className="sulux-column-chart__bar-wrap">
                    <div
                      className="sulux-column-chart__bar"
                      style={{ height: `${Math.max(heightPercent, item.total > 0 ? 8 : 0)}%` }}
                      title={formatNPR(item.total)}
                    />
                  </div>
                  <span className="sulux-column-chart__label">{item.label}</span>
                  <span className="sulux-column-chart__value">
                    {item.total > 0 ? formatNPR(item.total) : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </article>
      </div>
    </section>
  )
}

export default DashboardStats
