import { useEffect, useMemo, useState } from "react"
import { FiArrowLeft, FiCheckCircle, FiCreditCard, FiHome, FiMapPin, FiNavigation, FiTruck } from "react-icons/fi"
import { useNavigate } from "react-router-dom"
import { useCart } from "../../app/cart"
import { getEmployeeAuthSession, getEmployeeCompanySession } from "../../services/authApi"
import { createPharmacyOrder, fetchPharmacyDeliveryQuote } from "../../services/pharmacyApi"
import { initiatePayment, openCashfreeCheckout, verifyPayment } from "../../services/paymentsApi"
import { lookupIndianPincode, reverseGeocodeFromBrowserLocation } from "../../services/pincodeApi"
import "./pharmacy-checkout.css"

const PHARMACY_ORDERS_KEY = "pharmacy_orders"
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Step = "address" | "review" | "confirm"
type Method = "COD" | "CASHFREE"
type AddressForm = {
  line1: string
  line2: string
  state: string
  city: string
  pincode: string
  country: string
  phone: string
  email: string
}

function storePharmacyOrder(input: { id: string; orderId: string; createdAt: string; totalInr?: number; expectedDelivery?: string }) {
  const raw = localStorage.getItem(PHARMACY_ORDERS_KEY)
  let existing: Array<{ id: string; orderId: string; createdAt: string; totalInr?: number; expectedDelivery?: string }> = []
  if (raw) {
    try { existing = JSON.parse(raw) } catch { existing = [] }
  }
  localStorage.setItem(PHARMACY_ORDERS_KEY, JSON.stringify([input, ...existing.filter((item) => item.id !== input.id)].slice(0, 30)))
}

