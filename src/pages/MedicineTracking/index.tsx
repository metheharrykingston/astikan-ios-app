import { useEffect, useMemo, useState } from "react"
import { FiArrowLeft, FiCheckCircle, FiClock, FiHome, FiPackage, FiTruck } from "react-icons/fi"
import { useNavigate, useSearchParams } from "react-router-dom"
import { fetchPharmacyOrder, type PharmacyOrderDetail } from "../../services/pharmacyApi"
import "./medicine-tracking.css"

const PHARMACY_ORDERS_KEY = "pharmacy_orders"

const TRACKING_STEPS = [
  { key: "placed", title: "Order Placed", icon: <FiCheckCircle />, note: "Your medicine order has been placed." },
  { key: "packed", title: "Order Packed", icon: <FiPackage />, note: "Your medicine is packed and ready." },
  { key: "dispatched", title: "Order Dispatched", icon: <FiTruck />, note: "Your order has been dispatched." },
  { key: "out_for_delivery", title: "Out for Delivery", icon: <FiTruck />, note: "Your order is on the way." },
  { key: "delivered", title: "Delivered", icon: <FiHome />, note: "Order delivered successfully." },
] as const

function readLatestPharmacyOrderId() {
  try {
    const raw = localStorage.getItem(PHARMACY_ORDERS_KEY)
    if (!raw) return ""
    const parsed = JSON.parse(raw) as Array<{ id?: string; orderId?: string }>
    const latest = Array.isArray(parsed) ? parsed[0] : null
    return String(latest?.id || latest?.orderId || "").trim()
  } catch {
    return ""
  }
}

function normalizeOrderStatus(status: string) {
  const normalized = String(status || "placed").trim().toLowerCase().replace(/[\s-]+/g, "_")
  if (["created", "cod_order_created", "paid", "payment_confirmed", "prescription_review", "stock_allocated"].includes(normalized)) return "placed"
  if (["packing_started", "order_packed"].includes(normalized)) return "packed"
  if (["dispatch_ready", "rider_assigned", "order_dispatched"].includes(normalized)) return "dispatched"
  if (["cancelled", "canceled", "order_cancelled", "order_canceled"].includes(normalized)) return "order_cancelled"
  if (["refund_successfull", "refunded"].includes(normalized)) return "refund_successful"
  return normalized
}

