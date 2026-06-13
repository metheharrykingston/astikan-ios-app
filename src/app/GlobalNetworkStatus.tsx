import { useEffect, useState } from "react"
import { FiHome, FiRefreshCw, FiWifiOff } from "react-icons/fi"

export default function GlobalNetworkStatus() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off) }
  }, [])
  if (online) return null
  return (
    <div className="offline-overlay" role="alert" aria-live="assertive">
      <section className="offline-card">
        <div className="offline-wifi"><FiWifiOff /></div>
        <h2>No internet connection</h2>
        <p>Please check your connection and retry.</p>
        <div className="offline-actions">
          <button type="button" onClick={() => window.location.reload()}><FiRefreshCw /> Retry</button>
          <button type="button" className="secondary" onClick={() => { window.location.href = "/home" }}><FiHome /> Home</button>
        </div>
      </section>
    </div>
  )
}
