import { useMemo, useState } from "react"
import {
  FiArrowLeft,
  FiCheckCircle,
  FiChevronDown,
  FiChevronRight,
  FiShield,
  FiUser,
} from "react-icons/fi"
import { FaCalculator, FaStar } from "react-icons/fa"
import { useNavigate } from "react-router-dom"
import { goBackOrFallback } from "../../utils/navigation"
import "./insurance.css"

import premiumQuickCalculatorIcon from "../../assets/insurance/premium_01_quick_calculator_icon.png"
import premiumBannerClipboardCalculator from "../../assets/insurance/premium_02_banner_clipboard_calculator.png"
import premiumEstimateShieldHeart from "../../assets/insurance/premium_03_estimated_premium_shield_heart.png"
import premiumSaveTagIcon from "../../assets/insurance/premium_04_save_tag_icon.png"
import premiumFamilyCoverIcon from "../../assets/insurance/premium_05_family_cover_icon.png"
import premiumFastSupportIcon from "../../assets/insurance/premium_06_fast_support_icon.png"
import goldLargeMedalIcon from "../../assets/insurance/gold_01_large_medal_icon.png"
import goldWalletTopupIcon from "../../assets/insurance/gold_02_wallet_topup_icon.png"
import goldHealthPocketCardIcon from "../../assets/insurance/gold_03_healthpocket_card_icon.png"
import goldLabTestsIcon from "../../assets/insurance/gold_04_lab_tests_icon.png"
import goldOpdConsultationIcon from "../../assets/insurance/gold_05_opd_consultation_icon.png"
import goldTeleconsultationIcon from "../../assets/insurance/gold_06_teleconsultation_icon.png"
import goldIpdCoverageIcon from "../../assets/insurance/gold_07_ipd_coverage_icon.png"
import goldDailyCashIcon from "../../assets/insurance/gold_08_daily_cash_icon.png"
import goldWellnessVoucherIcon from "../../assets/insurance/gold_09_wellness_voucher_icon.png"
import goldPanelDiscountIcon from "../../assets/insurance/gold_10_panel_discount_icon.png"
import goldWhyChooseShieldCheck from "../../assets/insurance/gold_11_why_choose_shield_check.png"
import insuranceHeroIllustration from "../../assets/insurance/insurance_01_hero_health_insurance_illustration.png"
import insuranceCalculatePremiumIcon from "../../assets/insurance/insurance_02_calculate_premium_icon.png"
import insuranceSilverPlanIcon from "../../assets/insurance/insurance_03_silver_plan_star_icon.png"
import insuranceGoldPlanIcon from "../../assets/insurance/insurance_04_gold_plan_medal_icon.png"
import insurancePlatinumPlanIcon from "../../assets/insurance/insurance_05_platinum_plan_shield_icon.png"

type InsuranceView = "plans" | "calculator" | "detail"
type PlanKey = "silver" | "gold" | "platinum"

type Plan = {
  key: PlanKey
  title: string
  price: string
  daily: string
  description: string
  icon: string
  detailIcon: string
  tone: "silver" | "gold" | "platinum"
  popular?: boolean
  chips: string[]
  benefits: Array<{ title: string; value?: string; icon: string }>
  moreBenefits: Array<{ title: string; value: string; icon: string; tone: "purple" | "green" | "blue" }>
  why: string[]
}

const premiumFields = [
  ["Select Age Band", "36–45 years"],
  ["Coverage Amount", "₹10,00,000"],
  ["Number of Adults", "2"],
  ["Number of Children", "1"],
  ["Teleconsultations", "0"],
  ["Lab Tests", "0"],
  ["OPD Visits", "0"],
  ["Medicine Buckets", "0"],
] as const

const benefitIcons = {
  wallet: goldWalletTopupIcon,
  card: goldHealthPocketCardIcon,
  lab: goldLabTestsIcon,
  opd: goldOpdConsultationIcon,
  tele: goldTeleconsultationIcon,
  ipd: goldIpdCoverageIcon,
  dailyCash: goldDailyCashIcon,
  wellness: goldWellnessVoucherIcon,
  discount: goldPanelDiscountIcon,
}

