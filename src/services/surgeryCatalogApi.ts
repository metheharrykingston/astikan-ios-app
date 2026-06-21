import { apiGet } from "./api"
import type { SurgeryItem } from "../pages/Surgery/data"

const logoPool = [
  "/assets/surgery/apollo-logo.webp",
  "/assets/surgery/fortis-logo.webp",
  "/assets/surgery/manipal-logo.webp",
  "/assets/surgery/max-logo.webp",
]

const gradientPairs = [
  ["#0b66f6", "#38bdf8"],
  ["#7c3aed", "#ec4899"],
  ["#10b981", "#14b8a6"],
  ["#f97316", "#ef4444"],
  ["#2563eb", "#0ea5e9"],
  ["#14b8a6", "#84cc16"],
  ["#8b5cf6", "#3b82f6"],
  ["#e11d48", "#fb7185"],
]

function stableHash(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function pickGradient(key: string) {
  return gradientPairs[stableHash(key) % gradientPairs.length]
}

function getInitials(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  if (!parts.length) return "A"
  return parts.map((part) => part[0]?.toUpperCase() || "").join("")
}

function buildFallbackIcon(name: string, key: string) {
  const [start, end] = pickGradient(`${key}:icon`)
  const initials = escapeSvgText(getInitials(name))
  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="40" fill="url(#g)" />
      <circle cx="80" cy="80" r="56" fill="rgba(255,255,255,0.18)" />
      <text x="80" y="95" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="700" fill="#ffffff">${initials}</text>
    </svg>
  `)
}

function buildFallbackCard(name: string, subtitle: string, key: string, mode: "card" | "detail") {
  const [start, end] = pickGradient(`${key}:${mode}`)
  const safeTitle = escapeSvgText(String(name || "Treatment").trim().slice(0, 42))
  const safeSubtitle = escapeSvgText(String(subtitle || "Astikan Care").trim().slice(0, 42))
  const titleSize = safeTitle.length > 24 ? 24 : 30
  const height = mode === "detail" ? 640 : 520
  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="${height}" viewBox="0 0 720 ${height}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
      </defs>
      <rect width="720" height="${height}" rx="40" fill="url(#g)" />
      <circle cx="600" cy="110" r="120" fill="rgba(255,255,255,0.12)" />
      <circle cx="110" cy="${height - 90}" r="130" fill="rgba(255,255,255,0.10)" />
      <rect x="52" y="52" width="140" height="42" rx="21" fill="rgba(255,255,255,0.18)" />
      <text x="122" y="80" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#ffffff">Astikan</text>
      <text x="52" y="${mode === "detail" ? 220 : 200}" font-family="Arial, sans-serif" font-size="${titleSize}" font-weight="700" fill="#ffffff">${safeTitle}</text>
      <text x="52" y="${mode === "detail" ? 260 : 240}" font-family="Arial, sans-serif" font-size="22" font-weight="500" fill="rgba(255,255,255,0.92)">${safeSubtitle}</text>
      <rect x="52" y="${mode === "detail" ? 310 : 285}" width="210" height="56" rx="28" fill="rgba(255,255,255,0.18)" />
      <text x="157" y="${mode === "detail" ? 346 : 321}" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#ffffff">Care Guided</text>
    </svg>
  `)
}

function hasMeaningfulAsset(value: unknown) {
  const text = String(value ?? "").trim()
  return Boolean(text && text.startsWith("/assets/"))
}

function normalizeSurgeryItem(row: SurgeryItem) {
  const key = String(row.id || row.name || "astikan-treatment")
  const packages = Array.isArray(row.packages) && row.packages.length
    ? row.packages
    : [
        { id: "basic", label: "Basic", price: Number(row.startingPrice || 0), room: "Standard Room", stay: "As applicable" },
        { id: "standard", label: "Standard", price: Number(row.startingPrice || 0), room: "Private Room", stay: "As applicable" },
        { id: "premium", label: "Premium", price: Number(row.startingPrice || 0), room: "Premium Room", stay: "As applicable" },
      ]

  const hospitals = Array.isArray(row.hospitals) && row.hospitals.length
    ? row.hospitals.map((hospital, index) => ({
        ...hospital,
        logo: hasMeaningfulAsset(hospital.logo) ? hospital.logo : logoPool[index % logoPool.length],
      }))
    : logoPool.map((logo, index) => ({
        id: `${key}-hospital-${index + 1}`,
        name: ["Apollo Hospitals", "Fortis Hospitals", "Manipal Hospitals", "Max Hospitals"][index],
        rating: ["4.7", "4.6", "4.5", "4.6"][index],
        logo,
      }))

  const subtitle = String(row.subtitle || "").trim() || "Treatment support"
  const features = Array.isArray(row.features) && row.features.length
    ? row.features.slice(0, 4)
    : ["Insurance Support", "Free Consultation", "Hospital Guidance", "Care Follow-up"]

  const inclusions = Array.isArray(row.inclusions) && row.inclusions.length
    ? row.inclusions.slice(0, 6)
    : ["Doctor Consultation", "Hospital Guidance", "Pre-care Support", "Treatment Planning", "Coordination", "Follow-up"]

  const faqs = Array.isArray(row.faqs) && row.faqs.length
    ? row.faqs
    : [
        {
          question: `How does ${row.name} treatment usually work?`,
          answer: "The final plan depends on the doctor evaluation, your condition, and the hospital recommendation.",
        },
        {
          question: "Is insurance support available?",
          answer: "Insurance and cashless support depend on the treatment type, hospital, and your policy coverage.",
        },
      ]

  return {
    ...row,
    subtitle,
    shortName: String(row.shortName || row.name || "Treatment").trim(),
    icon: hasMeaningfulAsset(row.icon) ? row.icon : buildFallbackIcon(String(row.shortName || row.name || "Treatment"), key),
    cardImage: hasMeaningfulAsset(row.cardImage) ? row.cardImage : buildFallbackCard(String(row.name || "Treatment"), subtitle, key, "card"),
    detailImage: hasMeaningfulAsset(row.detailImage) ? row.detailImage : buildFallbackCard(String(row.name || "Treatment"), subtitle, key, "detail"),
    heroAlt: String(row.heroAlt || `${row.name} illustration`).trim(),
    startingPrice: Number(row.startingPrice || 0),
    emiFrom: Number(row.emiFrom || 0),
    rating: String(row.rating || "4.5"),
    reviews: String(row.reviews || "Review pending"),
    packages,
    hospitals,
    features,
    inclusions,
    faqs,
  } satisfies SurgeryItem
}

export async function fetchSurgeries(query?: { search?: string; limit?: number }) {
  const params = new URLSearchParams()
  if (query?.search) params.set("search", query.search)
  if (query?.limit) params.set("limit", String(query.limit))
  const suffix = params.toString() ? `?${params.toString()}` : ""
  const rows = await apiGet<SurgeryItem[]>(`/consumer/surgeries${suffix}`)
  return Array.isArray(rows) ? rows.map(normalizeSurgeryItem) : []
}

export async function fetchSurgeryById(id: string) {
  const row = await apiGet<SurgeryItem>(`/consumer/surgeries/${encodeURIComponent(id)}`)
  return normalizeSurgeryItem(row)
}
