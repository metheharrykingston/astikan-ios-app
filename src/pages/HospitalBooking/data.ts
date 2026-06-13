export type Hospital = {
  id: string
  name: string
  rating: string
  reviews: string
  address: string
  city: string
  image: string
  specialties: string
  nextAvailable: string
  open: boolean
  description: string
}

export const hospitals: Hospital[] = [
  {
    id: 'manipal-hospitals',
    name: 'Manipal Hospitals',
    rating: '4.7',
    reviews: '1.2k reviews',
    address: 'Old Airport Road, Bengaluru',
    city: 'Bengaluru, Karnataka',
    image: '/assets/consumer-ui/manipal-hospital.jpeg',
    specialties: '22+ Specialities Available',
    nextAvailable: 'Today, 10:30 AM',
    open: true,
    description: 'Manipal Hospitals provides multi-speciality healthcare with experienced doctors, diagnostic support and advanced emergency care.',
  },
  {
    id: 'apollo-hospitals',
    name: 'Apollo Hospitals',
    rating: '4.6',
    reviews: '2.3K reviews',
    address: 'Bannerghatta Road, Bengaluru, Karnataka 560076',
    city: 'Bengaluru, Karnataka',
    image: '/assets/consumer-ui/apollo-hospital.jpeg',
    specialties: '18+ Specialities Available',
    nextAvailable: 'Today, 11:00 AM',
    open: true,
    description: 'Apollo Hospitals is a multi-speciality hospital offering advanced treatment with world-class infrastructure and expert care.',
  },
  {
    id: 'fortis-hospital',
    name: 'Fortis Hospital',
    rating: '4.5',
    reviews: '980 reviews',
    address: 'Hosur Road, Bengaluru',
    city: 'Bengaluru, Karnataka',
    image: '/assets/consumer-ui/fortis-hospital.jpeg',
    specialties: '16+ Specialities Available',
    nextAvailable: 'Today, 09:45 AM',
    open: true,
    description: 'Fortis Hospital offers accessible OPD slots, emergency care, diagnostics and specialist treatment for families.',
  },
  {
    id: 'narayana-health-city',
    name: 'Narayana Health City',
    rating: '4.4',
    reviews: '760 reviews',
    address: 'Electronic City, Bengaluru',
    city: 'Bengaluru, Karnataka',
    image: '/assets/consumer-ui/narayana-hospital.jpeg',
    specialties: '15+ Specialities Available',
    nextAvailable: 'Today, 12:15 PM',
    open: true,
    description: 'Narayana Health City combines expert doctors, hospital booking support and reliable OPD appointment handling.',
  },
]

export const dateSlots = [
  { label: 'Today', date: '20 May', day: 'Tue' },
  { label: 'Tomorrow', date: '21 May', day: 'Wed' },
  { label: '', date: '22 May', day: 'Thu' },
  { label: '', date: '23 May', day: 'Fri' },
  { label: '', date: '24 May', day: 'Sat' },
  { label: '', date: '25 May', day: 'Sun' },
  { label: '', date: '26 May', day: 'Mon' },
]

export const morningSlots = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM']
export const afternoonSlots = ['02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM']

export function getHospital(id?: string) {
  return hospitals.find((item) => item.id === id) ?? hospitals[1]
}
