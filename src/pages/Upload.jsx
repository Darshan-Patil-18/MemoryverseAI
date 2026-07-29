import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { categorizeDocument, embedText } from '../lib/ai'
import { extractText } from '../lib/extractText'
import { buildRelationshipRows, findRelationshipCandidates } from '../lib/relationships'
import AppShell from '../components/AppShell'

const SOURCE_TABS = [
  { id: 'upload', label: 'File upload' },
  { id: 'url', label: 'Project Link / URL' },
  { id: 'text', label: 'Written note' }
]

const CATEGORY_NAMES = ['Projects', 'Skills', 'Certifications', 'Internships', 'Achievements', 'Academics']

let draftIdCounter = 0
function nextId() {
  draftIdCounter += 1
  return `draft-${draftIdCounter}`
}

export default function Upload() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sourceTab, setSourceTab] = useState('upload')
  const [dragOver, setDragOver] = useState(false)
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [drafts, setDrafts] = useState([]) // { id, file, filename, fileType, sourceType, status, aiResult, embedding, fileUrl, error }
  const [categories, setCategories] = useState([])
  const [existingDocs, setExistingDocs] = useState([])
  const [savingAll, setSavingAll] = useState(false)
  const [formError, setFormError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [{ data: cats }, { data: docs }] = await Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('documents').select('*').eq('user_id', user.id)
      ])
      setCategories(cats || [])
      setExistingDocs(docs || [])
    }
    load()
  }, [user])

  const categoryIdByName = {}
  categories.forEach((c) => (categoryIdByName[c.name] = c.id))
  const categoryNameById = {}
  categories.forEach((c) => (categoryNameById[c.id] = c.name))

  // --- Drafting + background AI processing (live preview) ---

  function addFileDrafts(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    const newDrafts = files.map((file) => ({
      id: nextId(),
      file,
      filename: file.name,
      fileType: file.type,
      sourceType: 'upload',
      status: 'processing',
      aiResult: null,
      embedding: null,
      fileUrl: null,
      error: null
    }))
    setDrafts((d) => [...d, ...newDrafts])
    newDrafts.forEach(processDraft)
  }

  async function processDraft(draft) {
    try {
      let rawText = ''
      let fileUrl = null

      if (draft.sourceType === 'upload') {
        rawText = await extractText(draft.file)
        const path = `${user.id}/${Date.now()}-${draft.file.name}`
        const { error: uploadError } = await supabase.storage.from('documents').upload(path, draft.file)
        if (uploadError) throw uploadError
        const { data: signed } = await supabase.storage.from('documents').createSignedUrl(path, 60 * 60 * 24 * 365)
        fileUrl = signed?.signedUrl || null
      } else if (draft.sourceType === 'url') {
        rawText = `Portfolio link: ${draft.filename}`
        fileUrl = draft.filename
      } else {
        rawText = draft.filename
      }

      let aiResult = await categorizeDocument({ rawText, filename: draft.filename, sourceType: draft.sourceType })

      // Compute the embedding now (not just at save time) so relationship
      // suggestions on the review screen can use semantic similarity, not
      // just literal shared tags. If this fails, we still fall back to
      // tag-only + relation-hint matching below — never blocks the upload.
      let embedding = null
      try {
        embedding = await embedText(
          `${aiResult.title}\n${aiResult.summary}\n${(aiResult.tags || []).join(', ')}`
        )
      } catch (embedErr) {
        console.warn('Embedding failed, falling back to tag/relation matching only', embedErr)
      }

      // Detect likely relationships against existing docs right now, so the
      // review screen can show "this looks related to X" before saving.
      // Combines: shared tags, embedding similarity, and the LLM's own
      // relation hints (aiResult.relations) — not tags alone.
      const relationshipSuggestions = findRelationshipCandidates({
        newDoc: { id: draft.id, ...aiResult, embedding },
        existingDocs
      })

      setDrafts((prev) =>
        prev.map((d) =>
          d.id === draft.id
            ? {
              ...d,
              status: 'ready',
              rawText,
              fileUrl,
              aiResult,
              embedding,
              relationshipSuggestions,
              approvedTargetIds: relationshipSuggestions.map((item) => item.documentId),
              editing: {}
            }
            : d
        )
      )
    } catch (err) {
      console.error(err)
      setDrafts((prev) => prev.map((d) => (d.id === draft.id ? { ...d, status: 'error', error: err.message } : d)))
    }
  }

  function handleAddUrlOrText() {
    setFormError('')
    if (sourceTab === 'url') {
      if (!url.trim()) return setFormError('Paste a link first.')
      const draft = {
        id: nextId(),
        file: null,
        filename: url.trim(),
        fileType: 'url',
        sourceType: 'url',
        status: 'processing',
        aiResult: null,
        error: null
      }
      setDrafts((d) => [...d, draft])
      processDraft(draft)
      setUrl('')
    } else if (sourceTab === 'text') {
      if (!notes.trim()) return setFormError('Write something first.')
      const draft = {
        id: nextId(),
        file: null,
        filename: notes.trim().slice(0, 60),
        fileType: 'text',
        sourceType: 'text',
        status: 'processing',
        aiResult: null,
        error: null,
        noteBody: notes.trim()
      }
      setDrafts((d) => [...d, draft])
      processDraft({ ...draft, filename: notes.trim() })
      setNotes('')
    }
  }

  function updateDraftField(id, field, value) {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, aiResult: { ...d.aiResult, [field]: value } } : d))
    )
  }

  function toggleEditing(id, field) {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, editing: { ...d.editing, [field]: !d.editing?.[field] } } : d))
    )
  }

  function removeDraft(id) {
    setDrafts((prev) => prev.filter((d) => d.id !== id))
  }

  function toggleRelationship(id, targetId) {
    setDrafts((prev) => prev.map((draft) => draft.id !== id ? draft : {
      ...draft,
      approvedTargetIds: draft.approvedTargetIds?.includes(targetId)
        ? draft.approvedTargetIds.filter((value) => value !== targetId)
        : [...(draft.approvedTargetIds || []), targetId]
    }))
  }

  // --- Final save: writes every "ready" draft to Supabase ---

  async function handleSaveAll() {
    const readyDrafts = drafts.filter((d) => d.status === 'ready')
    if (!readyDrafts.length) return
    setSavingAll(true)
    setFormError('')

    try {
      const insertedDocs = []
      for (const draft of readyDrafts) {
        // Reuse the embedding computed during review instead of recomputing —
        // saves a redundant model call. Falls back to computing it now if
        // it wasn't available earlier (e.g. embedding failed during preview).
        const embedding = draft.embedding || await embedText(
          `${draft.aiResult.title}\n${draft.aiResult.summary}\n${(draft.aiResult.tags || []).join(', ')}`
        )
        const categoryId = categoryIdByName[draft.aiResult.category] || null

        const { data: inserted, error: insertError } = await supabase
          .from('documents')
          .insert({
            user_id: user.id,
            title: draft.aiResult.title,
            original_filename: draft.filename,
            file_url: draft.fileUrl || null,
            file_type: draft.fileType,
            source_type: draft.sourceType,
            raw_text: (draft.rawText || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, 8000),
            ai_summary: draft.aiResult.summary,
            category_id: categoryId,
            tags: draft.aiResult.tags || [],
            event_year: draft.aiResult.event_year || new Date().getFullYear(),
            embedding
          })
          .select()
          .single()
        if (insertError) throw insertError

        await supabase.from('timeline_events').insert({
          user_id: user.id,
          document_id: inserted.id,
          title: inserted.title,
          description: inserted.ai_summary,
          event_year: inserted.event_year
        })

        // The `relations` field from the LLM isn't a documents-table column,
        // so it doesn't come back from the insert response — carry it
        // forward manually onto the inserted doc for the relationship pass
        // below. Same for embedding, in case the DB round-trip stringifies it.
        insertedDocs.push({ ...inserted, relations: draft.aiResult.relations || [], embedding: inserted.embedding || embedding })
      }

      // Relationship Engine: link every newly inserted doc against the
      // full existing set (including docs inserted earlier in this batch),
      // using tags + semantic similarity + the LLM's relation hints.
      {
        const allDocs = [...existingDocs, ...insertedDocs]
        for (const doc of insertedDocs) {
          const rows = buildRelationshipRows({
            userId: user.id,
            newDoc: doc,
            existingDocs: allDocs.filter((d) => d.id !== doc.id),
            approvedTargetIds: readyDrafts.find((draft) => draft.aiResult.title === doc.title)?.approvedTargetIds
          })
          if (rows.length) await supabase.from('relationships').insert(rows)
        }
      }

      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      setFormError(err.message || 'Something went wrong while saving.')
    } finally {
      setSavingAll(false)
    }
  }

  const readyCount = drafts.filter((d) => d.status === 'ready').length
  const processingCount = drafts.filter((d) => d.status === 'processing').length

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-10">
        <h1 className="font-display text-3xl text-parchment-100 mb-2">Add to your portfolio</h1>
        <p className="text-parchment-100/50 mb-8">
          Choose a source below. Only the fields for that source will be shown.
          MemoryVerse reads each one, files it, and connects it — you confirm before it's saved.
        </p>

        <div className="flex gap-2 mb-6">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSourceTab(tab.id)}
              className={`text-sm px-4 py-2 rounded-full border transition-colors ${sourceTab === tab.id ? 'bg-parchment-100 text-ink-900 border-parchment-100' : 'border-parchment-100/20 text-parchment-100/70'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {sourceTab === 'upload' && (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              addFileDrafts(e.dataTransfer.files)
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl py-12 text-center cursor-pointer transition-colors mb-8 ${dragOver ? 'border-gold-500 bg-gold-500/5' : 'border-parchment-100/20 hover:border-parchment-100/35'
              }`}
          >
            <p className="text-parchment-100 mb-1">Drag & drop files here, or click to browse</p>
            <p className="text-sm text-parchment-100/40">PDF, image, or text — select multiple files at once</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.png,.jpg,.jpeg,.doc,.docx"
              onChange={(e) => addFileDrafts(e.target.files)}
              className="hidden"
            />
          </div>
        )}

        {sourceTab === 'url' && (
          <div className="space-y-4 mb-8">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/you/project"
              className="w-full bg-ink-800 border border-parchment-100/15 rounded-lg px-4 py-2.5 text-parchment-100 placeholder:text-parchment-100/30 focus:border-gold-500/60 outline-none"
            />
            <button onClick={handleAddUrlOrText} className="text-sm bg-gold-500 hover:bg-gold-400 text-ink-950 font-medium px-5 py-2 rounded-lg">
              Process link
            </button>
          </div>
        )}

        {sourceTab === 'text' && (
          <div className="space-y-4 mb-8">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="e.g. Led the Data Science Club as president, organized 3 workshops in 2024..."
              className="w-full bg-ink-800 border border-parchment-100/15 rounded-lg px-4 py-2.5 text-parchment-100 placeholder:text-parchment-100/30 focus:border-gold-500/60 outline-none resize-none"
            />
            <button onClick={handleAddUrlOrText} className="text-sm bg-gold-500 hover:bg-gold-400 text-ink-950 font-medium px-5 py-2 rounded-lg">
              Process note
            </button>
          </div>
        )}

        {formError && <p className="text-sm text-red-400 mb-6">{formError}</p>}

        {drafts.length > 0 && (
          <div className="space-y-4 mb-8">
            <p className="text-xs uppercase tracking-wider text-parchment-100/40">
              {processingCount > 0 ? `Processing ${processingCount}, ` : ''}
              {readyCount} ready to review
            </p>
            {drafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                categories={categories}
                onFieldChange={(field, value) => updateDraftField(draft.id, field, value)}
                onToggleEdit={(field) => toggleEditing(draft.id, field)}
                onToggleRelationship={(targetId) => toggleRelationship(draft.id, targetId)}
                onRemove={() => removeDraft(draft.id)}
              />
            ))}
          </div>
        )}

        {readyCount > 0 && (
          <button
            onClick={handleSaveAll}
            disabled={savingAll}
            className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-ink-950 font-medium py-3 rounded-lg transition-colors"
          >
            {savingAll ? 'Saving…' : `Save document${readyCount > 1 ? `s (${readyCount})` : ''}`}
          </button>
        )}
      </div>
    </AppShell>
  )
}

