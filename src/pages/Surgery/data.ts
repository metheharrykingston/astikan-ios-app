export type SurgeryPackageTier = {
  id: string
  label: string
  price: number
  room: string
  stay: string
}

export type SurgeryTopHospital = {
  id: string
  name: string
  rating: string
  logo: string
}

export type SurgeryItem = {
  id: string
  name: string
  subtitle: string
  shortName: string
  startingPrice: number
  emiFrom: number
  rating: string
  reviews: string
  icon: string
  cardImage: string
  detailImage: string
  heroAlt: string
  inclusions: string[]
  features: string[]
  packages: SurgeryPackageTier[]
  hospitals: SurgeryTopHospital[]
  faqs: Array<{ question: string; answer: string }>
}

const surgeryAsset = (file: string) => `/assets/surgery/${file}`

const defaultHospitals: SurgeryTopHospital[] = [
  { id: 'apollo', name: 'Apollo Hospitals', rating: '4.7', logo: surgeryAsset('apollo-logo.webp') },
  { id: 'fortis', name: 'Fortis Hospitals', rating: '4.6', logo: surgeryAsset('fortis-logo.webp') },
  { id: 'manipal', name: 'Manipal Hospitals', rating: '4.5', logo: surgeryAsset('manipal-logo.webp') },
  { id: 'max', name: 'Max Hospitals', rating: '4.6', logo: surgeryAsset('max-logo.webp') },
]

const defaultFeatures = ['Insurance Support', 'Free Consultation', 'Hospital Admission', 'Follow-up Care']
const defaultInclusions = ['Surgeon Consultation', 'Hospital Stay', 'Pre-op Tests', 'Medicines', 'OT Charges', 'Follow-up Visit']

