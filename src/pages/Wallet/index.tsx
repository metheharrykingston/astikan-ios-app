import { useEffect, useState } from "react"
import { FiArrowLeft, FiCreditCard, FiRefreshCw, FiTrendingUp } from "react-icons/fi"
import { useNavigate } from "react-router-dom"
import { fetchEmployeeWalletSummary } from "../../services/paymentsApi"
import "./wallet.css"

export default function Wallet() {
  const navigate = useNavigate()
  const [wallet, setWallet] = useState<Awaited<ReturnType<typeof fetchEmployeeWalletSummary>> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    fetchEmployeeWalletSummary()
      .then((data) => { if (mounted) setWallet(data) })
      .catch(() => { if (mounted) setWallet(null) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const balance = wallet?.walletBalanceInr ?? 0
  const totalSavings = wallet?.estimated_savings_inr ?? 0
  const points = wallet?.loyalty_points ?? 0

  return (
    <main className="wallet-page">
      <header className="wallet-header">
        <button type="button" onClick={() => navigate(-1)} aria-label="Go back"><FiArrowLeft /></button>
        <div>
          <p>Astikan Healthcare</p>
          <h1>Wallet</h1>
        </div>
      </header>

      <section className="wallet-card">
        <span className="wallet-card-icon"><FiCreditCard /></span>
        <p>Available balance</p>
        <h2>₹{balance.toLocaleString("en-IN")}</h2>
        <small>No wallet deduction is active for medicine or lab checkout.</small>
      </section>

      <section className="wallet-grid">
        <article>
          <FiTrendingUp />
          <span>Recorded Savings</span>
          <strong>₹{totalSavings.toLocaleString("en-IN")}</strong>
        </article>
        <article>
          <FiRefreshCw />
          <span>Recorded Points</span>
          <strong>{points.toLocaleString("en-IN")}</strong>
        </article>
      </section>

      <section className="wallet-panel">
        <h2>Recent activity</h2>
        {loading ? <p>Loading wallet activity...</p> : <p>No recent wallet activity found.</p>}
      </section>
    </main>
  )
}
