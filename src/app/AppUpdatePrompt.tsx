import { useEffect, useMemo, useState } from "react"
import { FiRefreshCw, FiX } from "react-icons/fi"
import { useRegisterSW } from "virtual:pwa-register/react"
import "./install-prompt.css"

export default function AppUpdatePrompt() {
  const [dismissed, setDismissed] = useState(false)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url: string, registration: ServiceWorkerRegistration | undefined) {
      if (!registration) return

      const runUpdateCheck = () => {
        void registration.update().catch(() => undefined)
      }

      runUpdateCheck()
      const interval = window.setInterval(runUpdateCheck, 45_000)
      const onFocus = () => runUpdateCheck()
      const onVisibility = () => {
        if (document.visibilityState === "visible") runUpdateCheck()
      }

      window.addEventListener("focus", onFocus)
      document.addEventListener("visibilitychange", onVisibility)

      return () => {
        window.clearInterval(interval)
        window.removeEventListener("focus", onFocus)
        document.removeEventListener("visibilitychange", onVisibility)
      }
    },
    onRegisterError(error: unknown) {
      console.error("PWA register failed", error)
    },
  })

  useEffect(() => {
    if (needRefresh) {
      setDismissed(false)
    }
  }, [needRefresh])

  const visible = useMemo(() => needRefresh && !dismissed, [dismissed, needRefresh])

  if (!visible) return null

  if (needRefresh) {
    return (
      <div className="install-banner install-banner--update" role="status" aria-live="polite">
        <div className="install-banner-top">
          <strong>New Astikan update ready</strong>
          <button
            type="button"
            className="install-close install-close--icon"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss update"
          >
            <FiX />
          </button>
        </div>
        <p>Refresh once to get the latest Astikan experience and booking updates.</p>
        <div>
          <button
            className="install-cta install-cta--update"
            onClick={() => void updateServiceWorker(true)}
            type="button"
          >
            <FiRefreshCw />
            Refresh App
          </button>
          <button
            className="install-close"
            onClick={() => {
              setDismissed(true)
              setNeedRefresh(false)
            }}
            type="button"
          >
            Later
          </button>
        </div>
      </div>
    )
  }
  return null
}
