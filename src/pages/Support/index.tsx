import { useMemo, useState, type ReactElement } from "react"
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCheckCircle,
  FiChevronDown,
  FiChevronRight,
  FiHeadphones,
  FiLifeBuoy,
  FiPaperclip,
  FiPhoneCall,
  FiSend,
  FiTool,
} from "react-icons/fi"
import { useNavigate } from "react-router-dom"
import { getEmployeeAuthSession, getEmployeeCompanySession } from "../../services/authApi"
import { createEmployeeSupportTicket } from "../../services/supportApi"
import "./support.css"

type SupportCategory = "App Bug" | "Service Issue" | "Assistance"
type PriorityLevel = "Normal" | "High" | "Urgent"

type ChatMessage = {
  id: string
  from: "bot" | "user"
  text: string
}

const categoryMeta: Record<
  SupportCategory,
  {
    team: string
    icon: ReactElement
    title: string
    copy: string
    tone: "red" | "green" | "purple"
  }
> = {
  "App Bug": {
    team: "Product Engineering",
    icon: <FiAlertCircle />,
    title: "App Bug",
    copy: "App crash, login issue, glitch, payment button not working.",
    tone: "red",
  },
  "Service Issue": {
    team: "Care Operations",
    icon: <FiTool />,
    title: "Service Issue",
    copy: "Lab, pharmacy, doctor booking, consultation, refund or delivery issue.",
    tone: "green",
  },
  Assistance: {
    team: "Assistance Team",
    icon: <FiHeadphones />,
    title: "Assistance",
    copy: "Help with benefits, bookings, wallet, or app usage.",
    tone: "purple",
  },
}

const faqs = [
  {
    q: "Why is payment failed?",
    a: "Payment may fail due to bank decline, poor network, expired checkout, or cancelled payment. Retry once after checking your bank app or UPI limit.",
  },
  {
    q: "How do I raise refund or return?",
    a: "Open your booking or pharmacy order and raise a return or refund request with the order ID and any supporting images if medicines are involved.",
  },
  {
    q: "Where do I see reports?",
    a: "Lab reports appear in Reports and also under the relevant booking once the lab partner uploads them.",
  },
]

const priorityLevels: PriorityLevel[] = ["Normal", "High", "Urgent"]

