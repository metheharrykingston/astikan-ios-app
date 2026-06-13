import type { ReactElement } from "react"
import { FaHome, FaPills, FaShoppingBag, FaStethoscope, FaUserCircle } from "react-icons/fa"
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
  { id: "Doctor", label: "Doctor", route: "/teleconsultation/offer-checkout", icon: <FaStethoscope />, badge: "₹49" },
  { id: "Refill", label: "Refill", route: "/pharmacy", icon: <FaPills /> },
  { id: "Cart", label: "Cart", route: "/cart", icon: <FaShoppingBag /> },
  { id: "Account", label: "Account", route: "/settings", icon: <FaUserCircle /> },
]

export default function AppBottomNav({ active }: { active?: AppBottomNavKey }) {
  const navigate = useNavigate()
  return (
    <nav className="ast-bottom-nav" aria-label="Primary navigation">
      {navItems.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`ast-bottom-nav__item app-pressable ${active === item.id ? "active" : ""} ${item.badge ? "has-offer" : ""}`}
          onClick={() => navigate(item.route)}
        >
          <span className="ast-bottom-nav__icon">
            {item.icon}
            {item.badge ? <em>{item.badge}</em> : null}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
