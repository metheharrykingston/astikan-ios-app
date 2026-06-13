import { useState } from "react"
import { FiAlertTriangle, FiArrowLeft, FiHome, FiSend } from "react-icons/fi"
import { useLocation, useNavigate } from "react-router-dom"
import { getEmployeeAuthSession, getEmployeeCompanySession } from "../../services/authApi"
import { createEmployeeSupportTicket } from "../../services/supportApi"
import "./not-found.css"

export default function NotFound() {
  const navigate = useNavigate()
  const location = useLocation()
  const auth = getEmployeeAuthSession()
  const company = getEmployeeCompanySession()
  const [reportState, setReportState] = useState<"idle" | "sending" | "sent" | "failed">("idle")

  async function reportScreen() {
    setReportState("sending")
    try {
      await createEmployeeSupportTicket({
        companyId: auth?.companyId || company?.companyId,
        employeeId: auth?.userId,
        corporateName: company?.companyName || "Astikan",
        reporterName: auth?.fullName || "Astikan User",
        reporterEmail: auth?.email || "",
        subject: `404 page reported: ${location.pathname}`,
        category: "App Screen Issue",
        priority: "High",
        assignedTeam: "Tech Team",
        message: `User reported a missing/broken screen. Path: ${location.pathname}${location.search}. User: ${auth?.fullName || "Unknown"} (${auth?.email || auth?.phone || "no contact"}).`,
      })
      setReportState("sent")
    } catch {
      setReportState("failed")
    }
  }

  return (
    <main className="not-found-page app-page-enter">
      <section className="not-found-card">
        <div className="not-found-icon"><FiAlertTriangle /></div>
        <p className="not-found-kicker">404</p>
        <h1>Oops, not found</h1>
        <p>This screen is not available or the route is broken.</p>
        <small>{location.pathname}</small>
        <div className="not-found-actions">
          <button type="button" onClick={() => navigate("/home")}><FiHome /> Go Home</button>
          <button type="button" onClick={() => navigate(-1)}><FiArrowLeft /> Go Back</button>
          <button type="button" className="report" onClick={reportScreen} disabled={reportState === "sending" || reportState === "sent"}>
            <FiSend /> {reportState === "sending" ? "Reporting..." : reportState === "sent" ? "Reported" : "Report"}
          </button>
        </div>
        {reportState === "failed" && <p className="not-found-error">Could not send report. Please try again.</p>}
      </section>
    </main>
  )
}
