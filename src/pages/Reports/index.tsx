import { useEffect, useMemo, useRef, useState } from "react"
import { FiArrowLeft, FiDownload, FiEye, FiX } from "react-icons/fi"
import { useNavigate } from "react-router-dom"
import { Capacitor } from "@capacitor/core"
import { Directory, Filesystem } from "@capacitor/filesystem"
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import "../Settings/settings.css"
import "./index.css"
import { ensureEmployeeActor } from "../../services/actorsApi"
import { addNotification } from "../../services/notificationCenter"
import { buildReportDownloadName, getLabOrders, getLabReportLink, type LabOrder } from "../../services/labApi"
import { resolveInvoiceDownloadUrl, fetchEmployeeInvoices, type EmployeeInvoice } from "../../services/invoiceApi"
import { buildDocumentDownloadUrl, fetchEmployeeDocuments, type EmployeeServiceDocument } from "../../services/documentApi"
import { fetchEmployeePrescriptions, type EmployeePrescription } from "../../services/teleconsultApi"
import { buildApiUrl, getAuthToken } from "../../services/api"

type ReportTab = "Bills" | "Lab Reports" | "Consultation Reports"
type PdfLabel = "Bill" | "Report" | "Receipt" | "Prescription"

type RenderReportItem = {
  title: string
  subtitle: string
  date: string
  type: string
  status?: "New" | "Updated"
  pdfLabel?: PdfLabel
  fileName?: string
  getUrl?: () => Promise<string | null>
}

type PrescriptionActionCard = {
  title: string
  subtitle: string
  date: string
  summary: string
  medicines: string[]
  labTests: string[]
  followUpDate?: string | null
}

type ViewerState = {
  title: string
  blob: Blob
  fileName: string
}

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

function titleCase(value: string) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

function inferPdfLabel(value: string): PdfLabel {
  const lower = value.toLowerCase()
  if (lower.includes("receipt")) return "Receipt"
  if (lower.includes("report")) return "Report"
  if (lower.includes("prescription")) return "Prescription"
  return "Bill"
}

function safeFileName(value: string, fallback: string) {
  const cleaned = value.replace(/[^a-z0-9._-]+/gi, "-").replace(/(^-|-$)/g, "")
  return cleaned || fallback
}

async function fetchPdfBlob(rawUrl: string) {
  const url = buildApiUrl(rawUrl)
  const headers: HeadersInit = {}
  const token = getAuthToken()
  if (token && (url.includes("/api/") || rawUrl.startsWith("/api/"))) {
    headers.Authorization = `Bearer ${token}`
  }
  const response = await fetch(url, { headers })
  if (!response.ok) throw new Error(`Unable to open PDF (${response.status}).`)
  return response.blob()
}

async function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "")
    reader.onerror = () => reject(reader.error || new Error("Unable to read PDF file."))
    reader.readAsDataURL(blob)
  })
}

async function savePdf(blob: Blob, fileName: string) {
  if (Capacitor.isNativePlatform()) {
    const data = await blobToBase64(blob)
    const result = await Filesystem.writeFile({
      path: `Astikan/${safeFileName(fileName, "astikan-document.pdf")}`,
      data,
      directory: Directory.Documents,
      recursive: true,
    })
    return result.uri
  }
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = blobUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1500)
  return fileName
}

function PdfPreview({ blob, title }: { blob: Blob; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    let cancelled = false
    let task: ReturnType<typeof getDocument> | null = null
    void (async () => {
      try {
        setStatus("loading")
        const data = await blob.arrayBuffer()
        task = getDocument({ data })
        const pdf = await task.promise
        const page = await pdf.getPage(1)
        const canvas = canvasRef.current
        if (!canvas || cancelled) return
        const baseViewport = page.getViewport({ scale: 1 })
        const availableWidth = Math.max(280, canvas.parentElement?.clientWidth || 360)
        const viewport = page.getViewport({ scale: availableWidth / baseViewport.width })
        const ratio = window.devicePixelRatio || 1
        canvas.width = Math.floor(viewport.width * ratio)
        canvas.height = Math.floor(viewport.height * ratio)
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        const context = canvas.getContext("2d")
        if (!context) throw new Error("PDF canvas is unavailable.")
        await page.render({ canvas, canvasContext: context, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] }).promise
        if (!cancelled) setStatus("ready")
      } catch {
        if (!cancelled) setStatus("error")
      }
    })()
    return () => {
      cancelled = true
      void task?.destroy()
    }
  }, [blob])

  return (
    <div className="report-pdf-preview" aria-label={`${title} PDF preview`}>
      {status === "loading" ? <div className="report-pdf-loading"><span className="report-spinner" />Loading PDF preview...</div> : null}
      {status === "error" ? <div className="report-pdf-error">PDF preview could not be rendered. You can still download the bill.</div> : null}
      <canvas ref={canvasRef} hidden={status === "error"} />
    </div>
  )
}

