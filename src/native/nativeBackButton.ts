import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

let initialized = false;

export function setupNativeBackButton() {
  if (initialized) return;
  if (!Capacitor.isNativePlatform()) return;

  initialized = true;

  const homePaths = new Set(["/", "/home", "/dashboard"]);

  CapacitorApp.addListener("backButton", async (event: { canGoBack?: boolean }) => {
    const canGoBack = Boolean(event.canGoBack);
    const currentPath = window.location.pathname;

    if (!homePaths.has(currentPath) && canGoBack) {
      window.history.back();
      return;
    }

    if (!homePaths.has(currentPath) && window.history.length > 1) {
      window.history.back();
      return;
    }

    await CapacitorApp.minimizeApp();
  });
}
