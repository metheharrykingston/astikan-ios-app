import { FiArrowLeft, FiHome, FiMapPin } from "react-icons/fi"
import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { getEmployeeAuthSession } from "../../services/authApi"
import { lookupIndianPincode, reverseGeocodeFromBrowserLocation } from "../../services/pincodeApi"
import "./labtest.css"

type LabTestItem = {
  id: string
  color: "red" | "blue" | "gray" | "green" | "outline"
  name: string
  desc: string
  tag: string
  duration: string
  fasting: string
  quick?: string
  code?: string
}

type AddressDraft = {
  line1: string
  line2: string
  state: string
  city: string
  pincode: string
  country: string
}

type ContactDraft = {
  phone: string
  email: string
}

const INDIAN_STATE_CITY_OPTIONS: Record<string, string[]> = {
  'Andaman and Nicobar Islands': ['Port Blair', 'Havelock Island', 'Neil Island', 'Diglipur', 'Mayabunder', 'Rangat'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Nellore', 'Kurnool', 'Rajahmundry', 'Kakinada', 'Kadapa', 'Anantapur', 'Eluru', 'Ongole', 'Chittoor', 'Srikakulam', 'Vizianagaram', 'Machilipatnam', 'Nandyal', 'Hindupur', 'Tenali', 'Proddatur', 'Bhimavaram', 'Madanapalle', 'Adoni', 'Narasaraopet', 'Gudivada'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Tawang', 'Ziro', 'Pasighat', 'Roing', 'Tezu', 'Bomdila', 'Along', 'Daporijo', 'Namsai', 'Khonsa'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon', 'Dhubri', 'Diphu', 'North Lakhimpur', 'Sivasagar', 'Karimganj', 'Goalpara', 'Barpeta', 'Golaghat'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar', 'Munger', 'Chhapra', 'Danapur', 'Saharsa', 'Sasaram', 'Hajipur', 'Dehri', 'Siwan', 'Motihari', 'Nawada', 'Bagaha', 'Buxar', 'Kishanganj', 'Sitamarhi'],
  'Chandigarh': ['Chandigarh', 'Manimajra'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Jagdalpur', 'Raigarh', 'Ambikapur', 'Dhamtari', 'Chirmiri', 'Mahasamund', 'Kanker', 'Kawardha', 'Bemetara'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Diu', 'Silvassa', 'Amli', 'Naroli', 'Dadra'],
  'Delhi': ['New Delhi', 'Delhi', 'Dwarka', 'Rohini', 'Saket', 'Laxmi Nagar', 'Karol Bagh', 'Janakpuri', 'Pitampura', 'Vasant Kunj', 'Mayur Vihar', 'Preet Vihar', 'Narela', 'Najafgarh', 'Shahdara', 'Okhla', 'Mehrauli', 'Connaught Place'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Bicholim', 'Curchorem', 'Sanquelim', 'Canacona', 'Valpoi', 'Calangute'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Navsari', 'Morbi', 'Nadiad', 'Mehsana', 'Bharuch', 'Vapi', 'Porbandar', 'Godhra', 'Palanpur', 'Valsad', 'Veraval', 'Gondal', 'Botad', 'Amreli', 'Dahod'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula', 'Bhiwani', 'Sirsa', 'Bahadurgarh', 'Jind', 'Thanesar', 'Kaithal', 'Rewari', 'Palwal', 'Fatehabad', 'Narnaul', 'Jhajjar', 'Kurukshetra'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Mandi', 'Solan', 'Kullu', 'Manali', 'Una', 'Hamirpur', 'Bilaspur', 'Chamba', 'Nahan', 'Palampur', 'Kangra', 'Baddi', 'Parwanoo'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur', 'Kathua', 'Sopore', 'Pulwama', 'Kupwara', 'Poonch', 'Rajouri', 'Kulgam', 'Budgam', 'Ganderbal', 'Bandipora'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Deoghar', 'Phusro', 'Hazaribagh', 'Giridih', 'Ramgarh', 'Medininagar', 'Chirkunda', 'Chaibasa', 'Dumka', 'Gumla', 'Lohardaga', 'Jhumri Telaiya'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Dharwad', 'Belagavi', 'Kalaburagi', 'Davangere', 'Ballari', 'Vijayapura', 'Shivamogga', 'Tumakuru', 'Raichur', 'Bidar', 'Udupi', 'Hospet', 'Hassan', 'Mandya', 'Chitradurga', 'Kolar', 'Chikkamagaluru', 'Bagalkot', 'Karwar', 'Gadag'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha', 'Kottayam', 'Palakkad', 'Malappuram', 'Manjeri', 'Kasaragod', 'Pathanamthitta', 'Idukki', 'Wayanad', 'Guruvayur', 'Ponnani', 'Thalassery'],
  'Ladakh': ['Leh', 'Kargil', 'Diskit', 'Nubra', 'Zanskar'],
  'Lakshadweep': ['Kavaratti', 'Agatti', 'Minicoy', 'Amini', 'Andrott'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa', 'Murwara', 'Singrauli', 'Burhanpur', 'Khandwa', 'Morena', 'Bhind', 'Chhindwara', 'Guna', 'Shivpuri', 'Vidisha', 'Chhatarpur', 'Damoh', 'Mandsaur', 'Khargone', 'Neemuch'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Pimpri-Chinchwad', 'Aurangabad', 'Solapur', 'Amravati', 'Kolhapur', 'Sangli', 'Malegaon', 'Jalgaon', 'Akola', 'Latur', 'Dhule', 'Ahmednagar', 'Chandrapur', 'Parbhani', 'Ichalkaranji', 'Jalna', 'Ambarnath', 'Bhiwandi', 'Nanded', 'Satara', 'Wardha', 'Yavatmal', 'Panvel', 'Vasai-Virar', 'Mira-Bhayandar', 'Kalyan-Dombivli'],
  'Manipur': ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Kakching', 'Ukhrul', 'Senapati', 'Tamenglong', 'Jiribam', 'Moreh'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai', 'Nongpoh', 'Baghmara', 'Williamnagar', 'Nongstoin', 'Mawkyrwat', 'Khliehriat'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip', 'Kolasib', 'Mamit', 'Saiha', 'Lawngtlai', 'Saitual', 'Khawzawl'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Mon', 'Zunheboto', 'Phek', 'Kiphire', 'Longleng', 'Peren'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda', 'Jeypore', 'Bargarh', 'Paradip', 'Dhenkanal', 'Angul', 'Kendujhar', 'Koraput', 'Rayagada', 'Balangir'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam', 'Oulgaret'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur', 'Batala', 'Pathankot', 'Moga', 'Abohar', 'Malerkotla', 'Khanna', 'Phagwara', 'Muktsar', 'Barnala', 'Firozpur', 'Kapurthala', 'Faridkot', 'Sangrur'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Bhilwara', 'Alwar', 'Bharatpur', 'Sikar', 'Pali', 'Sri Ganganagar', 'Tonk', 'Kishangarh', 'Beawar', 'Hanumangarh', 'Dhaulpur', 'Sawai Madhopur', 'Churu', 'Jhunjhunu', 'Barmer', 'Nagaur', 'Jaisalmer'],
  'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan', 'Rangpo', 'Singtam', 'Jorethang', 'Ravangla'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Vellore', 'Erode', 'Thoothukudi', 'Dindigul', 'Thanjavur', 'Ranipet', 'Sivakasi', 'Karur', 'Udhagamandalam', 'Hosur', 'Nagercoil', 'Kanchipuram', 'Kumbakonam', 'Cuddalore', 'Karaikudi', 'Neyveli', 'Pollachi'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Suryapet', 'Miryalaguda', 'Siddipet', 'Jagtial', 'Mancherial', 'Kothagudem', 'Kamareddy'],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailashahar', 'Belonia', 'Khowai', 'Ambassa', 'Sonamura', 'Sabroom'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Gorakhpur', 'Noida', 'Firozabad', 'Jhansi', 'Muzaffarnagar', 'Mathura', 'Ayodhya', 'Shahjahanpur', 'Rampur', 'Mau', 'Farrukhabad', 'Hapur', 'Etawah', 'Mirzapur', 'Bulandshahr', 'Sambhal', 'Amroha', 'Hardoi', 'Fatehpur', 'Raebareli', 'Orai', 'Sitapur', 'Bahraich', 'Modinagar', 'Unnao', 'Jaunpur', 'Lakhimpur', 'Hathras', 'Banda', 'Pilibhit', 'Barabanki', 'Khurja', 'Gonda', 'Mainpuri', 'Lalitpur', 'Etah', 'Deoria', 'Ghazipur', 'Sultanpur', 'Azamgarh', 'Bijnor', 'Basti', 'Chandausi', 'Akbarpur', 'Ballia', 'Tanda', 'Greater Noida'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh', 'Nainital', 'Mussoorie', 'Pithoragarh', 'Almora', 'Kotdwar', 'Ramnagar', 'Manglaur', 'Jaspur', 'Kichha'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Baharampur', 'Habra', 'Kharagpur', 'Shantipur', 'Dankuni', 'Dhulian', 'Ranaghat', 'Haldia', 'Raiganj', 'Krishnanagar', 'Nabadwip', 'Medinipur', 'Jalpaiguri', 'Balurghat', 'Basirhat', 'Bankura', 'Chinsurah', 'Darjeeling']
}