function toInr(value: number) {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(Number(value) || 0)))}`
}

function toInrInteger(value: number) {
  const safe = Number(value)
  if (!Number.isFinite(safe)) return 0
  return Math.max(0, Math.round(safe))
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function PharmacyCheckout() {
  const navigate = useNavigate()
  const { items, totalItems, clearCart } = useCart()
  const authSession = getEmployeeAuthSession()
  const companySession = getEmployeeCompanySession()
  const [step, setStep] = useState<Step>("address")
  const [submittingMethod, setSubmittingMethod] = useState<Method | null>(null)
  const [error, setError] = useState("")
  const [pinStatus, setPinStatus] = useState("")
  const [geoStatus, setGeoStatus] = useState("")
  const [orderId, setOrderId] = useState("")
  const [confirmedOrder, setConfirmedOrder] = useState<{ displayId: string; localId: string; payableInr: number; deliveryChargeInr: number; expectedDelivery: string } | null>(null)
  const [confirmedItems, setConfirmedItems] = useState(items)
  const [deliveryQuote, setDeliveryQuote] = useState<{ chargeInr: number; expectedDelivery: string }>({ chargeInr: 0, expectedDelivery: "" })
  const [form, setForm] = useState<AddressForm>({
    line1: "",
    line2: "",
    state: "",
    city: "",
    pincode: "",
    country: "India",
    phone: authSession?.phone?.trim() || "",
    email: authSession?.email?.trim() || "",
  })

  const subtotal = items.reduce((sum, item) => sum + toInrInteger(item.price) * item.qty, 0)
  const taxAmount = 0
  const deliveryCharge = toInrInteger(deliveryQuote.chargeInr)
  const payableTotal = subtotal + taxAmount + deliveryCharge
  const employeeName = authSession?.fullName?.trim() || "Astikan Member"
  const employeeEmail = form.email.trim() || authSession?.email?.trim() || "member@astikan.local"
  const employeePhone = form.phone.trim() || authSession?.phone?.trim() || "9999999999"
  const employeeId = String(authSession?.userId ?? "").trim()
  const companyId = String(companySession?.companyId ?? authSession?.companyId ?? "astikan-demo-company").trim()
  const addressText = [form.line1, form.line2, form.city, form.state, form.pincode, form.country].filter(Boolean).join(", ")

  const canContinue = useMemo(() => {
    return form.line1.trim().length > 2 && form.city.trim() && form.state.trim() && /^[1-9][0-9]{5}$/.test(form.pincode.trim()) && /^[6-9][0-9]{9}$/.test(form.phone.trim())
  }, [form])

  function updateField<K extends keyof AddressForm>(key: K, value: AddressForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError("")
  }

  async function applyLiveLocation() {
    setGeoStatus("Detecting your live location...")
    try {
      const next = await reverseGeocodeFromBrowserLocation()
      setForm((prev) => ({
        ...prev,
        line1: next.line1 || prev.line1,
        line2: next.line2 || prev.line2,
        state: next.state || prev.state,
        city: next.city || prev.city,
        pincode: next.pincode || prev.pincode,
        country: next.country || prev.country || "India",
      }))
      setGeoStatus("Location detected.")
    } catch (err) {
      setGeoStatus(err instanceof Error ? err.message : "Could not detect location. Please enter address manually.")
    }
  }

  useEffect(() => {
    const pin = form.pincode.trim()
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      setPinStatus("")
      return
    }
    let cancelled = false
    setPinStatus("Checking pincode...")
    const timer = window.setTimeout(async () => {
      try {
        const result = await lookupIndianPincode(pin)
        if (cancelled) return
        if (!result) {
          setPinStatus("No pincode match found.")
          return
        }
        setForm((prev) => ({
          ...prev,
          state: result.state || prev.state,
          city: result.city || prev.city,
          line2: prev.line2 || result.line2 || result.locality || "",
          pincode: pin,
        }))
        setPinStatus(`Pincode matched: ${[result.city, result.state].filter(Boolean).join(", ")}`)
      } catch {
        if (!cancelled) setPinStatus("Pincode lookup is unavailable right now.")
      }
    }, 350)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [form.pincode])

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(async () => {
      try {
        const quote = await fetchPharmacyDeliveryQuote({ subtotal, pincode: form.pincode.trim() })
        if (active) setDeliveryQuote({ chargeInr: toInrInteger(quote.chargeInr), expectedDelivery: quote.expectedDelivery || "" })
      } catch {
        if (active) setDeliveryQuote((prev) => ({ ...prev, chargeInr: prev.chargeInr || 0 }))
      }
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [form.pincode, subtotal])

  async function placeOrder(method: Method) {
    if (!items.length) {
      setError("Your medicine cart is empty.")
      return
    }
    setSubmittingMethod(method)
    setError("")
    try {
      if (!employeeId) throw new Error("Please login again to place medicine order.")
      const payment = await initiatePayment({
        serviceType: "pharmacy",
        amountInr: toInrInteger(payableTotal),
        paymentMethod: method,
        employeeId,
        companyId,
        metadata: {
          employeeName,
          employeeEmail,
          employeePhone,
          companyName: companySession?.companyName ?? "Astikan",
          itemCount: totalItems,
        },
      })
      if (method === "CASHFREE") {
        if (!payment.paymentSessionId) throw new Error("Payment gateway did not return a checkout session.")
        const checkout = await openCashfreeCheckout(payment.paymentSessionId, payment.cashfreeOrderId)
        if (checkout.state !== "SUCCESS") throw new Error("Payment was not completed, so the medicine order was not created.")
        const verified = await verifyPayment(payment.transactionId, payment.cashfreeOrderId ?? null, null)
        const verifiedStatus = String(verified.paymentStatus ?? "").toUpperCase()
        if (verifiedStatus !== "SUCCESS" && verifiedStatus !== "PAID") {
          throw new Error("Payment was not completed, so the medicine order was not created.")
        }
      }
      const result = await createPharmacyOrder({
        companyReference: companyId,
        companyName: companySession?.companyName ?? "Astikan",
        employee: {
          email: employeeEmail,
          phone: employeePhone,
          fullName: employeeName,
          handle: authSession?.email ?? employeeId,
          employeeCode: employeeId,
        },
        orderSource: "employee_store",
        status: method === "COD" ? "cod_order_created" : "payment_confirmed",
        subtotalInr: toInrInteger(subtotal),
        walletUsedInr: 0,
        onlinePaymentInr: method === "COD" ? 0 : toInrInteger(payableTotal),
        deliveryChargeInr: toInrInteger(deliveryCharge),
        shippingAddress: {
          label: "Home",
          line1: form.line1.trim(),
          line2: form.line2.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          country: form.country.trim() || "India",
          phone: employeePhone,
          email: employeeEmail,
          address: addressText,
        },
        items: items.map((item) => ({
          productId: UUID_RE.test(item.id) ? item.id : undefined,
          sku: item.id,
          name: item.name,
          category: item.kind,
          description: `${item.dose} • ${item.kind}`,
          price: toInrInteger(item.price),
          quantity: item.qty,
          imageUrls: [item.image],
          isCustom: item.isCustom,
          genericName: item.genericName,
          useCase: item.useCase,
          manufacturer: item.manufacturer,
          sourceUrl: item.sourceUrl,
        })),
      })
      if (!result?.orderId) throw new Error("Order not confirmed")
      if (method === "CASHFREE" && payment.transactionId) {
        verifyPayment(payment.transactionId, payment.cashfreeOrderId ?? null, result.localOrderId ?? result.orderId).catch(() => {})
      }
      const localOrderId = result.localOrderId || result.orderId
      const displayOrderId = result.orderId
      storePharmacyOrder({ id: localOrderId, orderId: displayOrderId, createdAt: new Date().toISOString(), totalInr: toInrInteger(payableTotal), expectedDelivery: result.expectedDelivery || deliveryQuote.expectedDelivery })
      setConfirmedItems(items)
      clearCart()
      setOrderId(displayOrderId)
      setConfirmedOrder({ displayId: displayOrderId, localId: localOrderId, payableInr: toInrInteger(result.payableInr ?? payableTotal), deliveryChargeInr: toInrInteger(result.deliveryChargeInr ?? deliveryCharge), expectedDelivery: result.expectedDelivery || deliveryQuote.expectedDelivery })
      setStep("confirm")
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not place the order. Please try again.")
    } finally {
      setSubmittingMethod(null)
    }
  }

  if (!items.length && step !== "confirm") {
    return (
      <main className="pharmacy-checkout-page">
        <header className="checkout-header"><button type="button" onClick={() => navigate(-1)}><FiArrowLeft /></button><div><h1>Medicine Checkout</h1><p>Your cart is empty</p></div></header>
        <section className="checkout-empty"><p>Add one medicine to continue checkout.</p><button type="button" onClick={() => navigate("/pharmacy")}>Browse Medicines</button></section>
      </main>
    )
  }

  return (
    <main className="pharmacy-checkout-page">
      <header className="checkout-header">
        <button type="button" aria-label="Back" onClick={() => step === "review" ? setStep("address") : navigate(-1)}><FiArrowLeft /></button>
        <div><h1>Medicine Checkout</h1><p>{step === "address" ? "Delivery address" : step === "review" ? "Review order" : "Order confirmed"}</p></div>
      </header>

      {step === "address" && (
        <section className="checkout-card checkout-address-card">
          <div className="checkout-selected-preview"><FiTruck /><div><span>Selected medicines</span><strong>{totalItems} item{totalItems === 1 ? "" : "s"}</strong><small>{items.slice(0, 2).map((item) => titleCase(item.name)).join(", ")}</small></div></div>
          <div className="address-assist-row"><button type="button" onClick={applyLiveLocation}><FiNavigation /> Use live location</button></div>
          {geoStatus && <p className="address-auto-note">{geoStatus}</p>}
          <label>Address Line 1<input value={form.line1} onChange={(e) => updateField("line1", e.target.value)} placeholder="House / flat / building" /></label>
          <label>Address Line 2<input value={form.line2} onChange={(e) => updateField("line2", e.target.value)} placeholder="Area / landmark" /></label>
          <div className="checkout-grid-two"><label>Pincode<input value={form.pincode} onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6-digit pincode" /></label><label>City / District<input value={form.city} onChange={(e) => updateField("city", e.target.value)} placeholder="City or district" /></label></div>
          {pinStatus && <p className="address-auto-note">{pinStatus}</p>}
          <div className="checkout-grid-two"><label>State<input value={form.state} onChange={(e) => updateField("state", e.target.value)} placeholder="State" /></label><label>Country<input value={form.country} onChange={(e) => updateField("country", e.target.value)} /></label></div>
          <div className="checkout-grid-two"><label>Mobile Number<input value={form.phone} onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="tel" placeholder="10-digit mobile" /></label><label>Email<input value={form.email} onChange={(e) => updateField("email", e.target.value)} inputMode="email" placeholder="Receipt email" /></label></div>
          {error && <div className="checkout-error">{error}</div>}
          <button className="checkout-primary" type="button" disabled={!canContinue} onClick={() => setStep("review")}>Continue</button>
        </section>
      )}

      {step === "review" && (
        <section className="checkout-card review-card">
          <h2>Review Order</h2>
          <div className="review-items">{items.map((item) => <article key={item.id}><img src={item.image} alt={item.name} /><div><strong>{titleCase(item.name)}</strong><span>{item.qty} × {toInr(item.price)}</span></div><b>{toInr(item.qty * item.price)}</b></article>)}</div>
          <div className="review-address"><FiMapPin /><div><span>Delivery Address</span><strong>{addressText}</strong><small>{employeePhone} • {employeeEmail}</small></div></div>
          <div className="review-totals"><p><span>Medicine subtotal</span><strong>{toInr(subtotal)}</strong></p><p><span>Tax</span><strong>Inclusive</strong></p><p><span>Delivery</span><strong>{toInr(deliveryCharge)}</strong></p><p className="total"><span>Total Amount</span><strong>{toInr(payableTotal)}</strong></p>{deliveryQuote.expectedDelivery && <p><span>Expected delivery</span><strong>{deliveryQuote.expectedDelivery}</strong></p>}</div>
          {error && <div className="checkout-error">{error}</div>}
          <div className="payment-inline"><button type="button" disabled={Boolean(submittingMethod)} onClick={() => placeOrder("COD")}><FiTruck /> {submittingMethod === "COD" ? "Creating..." : "COD"}</button><button type="button" disabled={Boolean(submittingMethod)} onClick={() => placeOrder("CASHFREE")}><FiCreditCard /> {submittingMethod === "CASHFREE" ? "Processing..." : "Pay Now"}</button></div>
        </section>
      )}

      {step === "confirm" && (
        <section className="checkout-card checkout-success">
          <FiCheckCircle />
          <h2>Medicine Order Confirmed</h2>
          <strong>Order ID: {orderId}</strong>
          <div className="success-order-preview">
            {confirmedItems.map((item) => <p key={item.id}><span>{titleCase(item.name)} × {item.qty}</span><b>{toInr(item.qty * item.price)}</b></p>)}
            <p><span>Delivery</span><b>{toInr(confirmedOrder?.deliveryChargeInr ?? deliveryCharge)}</b></p>
            <p className="total"><span>Payable Amount</span><b>{toInr(confirmedOrder?.payableInr ?? payableTotal)}</b></p>
            {(confirmedOrder?.expectedDelivery || deliveryQuote.expectedDelivery) && <p><span>Expected delivery</span><b>{confirmedOrder?.expectedDelivery || deliveryQuote.expectedDelivery}</b></p>}
          </div>
          <div className="success-actions">
            <button type="button" className="secondary" onClick={() => navigate("/")}><FiHome /> Home</button>
            <button type="button" onClick={() => navigate("/pharmacy/tracking")}><FiTruck /> Track Status</button>
          </div>
        </section>
      )}
    </main>
  )
}
