import { FiArrowLeft, FiMinus, FiPlus, FiShoppingBag, FiTrash2 } from "react-icons/fi"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useCart } from "../../app/cart"
import { fetchPharmacyProducts, lookupPharmacyProducts } from "../../services/pharmacyApi"
import { mapProductToMedicine, type MedicineItem } from "../Pharmacy/medicineData"
import AppBottomNav from "../../components/AppBottomNav"
import "./cart.css"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default function CartPage() {
  const navigate = useNavigate()
  const { items, totalItems, removeItem, updateQty, addItem, syncItems } = useCart()
  const [catalog, setCatalog] = useState<MedicineItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const idsKey = useMemo(() => items.map((item) => item.id).sort().join("|"), [items])
  const hasOutOfStock = items.some((item) => !item.inStock)

  const upsells = useMemo(() => {
    const ids = new Set(items.map((item) => item.id))
    return catalog.filter((item) => !ids.has(item.id)).slice(0, 3)
  }, [items, catalog])


  useEffect(() => {
    let active = true
    async function loadCatalog() {
      try {
        const rows = await fetchPharmacyProducts({ limit: 24, audience: "employee" })
        if (!active || !rows?.length) return
        setCatalog(rows.map((row) => mapProductToMedicine(row)))
      } catch {
        if (active) setCatalog([])
      } finally {
        if (active) setCatalogLoading(false)
      }
    }
    loadCatalog()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    async function syncCart() {
      if (!idsKey) return
      const lookupIds = idsKey.split("|").filter((id) => UUID_RE.test(id))
      if (!lookupIds.length) return
      try {
        const rows = await lookupPharmacyProducts(lookupIds, "employee")
        if (!active || !rows?.length) return
        const mapped = rows.map((row) => mapProductToMedicine(row))
        syncItems(
          mapped.map((item) => ({
            id: item.id,
            name: item.name,
            dose: item.dose,
            kind: item.kind,
            image: item.image,
            inStock: item.inStock,
            price: item.price ?? 0,
          }))
        )
      } catch {
      // keep local cart if sync fails
      }
    }
    syncCart()
    return () => {
      active = false
    }
  }, [idsKey, syncItems])

  return (
    <main className="cart-page app-page-enter">
      <header className="cart-header app-fade-stagger">
        <button className="cart-back app-pressable" type="button" onClick={() => navigate(-1)} aria-label="Back">
          <FiArrowLeft />
        </button>
        <div>
          <h1>Your Cart</h1>
          <p>{totalItems} items</p>
        </div>
      </header>

      <section className="cart-content app-content-slide">
        {items.length === 0 && (
          <article className="cart-empty app-fade-stagger">
            <FiShoppingBag />
            <h2>Your cart is empty</h2>
            <p>Add medicines and health essentials to continue.</p>
            <button
              className="app-pressable"
              type="button"
onClick={() => navigate("/pharmacy")}
            >
              Browse Medicines
            </button>
          </article>
        )}

        {items.length > 0 && (
          <section className="cart-list app-fade-stagger">
            {items.map((item) => (
              <article key={item.id} className="cart-item">
                <button type="button" className="cart-item-main app-pressable" onClick={() => navigate(`/pharmacy/medicine/${item.id}`)}>
                  <img src={item.image} alt={item.name} loading="lazy" />
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.dose} • {item.kind}</p>
                    <span className={`stock-pill ${item.inStock ? "in" : "out"}`}>
                      {item.inStock ? "Doctor-trusted care essential" : "Out of stock — replace item"}
                    </span>
                  </div>
                </button>

                <div className="cart-item-right">
                  <button
                    type="button"
                    className="cart-remove app-pressable"
onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <FiTrash2 />
                  </button>
                  <div className="qty-box">
                    <button
                      type="button"
                      className="app-pressable"
onClick={() => updateQty(item.id, item.qty - 1)}
                      aria-label={`Decrease ${item.name}`}
                    >
                      <FiMinus />
                    </button>
                    <strong>{item.qty}</strong>
                    <button
                      type="button"
                      className="app-pressable"
onClick={() => updateQty(item.id, item.qty + 1)}
                      aria-label={`Increase ${item.name}`}
                    >
                      <FiPlus />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {(catalogLoading || upsells.length > 0) && (
          <section className="cart-upsells app-fade-stagger">
            <div className="upsells-head">
              <h3>Essential Supplies</h3>
            </div>
            {catalogLoading ? (
              <p className="cart-live-loading">Loading live medicine stock...</p>
            ) : (
              <div className="upsells-grid">
                {upsells.map((item) => (
                  <article key={item.id} className="upsell-row">
                    <button type="button" className="upsell-link app-pressable" onClick={() => navigate(`/pharmacy/medicine/${item.id}`)}>
                      <img src={item.image} alt={item.name} loading="lazy" />
                      <div>
                        <h4>{item.name}</h4>
                        <p>{item.dose}</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="upsell-add app-pressable"
                      onClick={() => addItem(item)}
                      disabled={!item.inStock}
                    >
                      {item.inStock ? "Add" : "Out"}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </section>

      {items.length > 0 && (
        <footer className="cart-footer app-fade-stagger">
          {hasOutOfStock && (
            <div className="cart-stock-alert">
              Some items are out of stock. Remove or replace them to continue.
            </div>
          )}
          <button
            type="button"
            className="checkout-btn app-pressable"
            disabled={hasOutOfStock}
onClick={() => navigate("/pharmacy/checkout")}
          >
            Proceed to checkout
          </button>
        </footer>
      )}
      <AppBottomNav active="Cart" />
    </main>
  )
}
