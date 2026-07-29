import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { askArchive, rankArchiveDocuments } from '../lib/ai'
import { SparkChatIcon } from './icons'

// Each chip maps its visible label to the exact full question that gets sent.
// The open-ended "Ask anything" chip focuses the input instead of auto-sending.
const SUGGESTIONS = [
  {
    label: 'Ask about your skills',
    question: 'What are my key skills based on my uploaded documents?'
  },
  {
    label: 'Ask about your latest project',
    question: 'Tell me about my latest project.'
  },
  {
    label: 'Ask about your certifications',
    question: 'List all my certifications.'
  },
  {
    label: 'Ask anything about your uploads',
    question: null // focuses input instead of sending
  }
]

export default function FloatingChat() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [bubbleIndex, setBubbleIndex] = useState(0)
  const [showBubble, setShowBubble] = useState(true)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Ask me about your journey — I only answer using your own uploaded documents.",
      citedTitles: []
    }
  ])
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  // Rotating "in the air" suggestion bubble above the launcher —
  // pauses while the panel is open so it never competes with the chat.
  useEffect(() => {
    if (open) return
    const cycle = setInterval(() => {
      setShowBubble(false)
      setTimeout(() => {
        setBubbleIndex((i) => (i + 1) % SUGGESTIONS.length)
        setShowBubble(true)
      }, 350)
    }, 3600)
    return () => clearInterval(cycle)
  }, [open])

  async function handleSend(e, forcedQuestion) {
    e?.preventDefault?.()
    const question = (forcedQuestion ?? input).trim()
    if (!question || sending) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: question }])
    setSending(true)

    try {
      const [{ data: cats }, { data: docs }] = await Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('documents').select('*').eq('user_id', user.id)
      ])
      const catMap = {}
      ;(cats || []).forEach((c) => (catMap[c.id] = c.name))

      const contextDocs = rankArchiveDocuments(question, (docs || []).map((d) => ({ ...d, categoryName: catMap[d.category_id] })))

      const result = await askArchive({ question, contextDocs })
      setMessages((m) => [...m, { role: 'assistant', text: result.answer, citedTitles: result.citedTitles }])
    } catch (err) {
      console.error(err)
      setMessages((m) => [...m, { role: 'assistant', text: 'Something went wrong reaching your archive — try again in a moment.', citedTitles: [] }])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="fixed bottom-7 right-7 z-40 flex flex-col items-end gap-3">
        {!open && (
          <div
            key={bubbleIndex}
            className={`glass-pill rounded-2xl px-4 py-2.5 text-sm text-[#1E2340] shadow-lg cursor-pointer transition-all duration-300 ${
              showBubble ? 'opacity-100 translate-y-0 animate-pop-in' : 'opacity-0 translate-y-2'
            }`}
            onClick={() => setOpen(true)}
          >
            {SUGGESTIONS[bubbleIndex].label}
          </div>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          className="relative w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl transition-transform hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #7C8CFF 0%, #C084F5 55%, #FF9E7A 100%)' }}
          aria-label="Ask anything about your uploads"
          title="Ask anything about your uploads"
        >
          <span className={`absolute inset-0 rounded-full ${open ? '' : 'animate-bob'}`} />
          {open ? (
            <span className="text-2xl leading-none relative">×</span>
          ) : (
            <SparkChatIcon className="w-7 h-7 relative" />
          )}
        </button>
      </div>

      {open && (
        <div className="fixed bottom-28 right-7 z-40 w-[calc(100vw-3.5rem)] max-w-sm h-[30rem] glass-panel rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-pop-in">
          <div className="px-5 py-4 border-b border-parchment-100/10 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #7C8CFF 0%, #C084F5 55%, #FF9E7A 100%)' }}
            >
              <SparkChatIcon className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-parchment-100">Ask about your journey</p>
              <p className="text-xs text-parchment-100/50">Only knows your own uploaded documents</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                <div
                  className={`inline-block max-w-[85%] text-left text-sm px-3.5 py-2.5 rounded-2xl ${
                    m.role === 'user'
                      ? 'text-white'
                      : 'bg-white/70 text-parchment-100/90 border border-parchment-100/10'
                  }`}
                  style={m.role === 'user' ? { background: 'linear-gradient(135deg, #7C8CFF 0%, #C084F5 100%)' } : undefined}
                >
                  {m.text}
                  {m.citedTitles?.length > 0 && (
                    <div className="mt-1.5 pt-1.5 border-t border-white/30 text-[11px] opacity-70">
                      From: {m.citedTitles.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && <p className="text-xs text-parchment-100/40">Searching your archive…</p>}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={(e) => {
                    if (s.question) {
                      // Send the full mapped question immediately
                      handleSend(e, s.question)
                    } else {
                      // Open-ended chip: just focus the input for the user to type
                      setOpen(true)
                      setTimeout(() => inputRef.current?.focus(), 50)
                    }
                  }}
                  className="text-[11px] px-3 py-1.5 rounded-full glass-pill text-parchment-100/70 hover:text-parchment-100 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSend} className="p-3 border-t border-parchment-100/10 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. What certifications do I have?"
              className="flex-1 bg-white/60 border border-parchment-100/15 rounded-xl px-3.5 py-2.5 text-sm text-parchment-100 placeholder:text-parchment-100/40 outline-none focus:border-gold-500/60"
            />
            <button
              type="submit"
              disabled={sending}
              className="text-sm px-4 py-2.5 rounded-xl text-white font-medium disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #7C8CFF 0%, #C084F5 100%)' }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  )
}
