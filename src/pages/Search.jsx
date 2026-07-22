import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { embedQuery } from '../lib/ai'
import AppShell from '../components/AppShell'
import DocumentCard from '../components/DocumentCard'

const SUGGESTIONS = [
  'Show all my certificates',
  'Show my AI or ML projects',
  'Show internship documents',
  'Show my latest resume'
]

export default function Search() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [categories, setCategories] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function ensureCategories() {
    if (Object.keys(categories).length) return categories
    const { data } = await supabase.from('categories').select('*')
    const map = {}
    ;(data || []).forEach((c) => (map[c.id] = c.name))
    setCategories(map)
    return map
  }

  async function runSearch(q) {
    const term = q ?? query
    if (!term.trim()) return
    setLoading(true)
    setError('')
    try {
      const catMap = await ensureCategories()
      const embedding = await embedQuery(term)
      const { data, error: rpcError } = await supabase.rpc('match_documents', {
        query_embedding: embedding,
        match_user_id: user.id,
        match_count: 12
      })
      if (rpcError) throw rpcError

      // enrich with full rows (tags, event_year) for the card component
      const ids = (data || []).map((d) => d.id)
      let full = []
      if (ids.length) {
        const { data: docs } = await supabase.from('documents').select('*').in('id', ids)
        full = ids.map((id) => docs.find((d) => d.id === id)).filter(Boolean)
      }
      setResults({ items: full, catMap })
    } catch (err) {
      console.error(err)
      setError('Search failed — try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 sm:px-10 py-10">
        <h1 className="font-display text-3xl text-parchment-100 mb-2">Ask your archive</h1>
        <p className="text-parchment-100/50 mb-8">Search in plain language. No folders to dig through.</p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            runSearch()
          }}
          className="flex gap-3 mb-4"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Show my AI projects"
            className="flex-1 bg-ink-800 border border-parchment-100/15 rounded-lg px-4 py-3 text-parchment-100 placeholder:text-parchment-100/30 focus:border-gold-500/60 outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-ink-950 font-medium px-6 rounded-lg transition-colors"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>

        <div className="flex flex-wrap gap-2 mb-10">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setQuery(s)
                runSearch(s)
              }}
              className="text-xs px-3 py-1.5 rounded-full border border-parchment-100/15 text-parchment-100/50 hover:text-parchment-100 hover:border-parchment-100/30 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-400 mb-6">{error}</p>}

        {results && (
          results.items.length === 0 ? (
            <p className="text-parchment-100/40">Nothing matched that yet — try a different phrase, or add more documents.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {results.items.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} categoryName={results.catMap[doc.category_id]} />
              ))}
            </div>
          )
        )}
      </div>
    </AppShell>
  )
}
