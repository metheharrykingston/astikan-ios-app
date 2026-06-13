import { useEffect, useState } from "react"
import { FiArrowLeft, FiChevronRight } from "react-icons/fi"
import { useLocation, useNavigate } from "react-router-dom"
import { fetchPharmacyCategories, type PharmacyCategory } from "../../services/pharmacyApi"
import { getPharmacyCategoryIcon } from "../Pharmacy/categoryIcons"
import "./pharmacy-categories.css"

const categories = [
  { id: "nutritional", name: "Nutritional Drinks", icon: getPharmacyCategoryIcon("Nutritional Drinks"), desc: "Protein, immunity and recovery drinks" },
  { id: "ayurveda", name: "Ayurveda", icon: getPharmacyCategoryIcon("Ayurveda"), desc: "Herbal and traditional wellness products" },
  { id: "vitamins", name: "Vitamins & Supplement", icon: getPharmacyCategoryIcon("Vitamins & Supplement"), desc: "Daily nutrition and support capsules" },
  { id: "devices", name: "Devices", icon: getPharmacyCategoryIcon("Devices"), desc: "BP monitor, thermometer and glucometer" },
  { id: "skincare", name: "Skin Care", icon: getPharmacyCategoryIcon("Skin Care"), desc: "Creams, gels and treatment essentials" },
  { id: "personal", name: "Personal Care", icon: getPharmacyCategoryIcon("Personal Care"), desc: "Daily hygiene and self-care products" },
]

export default function PharmacyCategories() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state?: { selectedCategory?: string } }
  const selected = state?.selectedCategory
  const [liveCategories, setLiveCategories] = useState<PharmacyCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function loadCategories() {
      setLoading(true)
      try {
        const rows = await fetchPharmacyCategories("employee")
        if (!active) return
        setLiveCategories(rows)
      } catch {
        if (active) setLiveCategories([])
      } finally {
        if (active) setLoading(false)
      }
    }
    loadCategories()
    return () => {
      active = false
    }
  }, [])

  const visibleCategories = liveCategories.length
      ? liveCategories.map((item) => ({
        id: item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: item.name,
        icon: getPharmacyCategoryIcon(item.name),
        desc: `${item.count} items`,
      }))
    : categories

  return (
    <main className="pharma-cat-page app-page-enter">
      <header className="pharma-cat-header app-fade-stagger">
        <button className="pharma-cat-back app-pressable" type="button" aria-label="Back" onClick={() => navigate(-1)}>
          <FiArrowLeft />
        </button>
        <div>
          <h1>Popular Categories</h1>
          <p>Browse all top medicine categories</p>
        </div>
      </header>

      <section className="pharma-cat-shell app-content-slide">
        <div className="pharma-cat-list">
          {loading && (
            <div className="pharma-cat-loading">Loading categories...</div>
          )}
          {visibleCategories.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`pharma-cat-item app-pressable ${selected === item.name ? "active" : ""}`}
              onClick={() => navigate("/pharmacy", { state: { selectedCategory: item.name } })}
            >
              <span className="pharma-cat-icon">{item.icon}</span>
              <div className="pharma-cat-copy">
                <h3>{item.name}</h3>
                <p>{item.desc}</p>
              </div>
              <FiChevronRight />
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
