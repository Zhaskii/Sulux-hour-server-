import NavIcon from './NavIcon'

type DashboardStatIconProps = {
  slug: string
}

const DashboardStatIcon = ({ slug }: DashboardStatIconProps) => {
  return (
    <span className="sulux-stat-card__icon" aria-hidden="true">
      <NavIcon slug={slug} />
    </span>
  )
}

export default DashboardStatIcon
