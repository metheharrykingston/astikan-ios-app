// src/App.tsx
import { useEffect, useMemo, useState } from "react"
import { RouterProvider } from "react-router-dom"
import { router } from "./app/routes"
import InstallPrompt from "./app/InstallPrompt"
import AppUpdatePrompt from "./app/AppUpdatePrompt"
import GlobalNetworkStatus from "./app/GlobalNetworkStatus"
import { CartProvider } from "./app/cart"
import { ProcessLoadingProvider } from "./app/process-loading"
import { warmLabCatalogSearchIndex } from "./services/labApi"
import { bindPushRegistrationToAuth } from "./services/pushNotifications"
import "./App.css"


function isMobileDevice() {
  if (typeof window === "undefined") return true
  const ua = navigator.userAgent || navigator.vendor || ""
  const mobileUa = /android|iphone|ipod|mobile/i.test(ua)
  const compactViewport = window.matchMedia("(max-width: 540px)").matches
  return mobileUa || compactViewport
}

function InstallOnMobileOnly() {
  return (
    <main className="mobile-only-gate">
      <section className="mobile-only-content">
        <img src="/logo.png" alt="Astikan" />
        <div>
          <span>Astikan</span>
          <h1>Install the app on mobile</h1>
          <p>Astikan is available only on mobile devices. Open this link on your Android or iPhone to continue.</p>
        </div>
      </section>
    </main>
  )
}

function App() {
  const [mobileDevice, setMobileDevice] = useState(() => isMobileDevice())
  const mobileOnly = useMemo(() => mobileDevice, [mobileDevice])

  useEffect(() => {
    if (!mobileDevice) return
    void warmLabCatalogSearchIndex()
    return bindPushRegistrationToAuth("user")
  }, [mobileDevice])

  useEffect(() => {
    const updateDeviceMode = () => setMobileDevice(isMobileDevice())
    window.addEventListener("resize", updateDeviceMode)
    window.addEventListener("orientationchange", updateDeviceMode)
    return () => {
      window.removeEventListener("resize", updateDeviceMode)
      window.removeEventListener("orientationchange", updateDeviceMode)
    }
  }, [])

  if (!mobileOnly) return <InstallOnMobileOnly />

  return (
    <ProcessLoadingProvider>
      <CartProvider>
        <RouterProvider router={router} />
        <GlobalNetworkStatus />
        <InstallPrompt />
        <AppUpdatePrompt />
      </CartProvider>
    </ProcessLoadingProvider>
  )
}

export default App