export default function Reports() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<ReportTab>("Bills")
  const [labOrders, setLabOrders] = useState<LabOrder[]>([])
  const [invoices, setInvoices] = useState<EmployeeInvoice[]>([])
  const [documents, setDocuments] = useState<EmployeeServiceDocument[]>([])
  const [prescriptions, setPrescriptions] = useState<EmployeePrescription[]>([])
  const [viewer, setViewer] = useState<ViewerState | null>(null)
  const [busyDocKey, setBusyDocKey] = useState("")
  const [reportNote, setReportNote] = useState("")

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const actor = await ensureEmployeeActor({ companyReference: "astikan-demo-company", companyName: "Astikan" })
        const orders = await getLabOrders(actor.employeeUserId)
        if (active) setLabOrders(orders)
        if (active) {
          orders
            .filter((order) => order.status.toLowerCase().includes("report") || Boolean(order.reportKey))
            .forEach((order) => {
              const key = `lab_report_notified:${order.id}`
              if (localStorage.getItem(key)) return
              localStorage.setItem(key, "1")
              void addNotification({
                title: "Lab report ready",
                body: `${order.testName} report is now available.`,
                channel: "health",
                cta: { label: "View Report", route: `/lab-tests/report/${order.id}` },
              })
            })
        }
      } catch {
        if (active) setLabOrders([])
      }
    })()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void fetchEmployeeInvoices()
      .then((items) => {
        if (active) setInvoices(items)
      })
      .catch(() => {
        if (active) setInvoices([])
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void fetchEmployeeDocuments()
      .then((items) => {
        if (active) setDocuments(items)
      })
      .catch(() => {
        if (active) setDocuments([])
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void fetchEmployeePrescriptions(30)
      .then((items) => {
        if (active) setPrescriptions(Array.isArray(items) ? items : [])
      })
      .catch(() => {
        if (active) setPrescriptions([])
      })
    return () => {
      active = false
    }
  }, [])

  const list = useMemo<RenderReportItem[]>(() => {
    if (tab === "Lab Reports") {
      return labOrders
        .filter((order) => order.status.toLowerCase().includes("report") || Boolean(order.reportKey))
        .map((order) => ({
          title: order.testName,
          subtitle: "Lab report ready",
          date: new Date(order.createdAt).toLocaleDateString(),
          type: "PDF",
          status: "New" as const,
          pdfLabel: "Report" as const,
          fileName: buildReportDownloadName(order.testName, order.createdAt),
          getUrl: async () => {
            const actor = await ensureEmployeeActor({ companyReference: "astikan-demo-company", companyName: "Astikan" })
            return getLabReportLink(order.id, actor.employeeUserId)
          },
        }))
    }
    if (tab === "Bills") {
      const invoiceItems = invoices.map((invoice) => ({
        title: `${invoice.service_type.toUpperCase()} bill • ${invoice.invoice_number}`,
        subtitle: `${invoice.company_name || "Astikan Healthcare Pvt Ltd"} • Paid ₹${Math.round(invoice.payable_inr || 0)}`,
        date: new Date(invoice.created_at).toLocaleDateString(),
        type: "PDF",
        status: invoice.invoice_status === "ISSUED" ? ("New" as const) : undefined,
        pdfLabel: "Bill" as const,
        fileName: invoice.file_name || `${invoice.invoice_number}.pdf`,
        getUrl: async () => resolveInvoiceDownloadUrl(invoice),
      }))
      const documentItems = documents.map((document) => {
        const label = inferPdfLabel(`${document.document_kind} ${document.source_type}`)
        return {
          title: `${titleCase(document.document_kind)} • ${document.document_number}`,
          subtitle: `${titleCase(document.source_type)} • ${titleCase(document.document_status)}`,
          date: new Date(document.created_at).toLocaleDateString(),
          type: "PDF",
          status: document.document_status === "ISSUED" ? ("New" as const) : undefined,
          pdfLabel: label,
          fileName: document.file_name || `${document.document_number}.pdf`,
          getUrl: async () => document.public_url || buildDocumentDownloadUrl(document.id),
        }
      })
      return [...invoiceItems, ...documentItems]
    }
    if (tab === "Consultation Reports") {
      return prescriptions.map((item) => ({
        title: item.conditionSummary || "Teleconsult Prescription",
        subtitle: [
          item.medicines.length ? `Medicines: ${item.medicines.map((medicine) => medicine.name).slice(0, 3).join(", ")}` : "",
          item.labTests.length ? `Tests: ${item.labTests.map((test) => test.name).slice(0, 2).join(", ")}` : "",
        ].filter(Boolean).join(" • ") || "Doctor summary available",
        date: new Date(item.createdAt).toLocaleDateString(),
        type: "Prescription",
        status: "Updated" as const,
      }))
    }
    return []
  }, [tab, invoices, documents, labOrders, prescriptions])

  const livePrescriptionCards = useMemo<PrescriptionActionCard[]>(() => {
    return prescriptions.map((item) => ({
      title: item.conditionSummary || "Teleconsult Prescription",
      subtitle: "Delivered by your Astikan doctor network",
      date: new Date(item.createdAt).toLocaleDateString(),
      summary: item.notes,
      medicines: item.medicines.map((medicine) => medicine.name).filter(Boolean),
      labTests: item.labTests.map((test) => test.name).filter(Boolean),
      followUpDate: item.followUpDate,
    }))
  }, [prescriptions])

  async function viewPdf(item: RenderReportItem) {
    if (!item.getUrl) return
    setReportNote("")
    const key = `view:${item.title}:${item.date}`
    setBusyDocKey(key)
    try {
      const rawUrl = await item.getUrl()
      if (!rawUrl) throw new Error(`${item.pdfLabel || "Document"} file is not available yet.`)
      const blob = await fetchPdfBlob(rawUrl)
      setViewer({ title: item.title, blob, fileName: item.fileName || safeFileName(`${item.title}.pdf`, "astikan-document.pdf") })
    } catch (error) {
      setReportNote(error instanceof Error ? error.message : "Unable to open this document right now.")
    } finally {
      setBusyDocKey("")
    }
  }

  async function downloadPdf(item: RenderReportItem) {
    if (!item.getUrl) return
    setReportNote("")
    const key = `download:${item.title}:${item.date}`
    setBusyDocKey(key)
    try {
      const rawUrl = await item.getUrl()
      if (!rawUrl) throw new Error(`${item.pdfLabel || "Document"} file is not available yet.`)
      const blob = await fetchPdfBlob(rawUrl)
      const fileName = item.fileName || safeFileName(`${item.title}.pdf`, "astikan-document.pdf")
      await savePdf(blob, fileName)
      setReportNote(Capacitor.isNativePlatform() ? `Downloaded to Documents/Astikan/${fileName}` : `${fileName} downloaded.`)
    } catch (error) {
      setReportNote(error instanceof Error ? error.message : "Unable to download this document right now.")
    } finally {
      setBusyDocKey("")
    }
  }

  return (
    <main className="account-page reports-page app-page-enter">
      <header className="account-header app-fade-stagger">
        <button className="account-back app-pressable" onClick={() => navigate(-1)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <h1>Bills & Reports</h1>
      </header>

      <section className="account-shell app-content-slide">
        <article className="account-card app-fade-stagger">
          <h3>All bills and clinical reports</h3>
          <p>View or download real PDFs generated for your medicine orders, lab tests, receipts and reports.</p>
        </article>

        <div className="tab-row reports-tab-row app-fade-stagger">
          {(["Bills", "Lab Reports", "Consultation Reports"] as const).map((item) => (
            <button key={item} className={`tab-btn app-pressable ${tab === item ? "active" : ""}`} type="button" onClick={() => setTab(item)}>
              {item}
            </button>
          ))}
        </div>

        {reportNote ? <p className="service-request-note reports-note app-fade-stagger">{reportNote}</p> : null}

        <section className="notice-list app-fade-stagger">
          {list.length === 0 && (
            <article className="notice-item">
              <h4>No records yet</h4>
              <p>Your real bills, receipts and reports will appear here after the backend generates them.</p>
            </article>
          )}
          {tab === "Consultation Reports" && livePrescriptionCards.length > 0
            ? livePrescriptionCards.map((item) => (
                <article key={`${item.title}-${item.date}`} className="notice-item notice-item--prescription">
                  <div className="notice-pill-row">
                    <span className="notice-pill">Prescription Ready</span>
                    <span className="notice-pill notice-pill--soft">{item.date}</span>
                  </div>
                  <h4>{item.title}</h4>
                  <p>{item.subtitle}</p>
                  <small>{item.followUpDate ? `Follow-up by ${new Date(item.followUpDate).toLocaleDateString()}` : "Follow-up as advised by doctor"}</small>
                  <p className="notice-summary">{item.summary}</p>
                  <div className="notice-cta-grid">
                    <div className="notice-cta-card">
                      <strong>Medicines with Astikan</strong>
                      <span>{item.medicines.length ? item.medicines.slice(0, 4).join(", ") : "Medicines suggested in this prescription"}</span>
                      <button className="app-pressable" type="button" onClick={() => navigate("/pharmacy")}>Book Medicines</button>
                    </div>
                    <div className="notice-cta-card">
                      <strong>Lab Tests with Astikan</strong>
                      <span>{item.labTests.length ? item.labTests.slice(0, 3).join(", ") : "Recommended diagnostic tests available in network"}</span>
                      <button className="app-pressable" type="button" onClick={() => navigate("/lab-tests")}>Book Lab Tests</button>
                    </div>
                    <div className="notice-cta-card">
                      <strong>Need another review?</strong>
                      <span>Book a follow-up consultation and continue with your Astikan care journey.</span>
                      <button className="app-pressable" type="button" onClick={() => navigate("/teleconsultation")}>Book Follow-up</button>
                    </div>
                  </div>
                </article>
              ))
            : list.map((item) => {
                const viewKey = `view:${item.title}:${item.date}`
                const downloadKey = `download:${item.title}:${item.date}`
                const label = item.pdfLabel || "Report"
                return (
                  <article key={`${item.title}-${item.date}`} className="notice-item report-item-card">
                    <div className="report-item-top">
                      <div>
                        <h4>{item.title}</h4>
                        <p>{item.subtitle}</p>
                      </div>
                      {item.status ? <span className="notice-pill">{item.status}</span> : null}
                    </div>
                    <small>{item.date} • {item.type}</small>
                    {item.getUrl ? (
                      <div className="report-action-row">
                        <button className="app-pressable report-view-btn" type="button" onClick={() => void viewPdf(item)} disabled={Boolean(busyDocKey)}>
                          <FiEye /> {busyDocKey === viewKey ? "Opening..." : `View ${label}`}
                        </button>
                        <button className="app-pressable report-download-btn" type="button" onClick={() => void downloadPdf(item)} disabled={Boolean(busyDocKey)}>
                          <FiDownload /> {busyDocKey === downloadKey ? "Downloading..." : `Download ${label}`}
                        </button>
                      </div>
                    ) : null}
                  </article>
                )
              })}
        </section>
      </section>

      {viewer ? (
        <div className="report-viewer-overlay" role="dialog" aria-modal="true" aria-label="PDF viewer">
          <section className="report-viewer-card app-page-enter">
            <div className="report-viewer-head">
              <div>
                <h3>{viewer.title}</h3>
                <p>{viewer.fileName}</p>
              </div>
              <button className="app-pressable" type="button" aria-label="Close viewer" onClick={() => setViewer(null)}><FiX /></button>
            </div>
            <PdfPreview blob={viewer.blob} title={viewer.title} />
            <button className="report-download-btn app-pressable" type="button" onClick={() => void savePdf(viewer.blob, viewer.fileName).then(() => {
              setReportNote(Capacitor.isNativePlatform() ? `Downloaded to Documents/Astikan/${viewer.fileName}` : `${viewer.fileName} downloaded.`)
            }).catch(() => setReportNote("Unable to download this PDF right now."))}>
              <FiDownload /> Download PDF
            </button>
          </section>
        </div>
      ) : null}
    </main>
  )
}
