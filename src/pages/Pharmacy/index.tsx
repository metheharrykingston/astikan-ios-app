import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  FiArrowLeft,
  FiCamera,
  FiSearch,
  FiShoppingCart,
  FiUpload,
  FiX,
} from "react-icons/fi"
import { useLocation, useNavigate } from "react-router-dom"
import { fetchPharmacyCategories, fetchPharmacyProducts, fetchPharmacyProductsPage } from "../../services/pharmacyApi"
import { parsePrescriptionImage, searchInternetMedicine } from "../../services/aiApi"
import { mapProductToMedicine, saveExternalMedicine, type MedicineItem } from "./medicineData"
import { getPharmacyCategoryIcon } from "./categoryIcons"
import { goBackOrFallback } from "../../utils/navigation"
import { useCart } from "../../app/cart"
import { playAppSound } from "../../utils/sound"
import AppBottomNav from "../../components/AppBottomNav"
import "./pharmacy.css"

const fallbackCategories = [
  { name: "Nutritional Drinks", icon: getPharmacyCategoryIcon("Nutritional Drinks") },
  { name: "Ayurveda", icon: getPharmacyCategoryIcon("Ayurveda") },
  { name: "Vitamins & Supplement", icon: getPharmacyCategoryIcon("Vitamins & Supplement") },
  { name: "Devices", icon: getPharmacyCategoryIcon("Devices") },
  { name: "Skin Care", icon: getPharmacyCategoryIcon("Skin Care") },
  { name: "Personal Care", icon: getPharmacyCategoryIcon("Personal Care") },
  { name: "Pain Relief", icon: getPharmacyCategoryIcon("Pain Relief") },
  { name: "Cold & Flu", icon: getPharmacyCategoryIcon("Cold & Flu") },
  { name: "Diabetes Care", icon: getPharmacyCategoryIcon("Diabetes Care") },
  { name: "Heart Health", icon: getPharmacyCategoryIcon("Heart Health") },
  { name: "Digestive", icon: getPharmacyCategoryIcon("Digestive") },
  { name: "Baby Care", icon: getPharmacyCategoryIcon("Baby Care") },
]

function titleCaseMedicine(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function normalizeSearchValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}

function createExternalMedicineId(query: string, sourceUrl: string) {
  const base = `${query}:${sourceUrl}`.toLowerCase()
  let hash = 0
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0
  }
  return `web-${hash.toString(16)}`
}

