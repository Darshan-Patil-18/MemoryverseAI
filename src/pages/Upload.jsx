import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { categorizeDocument, embedText } from '../lib/ai'
import { extractText } from '../lib/extractText'
import AppShell from '../components/AppShell'

const SOURCE_TABS = [
  { id: 'upload', label: 'File upload' },
  { id: 'url', label: 'Portfolio link' },
  { id: 'text', label: 'Written note' }
]

const STEPS = [
  'Reading document',
  'Understanding & categorizing',
  'Generating embedding',
  'Linking to your journey',
  'Saving to your archive'
]

export default function Upload() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sourceTab, setSourceTab] = useState('upload')
  const [file, setFile] = useState(null)
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [step, setStep] = useState(-1)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (sourceTab === 'upload' && !file) return setError('Choose a file first.')
    if (sourceTab === 'url' && !url.trim()) return setError('Paste a link first.')
    if (sourceTab === 'text' && !notes.trim()) return setError('Write something first.')

    try {
      setStep(0)
      let rawText = ''
      let fileUrl = null
      let fileType = null
      let filename = null

      if (sourceTab === 'upload') {
        filename = file.name
        fileType = file.type
        rawText = await extractText(file)
        if (notes.trim()) rawText += `\n\nUser notes: ${notes.trim()}`

        const path = `${user.id}/${Date.now()}-${file.name}`
        const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
        if (uploadError) throw uploadError
        const { data: signed } = await supabase.storage.from('documents').createSignedUrl(path, 60 * 60 * 24 * 365)
        fileUrl = signed?.signedUrl || null
      } else if (sourceTab === 'url') {
        filename = url
        fileType = 'url'
        fileUrl = url
        rawText = `Portfolio link: ${url}\n${notes ? `Notes: ${notes}` : ''}`
      } else {
        filename = notes.slice(0, 40)
        fileType = 'text'
        rawText = notes
      }

      setStep(1)
      const aiResult = await categorizeDocument({ rawText, filename, sourceType: sourceTab })

      setStep(2)
      const embedding = await embedText(`${aiResult.title}\n${aiResult.summary}\n${(aiResult.tags || []).join(', ')}`)

      setStep(3)
      const { data: categoryRow } = await supabase.from('categories').select('id').eq('name', aiResult.category).single()

      setStep(4)
      const { data: inserted, error: insertError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          title: aiResult.title,
          original_filename: filename,
          file_url: fileUrl,
          file_type: fileType,
          source_type: sourceTab,
          raw_text: rawText.slice(0, 8000),
          ai_summary: aiResult.summary,
          category_id: categoryRow?.id || null,
          tags: aiResult.tags || [],
          event_year: aiResult.event_year || new Date().getFullYear(),
          embedding
        })
        .select()
        .single()

      if (insertError) throw insertError

      await supabase.from('timeline_events').insert({
        user_id: user.id,
        document_id: inserted.id,
        title: aiResult.title,
        description: aiResult.summary,
        event_year: aiResult.event_year || new Date().getFullYear()
      })

      if (aiResult.relations?.length) {
        // Store as lightweight self-referencing hints for now; the target
        // gets resolved to a real document the next time a matching item
        // is uploaded (kept simple for the MVP relationship engine).
        const relRows = aiResult.relations.map((r) => ({
          user_id: user.id,
          source_document_id: inserted.id,
          target_document_id: inserted.id,
          relation_type: `${r.type}:${r.target_hint || ''}`.slice(0, 120),
          confidence: 0.5
        }))
        await supabase.from('relationships').insert(relRows)
      }

      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Something went wrong while processing this document.')
      setStep(-1)
    }
  }

  const isProcessing = step >= 0 && step < STEPS.length

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 sm:px-10 py-10">
        <h1 className="font-display text-3xl text-parchment-100 mb-2">Add a document</h1>
        <p className="text-parchment-100/50 mb-8">
          Drop in a certificate, resume, project report, internship letter, or portfolio link.
          MemoryVerse reads it, files it, and connects it — you don't sort anything.
        </p>

        {isProcessing ? (
          <ProcessingView step={step} />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-2">
              {SOURCE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSourceTab(tab.id)}
                  className={`text-sm px-4 py-2 rounded-full border transition-colors ${
                    sourceTab === tab.id ? 'bg-parchment-100 text-ink-900 border-parchment-100' : 'border-parchment-100/20 text-parchment-100/70'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {sourceTab === 'upload' && (
              <div>
                <label className="block text-sm text-parchment-100/70 mb-2">File (PDF, image, or text)</label>
                <input
                  type="file"
                  accept=".pdf,.txt,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-parchment-100/70 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-gold-500 file:text-ink-950 file:font-medium bg-ink-800 border border-parchment-100/15 rounded-lg px-4 py-2.5"
                />
              </div>
            )}

            {sourceTab === 'url' && (
              <div>
                <label className="block text-sm text-parchment-100/70 mb-2">Link</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/you/project"
                  className="w-full bg-ink-800 border border-parchment-100/15 rounded-lg px-4 py-2.5 text-parchment-100 placeholder:text-parchment-100/30 focus:border-gold-500/60 outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-parchment-100/70 mb-2">
                {sourceTab === 'text' ? 'Write your note' : 'Notes (optional, improves categorization)'}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={sourceTab === 'text' ? 6 : 3}
                placeholder={sourceTab === 'text' ? 'e.g. Led the Data Science Club as president, organized 3 workshops in 2024...' : 'e.g. This is my AWS certification from March 2024'}
                className="w-full bg-ink-800 border border-parchment-100/15 rounded-lg px-4 py-2.5 text-parchment-100 placeholder:text-parchment-100/30 focus:border-gold-500/60 outline-none resize-none"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              className="w-full bg-gold-500 hover:bg-gold-400 text-ink-950 font-medium py-3 rounded-lg transition-colors"
            >
              Process & save
            </button>
          </form>
        )}
      </div>
    </AppShell>
  )
}

function ProcessingView({ step }) {
  return (
    <div className="border border-parchment-100/10 rounded-2xl p-8">
      <div className="space-y-4">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-3">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${
                i < step ? 'bg-thread-500 text-ink-950' : i === step ? 'bg-gold-500 text-ink-950 animate-pulse' : 'bg-parchment-100/10 text-parchment-100/30'
              }`}
            >
              {i < step ? '✓' : i + 1}
            </span>
            <span className={i <= step ? 'text-parchment-100' : 'text-parchment-100/30'}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
