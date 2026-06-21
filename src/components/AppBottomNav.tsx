import type { ReactElement } from "react"
import { FaBolt, FaHome, FaPills, FaShoppingBag, FaStethoscope, FaUserCircle } from "react-icons/fa"
import { useNavigate } from "react-router-dom"
import "./AppBottomNav.css"

export type AppBottomNavKey = "Home" | "Doctor" | "Refill" | "Cart" | "Account"

const navItems: Array<{
  id: AppBottomNavKey
  label: string
  route: string
  icon: ReactElement
  badge?: string
}> = [
  { id: "Home", label: "Home", route: "/home", icon: <FaHome /> },
  { id: "Doctor", label: "Doctor", route: "/nearby-doctors", icon: <FaStethoscope /> },
  { id: "Refill", label: "Refill", route: "/pharmacy", icon: <FaPills /> },
  { id: "Cart", label: "Cart", route: "/cart", icon: <FaShoppingBag /> },
  { id: "Account", label: "Account", route: "/settings", icon: <FaUserCircle /> },
]

export default function AppBottomNav({ active }: { active?: AppBottomNavKey }) {
  const navigate = useNavigate()

  function pulseChargeButton() {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([18, 28, 18])
    }
  }

  return (
    <nav className="ast-bottom-nav" aria-label="Primary navigation">
      {navItems.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className={`ast-bottom-nav__item app-pressable ${active === item.id ? "active" : ""} ${item.badge ? "has-offer" : ""} ${index >= 2 ? "shift-right" : ""}`}
          onClick={() => navigate(item.route)}
        >
          <span className="ast-bottom-nav__icon">
            {item.icon}
            {item.badge ? <em>{item.badge}</em> : null}
          </span>
          <span>{item.label}</span>
        </button>
      ))}

      <button
        type="button"
        className="ast-bottom-nav__charge app-pressable"
        aria-label="Charge"
        onClick={pulseChargeButton}
      >
        <span className="ast-bottom-nav__charge-core">
          <FaBolt />
        </span>
      </button>
    </nav>
  )
}