function buildExternalMedicinePreview(name: string) {
  const safe = name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#eef7ff"/>
      <stop offset="100%" stop-color="#fff1e3"/>
    </linearGradient>
    <linearGradient id="card" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fbff"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <circle cx="152" cy="122" r="80" fill="#d9ebff"/>
  <circle cx="644" cy="472" r="90" fill="#ffe1c8"/>
  <rect x="136" y="94" width="528" height="412" rx="40" fill="url(#card)" stroke="#dbe7ff" stroke-width="4"/>
  <rect x="192" y="170" width="182" height="226" rx="32" fill="#ff6977"/>
  <rect x="230" y="136" width="106" height="40" rx="16" fill="#4175ff"/>
  <rect x="228" y="248" width="110" height="54" rx="18" fill="#fff3dd"/>
  <rect x="274" y="260" width="18" height="30" rx="6" fill="#ff6c77"/>
  <rect x="268" y="266" width="30" height="18" rx="6" fill="#3f74ff"/>
  <rect x="434" y="190" width="150" height="46" rx="23" fill="#ecf4ff"/>
  <rect x="434" y="252" width="118" height="18" rx="9" fill="#d9e8ff"/>
  <rect x="434" y="288" width="96" height="18" rx="9" fill="#ffdaba"/>
  <rect x="434" y="332" width="136" height="18" rx="9" fill="#d9e8ff"/>
  <text x="400" y="428" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#23406f">${safe}</text>
  <text x="400" y="464" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="600" fill="#476081">Astikan Pharmacy</text>
</svg>`.trim()
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function hasStrongCatalogMatch(searchValue: string, items: MedicineItem[]) {
  const normalizedQuery = normalizeSearchValue(searchValue)
  if (!normalizedQuery) return false
  return items.some((item) => {
    const target = normalizeSearchValue(`${item.name} ${item.dose} ${item.kind}`)
    return target === normalizedQuery || target.startsWith(`${normalizedQuery} `) || target.includes(` ${normalizedQuery} `)
  })
}

export default function Pharmacy() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state?: { selectedCategory?: string; searchQuery?: string } }
  const { totalItems } = useCart()
  const [query, setQuery] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const uploadStatus = "Upload a prescription and get the right medicine"
  const [catalog, setCatalog] = useState<MedicineItem[]>([])
  const [fallbackResults, setFallbackResults] = useState<MedicineItem[]>([])
  const [fallbackLabel, setFallbackLabel] = useState("")
  const [loadingAlternatives, setLoadingAlternatives] = useState(false)
  const [loadingInternetResult, setLoadingInternetResult] = useState(false)
  const [internetResult, setInternetResult] = useState<MedicineItem | null>(null)
  const [searchError, setSearchError] = useState("")
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [catalogError, setCatalogError] = useState("")
  const [loadingMore, setLoadingMore] = useState(false)
  const [activeCategory, setActiveCategory] = useState(state?.selectedCategory ?? "")
  const [liveCategories, setLiveCategories] = useState<Array<{ name: string; icon?: string }>>([])
  const loadingMoreRef = useRef(false)
  const [isProcessingRx, setIsProcessingRx] = useState(false)
  const [rxProcessingNote, setRxProcessingNote] = useState("Reading prescription...")
  const [rxMatches, setRxMatches] = useState<MedicineItem[]>([])
  const [rxToast, setRxToast] = useState<{ tone: "success" | "error"; title: string; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const showRxToast = useCallback((tone: "success" | "error", title: string, message: string) => {
    setRxToast({ tone, title, message })
  }, [])

  useEffect(() => {
    if (!rxToast) return
    const timer = window.setTimeout(() => setRxToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [rxToast])

  useEffect(() => {
    if (state?.searchQuery) {
      setQuery(state.searchQuery)
      setSearchTerm(state.searchQuery.trim())
    }
  }, [state?.searchQuery])

  useEffect(() => {
    if (query.trim()) return
    setSearchTerm("")
  }, [query])

  const PAGE_SIZE = 100
  const catalogOffsetRef = useRef(0)
  const hasMoreCatalogRef = useRef(true)
  const catalogRequestRef = useRef(0)

  const loadCatalogPage = useCallback(async (reset = false) => {
    const requestId = catalogRequestRef.current + 1
    catalogRequestRef.current = requestId

    if (reset) {
      setLoadingCatalog(true)
      setCatalogError("")
      setLoadingMore(false)
      setCatalog([])
      catalogOffsetRef.current = 0
      hasMoreCatalogRef.current = true
    } else {
      if (!hasMoreCatalogRef.current || loadingMoreRef.current) return
      setLoadingMore(true)
      loadingMoreRef.current = true
    }

    const offset = reset ? 0 : catalogOffsetRef.current

    try {
        const page = await fetchPharmacyProductsPage({
        audience: "employee",
        search: searchTerm || undefined,
        category: activeCategory || undefined,
        limit: PAGE_SIZE,
        offset,
      })

      if (catalogRequestRef.current !== requestId) return

      const rows = (page.items || []).map((row) => mapProductToMedicine(row)).filter((item) => item.inStock)
      const nextTotal = Number(page.total || rows.length || 0)
      setCatalog((current) => {
        if (reset) return rows
        const seen = new Set(current.map((item) => item.id))
        return current.concat(rows.filter((item) => !seen.has(item.id)))
      })
      catalogOffsetRef.current = offset + rows.length
      hasMoreCatalogRef.current = rows.length >= PAGE_SIZE && catalogOffsetRef.current < nextTotal
    } catch (error) {
      if (catalogRequestRef.current !== requestId) return
      if (reset) {
        setCatalog([])
        setCatalogError(error instanceof Error ? error.message : "Unable to load medicines.")
      }
      hasMoreCatalogRef.current = false
    } finally {
      if (catalogRequestRef.current !== requestId) return
      setLoadingCatalog(false)
      setLoadingMore(false)
      loadingMoreRef.current = false
    }
  }, [activeCategory, searchTerm])

  useEffect(() => {
    void loadCatalogPage(true)
  }, [activeCategory, loadCatalogPage, searchTerm])

  useEffect(() => {
    if (loadingCatalog || loadingMoreRef.current || !hasMoreCatalogRef.current) return
    const frame = window.requestAnimationFrame(() => {
      const root = document.querySelector(".pharmacy-page") as HTMLElement | null
      if (!root) return
      if (root.scrollHeight <= root.clientHeight + 80) {
        void loadCatalogPage(false)
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [catalog, loadCatalogPage, loadingCatalog, loadingMore])

  useEffect(() => {
    let active = true
    async function loadCategories() {
      try {
        const rows = await fetchPharmacyCategories("employee")
        if (!active) return
        const normalized = rows.map((row) => ({ name: row.name, icon: getPharmacyCategoryIcon(row.name) }))
        setLiveCategories(normalized)
      } catch {
        if (active) setLiveCategories([])
      }
    }
    loadCategories()
    return () => {
      active = false
    }
  }, [])

  const sourceItems = catalog
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase()
    const result = sourceItems.filter((item) => {
      const matchesQuery = !q || `${item.name} ${item.dose} ${item.kind}`.toLowerCase().includes(q)
      const matchesCategory = !activeCategory || item.kind === activeCategory
      return matchesQuery && matchesCategory
    })

    return result
  }, [activeCategory, catalog.length, searchTerm, sourceItems])

  const categoryOptions = useMemo(() => {
    const source = liveCategories.length > 1
      ? liveCategories
      : Array.from(new Set(sourceItems.map((item) => item.kind?.trim()).filter(Boolean)))
          .sort((a, b) => String(a).localeCompare(String(b)))
          .map((name) => ({ name: String(name), icon: getPharmacyCategoryIcon(String(name)) }))
    const base = source.length > 0 ? source : fallbackCategories
    const seen = new Set<string>()
    const unique = base.filter((item) => {
      const key = String(item.name || "").trim().toLowerCase()
      if (!key || key === "all" || key === "all categories" || seen.has(key)) return false
      seen.add(key)
      return true
    })
    return [{ name: "All", icon: "💊" }, ...unique]
  }, [liveCategories, sourceItems])

  useEffect(() => {
    let cancelled = false

    async function loadAlternativeMatches() {
      const trimmedQuery = searchTerm.trim()
      const catalogMatchFound = filtered.length > 0 || hasStrongCatalogMatch(trimmedQuery, catalog)
      if (!trimmedQuery || loadingCatalog || catalogMatchFound) {
        setFallbackResults([])
        setInternetResult(null)
        setFallbackLabel("")
        setSearchError("")
        setLoadingAlternatives(false)
        setLoadingInternetResult(false)
        return
      }

      setLoadingAlternatives(false)
      setLoadingInternetResult(true)
      setSearchError("")
      const liveResult = await searchInternetMedicine(trimmedQuery)
        .then((value) => ({ value, error: "" }))
        .catch((error: unknown) => ({
          value: null,
          error: error instanceof Error ? error.message : "Medicine search is temporarily unavailable.",
        }))
        .finally(() => {
          if (!cancelled) setLoadingInternetResult(false)
        })

      if (cancelled) return
      setFallbackResults([])

      if (liveResult.value?.product) {
        const product = liveResult.value.product
        const external: MedicineItem = {
          id: createExternalMedicineId(trimmedQuery, product.sourceUrl),
          name: product.name,
          dose: product.strength || product.packaging || "Standard",
          kind: product.category || "Medicine",
          inStock: true,
          image: product.imageUrl || buildExternalMedicinePreview(product.name),
          images: product.imageUrl ? [product.imageUrl] : [buildExternalMedicinePreview(product.name)],
          price: product.priceInr,
          mrp: product.mrpInr ?? product.priceInr,
          sellingPrice: product.priceInr,
          overview: product.description || `${product.name} found on a live verified web listing.`,
          genericName: product.genericName,
          useCase: product.useCase,
          manufacturer: product.manufacturer,
          uses: [
            product.useCase || "Live web match",
            "Proceed to checkout through Astikan",
            "Verify doctor advice if needed",
          ],
          doseGuide: [
            "Confirm the medicine name and strength before placing the order.",
            "Use only as directed on the pack or by your doctor.",
            "Reach out to Astikan support if you need verification help.",
          ],
          cautions: [
            "Confirm the medicine name, strength, and pack size before ordering.",
            "Please verify suitability if you are pregnant, allergic, or on other medicines.",
          ],
          isExternal: true,
          sourceUrl: product.sourceUrl,
          sourceDomain: product.sourceDomain,
          availabilityNote: "Available through Astikan",
        }
        saveExternalMedicine(external)
        setInternetResult(external)
        setFallbackLabel("")
        return
      }

      setInternetResult(null)
      setFallbackLabel("")
      setSearchError(liveResult.error || "We could not identify this medicine. Check the spelling and try again.")
    }

    void loadAlternativeMatches()
    return () => {
      cancelled = true
    }
  }, [activeCategory, catalog, filtered.length, loadingCatalog, searchTerm])

  const runMedicineSearch = useCallback(() => {
    setFallbackResults([])
    setInternetResult(null)
    setFallbackLabel("")
    setSearchError("")
    setSearchTerm(query.trim())
  }, [query])

  const visibleMedicines = useMemo(() => {
    if (internetResult) return [internetResult, ...fallbackResults]
    if (fallbackResults.length > 0) return fallbackResults
    return filtered
  }, [fallbackResults, filtered, internetResult])
  const categorizedMedicines = useMemo(() => {
    const groups = new Map<string, MedicineItem[]>()
    visibleMedicines.forEach((item) => {
      const category = item.kind?.trim() || "Other Medicines"
      groups.set(category, [...(groups.get(category) || []), item])
    })
    return Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right))
  }, [visibleMedicines])
  const isSearchActive = searchTerm.trim().length > 0
  const isSearching = isSearchActive && (loadingCatalog || loadingAlternatives || loadingInternetResult)

  async function onPrescriptionPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    const isImage = file.type.startsWith("image/")
    if (!isPdf && !isImage) {
      showRxToast("error", "Unsupported file", "Please upload a PDF or image prescription only.")
      return
    }

    if (isPdf) {
      showRxToast("success", "Prescription uploaded", `${file.name} was uploaded successfully.`)
      return
    }

    setRxProcessingNote("Reading medicine photo with OCR...")
    setIsProcessingRx(true)
    setRxMatches([])
    setInternetResult(null)
    setFallbackResults([])
    setSearchError("")

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ""))
        reader.onerror = () => reject(new Error("Unable to read file"))
        reader.readAsDataURL(file)
      })

      setRxProcessingNote("AI is identifying the real medicine name...")
      const parsed = await parsePrescriptionImage({
        imageBase64: dataUrl,
        fileName: file.name,
        mimeType: file.type,
      })

      const names = Array.from(
        new Set(
          parsed.medicines
            .map((item) => `${item.name || ""} ${item.strength || ""}`.trim())
            .map((name) => name.replace(/\s+/g, " ").trim())
            .filter((name): name is string => !!name && name.length >= 2),
        ),
      ).slice(0, 8)

      if (names.length === 0) {
        showRxToast("error", "Medicine not detected", "We could not read a medicine name from this photo. Please upload a clearer image.")
        return
      }

      const primaryName = names[0]
      setQuery(primaryName)
      setSearchTerm(primaryName)
      setRxProcessingNote(`Searching Astikan inventory for ${primaryName}...`)

      const inventoryMatches = await Promise.all(
        names.map(async (name) => {
          try {
            const rows = await fetchPharmacyProducts({ search: name, limit: 3, audience: "employee" })
            return (rows || []).map((row) => mapProductToMedicine(row)).filter((item) => item.inStock)
          } catch {
            return [] as MedicineItem[]
          }
        }),
      )

      const unique = new Map<string, MedicineItem>()
      inventoryMatches.flat().forEach((item) => {
        if (!unique.has(item.id)) unique.set(item.id, item)
      })

      const matchedInventory = Array.from(unique.values())
      if (matchedInventory.length > 0) {
        setRxMatches(matchedInventory)
        setInternetResult(null)
        showRxToast("success", "Medicine matched", `Found ${matchedInventory.length} medicine${matchedInventory.length > 1 ? "s" : ""} in Astikan inventory.`)
        setActiveCategory("")
        return
      }

      setRxProcessingNote("Medicine not in inventory. Creating AI medicine card...")
      for (const name of names) {
        try {
          const liveResult = await searchInternetMedicine(name)
          const product = liveResult.product
          if (!product) continue
          const external: MedicineItem = {
            id: createExternalMedicineId(name, product.sourceUrl),
            name: product.name || titleCaseMedicine(name),
            dose: product.strength || product.packaging || "Standard",
            kind: product.category || "Medicine",
            inStock: true,
            image: product.imageUrl || buildExternalMedicinePreview(product.name || name),
            images: product.imageUrl ? [product.imageUrl] : [buildExternalMedicinePreview(product.name || name)],
            price: Number(product.priceInr || 0),
            mrp: Number(product.mrpInr ?? product.priceInr ?? 0),
            sellingPrice: Number(product.priceInr || 0),
            overview: product.description || `${product.name || name} was identified from your uploaded photo and prepared as an AI medicine card.`,
            genericName: product.genericName,
            useCase: product.useCase,
            manufacturer: product.manufacturer,
            uses: [
              product.useCase || "AI identified medicine",
              "Proceed only after confirming name, strength, and pack size.",
              "Consult a doctor if you are unsure about suitability.",
            ],
            doseGuide: [
              "Use only as written on the pack or prescribed by your doctor.",
              "Confirm medicine strength before ordering.",
              "Do not self-medicate for serious symptoms.",
            ],
            cautions: [
              "AI recognition can make mistakes; verify the medicine name before checkout.",
              "Avoid if allergic or if your doctor has advised against it.",
            ],
            isExternal: true,
            sourceUrl: product.sourceUrl,
            sourceDomain: product.sourceDomain,
            availabilityNote: product.availabilityNote || "AI medicine card generated. Astikan team can verify fulfilment.",
          }
          saveExternalMedicine(external)
          setInternetResult(external)
          setRxMatches([external])
          setFallbackLabel("AI medicine card generated because this medicine was not found in Astikan inventory.")
          setSearchError("")
          setQuery(external.name)
          setSearchTerm(external.name)
          setActiveCategory("")
          showRxToast("success", "AI medicine card ready", `${external.name} is ready with price and details.`)
          return
        } catch {
          // try next OCR candidate
        }
      }

      setSearchError(`No inventory or AI medicine card could be created for ${primaryName}. Try another clear photo or type the medicine name.`)
      showRxToast("error", "Medicine not found", "We could not create a working medicine card from this photo.")
    } catch {
      showRxToast("error", "Processing failed", "Unable to process the medicine photo right now. Please retry.")
    } finally {
      setIsProcessingRx(false)
    }
  }

  function onPageScroll(e: React.UIEvent<HTMLElement>) {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (!loadingCatalog && !loadingMore && hasMoreCatalogRef.current && scrollHeight - (scrollTop + clientHeight) < 220) {
      void loadCatalogPage(false)
    }
  }

  return (
    <main className="pharmacy-page app-page-enter" onScroll={onPageScroll}>
      <header className="pharma-header app-fade-stagger">
        <button className="pharma-back app-pressable" onClick={() => goBackOrFallback(navigate)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>

        <h1>Medicine</h1>

        <button
          className="cart-btn app-pressable"
          type="button"
          aria-label="Cart"
          onClick={() => {
            playAppSound("tap")
            navigate("/cart")
          }}
        >
          <FiShoppingCart />
          {totalItems > 0 && <span>{totalItems}</span>}
        </button>
      </header>
      <AppBottomNav active="Refill" />

      <section className="pharma-content app-content-slide">
        <div className="medicine-search app-fade-stagger">
          <FiSearch />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                runMedicineSearch()
              }
            }}
            placeholder="Search Medicine"
          />
          <button
            type="button"
            className="medicine-search-btn app-pressable"
            onClick={runMedicineSearch}
            disabled={!query.trim() || query.trim() === searchTerm}
          >
<FiSearch />
          </button>
        </div>
        {isSearchActive && isSearching && (
          <div className="medicine-search-progress app-fade-stagger" role="status" aria-live="polite">
            <span className="medicine-search-progress-spinner" aria-hidden="true" />
            <span>Finding medicine details...</span>
          </div>
        )}

        {!isSearchActive && (
          <article className="rx-card app-fade-stagger">
            <h2><FiUpload /> Upload Prescription</h2>
            <p>{uploadStatus}</p>
            <div className="rx-actions">
              <button className="app-pressable" type="button" onClick={() => photoInputRef.current?.click()}>
                <FiCamera />
                Camera
              </button>
              <button className="app-pressable" type="button" onClick={() => fileInputRef.current?.click()}>
                <FiUpload />
                Upload
              </button>
            </div>
          </article>
        )}

        {rxMatches.length > 0 && (
          <section className="rx-results app-fade-stagger">
            <div className="section-row">
              <h3>Prescription Results</h3>
              <button type="button" className="see-all app-pressable" onClick={() => navigate("/cart")}>
                View Cart
              </button>
            </div>
            <div className="medicine-grid">
              {rxMatches.map((item) => (
                <button
                  key={item.id}
                  className="medicine-card app-pressable"
                  type="button"
                  onClick={() => navigate(`/pharmacy/medicine/${item.id}`)}
                >
                  <div className="medicine-thumb">
                    <img src={item.image} alt={item.name} loading="lazy" />
                  </div>
                    <div className="medicine-info">
                      <h4>{titleCaseMedicine(item.name)} {item.dose}</h4>
                      <p>{item.kind}</p>
                      <div className="medicine-tags pricing">
                        <strong>₹{Math.round(item.sellingPrice ?? item.price ?? 0)}</strong>
                      </div>
                    </div>
                  </button>
              ))}
            </div>
          </section>
        )}

        {!isSearchActive && (
          <section className="category-section app-fade-stagger">
            <div className="section-row">
              <h3>Categories</h3>
            </div>
            <div className="category-slider" role="list">
              {categoryOptions.map((item) => (
                <button
                  key={item.name}
                  className={`category-card app-pressable ${(item.name === "All" && !activeCategory) || activeCategory === item.name ? "active" : ""}`}
                  type="button"
                  onClick={() => {
                    setActiveCategory(item.name === "All" ? "" : item.name)
                  }}
                >
                  <div className="category-thumb">{item.icon}</div>
                  <h4>{titleCaseMedicine(item.name)}</h4>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className={`medicine-list app-fade-stagger ${isSearching ? "medicine-list--searching" : ""}`}>
          {!isSearching && (
            <div className="medicine-results-heading">
              <h3>
                {isSearchActive
                  ? `Results for "${searchTerm}"`
                  : activeCategory
                    ? `${activeCategory} Medicines`
                    : "All Medicines"}
              </h3>
              {isSearchActive && (
                <button
                  type="button"
                  className="medicine-clear-search app-pressable"
                  aria-label="Clear medicine search"
                  onClick={() => {
                    setQuery("")
                    setSearchTerm("")
                    setFallbackResults([])
                    setInternetResult(null)
                    setFallbackLabel("")
                    setSearchError("")
                  }}
                >
                  <FiX />
                </button>
              )}
            </div>
          )}
          {!!fallbackLabel && <p className="pharmacy-search-note">{fallbackLabel}</p>}
          {!!searchError && !isSearching && (
            <div className="pharmacy-search-error" role="alert">
              <span>{searchError}</span>
              <button type="button" className="app-pressable" onClick={runMedicineSearch}>Retry</button>
            </div>
          )}
          {loadingCatalog && !isSearchActive && catalog.length === 0 && (
            <div className="pharmacy-loading">Loading medicines...</div>
          )}
          {!loadingCatalog && catalogError && !isSearchActive && catalog.length === 0 && (
            <div className="pharmacy-soft-warning" role="status">
              <span>Live medicine stock is loading. Please wait a moment.</span>
              <button type="button" className="app-pressable" onClick={() => void loadCatalogPage(true)}>Retry</button>
            </div>
          )}
          {!loadingCatalog && visibleMedicines.length === 0 && !isSearching && !searchError && (searchTerm.trim() || activeCategory) && (
            <div className="pharmacy-soft-warning" role="status">
              <span>We could not match this exact filter.</span>
              <button
                type="button"
                className="app-pressable"
                onClick={() => {
                  setActiveCategory("")
                  setQuery("")
                  setSearchTerm("")
                }}
              >
                Show all
              </button>
            </div>
          )}
          {visibleMedicines.length > 0 && (isSearchActive || !!activeCategory || (!isSearchActive && !activeCategory)) && (
            <div className="medicine-grid">
              {visibleMedicines.map((item) => (
                <button
                  key={item.id}
                  className="medicine-card app-pressable"
                  type="button"
                  onClick={() => navigate(`/pharmacy/medicine/${item.id}`)}
                >
                  <div className="medicine-thumb">
                    <img src={item.image} alt={item.name} loading="lazy" />
                  </div>
                  <div className="medicine-info">
                    <h4>{titleCaseMedicine(item.name)}</h4>
                    <p>{item.dose} · {item.kind}</p>
                    <div className="medicine-tags pricing">
                      <strong>₹{Math.round(item.sellingPrice ?? item.price ?? 0)}</strong>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {false && visibleMedicines.length > 0 && !isSearchActive && !activeCategory && (
            <div className="medicine-category-list">
              {categorizedMedicines.map(([category, medicines]) => (
                <section className="medicine-category-block" key={category}>
                  <div className="medicine-category-title">
                    <h4>{category}</h4>
                    <button type="button" className="see-all app-pressable" onClick={() => setActiveCategory(category)}>
                      See all
                    </button>
                  </div>
                  <div className="medicine-grid">
                    {medicines.map((item) => (
                      <button
                        key={item.id}
                        className="medicine-card app-pressable"
                        type="button"
                        onClick={() => navigate(`/pharmacy/medicine/${item.id}`)}
                      >
                        <div className="medicine-thumb">
                          <img src={item.image} alt={item.name} loading="lazy" />
                        </div>
                        <div className="medicine-info">
                          <h4>{titleCaseMedicine(item.name)}</h4>
                          <p>{item.dose} · {item.kind}</p>
                          <div className="medicine-tags pricing">
                            <strong>₹{Math.round(item.sellingPrice ?? item.price ?? 0)}</strong>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          {!loadingCatalog && loadingMore && (
            <div className="pharmacy-loading">Loading more medicines...</div>
          )}
        </section>
      </section>

      <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="pharma-file" onChange={onPrescriptionPicked} />
      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="pharma-file" onChange={onPrescriptionPicked} />

      {isProcessingRx && (
        <div className="rx-processing-overlay">
          <div className="rx-processing-card app-page-enter">
            <div className="rx-spinner" aria-hidden="true" />
            <h4>Analyzing prescription</h4>
            <p>{rxProcessingNote}</p>
          </div>
        </div>
      )}
      {rxToast && (
        <div className="rx-toast-wrap" role="status" aria-live="polite">
          <div className={`rx-toast rx-toast--${rxToast.tone} app-page-enter`}>
            <strong>{rxToast.title}</strong>
            <p>{rxToast.message}</p>
            <button type="button" className="app-pressable" onClick={() => setRxToast(null)} aria-label="Close notification">
              Dismiss
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
