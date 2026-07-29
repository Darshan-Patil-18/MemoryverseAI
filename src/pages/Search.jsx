import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { embedQuery, rankArchiveDocuments } from '../lib/ai'
import AppShell from '../components/AppShell'
import DocumentCard from '../components/DocumentCard'
import DocumentDetailModal from '../components/DocumentDetailModal'

const SUGGESTIONS = ['Show all my certificates', 'Show my AI or ML projects', 'Show internship documents', 'Show my latest resume']

export default function Search() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [categories, setCategories] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [detailDoc, setDetailDoc] = useState(null)

  async function ensureCategories() {
    if (Object.keys(categories).length) return categories
    const { data } = await supabase.from('categories').select('*')
    const map = {}
    ;(data || []).forEach((c) => { map[c.id] = c.name })
    setCategories(map)
    return map
  }

  async function runSearch(value = query) {
    if (!value.trim()) return
    setLoading(true); setError('')
    try {
      const catMap = await ensureCategories()
      const [embedding, { data: docs, error: docsError }] = await Promise.all([
        embedQuery(value),
        supabase.from('documents').select('*').eq('user_id', user.id)
      ])
      if (docsError) throw docsError
      const { data: matches, error: matchError } = await supabase.rpc('match_documents', {
        query_embedding: embedding, match_user_id: user.id, match_count: 12
      })
      if (matchError) throw matchError
      const enriched = (docs || []).map((doc) => ({ ...doc, categoryName: catMap[doc.category_id] }))
      setResults({ items: rankArchiveDocuments(value, enriched, matches || []), catMap })
    } catch (err) {
      console.error(err); setError('Search failed — try again in a moment.')
    } finally { setLoading(false) }
  }

  return <AppShell>
    <div className="max-w-4xl mx-auto px-6 sm:px-10 py-10">
      <h1 className="font-display text-3xl text-parchment-100 mb-2">Search your archive</h1>
      <p className="text-parchment-100/50 mb-8">Find the exact uploads, projects, links, and certificates you need.</p>
      <form onSubmit={(e) => { e.preventDefault(); runSearch() }} className="flex gap-3 mb-4">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects, skills, or certificates" className="flex-1 bg-ink-800 border border-parchment-100/15 rounded-lg px-4 py-3 text-parchment-100 placeholder:text-parchment-100/30 focus:border-gold-500/60 outline-none" />
        <button type="submit" disabled={loading} className="bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-ink-950 font-medium px-6 rounded-lg transition-colors">{loading ? 'Searching…' : 'Search'}</button>
      </form>
      <div className="flex flex-wrap gap-2 mb-10">{SUGGESTIONS.map((suggestion) => <button key={suggestion} onClick={() => { setQuery(suggestion); runSearch(suggestion) }} className="text-xs px-3 py-1.5 rounded-full border border-parchment-100/15 text-parchment-100/50 hover:text-parchment-100 hover:border-parchment-100/30 transition-colors">{suggestion}</button>)}</div>
      {error && <p className="text-sm text-red-400 mb-6">{error}</p>}
      {results && (results.items.length === 0 ? <p className="text-parchment-100/40">No specific matches found. Try a project name, skill, category, or year.</p> : <div className="grid sm:grid-cols-2 gap-5">{results.items.map((doc) => <DocumentCard key={doc.id} doc={doc} categoryName={results.catMap[doc.category_id]} onOpen={setDetailDoc} />)}</div>)}
    </div>
    {detailDoc && <DocumentDetailModal doc={detailDoc} categoryName={results?.catMap?.[detailDoc.category_id]} relatedTitles={[]} onClose={() => setDetailDoc(null)} onEdit={() => {}} onDelete={() => {}} />}
  </AppShell>
}
