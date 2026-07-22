import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import AppShell from '../components/AppShell'
import DocumentCard from '../components/DocumentCard'

export default function Dashboard() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const [{ data: cats }, { data: docs }] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ])
      if (cancelled) return
      setCategories(cats || [])
      setDocuments(docs || [])
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

  const countsByCategory = useMemo(() => {
    const counts = {}
    documents.forEach((d) => {
      const name = categoryMap[d.category_id] || 'Uncategorized'
      counts[name] = (counts[name] || 0) + 1
    })
    return counts
  }, [documents, categoryMap])

  const filtered = activeCategory
    ? documents.filter((d) => categoryMap[d.category_id] === activeCategory)
    : documents

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-3xl text-parchment-100">Your archive</h1>
          <Link to="/upload" className="text-sm bg-gold-500 hover:bg-gold-400 text-ink-950 font-medium px-4 py-2 rounded-full transition-colors">
            + Add document
          </Link>
        </div>
        <p className="text-parchment-100/50 mb-10">{documents.length} item{documents.length !== 1 ? 's' : ''} indexed and connected.</p>

        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory(null)}
            className={`text-sm px-4 py-2 rounded-full border transition-colors ${
              !activeCategory ? 'bg-parchment-100 text-ink-900 border-parchment-100' : 'border-parchment-100/20 text-parchment-100/70 hover:border-parchment-100/40'
            }`}
          >
            All ({documents.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.name)}
              className={`text-sm px-4 py-2 rounded-full border transition-colors ${
                activeCategory === c.name ? 'bg-parchment-100 text-ink-900 border-parchment-100' : 'border-parchment-100/20 text-parchment-100/70 hover:border-parchment-100/40'
              }`}
            >
              {c.name} ({countsByCategory[c.name] || 0})
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-parchment-100/40">Loading your archive…</p>
        ) : filtered.length === 0 ? (
          <EmptyState hasAny={documents.length > 0} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} categoryName={categoryMap[doc.category_id]} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function EmptyState({ hasAny }) {
  return (
    <div className="border border-dashed border-parchment-100/20 rounded-2xl py-20 text-center">
      <p className="font-display text-xl text-parchment-100 mb-2">
        {hasAny ? 'Nothing in this category yet' : 'Your archive is empty'}
      </p>
      <p className="text-parchment-100/50 mb-6 max-w-sm mx-auto">
        {hasAny
          ? 'Upload something and MemoryVerse will sort it here automatically.'
          : 'Upload your first certificate, resume, or project report — MemoryVerse will read, categorize, and connect it.'}
      </p>
      <Link to="/upload" className="inline-block bg-gold-500 hover:bg-gold-400 text-ink-950 font-medium px-6 py-2.5 rounded-full transition-colors">
        Add your first document
      </Link>
    </div>
  )
}