function DraftCard({ draft, categories, onFieldChange, onToggleEdit, onToggleRelationship, onRemove }) {
  if (draft.status === 'processing') {
    return (
      <div className="border border-parchment-100/10 rounded-2xl p-5">
        <p className="text-sm text-parchment-100/70 mb-3">{draft.filename}</p>
        <div className="space-y-2">
          {['Reading file', 'Extracting text', 'Detecting category', 'Finding connections'].map((label, i) => (
            <div key={label} className="flex items-center gap-2 text-sm text-parchment-100/40">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" />
              {label}…
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (draft.status === 'error') {
    return (
      <div className="border border-red-500/30 bg-red-500/5 rounded-2xl p-5">
        <p className="text-sm text-parchment-100">{draft.filename}</p>
        <p className="text-sm text-red-400 mt-1">{draft.error}</p>
        <button onClick={onRemove} className="text-xs text-parchment-100/50 hover:text-parchment-100 underline mt-2">
          Remove
        </button>
      </div>
    )
  }

  const { aiResult, editing = {} } = draft

  return (
    <div className="border border-parchment-100/10 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <EditableField
          value={aiResult.title}
          editing={editing.title}
          onToggle={() => onToggleEdit('title')}
          onChange={(v) => onFieldChange('title', v)}
          render={(v) => <h3 className="font-display text-lg text-parchment-100">{v}</h3>}
        />
        <button onClick={onRemove} className="text-parchment-100/30 hover:text-parchment-100/60 text-sm">
          Remove
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-parchment-100/40 mb-1">Category</p>
          {editing.category ? (
            <div className="flex gap-2">
              <select
                value={aiResult.category}
                onChange={(e) => onFieldChange('category', e.target.value)}
                className="flex-1 bg-ink-900 border border-parchment-100/15 rounded-lg px-2 py-1.5 text-sm text-parchment-100"
              >
                {CATEGORY_NAMES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button onClick={() => onToggleEdit('category')} className="w-7 h-7 rounded-full bg-thread-500 text-ink-950 flex items-center justify-center text-xs">
                ✓
              </button>
            </div>
          ) : (
            <button onClick={() => onToggleEdit('category')} className="text-sm text-parchment-100 hover:text-gold-500 underline decoration-dotted">
              {aiResult.category}
            </button>
          )}
        </div>
        <div>
          <p className="text-xs text-parchment-100/40 mb-1 flex items-center gap-1.5">
            Year
            {aiResult.yearConfident === false && (
              <span className="text-[10px] font-medium text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full" title="No date was found in this document — please confirm the year is correct">
                ⚠ Confirm year
              </span>
            )}
          </p>
          <EditableField
            value={String(aiResult.event_year)}
            editing={editing.event_year}
            onToggle={() => onToggleEdit('event_year')}
            onChange={(v) => onFieldChange('event_year', Number(v) || aiResult.event_year)}
            render={(v) => <span className="text-sm text-parchment-100">{v}</span>}
            inputClassName="w-24"
          />
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs text-parchment-100/40 mb-1">Description</p>
        <EditableField
          value={aiResult.summary}
          editing={editing.summary}
          onToggle={() => onToggleEdit('summary')}
          onChange={(v) => onFieldChange('summary', v)}
          multiline
          render={(v) => <p className="text-sm text-parchment-100/70 leading-relaxed">{v}</p>}
        />
      </div>

      <div className="mb-2">
        <p className="text-xs text-parchment-100/40 mb-1">Suggested tags</p>
        <EditableField
          value={(aiResult.tags || []).join(', ')}
          editing={editing.tags}
          onToggle={() => onToggleEdit('tags')}
          onChange={(v) =>
            onFieldChange(
              'tags',
              v.split(',').map((t) => t.trim()).filter(Boolean)
            )
          }
          render={(v) => (
            <div className="flex flex-wrap gap-1.5">
              {(aiResult.tags || []).map((tag) => (
                <span key={tag} className="text-[11px] bg-parchment-100/10 text-parchment-100/70 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
              {(!aiResult.tags || aiResult.tags.length === 0) && <span className="text-xs text-parchment-100/30">No tags yet</span>}
            </div>
          )}
        />
      </div>

      {draft.relationshipSuggestions?.length > 0 && (
        <div className="mt-4 border-t border-parchment-100/10 pt-3">
          <p className="text-xs text-parchment-100/40 mb-2">Suggested connections — choose what to save</p>
          <div className="space-y-2">
            {draft.relationshipSuggestions.map((suggestion) => (
              <label key={suggestion.documentId} className="flex items-center gap-2 text-xs text-thread-400 cursor-pointer">
                <input type="checkbox" checked={draft.approvedTargetIds?.includes(suggestion.documentId)} onChange={() => onToggleRelationship(suggestion.documentId)} className="accent-[#3FA796]" />
                <span><span className="text-parchment-100/80">{suggestion.title}</span> — {suggestion.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EditableField({ value, editing, onToggle, onChange, render, multiline, inputClassName = 'w-full' }) {
  if (editing) {
    return (
      <div className="flex items-start gap-2 w-full">
        {multiline ? (
          <textarea
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className={`${inputClassName} bg-ink-900 border border-parchment-100/15 rounded-lg px-2 py-1.5 text-sm text-parchment-100 resize-none`}
          />
        ) : (
          <input
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputClassName} bg-ink-900 border border-parchment-100/15 rounded-lg px-2 py-1.5 text-sm text-parchment-100`}
          />
        )}
        <button onClick={onToggle} className="w-7 h-7 flex-shrink-0 rounded-full bg-thread-500 text-ink-950 flex items-center justify-center text-xs">
          ✓
        </button>
      </div>
    )
  }
  return (
    <button onClick={onToggle} className="text-left hover:opacity-80 w-full">
      {render(value)}
    </button>
  )
}