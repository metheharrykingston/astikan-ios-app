import { apiGet, apiPost } from "./api";
import { getEmployeeAuthSession, getEmployeeCompanySession } from "./authApi";

export type PaymentQuote = {
  walletBalanceInr: number;
  initialCreditInr: number;
  maxWalletPerServiceInr: number;
  grossAmountInr: number;
  discountPercent: number;
  walletUsableInr: number;
  payableAmountInr: number;
  cashbackFlatInr?: number;
  cashbackMessage?: string;
  cashbackBadge?: string;
  cashbackTerms?: string;
  campaignName?: string | null;
  codEnabled?: boolean;
  cashfreeEnabled?: boolean;
};

export type PaymentIntent = {
  transactionId: string;
  paymentMethod: "CASHFREE" | "COD";
  paymentStatus: string;
  cashfreeOrderId?: string | null;
  paymentSessionId?: string | null;
  quote: PaymentQuote;
};

export type CashfreeCheckoutState = "SUCCESS" | "PENDING" | "FAILED";

export type CashfreeCheckoutOpenResult = {
  state: CashfreeCheckoutState;
  rawStatus: string;
  payload?: unknown;
};

type CashfreeCheckoutResult = {
  error?: { message?: string; code?: string } | null;
  paymentDetails?: {
    paymentStatus?: string;
    payment_status?: string;
  } | null;
  paymentStatus?: string;
  payment_status?: string;
  status?: string;
};

function getSessionRefs() {
  const auth = getEmployeeAuthSession();
  const company = getEmployeeCompanySession();
  const employeeId = String(auth?.userId ?? "").trim();
  const companyId = String(auth?.companyId ?? company?.companyId ?? "astikan-demo-company").trim();

  if (!employeeId) {
    throw new Error("Please login again to continue.");
  }

  return {
    employeeId,
    companyId,
  };
}

export async function fetchPaymentQuote(
  serviceType: "pharmacy" | "lab" | "teleconsult" | "opd",
  amountInr: number,
  refs?: { employeeId?: string; companyId?: string },
) {
  const sessionRefs = refs?.employeeId && refs?.companyId ? { employeeId: refs.employeeId, companyId: refs.companyId } : getSessionRefs();
  return apiPost<PaymentQuote, { employeeId: string; companyId: string; serviceType: string; amountInr: number }>(
    "/payments/quote",
    { employeeId: sessionRefs.employeeId, companyId: sessionRefs.companyId, serviceType, amountInr },
  );
}

export async function initiatePayment(input: {
  serviceType: "pharmacy" | "lab" | "teleconsult" | "opd";
  amountInr: number;
  paymentMethod: "CASHFREE" | "COD";
  metadata?: Record<string, unknown>;
  employeeId?: string;
  companyId?: string;
}) {
  const sessionRefs = input.employeeId && input.companyId ? { employeeId: input.employeeId, companyId: input.companyId } : getSessionRefs();
  return apiPost<PaymentIntent, { employeeId: string; companyId: string; serviceType: string; amountInr: number; paymentMethod: string; metadata?: Record<string, unknown> }>(
    "/payments/initiate",
    { employeeId: sessionRefs.employeeId, companyId: sessionRefs.companyId, serviceType: input.serviceType, amountInr: input.amountInr, paymentMethod: input.paymentMethod, metadata: input.metadata ?? {} },
  );
}

export async function verifyPayment(transactionId: string, cashfreeOrderId?: string | null, serviceReference?: string | null) {
  return apiPost<{ transactionId: string; paymentStatus: string; provider: string }, { transactionId: string; cashfreeOrderId?: string | null; serviceReference?: string | null }>(
    "/payments/verify",
    { transactionId, cashfreeOrderId: cashfreeOrderId ?? null, serviceReference: serviceReference ?? null },
  );
}

declare global {
  interface Window {
    Cashfree?: (config: { mode: "sandbox" | "production" }) => {
      checkout: (config: { paymentSessionId: string; redirectTarget?: "_modal" }) => Promise<unknown>;
    };
  }
}

let cashfreeScriptPromise: Promise<void> | null = null;

