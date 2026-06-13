import { Outlet, useLocation } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import "./route-transition.css"
import { VoiceAgentProvider } from "./voice-agent"

export default function RouteTransitionLayout() {
  const location = useLocation()
  const previousPathRef = useRef(location.pathname)
  const [showLoader, setShowLoader] = useState(false)

  useEffect(() => {
    if (previousPathRef.current === location.pathname) {
      return
    }

    setShowLoader(true)
    previousPathRef.current = location.pathname

    const timer = window.setTimeout(() => {
      setShowLoader(false)
    }, 500)

    return () => window.clearTimeout(timer)
  }, [location.pathname])

  return (
    <VoiceAgentProvider>
      <Outlet />
      {showLoader && (
        <div className="route-loader-overlay" aria-live="polite" aria-label="Loading next screen">
          <span className="route-loader-spinner" />
        </div>
      )}
    </VoiceAgentProvider>
  )
}
