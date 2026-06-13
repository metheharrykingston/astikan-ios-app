export type MedicineItem = {
  id: string
  name: string
  dose: string
  kind: string
  inStock: boolean
  image: string
  images?: string[]
  price?: number
  mrp?: number
  sellingPrice?: number
  overview: string
  uses: string[]
  doseGuide: string[]
  cautions: string[]
  isExternal?: boolean
  sourceUrl?: string
  sourceDomain?: string
  availabilityNote?: string
  genericName?: string
  useCase?: string
  manufacturer?: string
}

export const EXTERNAL_MEDICINE_CACHE_KEY = "pharmacy_external_medicines_v1"

type PharmacyProduct = {
  id: string
  sku?: string | null
  name: string
  category?: string | null
  description?: string | null
  base_price_inr: number
  mrp_inr?: number
  sp_inr?: number
  image_urls_json?: string[]
  available_qty?: number | null
  in_stock?: boolean
}

function buildAiMedicineImageDataUrl(label = "Astikan Care") {
  const safe = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#eff7ff"/>
      <stop offset="52%" stop-color="#e6effc"/>
      <stop offset="100%" stop-color="#fff2e7"/>
    </linearGradient>
    <linearGradient id="card" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fbff"/>
    </linearGradient>
    <linearGradient id="bottle" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff8d63"/>
      <stop offset="100%" stop-color="#ff617b"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <circle cx="132" cy="116" r="70" fill="#d8ebff"/>
  <circle cx="650" cy="470" r="94" fill="#ffe3cc"/>
  <rect x="160" y="110" width="480" height="380" rx="42" fill="url(#card)" stroke="#dbe8ff" stroke-width="4"/>
  <rect x="214" y="186" width="172" height="220" rx="34" fill="url(#bottle)"/>
  <rect x="250" y="150" width="100" height="42" rx="15" fill="#4276ff"/>
  <rect x="246" y="256" width="108" height="58" rx="18" fill="#fff3db"/>
  <rect x="290" y="266" width="20" height="38" rx="6" fill="#ff6d73"/>
  <rect x="282" y="274" width="36" height="20" rx="6" fill="#3e72ff"/>
  <rect x="438" y="188" width="146" height="48" rx="24" fill="#ebf4ff"/>
  <rect x="438" y="252" width="120" height="18" rx="9" fill="#d6e7ff"/>
  <rect x="438" y="288" width="98" height="18" rx="9" fill="#ffd9b8"/>
  <rect x="438" y="332" width="136" height="18" rx="9" fill="#d6e7ff"/>
  <text x="400" y="438" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#23406f">${safe}</text>
  <text x="400" y="470" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="600" fill="#476081">Astikan Pharmacy</text>
</svg>`.trim()
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function extractDose(text?: string | null) {
  if (!text) return "Standard"
  const match = text.match(/(\d+\s?(mg|ml|g|mcg|iu|IU))/)
  if (match?.[0]) return match[0].replace("IU", "IU")
  return "Standard"
}

function buildFallbackUses(name: string) {
  return [
    `${name} daily support`,
    "Doctor-guided usage",
    "Symptom relief as advised",
  ]
}

export function mapProductToMedicine(product: PharmacyProduct): MedicineItem {
  const imageUrls = Array.isArray(product.image_urls_json) ? product.image_urls_json.filter(Boolean) : []
  const images = imageUrls.length ? imageUrls : [buildAiMedicineImageDataUrl("Astikan Care")]
  const image = images[0]
  const overview = product.description ?? `${product.name} is curated for daily health support.`
  const inStock = typeof product.in_stock === "boolean"
    ? product.in_stock
    : typeof product.available_qty === "number"
      ? product.available_qty > 0
      : true

  return {
    id: product.id,
    name: product.name,
    dose: extractDose(product.description ?? product.name),
    kind: product.category ?? "Tablet",
    inStock,
    image,
    images,
    price: Number(product.base_price_inr ?? 0),
    mrp: Number(product.mrp_inr ?? product.base_price_inr ?? 0),
    sellingPrice: Number(product.sp_inr ?? product.base_price_inr ?? 0),
    overview,
    uses: buildFallbackUses(product.name),
    doseGuide: [
      "Follow the label directions or physician guidance.",
      "Take with water after meals unless advised otherwise.",
      "Do not exceed the recommended dosage.",
    ],
    cautions: [
      "Consult your doctor if you are pregnant or on other medication.",
      "Stop use and seek care if you notice unusual reactions.",
    ],
  }
}

export function readExternalMedicines(): MedicineItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.sessionStorage.getItem(EXTERNAL_MEDICINE_CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as MedicineItem[]
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === "string") : []
  } catch {
    return []
  }
}

export function saveExternalMedicine(item: MedicineItem) {
  if (typeof window === "undefined") return
  const existing = readExternalMedicines()
  const next = [item, ...existing.filter((entry) => entry.id !== item.id)].slice(0, 20)
  window.sessionStorage.setItem(EXTERNAL_MEDICINE_CACHE_KEY, JSON.stringify(next))
}

export function findExternalMedicineById(id?: string) {
  if (!id) return undefined
  return readExternalMedicines().find((item) => item.id === id)
}

export const medicines: MedicineItem[] = [
  {
    id: "paracetamol",
    name: "Paracetamol",
    dose: "500mg",
    kind: "Tablet",
    inStock: true,
    image: "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=900&q=80",
    overview: "Paracetamol is commonly used to reduce fever and relieve mild to moderate pain.",
    uses: ["Fever management", "Headache and body pain", "Post-viral discomfort"],
    doseGuide: [
      "Adults usually take 500mg to 650mg as advised by doctor.",
      "Keep a safe gap between doses.",
      "Do not exceed maximum daily dose without medical guidance.",
    ],
    cautions: ["Use carefully with liver conditions", "Avoid combining multiple paracetamol products"],
  },
  {
    id: "ibuprofen",
    name: "Ibuprofen",
    dose: "400mg",
    kind: "Tablet",
    inStock: true,
    image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=900&q=80",
    overview: "Ibuprofen is an anti-inflammatory medicine often used for pain, swelling, and fever.",
    uses: ["Muscle and joint pain", "Dental pain", "Inflammatory pain"],
    doseGuide: [
      "Take with food or after meals to reduce stomach irritation.",
      "Use only for short-term symptom relief unless advised by doctor.",
      "Follow doctor recommendation for dose frequency.",
    ],
    cautions: ["Avoid in active stomach ulcer", "Use with caution in kidney conditions"],
  },
  {
    id: "amoxicillin",
    name: "Amoxicillin",
    dose: "250mg",
    kind: "Capsule",
    inStock: true,
    image: "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?auto=format&fit=crop&w=900&q=80",
    overview: "Amoxicillin is an antibiotic used for certain bacterial infections.",
    uses: ["Respiratory bacterial infections", "Ear and throat infections", "Skin infections"],
    doseGuide: [
      "Always complete the full prescribed course.",
      "Take doses at evenly spaced intervals.",
      "Use only when prescribed by doctor.",
    ],
    cautions: ["Not effective for viral flu/common cold", "Avoid if allergic to penicillin group"],
  },
  {
    id: "vitamin-d3",
    name: "Vitamin D3",
    dose: "60000 IU",
    kind: "Capsule",
    inStock: true,
    image: "https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6b?auto=format&fit=crop&w=900&q=80",
    overview: "Vitamin D3 supports bone health, immunity, and calcium regulation.",
    uses: ["Vitamin D deficiency", "Bone health support", "Low sunlight exposure support"],
    doseGuide: [
      "Usually taken weekly or as prescribed.",
      "Take after food for better absorption.",
      "Long-term dose should be medically monitored.",
    ],
    cautions: ["Avoid excessive self-dosing", "Monitor in kidney or calcium disorders"],
  },
  {
    id: "cetirizine",
    name: "Cetirizine",
    dose: "10mg",
    kind: "Tablet",
    inStock: true,
    image: "https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&w=900&q=80",
    overview: "Cetirizine is an antihistamine used for allergy symptoms.",
    uses: ["Sneezing and runny nose", "Allergic itching", "Seasonal allergies"],
    doseGuide: [
      "Generally taken once daily or as advised.",
      "Prefer evening dose if drowsiness occurs.",
      "Do not mix with sedative medicines without medical advice.",
    ],
    cautions: ["May cause mild drowsiness in some users", "Adjust guidance in severe kidney disease"],
  },
  {
    id: "metformin",
    name: "Metformin",
    dose: "500mg",
    kind: "Tablet",
    inStock: true,
    image: "https://images.unsplash.com/photo-1576602975754-22f003188452?auto=format&fit=crop&w=900&q=80",
    overview: "Metformin is used for blood glucose control in type 2 diabetes management.",
    uses: ["Type 2 diabetes support", "Insulin resistance management"],
    doseGuide: [
      "Usually taken with meals to reduce stomach upset.",
      "Dose is individualized based on response and tolerance.",
      "Do not stop abruptly without doctor advice.",
    ],
    cautions: ["Needs regular monitoring in long-term use", "Use carefully with kidney impairment"],
  },
]
