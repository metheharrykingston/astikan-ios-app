function normalizeCategoryName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

const iconRules: Array<{ match: RegExp; icon: string }> = [
  { match: /nutri|drink|protein|supplement/, icon: "🥤" },
  { match: /ayur|herbal/, icon: "🌿" },
  { match: /vitamin|multi|immunity/, icon: "💊" },
  { match: /device|monitor|thermometer|glucometer|bp/, icon: "🩺" },
  { match: /skin|derma|cream|lotion/, icon: "🧴" },
  { match: /personal|hygiene|soap|wash/, icon: "🧼" },
  { match: /pain|relief|analgesic/, icon: "🩹" },
  { match: /cold|flu|cough|fever/, icon: "🤧" },
  { match: /diabet|sugar/, icon: "🧪" },
  { match: /heart|card|bp/, icon: "❤️" },
  { match: /digest|gastric|liver/, icon: "🍽️" },
  { match: /baby|infant|mother/, icon: "🍼" },
  { match: /eye/, icon: "👁️" },
  { match: /bone|ortho|joint/, icon: "🦴" },
  { match: /kidney|renal|uro/, icon: "💧" },
  { match: /respir|asthma|lung/, icon: "🫁" },
]

export function getPharmacyCategoryIcon(categoryName: string) {
  const normalized = normalizeCategoryName(categoryName)
  const rule = iconRules.find((item) => item.match.test(normalized))
  return rule?.icon ?? "📦"
}
