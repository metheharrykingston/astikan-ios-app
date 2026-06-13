import { useEffect, useMemo, useRef, useState } from "react"
import {
  FiArrowLeft,
  FiChevronDown,
  FiChevronUp,
  FiShoppingCart,
  FiStar,
} from "react-icons/fi"
import { useNavigate, useParams } from "react-router-dom"
import { fetchPharmacyProducts, lookupPharmacyProducts } from "../../services/pharmacyApi"
import { findExternalMedicineById, mapProductToMedicine, medicines, readExternalMedicines, type MedicineItem } from "../Pharmacy/medicineData"
import { useCart } from "../../app/cart"
import { playAppSound } from "../../utils/sound"
import "./medicine-detail.css"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i


type PanelId = "about" | "uses" | "dose"
function normaliseMedicineKey(value?: string | null) {
  if (!value) return ""
  const decoded = (() => {
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  })()
  return decoded
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function medicineKeys(item: MedicineItem) {
  return [
    item.id,
    item.name,
    `${item.name}-${item.dose}`,
    `${item.name}-${item.kind}`,
    item.genericName,
  ]
    .map(normaliseMedicineKey)
    .filter(Boolean)
}

export default function MedicineDetail() {
  const navigate = useNavigate()
  const { medicineId } = useParams()
  const [catalog, setCatalog] = useState<MedicineItem[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const medicine = useMemo(() => {
    const requestedKey = normaliseMedicineKey(medicineId)
    const exactExternal = findExternalMedicineById(medicineId)
    const source = [
      ...catalog,
      ...medicines,
      ...readExternalMedicines(),
    ]
    const uniqueSource = Array.from(new Map(source.map((item) => [item.id, item])).values())
    return (
      exactExternal
      ?? uniqueSource.find((item) => item.id === medicineId)
      ?? uniqueSource.find((item) => medicineKeys(item).includes(requestedKey))
    )
  }, [catalog, medicineId])
  const [openPanel, setOpenPanel] = useState<PanelId>("about")
  const [showCartPopup, setShowCartPopup] = useState(false)
  const [lastAddedName, setLastAddedName] = useState("")
  const [activeImage, setActiveImage] = useState(0)
  const { addItem, replaceCartWithItem, totalItems } = useCart()
  const doseRef = useRef<HTMLDivElement | null>(null)

  const upsells = useMemo(() => {
    const source = catalog.length ? catalog : medicines
    return source.filter((item) => item.id !== medicineId).slice(0, 3)
  }, [medicineId, catalog])

  const gallery = useMemo(() => {
    if (!medicine) return []
    return [medicine.image, ...(medicine.images ?? [])].filter(Boolean)
  }, [medicine])


  useEffect(() => {
    let active = true
    async function loadCatalog() {
      setLoadingCatalog(true)
      try {
        if (medicineId && UUID_RE.test(medicineId)) {
          const exact = await lookupPharmacyProducts([medicineId], "employee")
          if (!active) return
          if (exact?.length) {
            setCatalog(exact.map((row) => mapProductToMedicine(row)))
            return
          }
        }

        const searched = medicineId ? await fetchPharmacyProducts({ search: medicineId, limit: 5, audience: "employee" }).catch(() => []) : []
        const rows = searched?.length ? searched : await fetchPharmacyProducts({ limit: 120, audience: "employee" })
        if (!active) return
        if (rows?.length) {
          setCatalog(rows.map((row) => mapProductToMedicine(row)))
        } else {
          setCatalog([])
        }
      } catch {
        if (active) setCatalog([])
      } finally {
        if (active) setLoadingCatalog(false)
      }
    }
    loadCatalog()
    return () => {
      active = false
    }
  }, [medicineId])

  useEffect(() => {
    if (!showCartPopup) return
    const timer = window.setTimeout(() => setShowCartPopup(false), 1800)
    return () => window.clearTimeout(timer)
  }, [showCartPopup])

  if (!medicine) {
    return (
      <main className="medicine-detail-page app-page-enter">
        <header className="medicine-detail-header app-fade-stagger">
          <button className="medicine-detail-back app-pressable" onClick={() => navigate(-1)} type="button" aria-label="Back">
            <FiArrowLeft />
          </button>
          <h1>Medicine Details</h1>
        </header>
        <section className="medicine-detail-shell">
          <article className="medicine-not-found">
            <h2>{loadingCatalog ? "Loading medicine..." : "Medicine not found"}</h2>
            {!loadingCatalog && (
              <button type="button" className="cta-primary app-pressable" onClick={() => navigate("/pharmacy")}>Back to Medicines</button>
            )}
          </article>
        </section>
      </main>
    )
  }

  const currentMedicine = medicine

  function togglePanel(id: PanelId) {
    setOpenPanel((prev) => (prev === id ? "about" : id))
  }

  function addToCart(item: MedicineItem) {
    if (!item.inStock) return
    addItem(item)
    playAppSound("success")
    setLastAddedName(item.name)
    setShowCartPopup(true)
  }

  function handleBuyNow() {
    if (!currentMedicine.inStock) return
    replaceCartWithItem(currentMedicine, 1)
    playAppSound("tap")
    navigate("/pharmacy/checkout", { state: { buyNowMedicineId: currentMedicine.id } })
  }

  return (
    <main className="medicine-detail-page app-page-enter">
      <header className="medicine-detail-header app-fade-stagger">
        <button className="medicine-detail-back app-pressable" onClick={() => navigate(-1)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <div className="medicine-header-title">
          <h1>{currentMedicine.name}</h1>
          <p>{currentMedicine.dose}</p>
        </div>
        <button
          className="medicine-cart-btn app-pressable"
          type="button"
          aria-label="Open cart"
          onClick={() => {
            playAppSound("tap")
            navigate("/cart")
          }}
        >
          <FiShoppingCart />
          {totalItems > 0 && <span>{totalItems}</span>}
        </button>
      </header>

      <section className="medicine-detail-shell app-content-slide">
        <article className="medicine-hero-card app-fade-stagger">
          <div className="medicine-hero-media">
            <img src={gallery[activeImage] || currentMedicine.image} alt={currentMedicine.name} />
            <span className="hero-pill"><FiStar /> Trusted medicine</span>
          </div>
          <div className="medicine-gallery">
            {gallery.slice(0, 5).map((img, index) => (
              <button
                key={`${img}-${index}`}
                type="button"
                className={`gallery-thumb app-pressable ${activeImage === index ? "active" : ""}`}
                onClick={() => setActiveImage(index)}
              >
                <img src={img} alt={`${currentMedicine.name} ${index + 1}`} />
              </button>
            ))}
          </div>
          <div className="medicine-hero-copy">
            <div className="medicine-hero-head">
              <div>
                <h2>{currentMedicine.name}</h2>
                <span className="medicine-title-dose">{currentMedicine.dose}</span>
              </div>
              <span className={`availability ${currentMedicine.inStock ? "in" : "out"}`}>
                {currentMedicine.inStock ? "In stock" : "Currently unavailable"}
              </span>
            </div>
            <p>{currentMedicine.kind}</p>

            <div className="medicine-price-block">
              <strong>₹{Math.round(currentMedicine.sellingPrice ?? currentMedicine.price ?? 0)}</strong>
            </div>

            <div className="hero-facts">
              <article>
                <small>Form</small>
                <strong>{currentMedicine.kind}</strong>
              </article>
              <article>
                <small>Dose</small>
                <strong>{currentMedicine.dose}</strong>
              </article>
              <article>
                <small>Brand</small>
                <strong>{currentMedicine.manufacturer || currentMedicine.name}</strong>
              </article>
            </div>
          </div>
        </article>

        <article className={`medicine-section app-fade-stagger ${openPanel === "about" ? "expanded" : "collapsed"}`}>
          <button className="section-toggle app-pressable" type="button" onClick={() => togglePanel("about")}>
            <h3>About This Medicine</h3>
            {openPanel === "about" ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          {openPanel === "about" && <p>{currentMedicine.overview}</p>}
        </article>

        <article className={`medicine-section app-fade-stagger ${openPanel === "uses" ? "expanded" : "collapsed"}`}>
          <button className="section-toggle app-pressable" type="button" onClick={() => togglePanel("uses")}>
            <h3>Common Uses</h3>
            {openPanel === "uses" ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          {openPanel === "uses" && (
            <ul>
              {currentMedicine.uses.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </article>

        <article ref={doseRef} className={`medicine-section app-fade-stagger ${openPanel === "dose" ? "expanded" : "collapsed"}`}>
          <button className="section-toggle app-pressable" type="button" onClick={() => togglePanel("dose")}>
            <h3>Dose Guidance</h3>
            {openPanel === "dose" ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          {openPanel === "dose" && (
            <ul>
              {currentMedicine.doseGuide.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </article>


        <section className="upsell-section app-fade-stagger">
          <div className="upsell-head">
            <h3>You may also need</h3>
            <p>Frequently bought with this medicine</p>
          </div>
          <div className="upsell-list">
            {upsells.map((item) => (
              <article key={item.id} className="upsell-card">
                <button type="button" className="upsell-main app-pressable" onClick={() => navigate(`/pharmacy/medicine/${item.id}`)}>
                  <img src={item.image} alt={item.name} loading="lazy" />
                  <div>
                    <h4>{item.name}</h4>
                    <p>{item.dose} • {item.kind}</p>
                  </div>
                </button>
                <button type="button" className="upsell-add app-pressable" onClick={() => addToCart(item)} disabled={!item.inStock}>
                  {item.inStock ? "Add" : "Out of stock"}
                </button>
              </article>
            ))}
          </div>
        </section>

      </section>

      {showCartPopup && (
        <button
          type="button"
          className="cart-added-popup app-page-enter"
          onClick={() => {
            playAppSound("tap")
            navigate("/cart")
          }}
        >
          {lastAddedName} added to cart
        </button>
      )}

      <footer className="buy-bar app-fade-stagger">
        <button
          type="button"
          className="buy-bar-cart app-pressable"
          onClick={() => addToCart(currentMedicine)}
          disabled={!currentMedicine.inStock}
        >
          Add to Cart
        </button>
        <button
          type="button"
          className="buy-bar-buy app-pressable"
          onClick={handleBuyNow}
          disabled={!currentMedicine.inStock}
        >
          Buy Now
        </button>
      </footer>
    </main>
  )
}
