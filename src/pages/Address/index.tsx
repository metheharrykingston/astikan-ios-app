import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FiArrowLeft, FiBriefcase, FiCheckCircle, FiHome, FiMapPin, FiNavigation } from "react-icons/fi"
import { getAddressProfile, saveHomeAddress } from "../../services/addressApi"
import { HOME_ADDRESS_KEY, OFFICE_ADDRESS_KEY, syncAddressCache } from "../../services/addressStore"
import "./address.css"

function splitAddress(value?: string | null) {
  if (!value) return ["", ""]
  const normalized = value.replace(/\r\n/g, "\n")
  const [line1, line2] = normalized.split("\n")
  if (line2) return [line1?.trim() ?? "", line2.trim()]
  const parts = normalized.split(",")
  if (parts.length > 1) {
    return [parts.slice(0, 2).join(",").trim(), parts.slice(2).join(",").trim()]
  }
  return [normalized.trim(), ""]
}

function formatDateTime(value?: string) {
  if (!value) return "Not saved yet"
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function Address() {
  const navigate = useNavigate()
  const [homeLine1, setHomeLine1] = useState("")
  const [homeLine2, setHomeLine2] = useState("")
  const [officeLine1, setOfficeLine1] = useState("")
  const [officeLine2, setOfficeLine2] = useState("")
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState("")
  const [error, setError] = useState("")
  const coordsRef = useRef<{ lat: number; lon: number } | null>(null)

  const homeAddress = [homeLine1, homeLine2].filter(Boolean).join("\n")
  const officeAddress = [officeLine1, officeLine2].filter(Boolean).join("\n")

  useEffect(() => {
    const raw = localStorage.getItem(HOME_ADDRESS_KEY)
    if (raw) {
      const [line1, line2] = splitAddress(raw)
      setHomeLine1(line1)
      setHomeLine2(line2)
    }
    const officeRaw = localStorage.getItem(OFFICE_ADDRESS_KEY)
    if (officeRaw) {
      const [line1, line2] = splitAddress(officeRaw)
      setOfficeLine1(line1)
      setOfficeLine2(line2)
    }
    let active = true
    void (async () => {
      try {
        const { address } = await getAddressProfile()
        if (!active) return
        if (address?.homeAddress) {
          const [line1, line2] = splitAddress(address.homeAddress)
          setHomeLine1(line1)
          setHomeLine2(line2)
        }
        if (address?.officeAddress) {
          const [line1, line2] = splitAddress(address.officeAddress)
          setOfficeLine1(line1)
          setOfficeLine2(line2)
        }
        if (address && typeof address.homeLat === "number" && typeof address.homeLon === "number") {
          coordsRef.current = { lat: address.homeLat, lon: address.homeLon }
        }
        setUpdatedAt(address?.updatedAt ?? "")
        syncAddressCache({
          homeAddress: address?.homeAddress ?? raw ?? "",
          officeAddress: address?.officeAddress ?? officeRaw ?? "",
          primary: "home",
        })
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load address")
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  async function suggestFromGps() {
    if (!navigator.geolocation) {
      setError("GPS not available")
      return
    }
    setLocating(true)
    setError("")
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        coordsRef.current = { lat, lon }
        try {
          const url = new URL("https://nominatim.openstreetmap.org/reverse")
          url.searchParams.set("format", "json")
          url.searchParams.set("lat", String(lat))
          url.searchParams.set("lon", String(lon))
          url.searchParams.set("zoom", "18")
          url.searchParams.set("addressdetails", "1")
          const res = await fetch(url.toString(), {
            headers: { "User-Agent": "AstikanApp/1.0" },
          })
          const data = await res.json()
          const display = data?.display_name as string | undefined
          if (display) {
            const [line1, line2] = splitAddress(display)
            setHomeLine1(line1)
            setHomeLine2(line2)
          }
        } catch {
          setError("Unable to fetch address suggestion")
        } finally {
          setLocating(false)
        }
      },
      () => {
        setLocating(false)
        setError("Location permission denied")
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function handleSave() {
    const trimmed = homeAddress.trim()
    if (!trimmed) return
    setSaving(true)
    setError("")
    try {
      await saveHomeAddress({
        homeAddress: trimmed,
        homeLat: coordsRef.current?.lat ?? null,
        homeLon: coordsRef.current?.lon ?? null,
        officeAddress: officeAddress.trim(),
      })
      syncAddressCache({
        homeAddress: trimmed,
        officeAddress: officeAddress.trim(),
        primary: "home",
      })
      setUpdatedAt(new Date().toISOString())
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1400)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save address")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="address-page app-page-enter">
      <header className="address-header app-fade-stagger">
        <button className="address-back app-pressable" onClick={() => navigate(-1)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <div>
          <h1>Saved Address</h1>
          <p>Used for medicine delivery, home collection, and support routing.</p>
        </div>
      </header>

      <section className="address-shell app-content-slide">
        {loading && <div className="address-inline-state address-loading">Loading saved addresses...</div>}
        {error && <div className="address-inline-state address-error">{error}</div>}

        <article className="address-hero-card app-fade-stagger">
          <div className="address-hero-top">
            <span className="address-kicker">Delivery Profile</span>
            <span className={`address-save-pill ${saved ? "saved" : ""}`}>{saved ? "Saved" : "Home address active"}</span>
          </div>
          <h2>Home pickup and medicine delivery</h2>
          <p>Last sync {formatDateTime(updatedAt)}</p>
          <div className="address-hero-stats">
            <div className="address-stat-tile">
              <small>Home Address</small>
              <strong>{homeAddress.trim() ? "Available" : "Missing"}</strong>
            </div>
            <div className="address-stat-tile">
              <small>Office Address</small>
              <strong>{officeAddress.trim() ? "Available" : "Pending"}</strong>
            </div>
          </div>
        </article>

        <article className="address-card app-fade-stagger">
          <div className="address-card-head">
            <div className="address-card-title">
              <span className="address-card-icon"><FiHome /></span>
              <div>
                <h3>Home Address</h3>
                <p>This is editable and used for doorstep services.</p>
              </div>
            </div>
          </div>

          <div className="address-toolbar">
            <button className="gps-btn app-pressable" type="button" onClick={suggestFromGps} disabled={locating} aria-label="Use GPS">
              <FiNavigation />
              {locating ? "Locating..." : "Use Current Location"}
            </button>
          </div>

          <div className="address-form-grid">
            <label htmlFor="homeLine1">
              <span>Address line 1</span>
              <input id="homeLine1" placeholder="House / Flat / Street" value={homeLine1} onChange={(event) => setHomeLine1(event.target.value)} />
            </label>
            <label htmlFor="homeLine2">
              <span>Address line 2</span>
              <input id="homeLine2" placeholder="Area, landmark, city details" value={homeLine2} onChange={(event) => setHomeLine2(event.target.value)} />
            </label>
          </div>

          <div className="address-preview">
            <span><FiMapPin /> Preview</span>
            <strong>{homeAddress.trim() || "No home address saved yet"}</strong>
          </div>

          <div className="address-actions">
            <button className="address-save-btn app-pressable" type="button" onClick={handleSave} disabled={saving || !homeAddress.trim()}>
              {saving ? "Saving..." : saved ? "Saved" : "Save Home Address"}
            </button>
          </div>
        </article>

        <article className="address-card app-fade-stagger">
          <div className="address-card-head">
            <div className="address-card-title">
              <span className="address-card-icon office"><FiBriefcase /></span>
              <div>
                <h3>Office Address</h3>
                <p>Managed centrally from your company profile.</p>
              </div>
            </div>
            <span className="address-lock-pill"><FiCheckCircle /> Verified</span>
          </div>

          <div className="address-office-block">
            <strong>{officeLine1 || "Office address not added"}</strong>
            {officeLine2 && <p>{officeLine2}</p>}
            {!officeLine1 && <p>Your company can update this from the admin side.</p>}
          </div>
        </article>
      </section>
    </main>
  )
}
