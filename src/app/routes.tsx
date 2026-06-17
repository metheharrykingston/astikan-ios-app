import { createBrowserRouter } from "react-router-dom"

import Splash from "../pages/Splash"
import Login from "../pages/Login"
import ForgotPassword from "../pages/ForgotPassword"
import Home from "../pages/Home"
import Health from "../pages/Health"
import Assessment from "../pages/assessment"
import Terms from "../pages/Legal/Terms"
import Privacy from "../pages/Legal/Privacy"
import ContactUs from "../pages/Legal/ContactUs"
import RefundsCancellation from "../pages/Legal/RefundsCancellation"
import AIChat from "../pages/AIChat"
import StressRelief from "../pages/StressChat"
import Meditation from "../pages/Meditation"
import LabTests from "../pages/LabTest"
import LabReadiness from "../pages/LabTest/readiness"
import LabLocation from "../pages/LabTest/location"
import LabBookNow from "../pages/LabTest/booknow"
import LabSchedule from "../pages/LabTest/schedule"
import LabConfirm from "../pages/LabTest/confirm"
import LabTracking from "../pages/LabTest/tracking"
import LabReportViewer from "../pages/LabTest/report"
import LabCancelRequest from "../pages/LabTest/cancel"
import TeleConsultation from "../pages/TeleConsultation"
import TeleOfferCheckout from "../pages/TeleConsultation/offerCheckout"
import OpdPickup from "../pages/TeleConsultation/pickup"
import TeleSchedule from "../pages/TeleConsultation/schedule"
import TeleConfirm from "../pages/TeleConsultation/confirm"
import TeleOverview from "../pages/TeleConsultation/overview"
import AISymptomAnalyser from "../pages/AISymptomAnalyser"
import Pharmacy from "../pages/Pharmacy"
import PharmacyCategories from "../pages/PharmacyCategories"
import MedicineDetail from "../pages/MedicineDetail"
import CartPage from "../pages/Cart"
import PharmacyCheckout from "../pages/PharmacyCheckout"
import PharmacySuccess from "../pages/PharmacySuccess"
import MedicineTracking from "../pages/MedicineTracking"
import HealthAssessments from "../pages/HealthAssessments"
import Settings from "../pages/Settings"
import Address from "../pages/Address"
import ProfileInfo from "../pages/ProfileInfo"
import HealthInfo from "../pages/HealthInfo"
import Bookings from "../pages/Bookings"
import Reports from "../pages/Reports"
import Notifications from "../pages/Notifications"
import MetricDetails from "../pages/MetricDetails"
import BloodPressureLog from "../pages/MetricDetails/BloodPressureLog"
import SugarLog from "../pages/MetricDetails/SugarLog"
import TipBlog from "../pages/TipBlog"
import Support from "../pages/Support"
import RouteTransitionLayout from "./RouteTransitionLayout"
import SurgeryList from "../pages/Surgery"
import SurgeryDetail from "../pages/Surgery/detail"
import SurgeryBook from "../pages/Surgery/book"
import SurgeryConfirm from "../pages/Surgery/confirm"
import SurgerySuccess from "../pages/Surgery/success"
import MedicalFinanceForm from "../pages/MedicalFinance"
import MedicalFinanceReview from "../pages/MedicalFinance/review"
import MedicalFinanceSuccess from "../pages/MedicalFinance/success"
import Wallet from "../pages/Wallet"
import Insurance from "../pages/Insurance"
import NotFound from "../pages/NotFound"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RouteTransitionLayout />,
    children: [
      { index: true, element: <Splash /> },
      { path: "login", element: <Login /> },
      { path: "forgot", element: <ForgotPassword /> },
      { path: "assessment", element: <Assessment /> },
      { path: "home", element: <Home /> },
      { path: "health", element: <Health /> },
      { path: "ai-chat", element: <AIChat /> },
      { path: "stress-relief", element: <StressRelief /> },
      { path: "meditation", element: <Meditation /> },
      { path: "lab-tests", element: <LabTests /> },
      { path: "lab-tests/readiness", element: <LabReadiness /> },
      { path: "lab-tests/location", element: <LabLocation /> },
      { path: "lab-tests/book-now", element: <LabBookNow /> },
      { path: "lab-tests/schedule", element: <LabSchedule /> },
      { path: "lab-tests/confirm", element: <LabConfirm /> },
      { path: "lab-tests/track/:id", element: <LabTracking /> },
      { path: "lab-tests/report/:id", element: <LabReportViewer /> },
      { path: "lab-tests/cancel/:id", element: <LabCancelRequest /> },
      { path: "teleconsultation", element: <TeleConsultation /> },
      { path: "teleconsultation/offer-checkout", element: <TeleOfferCheckout /> },
      { path: "teleconsultation/pickup", element: <OpdPickup /> },
      { path: "teleconsultation/schedule", element: <TeleSchedule /> },
      { path: "teleconsultation/confirm", element: <TeleConfirm /> },
      { path: "teleconsultation/overview/:id", element: <TeleOverview /> },
      { path: "ai-symptom-analyser", element: <AISymptomAnalyser /> },
      { path: "pharmacy", element: <Pharmacy /> },
      { path: "pharmacy/categories", element: <PharmacyCategories /> },
      { path: "pharmacy/tracking", element: <MedicineTracking /> },
      { path: "pharmacy/medicine/:medicineId", element: <MedicineDetail /> },
      { path: "pharmacy/checkout", element: <PharmacyCheckout /> },
      { path: "pharmacy/booking-success", element: <PharmacySuccess /> },
      { path: "cart", element: <CartPage /> },
      { path: "health-assessments", element: <HealthAssessments /> },
      { path: "settings", element: <Settings /> },
      { path: "address", element: <Address /> },
      { path: "profile-info", element: <ProfileInfo /> },
      { path: "health-info", element: <HealthInfo /> },
      { path: "bookings", element: <Bookings /> },
      { path: "reports", element: <Reports /> },
      { path: "wallet", element: <Wallet /> },
      { path: "notifications", element: <Notifications /> },
      { path: "surgeries", element: <SurgeryList /> },
      { path: "surgeries/booking-success", element: <SurgerySuccess /> },
      { path: "surgeries/:surgeryId/book", element: <SurgeryBook /> },
      { path: "surgeries/:surgeryId/confirm", element: <SurgeryConfirm /> },
      { path: "surgeries/:surgeryId", element: <SurgeryDetail /> },
      { path: "hospitals", element: <SurgeryList /> },
      { path: "hospitals/:surgeryId", element: <SurgeryDetail /> },
      { path: "medical-finance", element: <MedicalFinanceForm /> },
      { path: "insurance", element: <Insurance /> },
      { path: "medical-finance/review", element: <MedicalFinanceReview /> },
      { path: "medical-finance/success", element: <MedicalFinanceSuccess /> },
      { path: "support", element: <Support /> },
      { path: "metric/:metricId", element: <MetricDetails /> },
      { path: "metric/blood-pressure/log", element: <BloodPressureLog /> },
      { path: "metric/sugar/log", element: <SugarLog /> },
      { path: "health-tips/:tipId", element: <TipBlog /> },
      { path: "terms", element: <Terms /> },
      { path: "privacy", element: <Privacy /> },
      { path: "contact-us", element: <ContactUs /> },
      { path: "refunds-cancellations", element: <RefundsCancellation /> },
      { path: "*", element: <NotFound /> },
    ],
  },
])