function formatStatusLabel(status: string) {
  const normalized = normalizeOrderStatus(status)
  const map: Record<string, string> = {
    placed: "Order Placed",
    packed: "Order Packed",
    dispatched: "Order Dispatched",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    order_cancelled: "Order Cancelled",
    request_cancelled: "Request Cancelled",
    processing_refund: "Processing Refund",
    refund_successful: "Refund Successful",
  }
  return map[normalized] || normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

const CANCELLATION_STEPS = [
  { key: "order_cancelled", title: "Order Cancelled", icon: <FiClock />, note: "Cancellation accepted before packing." },
  { key: "processing_refund", title: "Processing Refund", icon: <FiClock />, note: "Cashfree refund request has been created." },
  { key: "refund_successful", title: "Refund Successful", icon: <FiCheckCircle />, note: "Refund has been successfully processed." },
] as const

export default function MedicineTracking() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderIdFromQuery = String(searchParams.get("orderId") || "").trim()
  const [order, setOrder] = useState<PharmacyOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    const orderId = orderIdFromQuery || readLatestPharmacyOrderId()
    if (!orderId) {
      setLoading(false)
      setError("No medicine order found yet.")
      return
    }

    async function load() {
      try {
        const next = await fetchPharmacyOrder(orderId)
        if (!active) return
        setOrder(next)
        setError("")
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : "Unable to load live order tracking.")
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    const timer = window.setInterval(() => void load(), 15000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [orderIdFromQuery])

  const normalizedStatus = useMemo(() => normalizeOrderStatus(order?.status || "placed"), [order?.status])
  const isCancellationFlow = ["order_cancelled", "request_cancelled", "processing_refund", "refund_successful"].includes(normalizedStatus)

  const activeStepIndex = useMemo(() => {
    const steps = isCancellationFlow ? CANCELLATION_STEPS : TRACKING_STEPS
    const index = steps.findIndex((step) => step.key === normalizedStatus)
    return index >= 0 ? index : 0
  }, [normalizedStatus, isCancellationFlow])

  const liveStatusLabel = useMemo(() => {
    if (!order?.status) return "Order Placed"
    return order.status_label || formatStatusLabel(order.status)
  }, [order?.status, order?.status_label])

  const deliveryAddress = useMemo(() => {
    const shipping = order?.shipping_address_json ?? {}
    return String((shipping.address as string) || "").trim() || "Delivery address will appear here."
  }, [order?.shipping_address_json])


  const payableAmount = useMemo(() => {
    const shipping = order?.shipping_address_json ?? {}
    const explicit = Number(order?.payable_inr ?? shipping.payableInr ?? 0)
    if (Number.isFinite(explicit) && explicit > 0) return explicit
    const subtotal = Number(order?.subtotal_inr ?? 0) || 0
    const delivery = Number(order?.delivery_charge_inr ?? shipping.deliveryChargeInr ?? 0) || 0
    const online = Number(order?.online_payment_inr ?? 0) || 0
    return Math.max(subtotal + delivery, online)
  }, [order])

  const expectedDelivery = String(order?.expected_delivery || order?.shipping_address_json?.expectedDelivery || "")

  return (
    <main className="track-page app-page-enter">
      <header className="track-header app-fade-stagger">
        <button className="track-back app-pressable" type="button" aria-label="Back" onClick={() => navigate(-1)}>
          <FiArrowLeft />
        </button>
        <div>
          <h1>Track Order</h1>
          <p>{order?.order_id ? `Order #${order.order_id}` : "Medicine Order"}</p>
        </div>
      </header>

      <section className="track-shell app-content-slide">
        <article className="track-eta-card app-fade-stagger">
          <div className="eta-left">
            <h2>{loading ? "Loading live status..." : liveStatusLabel}</h2>
            <p>
              {isCancellationFlow
                ? normalizedStatus === "refund_successful"
                  ? "Refund has been successfully processed for this medicine order."
                  : normalizedStatus === "request_cancelled"
                    ? "Cancellation request was cancelled."
                    : "Refund is being processed automatically through Cashfree."
                : expectedDelivery ? `Expected delivery: ${expectedDelivery}` : "Your medicine order preview and latest status are shown below."}
            </p>
          </div>
          <div className="eta-icon"><FiPackage /></div>
        </article>

        <article className="track-summary-card app-fade-stagger">
          <div>
            <span>Current Status</span>
            <strong>{liveStatusLabel}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>₹{Math.round(payableAmount)}</strong>
          </div>
          <div className="track-summary-address">
            <span>Medicine</span>
            <strong>{order?.items?.map((item) => item.name).join(", ") || "Medicine"}</strong>
          </div>
          <div className="track-summary-address">
            <span>Delivery Charges</span>
            <strong>Included / as per order</strong>
          </div>
          <div className="track-summary-address">
            <span>Expected Delivery</span>
            <strong>2-4 days after packing</strong>
          </div>
          <div className="track-summary-address">
            <span>Delivery Address</span>
            <strong>{deliveryAddress}</strong>
          </div>
        </article>

        {!loading && !error && order?.items?.length ? (
          <article className="track-order-preview app-fade-stagger">
            <h3>Order Preview</h3>
            {order.items.map((item) => (
              <div className="track-order-row" key={`${item.sku || item.name}-${item.qty}`}>
                <span>{item.name} × {item.qty}</span>
                <strong>₹{Math.round(Number(item.line_total_inr || item.unit_price_inr * item.qty || 0))}</strong>
              </div>
            ))}
            <div className="track-order-row"><span>Delivery</span><strong>₹{Math.round(Number(order.delivery_charge_inr ?? order.shipping_address_json?.deliveryChargeInr ?? 0) || 0)}</strong></div>
            <div className="track-order-row total"><span>Payable Amount</span><strong>₹{Math.round(payableAmount)}</strong></div>
            {expectedDelivery ? <div className="track-order-row"><span>Expected delivery</span><strong>{expectedDelivery}</strong></div> : null}
          </article>
        ) : null}

        <section className="track-timeline app-fade-stagger">
          {loading && <div className="track-state-card">Loading current order status...</div>}
          {!loading && error && <div className="track-state-card">{error}</div>}
          {!loading && !error
            ? (isCancellationFlow ? CANCELLATION_STEPS : TRACKING_STEPS).map((item, index) => {
                const done = activeStepIndex >= index
                const current = activeStepIndex === index
                return (
                  <article key={item.key} className={`timeline-item ${done ? "done" : ""} ${current ? "current" : ""}`}>
                    <span className="timeline-icon">{done ? <FiCheckCircle /> : item.icon}</span>
                    <div>
                      <h4>{item.title}</h4>
                      <p>{current ? item.note : done ? "Completed" : "Waiting for this stage"}</p>
                    </div>
                  </article>
                )
              })
            : null}
        </section>
      </section>
    </main>
  )
}
