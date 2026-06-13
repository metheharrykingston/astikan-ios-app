import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "mapbox-gl/dist/mapbox-gl.css"
import "./styles/globals.css"
import { initClarity } from "./services/clarity"
import { initializeNativeStoragePolicy } from "./native/nativeStoragePolicy"

async function lockEmployeeOrientation() {
  if (typeof window === "undefined") return
  try {
    const orientationApi = window.screen?.orientation as { lock?: (orientation: string) => Promise<void> } | undefined
    if (orientationApi?.lock) {
      await orientationApi.lock("portrait-primary")
    }
  } catch {
    // Ignore unsupported orientation lock failures on browsers/webviews.
  }
}

initializeNativeStoragePolicy()
void lockEmployeeOrientation()
initClarity()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