const plans: Plan[] = [
  {
    key: "silver",
    title: "Silver Plan",
    price: "₹8,499",
    daily: "₹23.28",
    description: "Essential coverage for everyday needs",
    icon: insuranceSilverPlanIcon,
    detailIcon: insuranceSilverPlanIcon,
    tone: "silver",
    chips: ["Teleconsultation", "Lab Benefits"],
    benefits: [
      { title: "Wallet Topup", value: "1,00,000 Pts", icon: benefitIcons.wallet },
      { title: "HealthPocket Card", icon: benefitIcons.card },
      { title: "Basic Lab Tests", value: "2 Included", icon: benefitIcons.lab },
      { title: "OPD Consultation", value: "5 visits", icon: benefitIcons.opd },
      { title: "Teleconsultation", value: "Unlimited", icon: benefitIcons.tele },
      { title: "IPD Coverage", value: "₹50,000", icon: benefitIcons.ipd },
    ],
    moreBenefits: [
      { title: "Daily Cash Coverage", value: "₹25,000", icon: benefitIcons.dailyCash, tone: "purple" },
      { title: "Wellness Vouchers", value: "₹20,000", icon: benefitIcons.wellness, tone: "green" },
      { title: "Panel Discounts", value: "Up to 35%", icon: benefitIcons.discount, tone: "blue" },
    ],
    why: ["Simple everyday health cover", "Good for first-time members", "Quick support and basic claims"],
  },
  {
    key: "gold",
    title: "Gold Plan",
    price: "₹11,499",
    daily: "₹30.99",
    description: "Balanced protection for you and your family",
    icon: insuranceGoldPlanIcon,
    detailIcon: goldLargeMedalIcon,
    tone: "gold",
    popular: true,
    chips: ["Teleconsultation", "Lab Benefits"],
    benefits: [
      { title: "Wallet Topup", value: "2,00,000 Pts", icon: benefitIcons.wallet },
      { title: "HealthPocket Card", icon: benefitIcons.card },
      { title: "Full Body Lab Tests", value: "4 Included", icon: benefitIcons.lab },
      { title: "OPD Consultation", value: "10 visits", icon: benefitIcons.opd },
      { title: "Teleconsultation", value: "Unlimited", icon: benefitIcons.tele },
      { title: "IPD Coverage", value: "₹1,00,000", icon: benefitIcons.ipd },
    ],
    moreBenefits: [
      { title: "Daily Cash Coverage", value: "₹45,000", icon: benefitIcons.dailyCash, tone: "purple" },
      { title: "Wellness Vouchers", value: "₹50,000", icon: benefitIcons.wellness, tone: "green" },
      { title: "Panel Discounts", value: "Up to 60%", icon: benefitIcons.discount, tone: "blue" },
    ],
    why: ["Family-friendly coverage", "Great balance of value and benefits", "Fast support and easy claims"],
  },
  {
    key: "platinum",
    title: "Platinum Plan",
    price: "₹24,499",
    daily: "₹67.12",
    description: "Complete care package with maximum benefits",
    icon: insurancePlatinumPlanIcon,
    detailIcon: insurancePlatinumPlanIcon,
    tone: "platinum",
    chips: ["Teleconsultation", "Cashless"],
    benefits: [
      { title: "Wallet Topup", value: "5,00,000 Pts", icon: benefitIcons.wallet },
      { title: "HealthPocket Card", icon: benefitIcons.card },
      { title: "Premium Lab Tests", value: "8 Included", icon: benefitIcons.lab },
      { title: "OPD Consultation", value: "20 visits", icon: benefitIcons.opd },
      { title: "Teleconsultation", value: "Unlimited", icon: benefitIcons.tele },
      { title: "IPD Coverage", value: "₹3,00,000", icon: benefitIcons.ipd },
    ],
    moreBenefits: [
      { title: "Daily Cash Coverage", value: "₹90,000", icon: benefitIcons.dailyCash, tone: "purple" },
      { title: "Wellness Vouchers", value: "₹1,00,000", icon: benefitIcons.wellness, tone: "green" },
      { title: "Panel Discounts", value: "Up to 80%", icon: benefitIcons.discount, tone: "blue" },
    ],
    why: ["Maximum healthcare benefits", "Best for complete family care", "Priority support and cashless help"],
  },
]

