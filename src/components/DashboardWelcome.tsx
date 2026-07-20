import type { PayloadRequest } from 'payload'

import SuluxBrandMark from './SuluxBrandMark'

type DashboardWelcomeProps = {
  user?: PayloadRequest['user']
}

const getGreeting = () => {
  const hour = new Date().getHours()

  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const getDisplayName = (user: DashboardWelcomeProps['user']) => {
  if (!user) return 'there'

  const firstName =
    'firstName' in user && typeof user.firstName === 'string' ? user.firstName.trim() : ''
  const lastName =
    'lastName' in user && typeof user.lastName === 'string' ? user.lastName.trim() : ''
  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  if (fullName) return fullName

  if ('email' in user && typeof user.email === 'string') {
    return user.email.split('@')[0]
  }

  return 'there'
}

const formatToday = () => {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const DashboardWelcome = ({ user }: DashboardWelcomeProps) => {
  const greeting = getGreeting()
  const displayName = getDisplayName(user)

  return (
    <section className="sulux-dashboard-hero">
      <div className="sulux-dashboard-hero__glow" aria-hidden="true" />
      <div className="sulux-dashboard-hero__texture" aria-hidden="true" />
      <span className="sulux-dashboard-hero__corner sulux-dashboard-hero__corner--tl" aria-hidden="true" />
      <span className="sulux-dashboard-hero__corner sulux-dashboard-hero__corner--br" aria-hidden="true" />

      <div className="sulux-dashboard-hero__content">
        <div className="sulux-dashboard-hero__brand">
          <SuluxBrandMark variant="full" />
        </div>

        <div className="sulux-dashboard-hero__copy">
          <p className="sulux-dashboard-hero__eyebrow">
            <span className="sulux-dashboard-hero__eyebrow-line" />
            Admin Console
          </p>

          <h1 className="sulux-dashboard-hero__title">
            {greeting}, <span>{displayName}</span>
          </h1>

 

          <p className="sulux-dashboard-hero__date">{formatToday()}</p>
        </div>
      </div>

    
    </section>
  )
}

export default DashboardWelcome
