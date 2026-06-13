import {
  MdAccessibilityNew,
  MdBiotech,
  MdBloodtype,
  MdChildCare,
  MdContentCut,
  MdElderly,
  MdFavorite,
  MdMedicalServices,
  MdMonitorHeart,
  MdOutlineScience,
  MdOutlineVisibility,
  MdPsychology,
  MdWaterDrop,
} from "react-icons/md"
import { FiArrowLeft, FiSearch } from "react-icons/fi"
import type { IconType } from "react-icons"
import { useNavigate } from "react-router-dom"
import { goBackOrFallback } from "../../utils/navigation"
import "./teleconsultation.css"

type DiscoverFilterKey = "all" | "general" | "heart" | "skin" | "lungs" | "kidney" | "bones" | "child"

type CategoryItem = {
  name: string
  icon: IconType
  filterKey: DiscoverFilterKey
}

const categories: CategoryItem[] = [
  { name: "General Checkup", icon: MdMedicalServices, filterKey: "general" },
  { name: "Heart", icon: MdFavorite, filterKey: "heart" },
  { name: "Skin", icon: MdOutlineScience, filterKey: "skin" },
  { name: "Lungs", icon: MdMonitorHeart, filterKey: "lungs" },
  { name: "Kidney", icon: MdWaterDrop, filterKey: "kidney" },
  { name: "Bones & Joints", icon: MdAccessibilityNew, filterKey: "bones" },
  { name: "Child Health", icon: MdChildCare, filterKey: "child" },
  { name: "Eye Care", icon: MdOutlineVisibility, filterKey: "general" },
  { name: "Blood & Hormones", icon: MdBloodtype, filterKey: "general" },
  { name: "Mental Wellness", icon: MdPsychology, filterKey: "general" },
  { name: "Surgery", icon: MdContentCut, filterKey: "general" },
  { name: "Senior Care", icon: MdElderly, filterKey: "general" },
  { name: "Cancer Care", icon: MdBiotech, filterKey: "general" },
  { name: "Pathology", icon: MdOutlineScience, filterKey: "general" },
  { name: "All Doctors", icon: MdMedicalServices, filterKey: "all" },
]

export default function DoctorCategories() {
  const navigate = useNavigate()

  function chooseCategory(filterKey: DiscoverFilterKey) {
    navigate("/teleconsultation", {
      state: {
        preselectedFilterKey: filterKey,
      },
    })
  }

  return (
    <main className="doctor-categories-page app-page-enter">
      <header className="doctor-categories-header app-fade-stagger">
        <button className="doctor-categories-icon-btn app-pressable" onClick={() => goBackOrFallback(navigate)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <h1>Find Your Doctor</h1>
        <button className="doctor-categories-icon-btn app-pressable" type="button" aria-label="Search">
          <FiSearch />
        </button>
      </header>

      <section className="doctor-categories-grid app-content-slide">
        {categories.map((item) => {
          const Icon = item.icon
          return (
            <button key={item.name} type="button" className="doctor-category-card app-pressable" onClick={() => chooseCategory(item.filterKey)}>
              <span className="doctor-category-icon"><Icon /></span>
              <span>{item.name}</span>
            </button>
          )
        })}
      </section>
    </main>
  )
}
