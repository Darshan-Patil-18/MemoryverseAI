import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { deleteRelationshipsForDocument } from '../lib/relationships'
import { buildTagEdges, countTagConnections, edgesForDocument } from '../lib/tagGraph'
import AppShell from '../components/AppShell'
import DocumentCard from '../components/DocumentCard'
import DocumentDetailModal from '../components/DocumentDetailModal'
import EditDocumentModal from '../components/EditDocumentModal'
import ConfirmModal from '../components/ConfirmModal'

const CATEGORY_EMPTY_COPY = {
  Certifications: 'No certifications yet — upload one to get started.',
  Projects: 'No projects yet — upload one to get started.',
  Skills: 'No skills yet — upload a document that shows off a skill to get started.',
  Internships: 'No internships yet — upload an offer letter or certificate to get started.',
  Achievements: 'No achievements yet — upload one to get started.',
  Academics: 'No academic records yet — upload one to get started.'
}

export default function Dashboard() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const [detailDoc, setDetailDoc] = useState(null)
  const [editDoc, setEditDoc] = useState(null)
  const [deleteDoc, setDeleteDoc] = useState(null)

  // Tag-based connections: computed purely from documents, always in sync
  const connectionCount = useMemo(() => countTagConnections(documents), [documents])

  async function loadAll() {
    setLoading(true)
    const [{ data: cats }, { data: docs }] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])
    setCategories(cats || [])
    setDocuments(docs || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const filledCategories = categories.filter((c) => countsByCategory[c.name] > 0).length

  const filtered = activeCategory ? documents.filter((d) => categoryMap[d.category_id] === activeCategory) : documents

  function relatedTitlesFor(docId) {
    return edgesForDocument(documents, docId).map((e) => {
      const other = e.sourceId === docId ? e.to : e.from
      return `${other.title} — ${e.label}`
    })
  }

  async function handleSaveEdit(fields) {
    await supabase.from('documents').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', editDoc.id)
    setEditDoc(null)
    setDetailDoc(null)
    loadAll()
  }

  async function handleConfirmDelete() {
    const docId = deleteDoc.id
    await deleteRelationshipsForDocument(docId)
    await supabase.from('timeline_events').delete().eq('document_id', docId)
    await supabase.from('documents').delete().eq('id', docId)
    setDeleteDoc(null)
    setDetailDoc(null)
    loadAll()
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-3xl text-parchment-100">Your archive</h1>
          <Link to="/upload" className="text-sm bg-gold-500 hover:bg-gold-400 text-ink-950 font-medium px-4 py-2 rounded-full transition-colors">
            + Add document
          </Link>
        </div>
        <p className="text-parchment-100/50 mb-6">{documents.length} item{documents.length !== 1 ? 's' : ''} indexed and connected.</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatBox label="Documents" value={documents.length} />
          <StatBox label="Categories filled" value={`${filledCategories}/${categories.length}`} />
          <StatBox label="Connections found" value={connectionCount} />
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory(null)}
            className={`text-sm px-4 py-2 rounded-full border transition-colors ${!activeCategory ? 'bg-parchment-100 text-ink-900 border-parchment-100' : 'border-parchment-100/20 text-parchment-100/70 hover:border-parchment-100/40'
              }`}
          >
            All ({documents.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.name)}
              className={`text-sm px-4 py-2 rounded-full border transition-colors ${activeCategory === c.name ? 'bg-parchment-100 text-ink-900 border-parchment-100' : 'border-parchment-100/20 text-parchment-100/70 hover:border-parchment-100/40'
                }`}
            >
              {c.name} ({countsByCategory[c.name] || 0})
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-parchment-100/40">Loading your archive…</p>
        ) : filtered.length === 0 ? (
          <EmptyState hasAny={documents.length > 0} category={activeCategory} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                categoryName={categoryMap[doc.category_id]}
                onOpen={setDetailDoc}
                onEdit={setEditDoc}
                onDelete={setDeleteDoc}
              />
            ))}
          </div>
        )}
      </div>

      {detailDoc && (
        <DocumentDetailModal
          doc={detailDoc}
          categoryName={categoryMap[detailDoc.category_id]}
          relatedTitles={relatedTitlesFor(detailDoc.id)}
          onClose={() => setDetailDoc(null)}
          onEdit={() => setEditDoc(detailDoc)}
          onDelete={() => setDeleteDoc(detailDoc)}
        />
      )}

      {editDoc && <EditDocumentModal doc={editDoc} categories={categories} onClose={() => setEditDoc(null)} onSave={handleSaveEdit} />}

      <ConfirmModal
        open={!!deleteDoc}
        title="Delete this document?"
        message={`"${deleteDoc?.title}" and its connections will be permanently removed from your archive.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDoc(null)}
      />
    </AppShell>
  )
}

function StatBox({ label, value }) {
  return (
    <div className="bg-ink-800/60 border border-parchment-100/10 rounded-xl px-4 py-4 text-center">
      <p className="font-display text-2xl text-parchment-100">{value}</p>
      <p className="text-xs text-parchment-100/40 mt-1">{label}</p>
    </div>
  )
}

function EmptyState({ hasAny, category }) {
  const message = category ? CATEGORY_EMPTY_COPY[category] : null
  return (
    <div className="border border-dashed border-parchment-100/20 rounded-2xl py-20 text-center">
      <p className="font-display text-xl text-parchment-100 mb-2">
        {message ? message.split(' — ')[0] : hasAny ? 'Nothing in this category yet' : 'Your archive is empty'}
      </p>
      <p className="text-parchment-100/50 mb-6 max-w-sm mx-auto">
        {message
          ? message.split(' — ')[1] || 'Upload something and MemoryVerse will sort it here automatically.'
          : hasAny
            ? 'Upload something and MemoryVerse will sort it here automatically.'
            : 'Upload your first certificate, resume, or project report — MemoryVerse will read, categorize, and connect it.'}
      </p>
      <Link to="/upload" className="inline-block bg-gold-500 hover:bg-gold-400 text-ink-950 font-medium px-6 py-2.5 rounded-full transition-colors">
        Add your first document
      </Link>
    </div>
  )
}