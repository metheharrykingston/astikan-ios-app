import { FiArrowLeft, FiClock, FiFileText, FiMapPin } from "react-icons/fi"
import { RiTestTubeLine } from "react-icons/ri"
import { useEffect, useMemo, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import "./labtest.css"

type LabTestItem = {
  id: string
  color: "red" | "blue" | "gray" | "green" | "outline"
  name: string
  desc: string
  tag: string
  duration: string
  fasting: string
  quick?: string
  code?: string
}

export default function LabBookNowStep3() {
  const navigate = useNavigate()
  const { state } = useLocation() as {
    state?: {
      selectedTest?: LabTestItem
      collectionType?: string
      address?: string
      readinessQuestions?: Array<{ id: string; question: string; options: Array<{ value: string; label: string }> }>
      readiness?: Record<string, "yes" | "no">
    }
  }

  const mapboxTokenRaw = (import.meta as any).env?.VITE_MAPBOX_TOKEN
  const mapboxToken =
    typeof mapboxTokenRaw === "string" && mapboxTokenRaw.trim() && mapboxTokenRaw !== "undefined" && mapboxTokenRaw !== "null"
      ? mapboxTokenRaw
      : ""
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const originMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const NIRAMAYA_DELHI_ADDRESS =
    "NirAmaya PathLabs Private Limited, B-4, New Multan Nagar, Near Paschim Vihar Metro, Pillor No. 233, New Delhi-110056"

  const test =
    state?.selectedTest ??
    ({
      id: "cbc",
      color: "red",
      name: "Complete Blood Count (CBC)",
      desc: "Comprehensive blood analysis",
      tag: "Blood Test",
      duration: "15 mins test",
      fasting: "No fasting required",
    } as LabTestItem)

  const canRenderMap = useMemo(() => mapboxToken.trim().length > 0, [mapboxToken])
  const addressValue = state?.address ?? ""
  const addressLabel = addressValue || "Selected address"
  const userInitial = (addressLabel.trim()[0] || "U").toUpperCase()
  const now = new Date()
  const bookingDate = now.toISOString().slice(0, 10)
  const bookingTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })

  async function geocodeAddress(query: string, signal?: AbortSignal) {
    if (!query.trim()) return null
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

  async function fetchRoute(origin: { lon: number; lat: number }, destination: { lon: number; lat: number }) {
    const url =
      "https://api.mapbox.com/directions/v5/mapbox/driving-traffic/" +
      `${origin.lon},${origin.lat};${destination.lon},${destination.lat}` +
      `?geometries=geojson&overview=full&access_token=${mapboxToken}`
    const response = await fetch(url)
    if (!response.ok) throw new Error("Unable to fetch route")
    const data = (await response.json()) as {
      routes?: Array<{ geometry?: { coordinates: [number, number][] }; distance?: number; duration?: number }>
    }
    const route = data.routes?.[0]
    if (!route?.geometry?.coordinates) throw new Error("No route available")
    return route
  }

  useEffect(() => {
    if (!mapboxToken.trim()) {
      console.error("Mapbox token missing")
    }
  }, [mapboxToken])

  useEffect(() => {
    if (!canRenderMap || !mapContainerRef.current || mapRef.current) return
    mapboxgl.accessToken = mapboxToken
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center: [77.209, 28.6139],
      zoom: 11.4,
      pitch: 55,
      bearing: -25,
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
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.4 })

      if (!map.getLayer("3d-buildings") && map.getSource("composite")) {
        map.addLayer({
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 14,
          paint: {
            "fill-extrusion-color": "#d5dbe6",
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.85,
          },
        })
      }

      hideLabels()
    })

    map.on("styledata", hideLabels)
    map.on("error", (event) => {
      const err = (event as { error?: Error }).error
      console.error("Mapbox error", err ?? event)
    })

    map.scrollZoom.disable()
    map.boxZoom.disable()
    map.dragPan.disable()
    map.dragRotate.disable()
    map.keyboard.disable()
    map.doubleClickZoom.disable()
    map.touchZoomRotate.disable()
    mapRef.current = map
  }, [canRenderMap, mapboxToken])

  useEffect(() => {
    if (!canRenderMap || !addressValue) return
    const controller = new AbortController()
    let interval: number | undefined

    async function updateRoute() {
      try {
        const origin = await geocodeAddress(addressValue, controller.signal)
        const destination = await geocodeAddress(NIRAMAYA_DELHI_ADDRESS, controller.signal)
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

        if (map.getSource("route")) {
          const source = map.getSource("route") as mapboxgl.GeoJSONSource
          source.setData(geojson)
        } else {
          map.addSource("route", {
            type: "geojson",
            data: geojson,
          })
          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            paint: {
              "line-color": "#5b8cff",
              "line-width": 5,
              "line-opacity": 0.88,
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

        const labEl = document.createElement("div")
        labEl.className = "map-marker map-marker--lab"
        labEl.innerHTML = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M9 3h6v2l-1 1v4.3l4.6 7.7A3 3 0 0 1 15.9 22H8.1a3 3 0 0 1-2.7-4.5L10 10.3V6L9 5V3zm2 6.7L7.1 18a1 1 0 0 0 .9 1.5h7.8a1 1 0 0 0 .9-1.5L13 9.7V6h-2v3.7z\"/></svg>"
        destinationMarkerRef.current = new mapboxgl.Marker({ element: labEl })
          .setLngLat([destination.lon, destination.lat])
          .addTo(map)

        const bounds = new mapboxgl.LngLatBounds()
        bounds.extend([origin.lon, origin.lat])
        bounds.extend([destination.lon, destination.lat])
        map.fitBounds(bounds, { padding: 60, maxZoom: 14 })

      } catch (error) {
        console.error("Mapbox route error", error)
      }
    }

    updateRoute()
    interval = window.setInterval(updateRoute, 60000)
    return () => {
      controller.abort()
      if (interval) window.clearInterval(interval)
    }
  }, [NIRAMAYA_DELHI_ADDRESS, canRenderMap, mapboxToken, addressValue])

  return (
    <div className="lab-page">
      <div className="lab-header">
        <button className="lab-back" onClick={() => navigate(-1)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <div>
          <h1>Lab Test Booking</h1>
          <p>Book tests & get reports online</p>
        </div>
      </div>

      <div className="lab-steps">
        <div className="step done">1. Readiness</div>
        <span>-</span>
        <div className="step done">2. Location</div>
        <span>-</span>
        <div className="step active">3. Confirm</div>
      </div>

      <div className="status-block">
        <div className="status-round">
          <RiTestTubeLine />
        </div>
        <h2>Ready for collection</h2>
        <p>Your selected lab partner is ready to collect your sample.</p>
      </div>

      <div className="lab-test-card static-card" role="presentation">
        <div className={`lab-icon ${test.color}`} />
        <div className="lab-info">
          <h3>{test.name}</h3>
          <p>{test.desc}</p>
          <div className="lab-meta-row">
            <span className="pill">{test.tag}</span>
            <span><FiClock /> Collection-ready slot</span>
          </div>
          <div className="lab-meta-row muted">
            <span><FiFileText /> {test.fasting}</span>
          </div>
        </div>
      </div>

      <div className="map-box live-map">
        {!canRenderMap && <div className="mapbox-fallback">Map unavailable right now.</div>}
        {canRenderMap && <div ref={mapContainerRef} className="mapbox-container" />}
      </div>

      <div className="address-line">
        <FiMapPin /> Address : {addressLabel}
      </div>

      <div className="bottom-buttons single">
        <button
          className="btn-primary"
          onClick={() =>
            navigate("/lab-tests/confirm", {
              state: {
                selectedTest: test,
                collectionType: state?.collectionType,
                address: state?.address,
                date: bookingDate,
                time: bookingTime,
                etaMinutes: null,
                etaStartAt: null,
                readinessQuestions: state?.readinessQuestions,
                readiness: state?.readiness,
              },
            })
          }
          type="button"
        >
          Continue to Payment
        </button>
      </div>
    </div>
  )
}
