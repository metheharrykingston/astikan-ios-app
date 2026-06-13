export const HOME_ADDRESS_KEY = "employee_home_address"
export const OFFICE_ADDRESS_KEY = "employee_office_address"
export const PRIMARY_ADDRESS_KEY = "employee_primary_address"

export function syncAddressCache(input: {
  homeAddress?: string | null
  officeAddress?: string | null
  primary?: "home" | "office" | null
}) {
  const home = String(input.homeAddress ?? "").trim()
  const office = String(input.officeAddress ?? "").trim()
  const primary = input.primary ?? "home"

  if (home) localStorage.setItem(HOME_ADDRESS_KEY, home)
  if (office) localStorage.setItem(OFFICE_ADDRESS_KEY, office)
  localStorage.setItem(PRIMARY_ADDRESS_KEY, primary === "office" ? "Office" : "Home")
}

export function getAddressSnapshot() {
  const homeAddress = String(localStorage.getItem(HOME_ADDRESS_KEY) ?? "").trim()
  const officeAddress = String(localStorage.getItem(OFFICE_ADDRESS_KEY) ?? "").trim()
  const primaryLabel = String(localStorage.getItem(PRIMARY_ADDRESS_KEY) ?? "").trim()
  const primaryKey = primaryLabel.toLowerCase() === "office" ? "office" : "home"
  const primaryAddress =
    primaryKey === "office"
      ? officeAddress || homeAddress || "Home"
      : homeAddress || officeAddress || "Home"

  return {
    homeAddress,
    officeAddress,
    primaryKey,
    primaryAddress,
  }
}
