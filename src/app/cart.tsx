import { createContext, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { MedicineItem } from "../pages/Pharmacy/medicineData"

export type CartItem = {
  id: string
  name: string
  dose: string
  kind: string
  image: string
  inStock: boolean
  price: number
  qty: number
  isCustom?: boolean
  genericName?: string
  useCase?: string
  manufacturer?: string
  sourceUrl?: string
}

type CartContextType = {
  items: CartItem[]
  totalItems: number
  addItem: (item: MedicineItem, qty?: number) => void
  replaceCartWithItem: (item: MedicineItem, qty?: number) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
  syncItems: (updates: Array<Partial<CartItem> & { id: string }>) => void
  clearCart: () => void
}

const CART_STORAGE_KEY = "employee_app_cart_v1"

const CartContext = createContext<CartContextType | null>(null)

function normalizeQty(qty: number) {
  if (Number.isNaN(qty)) return 1
  return Math.max(1, Math.floor(qty))
}

function readInitialCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CartItem[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item && typeof item.id === "string" && item.qty > 0)
  } catch {
    return []
  }
}

function estimateMedicinePrice(item: MedicineItem) {
  if (typeof item.price === "number" && Number.isFinite(item.price) && item.price > 0) {
    return item.price
  }
  if (item.kind.toLowerCase().includes("capsule")) return 249
  if (item.kind.toLowerCase().includes("syrup")) return 189
  return 149
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readInitialCart())

  function persist(next: CartItem[]) {
    setItems(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next))
    }
  }

  function addItem(item: MedicineItem, qty = 1) {
    const nextQty = normalizeQty(qty)
    const existing = items.find((line) => line.id === item.id)
    if (existing) {
      persist(items.map((line) => (line.id === item.id ? { ...line, qty: line.qty + nextQty } : line)))
      return
    }
    persist([...items, toCartLine(item, nextQty)])
  }

  function toCartLine(item: MedicineItem, qty: number): CartItem {
    return {
      id: item.id,
      name: item.name,
      dose: item.dose,
      kind: item.kind,
      image: item.image,
      inStock: item.inStock,
      price: estimateMedicinePrice(item),
      qty: normalizeQty(qty),
      isCustom: item.isExternal === true,
      genericName: item.genericName,
      useCase: item.useCase,
      manufacturer: item.manufacturer,
      sourceUrl: item.sourceUrl,
    }
  }

  function replaceCartWithItem(item: MedicineItem, qty = 1) {
    persist([toCartLine(item, qty)])
  }

  function removeItem(id: string) {
    persist(items.filter((line) => line.id !== id))
  }

  function updateQty(id: string, qty: number) {
    if (qty <= 0) {
      removeItem(id)
      return
    }
    persist(items.map((line) => (line.id === id ? { ...line, qty: normalizeQty(qty) } : line)))
  }

  function syncItems(updates: Array<Partial<CartItem> & { id: string }>) {
    if (!updates.length) return
    const updateMap = new Map(updates.map((item) => [item.id, item]))
    persist(
      items.map((line) => {
        const update = updateMap.get(line.id)
        if (!update) return line
        return { ...line, ...update, qty: line.qty }
      })
    )
  }

  function clearCart() {
    persist([])
  }

  const value = useMemo<CartContextType>(
    () => ({
      items,
      totalItems: items.reduce((sum, line) => sum + line.qty, 0),
      addItem,
      replaceCartWithItem,
      removeItem,
      updateQty,
      syncItems,
      clearCart,
    }),
    [items],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider")
  }
  return ctx
}
