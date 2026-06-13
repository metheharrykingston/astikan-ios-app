import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "./splash.css"

export default function Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hasAuth =
        localStorage.getItem("astikan_user_auth") ||
        sessionStorage.getItem("astikan_user_auth")
      if (hasAuth) navigate("/home")
      else navigate("/login")
    }, 850)
    return () => window.clearTimeout(timer)
  }, [navigate])

  return (
    <div className="splash-container app-page-enter" data-status-bar-color="#ffffff">
      <div className="splash-center-loader" aria-label="Loading Astikan" />
    </div>
  )
}
