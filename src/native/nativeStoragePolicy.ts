import { Capacitor } from "@capacitor/core"

const AUTH_STORAGE_KEYS = new Set([
  "astikan_user_auth",
  "astikan_user_company",
])

function clearNonAuthEntries(storage: Storage) {
  const keys: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key && !AUTH_STORAGE_KEYS.has(key)) keys.push(key)
  }
  keys.forEach((key) => storage.removeItem(key))
}

function enforceAuthOnlyWrites() {
  const originalSetItem = Storage.prototype.setItem
  Storage.prototype.setItem = function setAuthStorageItem(key: string, value: string) {
    if (AUTH_STORAGE_KEYS.has(String(key))) {
      originalSetItem.call(this, key, value)
    }
  }
}

export function initializeNativeStoragePolicy() {
  if (!Capacitor.isNativePlatform()) return

  clearNonAuthEntries(window.localStorage)
  clearNonAuthEntries(window.sessionStorage)
  enforceAuthOnlyWrites()

  if ("caches" in window) {
    void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
  }

  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.getRegistrations().then((registrations) =>
      Promise.all(registrations.map((registration) => registration.unregister())),
    )
  }
}
