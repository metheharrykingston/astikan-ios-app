import { apiGet } from "./api"

export type IndianPincodeLookup = {
  state: string
  city: string
  district: string
  locality: string
  line2: string
  pincode: string
}

function clean(value: unknown) {
  return String(value ?? "").trim()
}

export async function lookupIndianPincode(pincode: string): Promise<IndianPincodeLookup | null> {
  const pin = clean(pincode).replace(/\D/g, "").slice(0, 6)
  if (!/^[1-9][0-9]{5}$/.test(pin)) return null
  const result = await apiGet<any>(`/location/pincode/${encodeURIComponent(pin)}`)
  if (!result?.found) return null
  return {
    state: clean(result.state),
    city: clean(result.city || result.district),
    district: clean(result.district || result.city),
    locality: clean(result.locality || result.areas?.[0]),
    line2: clean(result.line2 || [result.locality || result.areas?.[0], result.city || result.district, result.state].filter(Boolean).join(", ")),
    pincode: pin,
  }
}

export type GeoAddressDraft = {
  line1: string
  line2: string
  state: string
  city: string
  pincode: string
  country: string
  latitude?: number
  longitude?: number
}

export async function reverseGeocodeFromBrowserLocation(): Promise<GeoAddressDraft> {
  if (!navigator.geolocation) throw new Error("Live location is not supported on this device.")
  const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => reject(new Error("Location permission is required to auto-fill your address.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  })
  const data = await apiGet<Record<string, unknown>>(
    `/location/reverse-geocode?lat=${encodeURIComponent(String(coords.latitude))}&lng=${encodeURIComponent(String(coords.longitude))}`,
  )
  return {
    line1: clean(data.line1) || "Current location",
    line2: clean(data.line2),
    state: clean(data.state),
    city: clean(data.city),
    pincode: clean(data.pincode).replace(/\D/g, "").slice(0, 6),
    country: clean(data.country) || "India",
    latitude: coords.latitude,
    longitude: coords.longitude,
  }
}
