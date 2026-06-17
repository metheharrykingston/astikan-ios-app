import type { ReactNode } from 'react'
import { FiArrowLeft } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { goBackOrFallback } from '../../utils/navigation'

type SurgeryHeaderProps = {
  title: string
  subtitle?: string
  right?: ReactNode
}

export function SurgeryHeader({ title, subtitle, right }: SurgeryHeaderProps) {
  const navigate = useNavigate()
  return (
    <header className="surgery-fixed-header app-fade-stagger">
      <button className="surgery-header-back app-pressable" type="button" onClick={() => goBackOrFallback(navigate, '/home')} aria-label="Back">
        <FiArrowLeft />
      </button>
      <div className="surgery-header-title">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {right ? <div className="surgery-header-actions">{right}</div> : null}
    </header>
  )
}