const STATE_OPTIONS = Object.keys(INDIAN_STATE_CITY_OPTIONS).sort((a, b) => a.localeCompare(b))

export default function LabLocationStep2() {
  const navigate = useNavigate()
  const { state } = useLocation() as {
    state?: {
      selectedTest?: LabTestItem
      readinessQuestions?: Array<{ id: string; question: string; options: Array<{ value: string; label: string }> }>
      readiness?: Record<string, "yes" | "no">
    }
  }
  const selectedTest = state?.selectedTest
  const authSession = getEmployeeAuthSession()
  const [address, setAddress] = useState<AddressDraft>({
    line1: "",
    line2: "",
    state: "",
    city: "",
    pincode: "",
    country: "India",
  })
  const [contact, setContact] = useState<ContactDraft>({
    phone: authSession?.phone?.trim() || "",
    email: authSession?.email?.trim() || "",
  })
  const [error, setError] = useState("")
  const [geoStatus, setGeoStatus] = useState("")
  const [pinStatus, setPinStatus] = useState("")

  const cityOptions = useMemo(() => {
    return address.state ? INDIAN_STATE_CITY_OPTIONS[address.state] ?? [] : []
  }, [address.state])

  const canContinue =
    address.line1.trim().length > 2 &&
    Boolean(address.state) &&
    Boolean(address.city) &&
    /^[1-9][0-9]{5}$/.test(address.pincode.trim()) &&
    /^[6-9][0-9]{9}$/.test(contact.phone.trim())

  function updateAddress<K extends keyof AddressDraft>(key: K, value: AddressDraft[K]) {
    setAddress((current) => ({ ...current, [key]: value }))
    if (error) setError("")
  }

  async function applyLiveLocation() {
    setGeoStatus("Detecting live location...")
    try {
      const next = await reverseGeocodeFromBrowserLocation()
      setAddress((current) => ({
        ...current,
        line1: next.line1 || current.line1,
        line2: next.line2 || current.line2,
        state: next.state || current.state,
        city: next.city || current.city,
        pincode: next.pincode || current.pincode,
        country: next.country || current.country || "India",
      }))
      setGeoStatus("Location detected.")
    } catch (locationError) {
      setGeoStatus(locationError instanceof Error ? locationError.message : "Location permission is required to auto-fill your address.")
    }
  }

  useEffect(() => {
    const pin = address.pincode.trim()
    if (!/^[1-9][0-9]{5}$/.test(pin)) { setPinStatus(""); return }
    let cancelled = false
    setPinStatus("Fetching city and state from PIN code...")
    const timer = window.setTimeout(async () => {
      try {
        const result = await lookupIndianPincode(pin)
        if (cancelled) return
        if (!result) { setPinStatus("PIN code details were not found. You can still edit manually."); return }
        setAddress((current) => ({ ...current, state: result.state || current.state, city: result.city || current.city, line2: current.line2 || result.line2, country: current.country || "India" }))
        setPinStatus(`PIN matched: ${result.city}, ${result.state}`)
      } catch {
        if (!cancelled) setPinStatus("Could not fetch PIN details. Please continue manually.")
      }
    }, 350)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [address.pincode])

  function continueToConfirm() {
    if (!canContinue) {
      setError("Please enter address, state, city, 6-digit pincode and a valid 10-digit phone number.")
      return
    }

    const cleanAddress = {
      line1: address.line1.trim(),
      line2: address.line2.trim(),
      city: address.city.trim(),
      state: address.state.trim(),
      pincode: address.pincode.trim(),
      country: address.country,
    }

    navigate("/lab-tests/confirm", {
      state: {
        ...state,
        selectedTest,
        collectionType: "home",
        address: Object.values(cleanAddress).filter(Boolean).join(", "),
        addressDetails: cleanAddress,
        contactPhone: contact.phone.trim(),
        contactEmail: contact.email.trim(),
      },
    })
  }

  return (
    <main className="lab-page lab-page--location lab-page--address-only">
      <header className="lab-header">
        <button className="lab-back" type="button" onClick={() => navigate(-1)} aria-label="Go back"><FiArrowLeft /></button>
        <div>
          <h1>Collection Address</h1>
          <p>Step 2 of 3</p>
        </div>
      </header>

      <section className="lab-card selected-test-card compact">
        <span className="test-mini-icon"><FiHome /></span>
        <div>
          <p>Selected test</p>
          <h2>{selectedTest?.name ?? "Lab Test"}</h2>
          <small>Home sample collection managed by Astikan Healthcare.</small>
        </div>
      </section>

      <section className="location-choice-panel address-panel lab-address-card">
        <div className="panel-heading">
          <span><FiMapPin /></span>
          <div>
            <h2>Collection Address</h2>
            <p>Home Collection</p>
          </div>
        </div>

        <div className="address-assist-row address-assist-row--button-only">
          <button type="button" className="location-detect-btn app-pressable" onClick={() => void applyLiveLocation()}><FiMapPin /> Use Live Location</button>
          {geoStatus ? <span>{geoStatus}</span> : null}
        </div>
        <div className="address-grid">
          <label>
            House / Flat / Building
            <input
              value={address.line1}
              onChange={(event) => updateAddress("line1", event.target.value)}
              placeholder="House no., flat, building"
            />
          </label>

          <label>
            Area / Landmark
            <input
              value={address.line2}
              onChange={(event) => updateAddress("line2", event.target.value)}
              placeholder="Street, area, landmark"
            />
          </label>

          <div className="address-grid-two">
            <label>
              State
              <select
                value={address.state}
                onChange={(event) => {
                  setAddress((current) => ({ ...current, state: event.target.value, city: "" }))
                  if (error) setError("")
                }}
              >
                <option value="">Select state</option>
                {STATE_OPTIONS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label>
              City
              <input
                value={address.city}
                onChange={(event) => updateAddress("city", event.target.value)}
                placeholder={address.state ? "Search or type your city" : "Select state first"}
                list="indian-city-options"
                disabled={!address.state}
              />
              <datalist id="indian-city-options">
                {cityOptions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </label>
          </div>

          <div className="address-grid-two">
            <label>
              Pincode
              <input
                value={address.pincode}
                onChange={(event) => updateAddress("pincode", event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit pincode"
                inputMode="numeric"
              />
            </label>

            <label>
              Country
              <input value={address.country} readOnly />
            </label>
          </div>

          {pinStatus ? <p className="address-auto-note">{pinStatus}</p> : null}

          <div className="address-grid-two">
            <label>
              Phone Number *
              <input
                value={contact.phone}
                onChange={(event) => {
                  setContact((current) => ({ ...current, phone: event.target.value.replace(/\D/g, "").slice(0, 10) }))
                  if (error) setError("")
                }}
                placeholder="10-digit mobile number"
                inputMode="tel"
              />
            </label>

            <label>
              Email
              <input
                value={contact.email}
                onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))}
                placeholder="Email for receipt"
                inputMode="email"
              />
            </label>
          </div>
        </div>

        {error ? <p className="location-error">{error}</p> : null}
      </section>

      <div className="lab-bottom-action">
        <button type="button" onClick={continueToConfirm} disabled={!canContinue}>Continue</button>
      </div>
    </main>
  )
}
