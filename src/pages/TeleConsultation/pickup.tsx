import { useEffect, useMemo, useRef, useState } from "react"
import { FiArrowLeft, FiCheckCircle, FiMapPin } from "react-icons/fi"
import { useLocation, useNavigate } from "react-router-dom"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { getAddressSnapshot } from "../../services/addressStore"
import "./pickup.css"

type PickupDoctor = {
  id: string
  name: string
  specialty: string
  distance: string
  eta: string
  avatar: string
  practiceAddress?: string | null
}

export default function OpdPickup() {
  const navigate = useNavigate()
  const { state } = useLocation() as {
    state?: {
      doctor?: PickupDoctor
      analysisQuery?: string
      selectedSymptoms?: string[]
    }
  }
  const doctor = state?.doctor
  const [showScheduled, setShowScheduled] = useState(false)
  const [mapError, setMapError] = useState("")
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const originMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null)

  const { homeAddress } = getAddressSnapshot()
  const address = useMemo(() => homeAddress || "Add your home address in Settings", [homeAddress])
  const destinationAddress = useMemo(() => {
    if (doctor?.practiceAddress) return doctor.practiceAddress
    return "Astikan OPD Clinic, Connaught Place, New Delhi"
  }, [doctor?.practiceAddress])
  const userInitial = (address.trim()[0] || "U").toUpperCase()

  const mapboxTokenRaw = (import.meta as any).env?.VITE_MAPBOX_TOKEN
  const mapboxToken =
    typeof mapboxTokenRaw === "string" && mapboxTokenRaw.trim() && mapboxTokenRaw !== "undefined" && mapboxTokenRaw !== "null"
      ? mapboxTokenRaw
      : ""
  const canRenderMap = useMemo(() => mapboxToken.trim().length > 0, [mapboxToken])

  async function geocodeAddress(query: string, signal?: AbortSignal) {
    if (!query.trim() || !mapboxToken.trim()) return null
    const url =
      "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
      encodeURIComponent(query) +
      `.json?limit=1&country=IN&access_token=${mapboxToken}`
    const response = await fetch(url, { signal })
    if (!response.ok) return null
    const data = (await response.json()) as {
      features?: Array<{ center?: [number, number] }>
    }
    const coords = data.features?.[0]?.center
    if (!coords) return null
    return { lon: coords[0], lat: coords[1] }
  }

  type RouteResponse = {
    geometry: { coordinates: [number, number][] }
    duration?: number
  }

  async function fetchRoute(
    origin: { lon: number; lat: number },
    destination: { lon: number; lat: number },
  ): Promise<RouteResponse> {
    const url =
      "https://api.mapbox.com/directions/v5/mapbox/driving-traffic/" +
      `${origin.lon},${origin.lat};${destination.lon},${destination.lat}` +
      `?geometries=geojson&overview=full&access_token=${mapboxToken}`
    const response = await fetch(url)
    if (!response.ok) throw new Error("Unable to fetch route")
    const data = (await response.json()) as { routes?: RouteResponse[] }
    const route = data.routes?.[0]
    if (!route?.geometry?.coordinates) throw new Error("No route available")
    return route
  }

  useEffect(() => {
    if (!canRenderMap || !mapContainerRef.current || mapRef.current) return
    mapboxgl.accessToken = mapboxToken
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center: [77.5946, 12.9716],
      zoom: 11.6,
      pitch: 55,
      bearing: -18,
      antialias: true,
    })
    const hideLabels = () => {
      const style = map.getStyle()
      style.layers?.forEach((layer) => {
        const id = layer.id.toLowerCase()
        const hasText =
          layer.type === "symbol" && Boolean((layer.layout as any)?.["text-field"])
        const looksLikeLabel =
          id.includes("label") ||
          id.includes("place") ||
          id.includes("road") ||
          id.includes("highway") ||
          id.includes("poi") ||
          id.includes("airport")
        if (hasText || looksLikeLabel) {
          map.setLayoutProperty(layer.id, "visibility", "none")
        }
      })
    }

    map.on("load", () => {
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      })
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.3 })
      hideLabels()
    })

    map.on("styledata", hideLabels)
    map.on("error", (event) => {
      const err = (event as { error?: Error }).error
      console.error("Mapbox error", err ?? event)
      setMapError("Map unavailable right now.")
    })

    map.scrollZoom.disable()
    map.boxZoom.disable()
    map.dragPan.disable()
    map.dragRotate.disable()
    map.keyboard.disable()
    map.doubleClickZoom.disable()
    map.touchZoomRotate.disable()
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [canRenderMap, mapboxToken])

  useEffect(() => {
    if (!canRenderMap) return
    const controller = new AbortController()
    let interval: number | undefined

    async function updateRoute() {
      try {
        const origin = await geocodeAddress(address, controller.signal)
        const destination = await geocodeAddress(destinationAddress, controller.signal)
        if (!origin || !destination) return
        const route = await fetchRoute(origin, destination)
        const map = mapRef.current
        if (!map) return

        const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: route.geometry?.coordinates ?? [],
          },
        }

        if (map.getSource("pickup-route")) {
          const source = map.getSource("pickup-route") as mapboxgl.GeoJSONSource
          source.setData(geojson)
        } else {
          map.addSource("pickup-route", {
            type: "geojson",
            data: geojson,
          })
          map.addLayer({
            id: "pickup-route-line",
            type: "line",
            source: "pickup-route",
            paint: {
              "line-color": "#7c3aed",
              "line-width": 5,
              "line-opacity": 0.9,
            },
          })
        }

        if (originMarkerRef.current) originMarkerRef.current.remove()
        if (destinationMarkerRef.current) destinationMarkerRef.current.remove()

        const userEl = document.createElement("div")
        userEl.className = "map-marker map-marker--user"
        userEl.textContent = userInitial
        originMarkerRef.current = new mapboxgl.Marker({ element: userEl })
          .setLngLat([origin.lon, origin.lat])
          .addTo(map)

        const clinicEl = document.createElement("div")
        clinicEl.className = "map-marker map-marker--clinic"
        clinicEl.innerHTML = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7zm0 9.5A2.5 2.5 0 1 0 12 6a2.5 2.5 0 0 0 0 5.5z\"/></svg>"
        destinationMarkerRef.current = new mapboxgl.Marker({ element: clinicEl })
          .setLngLat([destination.lon, destination.lat])
          .addTo(map)

        const bounds = new mapboxgl.LngLatBounds()
        bounds.extend([origin.lon, origin.lat])
        bounds.extend([destination.lon, destination.lat])
        map.fitBounds(bounds, { padding: 60, maxZoom: 14 })
        setMapError("")

        if (typeof route.duration === "number") {
          setEtaMinutes(Math.max(1, Math.round(route.duration / 60)))
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
        console.error("Mapbox route error", error)
        setMapError("Unable to load route.")
      }
    }

    updateRoute()
    interval = window.setInterval(updateRoute, 60000)
    return () => {
      controller.abort()
      if (interval) window.clearInterval(interval)
    }
  }, [address, canRenderMap, destinationAddress, userInitial])

  function scheduleLater() {
    setShowScheduled(true)
    window.setTimeout(() => setShowScheduled(false), 1800)
  }

  function bookNow() {
    if (!doctor) return
    navigate("/teleconsultation", {
      state: {
        selectedDoctorId: doctor.id,
        startRide: true,
      },
    })
  }

  return (
    <main className="opd-pickup-page app-page-enter">
      <header className="opd-pickup-header app-fade-stagger">
        <button className="pickup-back app-pressable" type="button" aria-label="Back" onClick={() => navigate(-1)}>
          <FiArrowLeft />
        </button>
        <div>
          <h1>OPD Visit</h1>
          <p>Confirm appointment details before booking.</p>
        </div>
      </header>

      <section className="opd-pickup-content app-content-slide">
        {doctor && (
          <article className="selected-doctor app-fade-stagger">
            <img src={doctor.avatar} alt={doctor.name} />
            <div>
              <h2>{doctor.name}</h2>
              <p>{doctor.specialty}</p>
              <span>{doctor.distance} • ETA {doctor.eta}</span>
            </div>
          </article>
        )}

        <section className="pickup-block app-fade-stagger">
          <h3>Visit details</h3>
          <div className="pickup-grid pickup-grid--single">
            <div className="pickup-card pickup-card--static">
              <span className="pickup-icon">
                <FiMapPin />
              </span>
              <h4>Clinic visit</h4>
              <p>Confirm your location and clinic before booking.</p>
              <b className="pickup-pill green">{etaMinutes ? `ETA ${etaMinutes} mins` : "ETA"}</b>
            </div>
          </div>
        </section>

        <article className="pickup-map app-fade-stagger">
          {!canRenderMap && <div className="mapbox-fallback">Map unavailable right now.</div>}
          {mapError && <div className="mapbox-error">{mapError}</div>}
          {canRenderMap && <div ref={mapContainerRef} className="mapbox-container" />}
        </article>

        <p className="pickup-address app-fade-stagger">
          <FiMapPin /> Your Address: {address}
        </p>
        <p className="pickup-address pickup-address--clinic app-fade-stagger">
          <FiMapPin /> Clinic Address: {destinationAddress}
        </p>
      </section>

      <footer className="pickup-footer app-fade-stagger">
        <button className="pickup-secondary app-pressable" type="button" onClick={scheduleLater}>
          Schedule Later
        </button>
        <button className="pickup-primary app-pressable" type="button" onClick={bookNow}>
          Book Now
        </button>
      </footer>

      {showScheduled && (
        <div className="pickup-toast app-page-enter" role="status">
          <FiCheckCircle /> Visit scheduled for later.
        </div>
      )}
    </main>
  )
}
