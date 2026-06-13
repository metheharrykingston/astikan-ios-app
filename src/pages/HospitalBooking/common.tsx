import { FiBatteryCharging, FiBell, FiCalendar, FiShield } from 'react-icons/fi'
import AppBottomNav from '../../components/AppBottomNav'

export function StatusBar() {
  return (
    <div className="consumer-status" aria-hidden="true">
      <span>9:41</span>
      <span className="consumer-status-icons">
        <span className="signal-bars"><span /><span /><span /><span /></span>
        <FiBatteryCharging />
        <span className="battery-icon" />
      </span>
    </div>
  )
}

export function BottomNav(_props?: { active?: string }) {
  return <AppBottomNav active="Home" />
}

export function TrustStrip() {
  return (
    <div className="trust-strip">
      <div><FiShield /><span><strong>Verified Hospitals</strong><span>100% Verified</span></span></div>
      <div><FiCalendar /><span><strong>Instant Booking</strong><span>Hassle-free Slots</span></span></div>
      <div><FiBell /><span><strong>24x7 Support</strong><span>We're here to help</span></span></div>
    </div>
  )
}
