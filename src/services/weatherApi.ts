export type WeatherSnapshot = {
  tempC: number
  condition: string
  humidity: number
  windKph: number
  location: string
  aqi?: number | null
  pm25?: number | null
  pm10?: number | null
}

export async function fetchWeather(lat: number, lon: number) {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
  })
  const res = await fetch(`/api/weather/now?${params.toString()}`)
  const data = await res.json()
  if (!res.ok || data.status !== "ok") {
    throw new Error(data.message || "Weather unavailable")
  }
  return data.data as WeatherSnapshot
}
