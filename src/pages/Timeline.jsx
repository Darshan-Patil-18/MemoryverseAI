import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import AppShell from '../components/AppShell'

const CATEGORY_COLORS = {
  Projects: '#D4A24C',
  Skills: '#5FC3B0',
  Certifications: '#E6BE72',
  Internships: '#3FA796',
  Achievements: '#D4A24C',
  Academics: '#5FC3B0'
}

export default function Timeline() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeYear, setActiveYear] = useState(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const [{ data: evts }, { data: cats }] = await Promise.all([
        supabase
          .from('timeline_events')
          .select('*, documents(file_url, ai_summary, category_id, tags)')
          .eq('user_id', user.id)
          .order('event_year', { ascending: false }),
        supabase.from('categories').select('*')
      ])
      if (cancelled) return
      setEvents(evts || [])
      setCategories(cats || [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user])

  const categoryMap = useMemo(() => {
    const map = {}
    categories.forEach((c) => (map[c.id] = c.name))
    return map
  }, [categories])

  const byYear = useMemo(() => {
    const grouped = {}
    events.forEach((e) => {
      const year = e.event_year || new Date(e.created_at).getFullYear()
      grouped[year] = grouped[year] || []
      grouped[year].push(e)
    })
    return Object.entries(grouped).sort((a, b) => b[0] - a[0])
  }, [events])

  const years = byYear.map(([y]) => y)

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 sm:px-10 py-10">
        <h1 className="font-display text-4xl text-parchment-100 mb-2">Your journey</h1>
        <p className="text-parchment-100/60 mb-8 text-lg">Every certification, project, and milestone — laid out by year.</p>

        {loading ? (
          <p className="text-parchment-100/40">Loading timeline…</p>
        ) : byYear.length === 0 ? (
          <div className="border border-dashed border-parchment-100/20 rounded-3xl py-24 text-center glass-panel">
            <p className="font-display text-2xl text-parchment-100 mb-2">Nothing here yet</p>
            <p className="text-parchment-100/55">Add a document and it'll take its place on your timeline.</p>
          </div>
        ) : (
          <>
            {years.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-10 sticky top-4 z-10">
                <button
                  onClick={() => setActiveYear(null)}
                  style={!activeYear ? { background: 'linear-gradient(135deg, rgba(124,140,255,0.35), rgba(192,132,245,0.3))', color: '#1E2340', border: '1px solid rgba(255,255,255,0.6)' } : { background: 'rgba(30,35,64,0.08)', color: 'rgba(30,35,64,0.75)', border: '1px solid rgba(30,35,64,0.12)' }}
                  className={`text-sm px-4 py-2 rounded-full transition-all hover:shadow-md ${
                    !activeYear ? 'shadow-sm' : 'hover:bg-[rgba(30,35,64,0.15)]'
                  }`}
                >
                  All years
                </button>
                {years.map((y) => (
                  <button
                    key={y}
                    onClick={() => setActiveYear(y)}
                    style={activeYear === y ? { background: 'linear-gradient(135deg, rgba(124,140,255,0.35), rgba(192,132,245,0.3))', color: '#1E2340', border: '1px solid rgba(255,255,255,0.6)' } : { background: 'rgba(30,35,64,0.08)', color: 'rgba(30,35,64,0.75)', border: '1px solid rgba(30,35,64,0.12)' }}
                    className={`text-sm px-4 py-2 rounded-full transition-all hover:shadow-md ${
                      activeYear === y ? 'shadow-sm' : 'hover:bg-[rgba(30,35,64,0.15)]'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}

            <div className="relative pl-10">
              <div className="absolute left-[15px] top-3 bottom-3 w-0.5 thread-line" />
              <div className="space-y-16">
                {byYear
                  .filter(([year]) => !activeYear || String(year) === String(activeYear))
                  .map(([year, items]) => (
                    <div key={year} className="relative">
                      <div
                        className="absolute -left-10 top-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #7C8CFF, #C084F5)' }}
                      >
                        {String(year).slice(2)}
                      </div>
                      <p className="font-display text-3xl text-parchment-100 mb-6">{year}</p>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {items.map((e) => {
                          const categoryName = categoryMap[e.documents?.category_id]
                          const color = CATEGORY_COLORS[categoryName] || '#D4A24C'
                          return (
                            <a
                              key={e.id}
                              href={e.documents?.file_url || '#'}
                              target={e.documents?.file_url ? '_blank' : undefined}
                              rel="noreferrer"
                              className="glass-panel rounded-2xl px-5 py-4 hover:-translate-y-0.5 transition-transform block"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                                <span className="text-[11px] uppercase tracking-wider text-parchment-100/45">{categoryName || 'Uncategorized'}</span>
                              </div>
                              <p className="text-parchment-100 font-medium mb-1 leading-snug">{e.title}</p>
                              {e.description && <p className="text-sm text-parchment-100/55 leading-relaxed line-clamp-2">{e.description}</p>}
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