async function ensureCashfreeScript() {
  if (window.Cashfree) return;
  if (!cashfreeScriptPromise) {
    cashfreeScriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-cashfree-sdk="true"]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Cashfree SDK failed to load")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.async = true;
      script.dataset.cashfreeSdk = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Cashfree SDK failed to load"));
      document.head.appendChild(script);
    });
  }
  await cashfreeScriptPromise;
}

function validateCashfreeSession(paymentSessionId: string, cashfreeOrderId?: string | null) {
  const sessionId = String(paymentSessionId ?? "").trim();
  const orderId = String(cashfreeOrderId ?? "").trim();

  if (!sessionId || !sessionId.startsWith("session_") || sessionId.length < 40) {
    throw new Error("Cashfree returned an invalid payment session. Please retry.");
  }

  return { sessionId, orderId };
}

export async function openCashfreeCheckout(
  paymentSessionId: string,
  cashfreeOrderId?: string | null,
): Promise<CashfreeCheckoutOpenResult> {
  const validated = validateCashfreeSession(paymentSessionId, cashfreeOrderId);

  await ensureCashfreeScript();
  const mode = window.location.hostname.includes("astikan.tech") ? "production" : "sandbox";
  const cashfree = window.Cashfree?.({ mode });
  if (!cashfree) throw new Error("Cashfree SDK is unavailable");
  const result = (await cashfree.checkout({
    paymentSessionId: validated.sessionId,
    redirectTarget: "_modal",
  })) as CashfreeCheckoutResult | undefined;

  const errorMessage = String(result?.error?.message ?? "").trim();
  if (errorMessage) {
    throw new Error(errorMessage || "Payment not completed.");
  }

  const rawStatus = String(
    result?.paymentDetails?.paymentStatus ??
      result?.paymentDetails?.payment_status ??
      result?.paymentStatus ??
      result?.payment_status ??
      result?.status ??
      ""
  )
    .trim()
    .toUpperCase();

  if (!rawStatus) {
    return {
      state: "PENDING",
      rawStatus: "UNKNOWN",
      payload: result,
    };
  }

  if (rawStatus === "SUCCESS" || rawStatus === "PAID") {
    return {
      state: "SUCCESS",
      rawStatus,
      payload: result,
    };
  }

  if (rawStatus.includes("CANCEL") || rawStatus.includes("DROP") || rawStatus.includes("FAIL")) {
    throw new Error("Payment not completed.");
  }

  if (rawStatus.includes("ACTIVE") || rawStatus.includes("PENDING") || rawStatus.includes("INITIAL")) {
    return {
      state: "PENDING",
      rawStatus,
      payload: result,
    };
  }

  return {
    state: "PENDING",
    rawStatus,
    payload: result,
  };
}

export async function fetchEmployeeWalletSummary() {
  const { employeeId, companyId } = getSessionRefs();
  void employeeId;
  void companyId;
  return apiGet<{
    month: string;
    userId: string;
    employeeId?: string;
    companyId: string;
    walletBalanceInr: number;
    initialCreditInr: number;
    maxUsablePerServiceInr: number;
    wallet_used_inr: number;
    loyalty_points: number;
    estimated_savings_inr: number;
  }>("/payments/user/wallet-summary");
}

export type EmployeePaymentHistoryItem = {
  id: string;
  company_id: string;
  employee_id: string;
  service_type: string;
  service_reference?: string | null;
  payment_method: string;
  payment_status: string;
  order_amount_inr: number;
  wallet_discount_inr: number;
  payable_inr: number;
  discount_percent: number;
  cod_amount_inr: number;
  cashfree_order_id?: string | null;
  failure_reason?: string | null;
  created_at: string;
  paid_at?: string | null;
  employee_name?: string | null;
  employee_email?: string | null;
  company_name?: string | null;
};

export async function fetchEmployeePaymentHistory(limit = 20) {
  return apiGet<{
    items: EmployeePaymentHistoryItem[];
    total: number;
    limit: number;
    offset: number;
  }>(`/payments/user/history?limit=${encodeURIComponent(String(limit))}`);
}
