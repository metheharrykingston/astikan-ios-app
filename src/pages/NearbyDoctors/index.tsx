import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FiArrowLeft, FiInfo, FiMapPin, FiNavigation, FiRefreshCw, FiSearch, FiStar, FiUser } from "react-icons/fi"
import AppBottomNav from "../../components/AppBottomNav"
import { apiGet } from "../../services/api"
import { fetchNearbyDoctors, type NearbyDoctorPlace } from "../../services/doctorsApi"
import { goBackOrFallback } from "../../utils/navigation"
import "./nearby-doctors.css"

type UserLocation = { lat: number; lng: number }
type RadiusOption = 5 | 10 | 20

const RADIUS_OPTIONS: RadiusOption[] = [5, 10, 20]

function distanceKm(from: UserLocation | null, to: NearbyDoctorPlace["location"]) {
  if (!from || !Number.isFinite(to.lat) || !Number.isFinite(to.lng)) return null
  const earthKm = 6371
  const dLat = ((to.lat - from.lat) * Math.PI) / 180
  const dLng = ((to.lng - from.lng) * Math.PI) / 180
  const lat1 = (from.lat * Math.PI) / 180
  const lat2 = (to.lat * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function prettyType(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Doctor"
}

function clean(value: unknown) {
  return String(value ?? "").trim()
}

function buildAddressLabel(data: Record<string, unknown>) {
  const label = [
    clean(data.line1),
    clean(data.locality),
    clean(data.city),
    clean(data.state),
  ].filter(Boolean)
  return label.join(", ") || "Current location"
}

export default function NearbyDoctors() {
  const navigate = useNavigate()
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [addressLabel, setAddressLabel] = useState("Detecting your location...")
  const [doctors, setDoctors] = useState<NearbyDoctorPlace[]>([])
  const [query, setQuery] = useState("")
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<RadiusOption>(5)
  const [locating, setLocating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [hasSearched, setHasSearched] = useState(false)

  const filteredDoctors = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = q
      ? doctors.filter((doctor) =>
          doctor.name.toLowerCase().includes(q) ||
          doctor.address.toLowerCase().includes(q) ||
          doctor.primaryType.toLowerCase().includes(q) ||
          doctor.types.some((type) => type.toLowerCase().includes(q)),
        )
      : doctors
    return rows.sort((a, b) => {
      const aDistance = distanceKm(location, a.location) ?? Number.POSITIVE_INFINITY
      const bDistance = distanceKm(location, b.location) ?? Number.POSITIVE_INFINITY
      return aDistance - bDistance
    })
  }, [doctors, location, query])

  async function resolveAddress(nextLocation: UserLocation) {
    const data = await apiGet<Record<string, unknown>>(
      `/location/reverse-geocode?lat=${encodeURIComponent(String(nextLocation.lat))}&lng=${encodeURIComponent(String(nextLocation.lng))}`,
    )
    setAddressLabel(buildAddressLabel(data))
  }

  async function loadNearby(nextLocation: UserLocation, radiusKm: RadiusOption) {
    setError("")
    setLoading(true)
    try {
      const result = await fetchNearbyDoctors({
        lat: nextLocation.lat,
        lng: nextLocation.lng,
        radius: radiusKm * 1000,
        limit: 12,
      })
      setDoctors(result.doctors || [])
      setHasSearched(true)
      if (!result.doctors?.length) {
        setError("No nearby doctor listings were found around this location. Try a wider radius.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to find nearby doctors right now.")
    } finally {
      setLoading(false)
    }
  }

  function useCurrentLocation() {
    setError("")
    setLocating(true)
    if (!navigator.geolocation) {
      setLocating(false)
      setAddressLabel("Location is not available on this device.")
      setError("Location is not available on this device. Please enable location services.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setLocation(nextLocation)
        try {
          await resolveAddress(nextLocation)
        } catch {
          setAddressLabel("Current location")
        } finally {
          setLocating(false)
        }
      },
      () => {
        setLocating(false)
        setAddressLabel("Location permission needed")
        setError("Location permission is needed to find nearby doctors.")
      },
      { enableHighAccuracy: true, timeout: 14000, maximumAge: 60000 },
    )
  }

  useEffect(() => {
    useCurrentLocation()
  }, [])

  useEffect(() => {
    if (!location) return
    void loadNearby(location, selectedRadiusKm)
  }, [location, selectedRadiusKm])

  function bookDoctor(doctor: NearbyDoctorPlace) {
    navigate("/nearby-doctors/consult", { state: { doctor, userLocation: location } })
  }

  return (
    <main className="nearby-page app-page-enter">
      <header className="nearby-header">
        <button className="nearby-back app-pressable" type="button" onClick={() => goBackOrFallback(navigate, "/home")} aria-label="Back">
          <FiArrowLeft />
        </button>
        <div className="nearby-header-copy">
          <h1>Doctors</h1>
          <p>{addressLabel}</p>
        </div>
        <button className="nearby-location-pill app-pressable" type="button" onClick={useCurrentLocation} aria-label="Refresh location" disabled={locating || loading}>
          <FiRefreshCw />
        </button>
      </header>

      <section className="nearby-content">
        <div className="nearby-search-card">
          <FiSearch />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search doctor, clinic or address" />
        </div>

        <section className="nearby-hero-card">
          <div className="nearby-hero-icon"><FiNavigation /></div>
          <div>
            <h2>{locating ? "Finding your live location" : "Doctors around your live location"}</h2>
            <p>{addressLabel}</p>
          </div>
          <button className="nearby-primary-btn app-pressable" type="button" onClick={useCurrentLocation} disabled={loading || locating}>
            {locating ? "Detecting..." : loading ? "Refreshing..." : "Refresh location"}
          </button>
        </section>

        <div className="nearby-filter-row">
          <span className="nearby-filter-chip nearby-filter-chip--static active"><FiUser /> Doctors</span>
          {RADIUS_OPTIONS.map((radiusKm) => (
            <button
              key={radiusKm}
              className={`nearby-filter-chip app-pressable ${selectedRadiusKm === radiusKm ? "active" : ""}`}
              type="button"
              onClick={() => setSelectedRadiusKm(radiusKm)}
            >
              <FiMapPin /> {radiusKm} km
            </button>
          ))}
        </div>

        {error ? <div className="nearby-alert"><FiInfo /> {error}</div> : null}

        <section className="nearby-list">
          {filteredDoctors.map((doctor) => {
            const km = distanceKm(location, doctor.location)
            return (
              <article className="nearby-doctor-card" key={doctor.placeId}>
                <div className="nearby-blur-avatar" aria-hidden="true"><FiUser /></div>
                <div className="nearby-doctor-main">
                  <div className="nearby-title-row">
                    <h3>{doctor.name}</h3>
                    {typeof doctor.rating === "number" ? <span className="nearby-rating"><FiStar /> {doctor.rating.toFixed(1)}</span> : null}
                  </div>
                  <strong>{prettyType(doctor.primaryType)}</strong>
                  <p><FiMapPin /> {doctor.address}</p>
                  <div className="nearby-meta-row">
                    {typeof km === "number" ? <span><FiMapPin /> {km.toFixed(km < 10 ? 1 : 0)} km away</span> : null}
                    <span>{doctor.types.slice(0, 2).map(prettyType).join(" • ")}</span>
                  </div>
                  <button className="nearby-book-btn app-pressable" type="button" onClick={() => bookDoctor(doctor)}>Book Now</button>
                </div>
              </article>
            )
          })}

          {!loading && hasSearched && filteredDoctors.length === 0 ? (
            <div className="nearby-empty">
              <h3>No doctors found</h3>
              <p>Try refreshing your location or switch to a wider distance tab.</p>
            </div>
          ) : null}
        </section>

        <div className="nearby-note"><FiInfo /> Nearby results are public map listings. Availability, slot and consultation price are confirmed by Astikan.</div>
      </section>
      <AppBottomNav active="Doctor" />
    </main>
  )
}
