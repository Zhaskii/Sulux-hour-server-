type SuluxBrandMarkProps = {
  variant?: 'full' | 'compact' | 'icon'
  className?: string
}

const SuluxBrandMark = ({ variant = 'full', className = '' }: SuluxBrandMarkProps) => {
  if (variant === 'icon') {
    return (
      <div className={`sulux-brand sulux-brand--icon ${className}`.trim()}>
        <span className="sulux-brand__mark">S</span>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`sulux-brand sulux-brand--compact ${className}`.trim()}>
        <span className="sulux-brand__primary">SULUX</span>
        <span className="sulux-brand__secondary">CENTRE</span>
      </div>
    )
  }

  return (
    <div className={`sulux-brand sulux-brand--full ${className}`.trim()}>
      <span className="sulux-brand__primary">SULUX</span>
      <span className="sulux-brand__secondary">CENTRE</span>
      <span className="sulux-brand__tagline">Premium Quality Watches</span>
    </div>
  )
}

export default SuluxBrandMark