export const surgeries: SurgeryItem[] = [
  {
    id: 'hernia-surgery',
    name: 'Hernia Surgery',
    subtitle: 'Laparoscopic Treatment',
    shortName: 'Hernia',
    startingPrice: 35000,
    emiFrom: 1458,
    rating: '4.8',
    reviews: '2,450 Reviews',
    icon: surgeryAsset('hernia-icon.webp'),
    cardImage: surgeryAsset('hernia-card.webp'),
    detailImage: surgeryAsset('hernia-detail.webp'),
    heroAlt: 'Hernia laparoscopic treatment illustration',
    inclusions: defaultInclusions,
    features: defaultFeatures,
    packages: [
      { id: 'basic', label: 'Basic', price: 35000, room: 'Standard Room', stay: '2-3 Days Stay' },
      { id: 'standard', label: 'Standard', price: 55000, room: 'Private Room', stay: '3-4 Days Stay' },
      { id: 'premium', label: 'Premium', price: 85000, room: 'Deluxe Room', stay: '4-5 Days Stay' },
    ],
    hospitals: defaultHospitals,
    faqs: [
      { question: 'How long is the recovery period?', answer: 'Most patients resume light activity within 3-5 days. Your surgeon will confirm the exact plan after evaluation.' },
      { question: 'Is insurance accepted?', answer: 'Yes. Cashless insurance support is available with eligible partner hospitals.' },
      { question: 'What tests are required?', answer: 'Usually CBC, urine test, sugar, ECG, and anaesthesia fitness are checked before surgery.' },
      { question: 'Are there any risks?', answer: 'Every surgery has risks. The care team explains anaesthesia, infection, recurrence, and recovery risks before admission.' },
    ],
  },
  {
    id: 'piles-surgery',
    name: 'Piles Surgery',
    subtitle: 'Laser Treatment',
    shortName: 'Piles',
    startingPrice: 28000,
    emiFrom: 1167,
    rating: '4.7',
    reviews: '1,980 Reviews',
    icon: surgeryAsset('piles-icon.webp'),
    cardImage: surgeryAsset('piles-card.webp'),
    detailImage: surgeryAsset('piles-card.webp'),
    heroAlt: 'Piles laser treatment illustration',
    inclusions: defaultInclusions,
    features: defaultFeatures,
    packages: [
      { id: 'basic', label: 'Basic', price: 28000, room: 'Standard Room', stay: '1-2 Days Stay' },
      { id: 'standard', label: 'Standard', price: 45000, room: 'Private Room', stay: '2-3 Days Stay' },
      { id: 'premium', label: 'Premium', price: 68000, room: 'Deluxe Room', stay: '3-4 Days Stay' },
    ],
    hospitals: defaultHospitals,
    faqs: [
      { question: 'Is laser piles surgery painful?', answer: 'Laser treatment is usually less painful than traditional procedures, but final suitability depends on the grade of piles.' },
      { question: 'Is insurance accepted?', answer: 'Insurance support depends on policy terms and hospital eligibility.' },
      { question: 'How soon can I return to work?', answer: 'Many patients return to desk work within a few days after doctor approval.' },
      { question: 'Will I need hospital admission?', answer: 'Short admission or day-care treatment may be recommended depending on the case.' },
    ],
  },
  {
    id: 'kidney-stone-surgery',
    name: 'Kidney Stone Surgery',
    subtitle: 'Laser Treatment',
    shortName: 'Kidney Stone',
    startingPrice: 45000,
    emiFrom: 1875,
    rating: '4.7',
    reviews: '2,120 Reviews',
    icon: surgeryAsset('kidney-stone-icon.webp'),
    cardImage: surgeryAsset('kidney-card.webp'),
    detailImage: surgeryAsset('kidney-card.webp'),
    heroAlt: 'Kidney stone treatment illustration',
    inclusions: defaultInclusions,
    features: defaultFeatures,
    packages: [
      { id: 'basic', label: 'Basic', price: 45000, room: 'Standard Room', stay: '1-2 Days Stay' },
      { id: 'standard', label: 'Standard', price: 65000, room: 'Private Room', stay: '2-3 Days Stay' },
      { id: 'premium', label: 'Premium', price: 95000, room: 'Deluxe Room', stay: '3-4 Days Stay' },
    ],
    hospitals: defaultHospitals,
    faqs: [
      { question: 'Which surgery is used for kidney stone?', answer: 'The method depends on stone size and location. Common options include laser procedures and minimally invasive removal.' },
      { question: 'Is insurance accepted?', answer: 'Yes, eligible procedures can be supported through insurance at partner hospitals.' },
      { question: 'What tests are required?', answer: 'Ultrasound/CT, urine test, kidney function test, and routine pre-op checks may be needed.' },
      { question: 'How long is the stay?', answer: 'Many cases need 1-2 days, depending on procedure and recovery.' },
    ],
  },
  {
    id: 'gallbladder-stone-surgery',
    name: 'Gallbladder Stone Surgery',
    subtitle: 'Laparoscopic Treatment',
    shortName: 'Gallbladder Stone',
    startingPrice: 52000,
    emiFrom: 2167,
    rating: '4.6',
    reviews: '1,560 Reviews',
    icon: surgeryAsset('gallbladder-icon.webp'),
    cardImage: surgeryAsset('gallbladder-card.webp'),
    detailImage: surgeryAsset('gallbladder-card.webp'),
    heroAlt: 'Gallbladder stone treatment illustration',
    inclusions: defaultInclusions,
    features: defaultFeatures,
    packages: [
      { id: 'basic', label: 'Basic', price: 52000, room: 'Standard Room', stay: '2-3 Days Stay' },
      { id: 'standard', label: 'Standard', price: 72000, room: 'Private Room', stay: '3-4 Days Stay' },
      { id: 'premium', label: 'Premium', price: 105000, room: 'Deluxe Room', stay: '4-5 Days Stay' },
    ],
    hospitals: defaultHospitals,
    faqs: [
      { question: 'Is laparoscopic gallbladder surgery common?', answer: 'Yes, laparoscopic surgery is commonly used when the doctor recommends gallbladder removal.' },
      { question: 'Is insurance accepted?', answer: 'Insurance support is available for eligible users and hospitals.' },
      { question: 'How long is recovery?', answer: 'Light routine may resume within a week for many patients after approval.' },
      { question: 'What tests are required?', answer: 'Ultrasound, blood tests, liver function, ECG, and anaesthesia fitness may be checked.' },
    ],
  },
  {
    id: 'cataract-surgery',
    name: 'Cataract Surgery',
    subtitle: 'Phaco Treatment',
    shortName: 'Cataract',
    startingPrice: 18000,
    emiFrom: 750,
    rating: '4.8',
    reviews: '3,100 Reviews',
    icon: surgeryAsset('cataract-icon.webp'),
    cardImage: surgeryAsset('cataract-card.webp'),
    detailImage: surgeryAsset('cataract-card.webp'),
    heroAlt: 'Cataract surgery illustration',
    inclusions: defaultInclusions,
    features: defaultFeatures,
    packages: [
      { id: 'basic', label: 'Basic', price: 18000, room: 'Day Care', stay: 'Same Day' },
      { id: 'standard', label: 'Standard', price: 38000, room: 'Premium Lens', stay: 'Same Day' },
      { id: 'premium', label: 'Premium', price: 65000, room: 'Advanced Lens', stay: 'Same Day' },
    ],
    hospitals: defaultHospitals,
    faqs: [
      { question: 'Is cataract surgery day care?', answer: 'Most cataract surgeries are day-care procedures, but the doctor decides after examination.' },
      { question: 'Is insurance accepted?', answer: 'Eligible insurance plans can be used at partner hospitals.' },
      { question: 'What tests are required?', answer: 'Eye examination, lens measurement, sugar/BP checks, and routine fitness checks may be required.' },
      { question: 'How soon can vision improve?', answer: 'Many patients notice improvement quickly, with full guidance given by the ophthalmologist.' },
    ],
  },
]

export function getSurgery(id?: string) {
  return surgeries.find((item) => item.id === id) ?? surgeries[0]
}

export function formatRupees(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
}