function getHeader(view: InsuranceView, selectedPlan: Plan) {
  if (view === "calculator") {
    return { title: "Premium Calculator", subtitle: "Estimate your health plan premium" }
  }
  if (view === "detail") {
    return { title: selectedPlan.title, subtitle: selectedPlan.description }
  }
  return { title: "Insurance", subtitle: "Choose a plan that fits your healthcare needs" }
}

export default function Insurance() {
  const navigate = useNavigate()
  const [view, setView] = useState<InsuranceView>("plans")
  const [selectedPlanKey, setSelectedPlanKey] = useState<PlanKey>("gold")

  const selectedPlan = useMemo(() => plans.find((plan) => plan.key === selectedPlanKey) ?? plans[1], [selectedPlanKey])
  const header = getHeader(view, selectedPlan)

  function handleBack() {
    if (view !== "plans") {
      setView("plans")
      return
    }
    goBackOrFallback(navigate, "/home")
  }

  function openPlan(planKey: PlanKey) {
    setSelectedPlanKey(planKey)
    setView("detail")
  }

  return (
    <main className="insurance-page app-page-enter">
      <header className="insurance-fixed-header app-fade-stagger">
        <button className="insurance-back app-pressable" type="button" onClick={handleBack} aria-label="Back">
          <FiArrowLeft />
        </button>
        <div className="insurance-header-copy">
          <h1>{header.title}</h1>
          <p>{header.subtitle}</p>
        </div>
      </header>


      {view === "plans" && (
        <section className="insurance-shell app-content-slide">
          <section className="insurance-hero-card app-fade-stagger">
            <div className="insurance-hero-copy">
              <h2>Protect your health with the right plan</h2>
              <p>Select a plan, compare benefits, or calculate your premium.</p>
            </div>
            <img src={insuranceHeroIllustration} alt="Health insurance illustration" className="insurance-hero-img" />
          </section>

          <button className="insurance-calc-card app-pressable" type="button" onClick={() => setView("calculator")}>
            <img src={insuranceCalculatePremiumIcon} alt="" className="insurance-calc-icon-img" />
            <span className="insurance-calc-copy">
              <strong>Not sure which plan is right for you?</strong>
              <small>Calculate your premium in less than a minute.</small>
            </span>
            <span className="insurance-calc-button">Calculate <FiChevronRight /></span>
          </button>

          <section className="insurance-plan-list" aria-label="Insurance plans">
            {plans.map((plan) => (
              <article key={plan.key} className={`insurance-plan-card ${plan.tone}`}>
                {plan.popular ? <span className="insurance-popular"><FaStar /> Most Popular</span> : null}
                <div className="insurance-plan-media">
                  <img src={plan.icon} alt="" />
                </div>
                <div className="insurance-plan-copy">
                  <h2>{plan.title}</h2>
                  <p className="insurance-plan-price">{plan.price} <span>/ Year</span></p>
                  <p className="insurance-plan-desc">{plan.description}</p>
                  <div className="insurance-chip-row">
                    {plan.chips.map((chip) => (
                      <span key={chip} className="insurance-chip">{chip}</span>
                    ))}
                  </div>
                </div>
                <button className={`insurance-view-btn ${plan.popular ? "filled" : ""} app-pressable`} type="button" onClick={() => openPlan(plan.key)}>
                  View <FiChevronRight />
                </button>
              </article>
            ))}
          </section>
        </section>
      )}

      {view === "calculator" && (
        <section className="insurance-shell app-content-slide">
          <section className="insurance-calc-hero app-fade-stagger">
            <img src={premiumQuickCalculatorIcon} alt="" className="insurance-calc-hero-icon" />
            <div>
              <h2>Quick Premium Estimate</h2>
              <p>Get a quick premium estimate in under a minute.</p>
            </div>
            <img src={premiumBannerClipboardCalculator} alt="" className="insurance-calc-hero-art" />
          </section>

          <section className="insurance-form-card">
            <div className="insurance-form-grid">
              {premiumFields.map(([label, value]) => (
                <label key={label} className="insurance-field">
                  <span>{label}</span>
                  <button className="app-pressable" type="button">
                    {value}
                    <FiChevronDown />
                  </button>
                </label>
              ))}
              <label className="insurance-field full">
                <span>Personal Accident (PA–AD) Sum Insured</span>
                <button className="app-pressable" type="button">
                  ₹50,000
                  <FiChevronDown />
                </button>
              </label>
            </div>
            <button className="insurance-gradient-btn app-pressable" type="button">
              <FaCalculator /> Calculate Premium
            </button>
          </section>

          <section className="insurance-result-card">
            <img src={premiumEstimateShieldHeart} alt="Premium shield" className="insurance-result-art" />
            <div className="insurance-result-copy">
              <h2>Estimated Annual Premium</h2>
              <strong>₹12,450</strong>
              <p>Based on your selected coverage and benefits</p>
              <div className="insurance-result-tags">
                <span><img src={premiumSaveTagIcon} alt="" /> Save more</span>
                <span><img src={premiumFamilyCoverIcon} alt="" /> Family cover</span>
                <span><img src={premiumFastSupportIcon} alt="" /> Fast support</span>
              </div>
            </div>
            <div className="insurance-result-actions">
              <button type="button" className="insurance-gradient-btn app-pressable"><FiUser /> Get Quote</button>
              <button type="button" className="insurance-outline-btn app-pressable" onClick={() => setView("plans")}><FiShield /> Compare Plans</button>
            </div>
          </section>
        </section>
      )}

      {view === "detail" && (
        <section className="insurance-shell app-content-slide">
          <section className={`gold-price-card ${selectedPlan.tone} app-fade-stagger`}>
            <div className="gold-price-media">
              <img src={selectedPlan.detailIcon} alt="" />
            </div>
            <div className="gold-price-copy">
              <h2>{selectedPlan.price} <span>/ Year</span></h2>
              <p>{selectedPlan.daily} <span>/ Day</span></p>
            </div>
            {selectedPlan.popular ? <span className="insurance-popular static"><FaStar /> Most Popular</span> : null}
            <button className="app-pressable" type="button" onClick={() => setView("calculator")}><FaCalculator /> Calculate Premium <FiChevronRight /></button>
          </section>

          <section className="gold-section-card">
            <h2>What you get</h2>
            <div className="gold-benefit-grid">
              {selectedPlan.benefits.map((benefit) => (
                <article key={benefit.title} className="gold-benefit-card">
                  <img src={benefit.icon} alt="" />
                  <div>
                    <strong>{benefit.title}</strong>
                    {benefit.value ? <p>{benefit.value}</p> : null}
                  </div>
                </article>
              ))}
            </div>

            <h2>More benefits</h2>
            <div className="gold-mini-grid">
              {selectedPlan.moreBenefits.map((benefit) => (
                <article key={benefit.title} className={`gold-mini-card ${benefit.tone}`}>
                  <img src={benefit.icon} alt="" />
                  <div>
                    <strong>{benefit.title}</strong>
                    <p>{benefit.value}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="gold-why-card">
              <img src={goldWhyChooseShieldCheck} alt="Plan shield" />
              <div>
                <h2>Why choose this plan</h2>
                {selectedPlan.why.map((line) => (
                  <p key={line}><FiCheckCircle /> {line}</p>
                ))}
              </div>
            </div>

            <button type="button" className="insurance-gradient-btn app-pressable">Choose {selectedPlan.title} <FiChevronRight /></button>
            <button type="button" className="insurance-outline-btn app-pressable" onClick={() => setView("plans")}><FiShield /> Compare Plans</button>
          </section>
        </section>
      )}
    </main>
  )
}
