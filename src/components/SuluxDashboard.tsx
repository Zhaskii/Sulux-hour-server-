import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'

import DashboardStats from './DashboardStats'
import DashboardWelcome from './DashboardWelcome'
import { getDashboardStats } from '../utilities/dashboard-stats'

const SuluxDashboard = async (props: AdminViewServerProps) => {
  const { initPageResult } = props
  const { req } = initPageResult
  const { payload, user } = req
  const stats = await getDashboardStats(payload)

  return (
    <Gutter className="dashboard">
      <DashboardWelcome user={user} />
      <DashboardStats stats={stats} />
    </Gutter>
  )
}

export default SuluxDashboard