export default function Support() {
  const navigate = useNavigate()
  const auth = getEmployeeAuthSession()
  const company = getEmployeeCompanySession()
  const [subject, setSubject] = useState("")
  const [category, setCategory] = useState<SupportCategory>("Assistance")
  const [message, setMessage] = useState("")
  const [priority, setPriority] = useState<PriorityLevel>("Normal")
  const [notice, setNotice] = useState("")
  const [openFaq, setOpenFaq] = useState<number>(0)
  const [chatInput, setChatInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      from: "bot",
      text: "Hi, I'm Astikan Support. Select a category or tell us what happened. We'll route you to the right team.",
    },
  ])
  const [attachments, setAttachments] = useState<Array<{ name: string; size: number; type: string }>>([])

  const selectedMeta = categoryMeta[category]
  const isReady = subject.trim().length > 2 && message.trim().length > 8

  const quickHelpCards = useMemo(() => Object.entries(categoryMeta) as Array<[SupportCategory, (typeof categoryMeta)[SupportCategory]]>, [])

  function pushChat(preset?: string) {
    const text = (preset ?? chatInput).trim()
    if (!text) return
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), from: "user", text },
      {
        id: crypto.randomUUID(),
        from: "bot",
        text: `Got it. This looks like ${category}. I’ll route this to ${selectedMeta.team} and include it in your ticket details.`,
      },
    ])
    setMessage((prev) => `${prev}${prev ? "\n" : ""}${text}`)
    setChatInput("")
  }

  async function submit() {
    if (!isReady) {
      setNotice("Please add a short subject and explain the issue first.")
      return
    }
    const response = await createEmployeeSupportTicket({
      companyId: auth?.companyId || company?.companyId,
      employeeId: auth?.userId,
      corporateName: auth?.companyName || company?.companyName,
      reporterName: auth?.fullName || "Employee",
      reporterEmail: auth?.email || "",
      subject,
      category,
      assignedTeam: selectedMeta.team,
      priority,
      attachments,
      message,
    })
    setNotice(`Ticket created. Routed to ${response.assignedTeam || selectedMeta.team}. Ticket ID: ${response.id}`)
    setSubject("")
    setMessage("")
    setChatInput("")
    setAttachments([])
    setMessages([
      {
        id: crypto.randomUUID(),
        from: "bot",
        text: "Your support ticket is created. If you want, you can start a new request here anytime.",
      },
    ])
  }

  return (
    <main className="support-page app-page-enter">
      <header className="support-header app-fade-stagger">
        <button className="support-back app-pressable" onClick={() => navigate(-1)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <div className="support-title-wrap">
          <h1>Support</h1>
        </div>
        <button className="support-headset app-pressable" type="button" aria-label="Support channels">
          <FiHeadphones />
        </button>
      </header>

      <section className="support-shell app-content-slide">
        <article className="support-hero-card app-fade-stagger">
          <div className="support-hero-copy">
            <h2>Hi! How can we help you today? 👋</h2>
            <p>Chat with us or raise a ticket. We’re here to help.</p>
          </div>
          <div className="support-hero-art" aria-hidden="true">
            <img src="/assets/reference-ui/support-headset-art.webp" alt="" className="support-hero-asset" />
          </div>
        </article>

        <section className="support-block app-fade-stagger">
          <h3 className="support-section-title">Quick help</h3>
          <div className="support-quick-grid">
            {quickHelpCards.map(([item, meta]) => (
              <button
                key={item}
                type="button"
                className={`support-quick-card ${meta.tone} ${category === item ? "active" : ""}`}
                onClick={() => setCategory(item)}
              >
                <span className="support-quick-icon">{meta.icon}</span>
                <strong>{meta.title}</strong>
                <small>{meta.copy}</small>
                <span className="support-quick-arrow">
                  <FiChevronRight />
                </span>
              </button>
            ))}
          </div>
        </section>

        <article className="support-route-banner app-fade-stagger">
          <span className="support-route-icon">
            <FiCheckCircle />
          </span>
          <div>
            <strong>Routed to {selectedMeta.team}</strong>
            <p>Your query will be handled by our support experts.</p>
          </div>
        </article>

        <section className="support-live-card app-fade-stagger">
          <div className="support-live-head">
            <div>
              <h3>Live chat</h3>
              <p><span className="support-dot" /> We typically reply in a few minutes</p>
            </div>
          </div>

          <div className="support-chat-bot-row">
            <span className="support-bot-avatar">🤖</span>
            <div className="support-chat-bubble bot">
              {messages[messages.length - 1]?.text || "Hi, I’m Astikan Support."}
            </div>
          </div>

          <div className="support-chip-row">
            {["Payment issues", "Refund & return", "Booking help"].map((item) => (
              <button key={item} type="button" className="support-chip app-pressable" onClick={() => pushChat(item)}>
                {item}
              </button>
            ))}
          </div>

          <div className="support-chat-input-wrap">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && pushChat()}
              placeholder="Type your message..."
            />
            <button type="button" className="support-send-btn app-pressable" onClick={() => pushChat()}>
              <FiSend />
            </button>
          </div>
        </section>

        <section className="support-block app-fade-stagger">
          <div className="support-faq-stack">
            {faqs.map((faq, index) => {
              const opened = openFaq === index
              return (
                <button
                  key={faq.q}
                  type="button"
                  className={`support-faq-row ${opened ? "open" : ""}`}
                  onClick={() => setOpenFaq(opened ? -1 : index)}
                >
                  <div>
                    <strong>{faq.q}</strong>
                    {opened ? <p>{faq.a}</p> : null}
                  </div>
                  <FiChevronDown />
                </button>
              )
            })}
            <button type="button" className="support-faq-link app-pressable">
              View all FAQs
              <FiChevronRight />
            </button>
          </div>
        </section>

        <section className="support-ticket-card app-fade-stagger">
          <div className="support-ticket-head">
            <span className="support-ticket-icon">
              <FiLifeBuoy />
            </span>
            <div>
              <h3>Raise a support ticket</h3>
              <p>Provide details and our team will get back to you.</p>
            </div>
          </div>

          <label className="support-field">
            <span>Subject</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short title for your issue" />
          </label>

          <label className="support-field">
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as SupportCategory)}>
              {(Object.keys(categoryMeta) as SupportCategory[]).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <div className="support-priority-wrap">
            <span>Priority</span>
            <div className="support-priority-grid">
              {priorityLevels.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`support-priority-pill ${priority === item ? "active" : ""} ${item.toLowerCase()}`}
                  onClick={() => setPriority(item)}
                >
                  <i />
                  {item}
                </button>
              ))}
            </div>
          </div>

          <label className="support-field">
            <span>Details</span>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain what happened, booking ID, payment ID, screenshots, etc."
            />
          </label>

          <label className="support-upload-box app-pressable">
            <FiPaperclip />
            <div>
              <strong>Attach screenshot/photo</strong>
              <small>JPG, PNG up to 10MB</small>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) =>
                setAttachments(Array.from(e.target.files || []).map((file) => ({
                  name: file.name,
                  size: file.size,
                  type: file.type,
                })))
              }
            />
          </label>

          {attachments.length ? (
            <p className="support-inline-note">
              <FiPaperclip />
              {attachments.length} attachment{attachments.length > 1 ? "s" : ""} ready
            </p>
          ) : null}

          <button className="support-primary-btn app-pressable" disabled={!isReady} type="button" onClick={() => void submit()}>
            Create Support Ticket
          </button>

          <div className="support-footer-note">
            <FiCheckCircle />
            <span>Your data is safe with us.</span>
          </div>

          {notice ? <p className="support-ticket-success">{notice}</p> : null}
        </section>

        <section className="support-block app-fade-stagger">
          <h3 className="support-section-title">More help</h3>
          <div className="support-more-list">
            <button type="button" className="support-more-row app-pressable">
              <span className="support-more-icon blue">?</span>
              <div>
                <strong>FAQs</strong>
                <small>Browse common questions</small>
              </div>
              <FiChevronRight />
            </button>
            <button type="button" className="support-more-row app-pressable">
              <span className="support-more-icon green">✓</span>
              <div>
                <strong>Track your tickets</strong>
                <small>View status of your requests</small>
              </div>
              <FiChevronRight />
            </button>
            <button type="button" className="support-more-row app-pressable">
              <span className="support-more-icon purple">
                <FiPhoneCall />
              </span>
              <div>
                <strong>Contact us</strong>
                <small>Reach us through other channels</small>
              </div>
              <FiChevronRight />
            </button>
          </div>
        </section>
      </section>
    </main>
  )
}
