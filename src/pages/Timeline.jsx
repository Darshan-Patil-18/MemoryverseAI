import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import AppShell from '../components/AppShell'

export default function Timeline() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('timeline_events')
      .select('*, documents(file_url, ai_summary)')
      .eq('user_id', user.id)
      .order('event_year', { ascending: true })
      .then(({ data }) => {
        setEvents(data || [])
        setLoading(false)
      })
  }, [user])

  const byYear = useMemo(() => {
    const grouped = {}
    events.forEach((e) => {
      grouped[e.event_year] = grouped[e.event_year] || []
      grouped[e.event_year].push(e)
    })
    return Object.entries(grouped).sort((a, b) => a[0] - b[0])
  }, [events])

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 sm:px-10 py-10">
        <h1 className="font-display text-3xl text-parchment-100 mb-2">Your journey</h1>
        <p className="text-parchment-100/50 mb-12">Every upload, laid out by year.</p>

        {loading ? (
          <p className="text-parchment-100/40">Loading timeline…</p>
        ) : byYear.length === 0 ? (
          <p className="text-parchment-100/40">Nothing here yet — add a document and it'll appear on your timeline.</p>
        ) : (
          <div className="relative pl-8">
            <div className="absolute left-[7px] top-2 bottom-2 w-px thread-line" />
            <div className="space-y-14">
              {byYear.map(([year, items]) => (
                <div key={year} className="relative">
                  <div className="absolute -left-8 top-1 w-3.5 h-3.5 rounded-full bg-gold-500" />
                  <p className="font-display text-3xl text-parchment-100 mb-5">{year}</p>
                  <div className="space-y-4">
                    {items.map((e) => (
                      <a
                        key={e.id}
                        href={e.documents?.file_url || '#'}
                        target={e.documents?.file_url ? '_blank' : undefined}
                        rel="noreferrer"
                        className="block bg-ink-800/60 border border-parchment-100/10 hover:border-gold-500/30 rounded-xl px-5 py-4 transition-colors"
                      >
                        <p className="text-parchment-100 font-medium mb-1">{e.title}</p>
                        {e.description && <p className="text-sm text-parchment-100/50 leading-relaxed">{e.description}</p>}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
