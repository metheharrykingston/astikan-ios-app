import { useEffect, useMemo, useState } from "react"
import {
  FiActivity,
  FiBookOpen,
  FiCalendar,
  FiChevronRight,
  FiFileText,
  FiHome,
  FiMail,
  FiPhone,
  FiShield,
  FiUser,
} from "react-icons/fi"
import { useNavigate } from "react-router-dom"
import { getEmployeeAuthSession, getEmployeeCompanySession } from "../../services/authApi"
import { fetchEmployeeProfile, type EmployeeProfile } from "../../services/employeeApi"
import "./profile-info.css"

const profileMenu = [
  { title: "Health Information", subtitle: "Vitals, allergies, and care notes", icon: <FiActivity />, to: "/health-info" },
  { title: "Saved Address", subtitle: "Home and office locations", icon: <FiHome />, to: "/address" },
  { title: "Bookings", subtitle: "Consultation and test history", icon: <FiBookOpen />, to: "/bookings" },
  { title: "Reports", subtitle: "Invoices, bills, and files", icon: <FiFileText />, to: "/reports" },
]

function formatDate(value?: string | null) {
  if (!value) return "Not added"
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getEmploymentType(profile: EmployeeProfile | null) {
  const raw = profile?.address_json?.employment_type
  return typeof raw === "string" && raw.trim() ? raw.trim() : "Full-time"
}

function getStatusLabel(status?: string | null) {
  const normalized = String(status ?? "").trim().toLowerCase()
  if (!normalized) return "Active"
  if (normalized === "inactive") return "Inactive"
  if (normalized === "pending") return "Pending"
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export default function ProfileInfo() {
  const navigate = useNavigate()
  const authSession = getEmployeeAuthSession()
  const companySession = getEmployeeCompanySession()
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [loading, setLoading] = useState(Boolean(authSession?.userId))
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    const userId = authSession?.userId
    if (!userId) {
      setLoading(false)
      return
    }

    void fetchEmployeeProfile(userId)
      .then((data) => {
        if (!active) return
        setProfile(data)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : "Unable to load profile")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [authSession?.userId])

  const displayName = authSession?.fullName?.trim() || "Astikan Member"
  const displayEmail = authSession?.email?.trim() || "Not added"
  const displayPhone = authSession?.phone?.trim() || "Not added"
  const companyName = companySession?.companyName?.trim() || "Astikan"
  const memberId = profile?.employee_code?.trim() || authSession?.userId?.slice(0, 8).toUpperCase() || "Pending"
  const department = profile?.department?.trim() || "General"
  const designation = profile?.designation?.trim() || "Member"
  const joiningDate = formatDate(profile?.date_of_joining)
  const employmentType = getEmploymentType(profile).replace(/employee/gi, "member")
  const statusLabel = getStatusLabel(profile?.status)

  const summaryTiles = useMemo(
    () => [
      { label: "Member ID", value: memberId, icon: <FiShield /> },
      { label: "Care Group", value: department, icon: <FiUser /> },
      { label: "Member Since", value: joiningDate, icon: <FiCalendar /> },
      { label: "Plan", value: employmentType, icon: <FiUser /> },
    ],
    [department, memberId, employmentType, joiningDate],
  )

  return (
    <main className="profile-hub-page app-page-enter">
      <header className="profile-hub-header app-fade-stagger">
        <button className="profile-hub-back app-pressable" onClick={() => navigate(-1)} type="button" aria-label="Back">&lt;</button>
        <h1>My Profile</h1>
      </header>

      <section className="profile-hub-shell app-content-slide">
        <article className="profile-hero profile-hero-redesign app-fade-stagger">
          <div className="profile-hero-top">
            <div className="profile-hero-main">
              <div className="profile-avatar" aria-hidden="true">
                <FiUser />
              </div>
              <div className="profile-identity">
                <span className="profile-kicker">{companyName}</span>
                <h2>{displayName}</h2>
                <p>{designation}</p>
              </div>
            </div>
            <span className={`profile-status-pill ${statusLabel.toLowerCase()}`}>{statusLabel}</span>
          </div>

          <div className="profile-contact-grid">
            <span><FiMail /> {displayEmail}</span>
            <span><FiPhone /> {displayPhone}</span>
          </div>

          <div className="profile-summary-grid">
            {summaryTiles.map((item) => (
              <div key={item.label} className="profile-summary-tile">
                <span className="profile-summary-icon" aria-hidden="true">{item.icon}</span>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>

        {loading && <div className="profile-inline-state profile-loading">Loading profile details...</div>}
        {error && <div className="profile-inline-state profile-error">{error}</div>}

        <section className="profile-section-card app-fade-stagger">
          <div className="profile-section-head">
            <div>
              <h3>Member Details</h3>
              <p>Shown from your Astikan profile and login record.</p>
            </div>
          </div>
          <div className="profile-detail-list">
            <div className="profile-detail-row">
              <span>Name</span>
              <strong>{displayName}</strong>
            </div>
            <div className="profile-detail-row">
              <span>Plan Type</span>
              <strong>{designation}</strong>
            </div>
            <div className="profile-detail-row">
              <span>Care Group</span>
              <strong>{department}</strong>
            </div>
            <div className="profile-detail-row">
              <span>Member ID</span>
              <strong>{memberId}</strong>
            </div>
          </div>
        </section>

        <section className="profile-menu app-fade-stagger" aria-label="Profile sections">
          {profileMenu.map((item, index) => (
            <button
              key={item.title}
              className="profile-menu-item app-pressable"
              type="button"
              onClick={() => navigate(item.to)}
              style={{ animationDelay: `${90 + index * 60}ms` }}
            >
              <span className="profile-menu-icon" aria-hidden="true">{item.icon}</span>
              <span className="profile-menu-copy">
                <strong>{item.title}</strong>
                <small>{item.subtitle}</small>
              </span>
              <span className="profile-menu-arrow" aria-hidden="true">
                <FiChevronRight />
              </span>
            </button>
          ))}
        </section>
      </section>
    </main>
  )
}
