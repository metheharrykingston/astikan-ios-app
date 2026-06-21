import { useEffect, useMemo, useState } from 'react'
import { FiCheckCircle, FiChevronRight, FiFilter, FiSearch, FiShield, FiSliders } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { fetchSurgeries } from '../../services/surgeryCatalogApi'
import { fallbackSurgeries, formatRupees, type SurgeryItem } from './data'
import { SurgeryHeader } from './Header'
import './surgery.css'

export default function SurgeryList() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<SurgeryItem[]>(fallbackSurgeries)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [sortMode, setSortMode] = useState<'popular' | 'price-low' | 'price-high'>('popular')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchSurgeries({ limit: 120 })
      .then((items) => {
        if (!cancelled && Array.isArray(items) && items.length) setRows(items)
      })
      .catch(() => {
        if (!cancelled) setRows(fallbackSurgeries)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(() => {
    const values = Array.from(
      new Set(
        rows
          .map((item) => String(item.subtitle || '').split('|')[0].trim())
          .filter(Boolean),
      ),
    )
    return ['All', ...values.slice(0, 11)]
  }, [rows])

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase()
    const base = rows.filter((item) => {
      const matchesSearch = !search || [item.name, item.shortName, item.subtitle].some((value) => String(value || '').toLowerCase().includes(search))
      const matchesFilter = activeFilter === 'All' || String(item.subtitle || '').split('|')[0].trim() === activeFilter
      return matchesSearch && matchesFilter
    })

    if (sortMode === 'price-low') {
      return [...base].sort((left, right) => left.startingPrice - right.startingPrice)
    }
    if (sortMode === 'price-high') {
      return [...base].sort((left, right) => right.startingPrice - left.startingPrice)
    }
    return base
  }, [activeFilter, query, rows, sortMode])

  const popularRows = filteredRows.slice(0, 12)
  const packageRows = filteredRows.slice(0, 120)

  return (
    <main className="surgery-page app-page-enter">
      <SurgeryHeader
        title="Treatments"
        subtitle="Surgery, procedures and guided care."
        right={(
          <span className="surgery-insurance-pill">
            <FiShield />
            <span>Insurance<br />Accepted</span>
          </span>
        )}
      />

      <section className="surgery-shell app-content-slide">
        <article className="surgery-main-hero app-fade-stagger">
          <img src="/assets/surgery/surgery-hero.webp" alt="Astikan treatments and surgery care" />
          <div className="surgery-hero-copy">
            <h2>Quality care for every treatment journey</h2>
            <p>Surgeries, procedures and specialist-led treatment support</p>
            <button className="surgery-primary-btn app-pressable" type="button" onClick={() => document.getElementById('surgery-packages')?.scrollIntoView({ behavior: 'smooth' })}>
              Explore Treatments
            </button>
          </div>
        </article>

        <div className="surgery-search-bar app-fade-stagger">
          <FiSearch />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for surgeries or treatments..." />
          <button
            className="surgery-search-action app-pressable"
            type="button"
            aria-label={query ? 'Clear search' : 'Open filters'}
            onClick={() => {
              if (query) {
                setQuery('')
                return
              }
              const packages = document.getElementById('surgery-packages')
              if (packages) packages.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            <FiFilter />
          </button>
        </div>

        <section className="surgery-filter-row app-fade-stagger" aria-label="Treatment filters">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`surgery-filter-chip app-pressable ${activeFilter === category ? 'active' : ''}`}
              onClick={() => setActiveFilter(category)}
            >
              {category}
            </button>
          ))}
        </section>

        <section className="app-fade-stagger">
          <div className="surgery-section-head">
            <h2>Popular Treatments</h2>
            <button
              className="surgery-link-btn app-pressable"
              type="button"
              onClick={() => {
                setActiveFilter('All')
                document.getElementById('surgery-packages')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            >
              View All
            </button>
          </div>
          <div className="popular-surgeries-row">
            {popularRows.map((surgery) => (
              <button key={surgery.id} className="popular-surgery-card app-pressable" type="button" onClick={() => navigate(`/surgeries/${surgery.id}`)}>
                <img src={surgery.icon} alt={surgery.shortName} />
                <span>{surgery.shortName}</span>
              </button>
            ))}
          </div>
        </section>

        <section id="surgery-packages" className="app-fade-stagger">
          <div className="surgery-section-head">
            <div>
              <h2>Treatment Packages</h2>
              <p>All prices are starting from</p>
            </div>
            <button
              className="surgery-sort-btn app-pressable"
              type="button"
              onClick={() => setSortMode((current) => (current === 'popular' ? 'price-low' : current === 'price-low' ? 'price-high' : 'popular'))}
            >
              <FiSliders />
              {sortMode === 'popular' ? 'Popular' : sortMode === 'price-low' ? 'Low to High' : 'High to Low'}
            </button>
          </div>

          <div className="surgery-package-list">
            {packageRows.map((surgery) => (
              <article
                key={surgery.id}
                className="surgery-package-card app-pressable"
                onClick={() => navigate(`/surgeries/${surgery.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    navigate(`/surgeries/${surgery.id}`)
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="surgery-card-image"><img src={surgery.cardImage} alt={surgery.heroAlt} /></div>
                <div className="surgery-card-content">
                  <div className="surgery-card-top">
                    <div className="surgery-card-copy">
                      <h3>{surgery.name}</h3>
                      <p>{surgery.subtitle}</p>
                      <span className="surgery-price-label">Starting from</span>
                      <h4 className="surgery-card-price">{formatRupees(surgery.startingPrice)}</h4>
                    </div>
                    <div className="surgery-feature-list">
                      {surgery.features.map((feature) => <span key={feature}><FiCheckCircle />{feature}</span>)}
                    </div>
                  </div>
                  <button className="surgery-view-package app-pressable" type="button" onClick={(event) => { event.stopPropagation(); navigate(`/surgeries/${surgery.id}`) }}>
                    View Package <FiChevronRight />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!loading && packageRows.length === 0 ? <p>No treatments matched your search.</p> : null}
        </section>
      </section>
    </main>
  )
}
