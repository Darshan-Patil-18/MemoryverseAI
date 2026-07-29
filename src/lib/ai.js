// AI layer: OpenRouter (free model) for understanding + categorization,
// and an in-browser embedding model (Xenova/all-MiniLM-L6-v2, 384-dim,
// matches the `vector(384)` column in Supabase) so embeddings stay free
// and never leave the user's machine.

const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const OPENROUTER_MODEL = 'openrouter/free'

const CATEGORY_NAMES = [
  'Projects',
  'Skills',
  'Certifications',
  'Internships',
  'Achievements',
  'Academics'
]

const SYSTEM_PROMPT = `You are the categorization engine inside MemoryVerse AI, a digital identity system for students.
Given raw text extracted from a document (certificate, resume, project report, internship letter, portfolio link, etc.), respond with STRICT JSON only, no prose, no markdown fences, matching this shape:

{
  "title": "short human-readable title for this document",
  "category": "one of: Projects, Skills, Certifications, Internships, Achievements, Academics",
  "summary": "2-3 sentence summary of what this document represents",
  "tags": ["skill or keyword", "..."],
  "event_year": 2024,
  "relations": [
    {"type": "certification_to_skill", "target_hint": "e.g. Python"},
    {"type": "skill_to_project", "target_hint": "e.g. AI/ML Portfolio"}
  ]
}

Rules:
- category must be exactly one of the six listed values.
- Category decision priority — many documents could plausibly fit more than one category, so use this order and stop at the first one that applies. Do not pick a "more interesting" category further down the list if an earlier one applies:
  1. Internships: the text explicitly mentions an internship (word "internship"/"intern"), OR describes work/output produced during an internship, OR is a portfolio/project link whose own title or description ties it to an internship — even if it also looks like a project. Internship evidence always wins over Projects.
  2. Certifications: a formal certificate for COMPLETING a course, training program, or exam (e.g. "has successfully completed", "certified in") — not for merely attending or participating in an event.
  3. Achievements: a prize, rank, award, placement, or competition result (e.g. "third place", "winner", "selected", "awarded") — including hackathon results. Plain participation certificates with no rank/result also belong here, not Certifications.
  4. Projects: a specific technical build, codebase, app, or project report that is NOT tied to an internship, a course, or a competition result.
  5. Skills: a document whose main purpose is demonstrating or listing a skill on its own (rare as a standalone upload).
  6. Academics: transcripts, marksheets, degree records, resumes, or general academic documents that don't fit any category above.
- event_year is your best guess of the year the document/event is from (integer). If unknown, use the current year.
- tags should be 2-6 words describing the document HOLDER's skills, technologies used, the type of event/achievement, or measurable outcomes (e.g. "Python", "Hackathon", "Team Leadership", "Third Prize"). Never invent a tag that isn't backed by the text.
- tags must NEVER be: the name of the organizing institution, university, college, company, or event sponsor (e.g. do not tag "Adani University" or "SAL College of Engineering" just because they appear in the text) — those belong in the summary, not tags.
- tags must NEVER be the name or title/role of anyone other than the document holder — e.g. if a signature block reads "Abhijeet Chavan — Founder, Weboreel", do NOT tag "Founder": that is the signer's role, not the holder's. Only tag a role/title if it explicitly belongs to the person the document is about.
- If the document contains no explicit skill or technology words (common for plain participation/placement certificates), fall back to tagging the event or achievement TYPE instead (e.g. "Hackathon", "Competition", "Team Event", "Placement") rather than inventing a skill, and rather than defaulting to institution names.
- relations should capture how this item likely connects to other parts of someone's journey (certification -> skill, skill -> project, project -> internship, internship -> career path). target_hint is a free-text guess, not an ID.
- Output ONLY the JSON object.`

function stripCodeFences(text) {
  return text.replace(/```json\s*|\s*```/g, '').trim()
}

async function chatCompletion(messages, { temperature = 0.2 } = {}) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'MemoryVerse AI'
    },
    body: JSON.stringify({ model: OPENROUTER_MODEL, temperature, messages })
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenRouter request failed (${res.status}): ${errText}`)
  }

  const data = await res.json()
  return data?.choices?.[0]?.message?.content || ''
}

// Cleans up a title so the UI never shows raw, unedited user input.
// Trims whitespace, strips trailing punctuation artifacts, title-cases
// short all-lowercase strings, and caps length.
export function cleanTitle(rawTitle, fallback = 'Untitled document') {
  let title = (rawTitle || '').trim().replace(/\s+/g, ' ')
  if (!title) return fallback
  title = title.replace(/^[-–—:.,\s]+|[-–—:.,\s]+$/g, '')
  // If it reads like raw typed text (all lowercase, no punctuation, long run-on),
  // apply light title-casing so it looks composed rather than echoed.
  const looksRaw = title === title.toLowerCase() && title.split(' ').length > 3
  if (looksRaw) {
    title = title
      .split(' ')
      .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ')
  }
  if (title.length > 80) title = title.slice(0, 77).trim() + '…'
  return title || fallback
}

const FALLBACK_SUMMARY_BY_TYPE = {
  upload: 'This document was saved to your archive. Add a short note next time to help MemoryVerse summarize it automatically.',
  url: 'This portfolio link was saved to your archive.',
  text: 'This note was saved to your archive.'
}

export async function categorizeDocument({ rawText, filename, sourceType }) {
  const todayISO = new Date().toISOString().slice(0, 10)
  const userContent = `Today's date: ${todayISO}\nFilename: ${filename || 'n/a'}\nSource type: ${sourceType}\n\nExtracted text:\n${(rawText || '').slice(0, 6000)}`

  let parsed
  try {
    const raw = await chatCompletion([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent }
    ])
    parsed = JSON.parse(stripCodeFences(raw))
  } catch (err) {
    console.warn('AI categorization failed, using safe fallback', err)
    parsed = {
      title: cleanTitle(filename),
      category: 'Academics',
      summary: FALLBACK_SUMMARY_BY_TYPE[sourceType] || FALLBACK_SUMMARY_BY_TYPE.upload,
      tags: [],
      event_year: new Date().getFullYear(),
      relations: []
    }
  }

  parsed.title = cleanTitle(parsed.title, filename || 'Untitled document')
  if (!parsed.summary || !parsed.summary.trim()) {
    parsed.summary = FALLBACK_SUMMARY_BY_TYPE[sourceType] || FALLBACK_SUMMARY_BY_TYPE.upload
  }
  if (!CATEGORY_NAMES.includes(parsed.category)) {
    parsed.category = 'Academics'
  }
  if (!Array.isArray(parsed.tags)) parsed.tags = []
  if (!Array.isArray(parsed.relations)) parsed.relations = []

  // Safety net for event_year: an LLM has no built-in sense of "today" and
  // can guess a plausible-but-wrong year (commonly one near its training
  // data) when the source document itself contains no date. Don't trust the
  // model's guess in that case — check the raw text for an explicit year
  // ourselves, and flag it as unconfirmed (rather than silently guessing)
  // if the document never states one, so the review screen can ask the
  // user to confirm it instead of saving a possibly-wrong year unseen.
  const yearsInText = [...(rawText || '').matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]))
  const currentYear = new Date().getFullYear()
  if (yearsInText.length > 0) {
    // Prefer a year actually present in the source text over the model's guess,
    // picking the one closest to what the model returned if there are several.
    parsed.event_year = yearsInText.reduce((closest, y) =>
      Math.abs(y - (parsed.event_year || currentYear)) < Math.abs(closest - (parsed.event_year || currentYear)) ? y : closest
      , yearsInText[0])
    parsed.yearConfident = true
  } else {
    // No year anywhere in the document — pre-fill the current year as a
    // starting point, but mark it unconfirmed so the UI prompts the user
    // to check it rather than treating it as a reliable AI-derived fact.
    parsed.event_year = currentYear
    parsed.yearConfident = false
  }

  return parsed
}

// --- RAG answer synthesis for Ask / floating chatbot ---
// Answers ONLY from the user's own documents. Returns { answer, citedTitles, inScope }.
export async function askArchive({ question, contextDocs }) {
  if (!contextDocs || contextDocs.length === 0) {
    return {
      answer: "I couldn't find anything in your archive about that yet. Try uploading a related document, or ask something else about what you've already added.",
      citedTitles: [],
      inScope: false
    }
  }

  const context = contextDocs
    .map((d, i) => `[${i + 1}] Title: ${d.title}\nCategory: ${d.categoryName || 'Uncategorized'}\nYear: ${d.event_year || 'n/a'}\nSummary: ${d.ai_summary || 'n/a'}\nTags: ${(d.tags || []).join(', ')}`)
    .join('\n\n')

  const system = `You are the "Ask your archive" assistant inside MemoryVerse AI. You answer questions using ONLY the numbered document excerpts provided below — never general knowledge, and never information about anyone else. If the question cannot be answered from these documents, say plainly that you can only answer questions about the user's own uploaded documents. Respond with STRICT JSON only, no prose, no markdown fences, matching:
{"answer": "concise answer in plain language, 1-4 sentences", "cited_indices": [1,2], "in_scope": true}
"cited_indices" must reference only the numbers of documents you actually used. If out of scope, set "in_scope" to false and "cited_indices" to [].`

  const user = `Archive documents:\n${context}\n\nQuestion: ${question}`

  try {
    const raw = await chatCompletion([
      { role: 'system', content: system },
      { role: 'user', content: user }
    ])
    const parsed = JSON.parse(stripCodeFences(raw))
    const citedTitles = (parsed.cited_indices || [])
      .map((i) => contextDocs[i - 1]?.title)
      .filter(Boolean)
    return {
      answer: parsed.answer || "I couldn't find a clear answer in your archive for that.",
      citedTitles,
      inScope: parsed.in_scope !== false && citedTitles.length > 0
    }
  } catch (err) {
    console.warn('askArchive failed', err)
    // Safe fallback: surface the closest matches without a synthesized answer.
    return {
      answer: `I found ${contextDocs.length} document${contextDocs.length === 1 ? '' : 's'} that might be relevant.`,
      citedTitles: contextDocs.slice(0, 3).map((d) => d.title),
      inScope: true
    }
  }
}

// Keep search and chat precise even when vector search returns loosely related
// documents. This is deliberately transparent: a result needs matching words,
// tags, category intent, or an explicit "latest" request to be shown.
export function rankArchiveDocuments(question, docs, vectorMatches = []) {
  const q = String(question || '').toLowerCase()
  const terms = q.match(/[a-z0-9+#.]{2,}/g)?.filter((t) => !['show', 'what', 'have', 'about', 'my', 'the', 'all', 'latest'].includes(t)) || []
  const wantsLatest = /latest|newest|recent/.test(q)
  const categoryTerms = { certificates: 'Certifications', certificate: 'Certifications', projects: 'Projects', project: 'Projects', internship: 'Internships', internships: 'Internships', skills: 'Skills', achievements: 'Achievements', achievement: 'Achievements', academic: 'Academics', resume: 'Academics' }
  // Exact substring first; if nothing matches, fall back to a small edit-distance
  // check per word so common typos ("achivements", "certifcates") still resolve
  // to the right category instead of silently returning zero results.
  function editDistance(a, b) {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
    for (let j = 0; j <= b.length; j++) dp[0][j] = j
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
      }
    }
    return dp[a.length][b.length]
  }
  let requestedCategory = Object.entries(categoryTerms).find(([term]) => q.includes(term))?.[1]
  if (!requestedCategory) {
    const words = q.split(/\s+/).filter((w) => w.length > 3)
    for (const [term, cat] of Object.entries(categoryTerms)) {
      if (words.some((w) => editDistance(w, term) <= 2)) {
        requestedCategory = cat
        break
      }
    }
  }
  const similarity = new Map(vectorMatches.map((m) => [m.id, Number(m.similarity || 0)]))
  const ranked = docs.map((doc) => {
    const haystack = `${doc.title} ${doc.ai_summary || ''} ${(doc.tags || []).join(' ')} ${doc.categoryName || ''}`.toLowerCase()
    const matchedTerms = terms.filter((term) => haystack.includes(term))
    let score = matchedTerms.length * 3 + (similarity.get(doc.id) || 0) * 0.25
    if (requestedCategory && doc.categoryName === requestedCategory) score += 5
    if (wantsLatest) score += new Date(doc.created_at || 0).getTime() / 1e13
    return { doc, score, matchedTerms }
  })
  const relevant = ranked.filter((item) => wantsLatest || item.matchedTerms.length > 0 || (requestedCategory && item.doc.categoryName === requestedCategory) || (similarity.get(item.doc.id) || 0) >= 0.42)
  return relevant.sort((a, b) => b.score - a.score).slice(0, wantsLatest ? 1 : 6).map((item) => item.doc)
}

// --- "Generate my profile" — turns the whole archive into a one-page summary ---
export async function generateProfileSummary({ fullName, documents }) {
  const byCategory = {}
  documents.forEach((d) => {
    const cat = d.categoryName || 'Uncategorized'
    byCategory[cat] = byCategory[cat] || []
    byCategory[cat].push(`${d.title} (${d.event_year || 'n/a'}): ${d.ai_summary || ''}`)
  })
  const context = Object.entries(byCategory)
    .map(([cat, items]) => `${cat}:\n${items.map((i) => `- ${i}`).join('\n')}`)
    .join('\n\n')

  const system = `You write a concise, one-page professional profile summary for a student, based only on the archive entries provided. Structure it with short sections (Summary, Skills, Projects, Certifications, Internships/Experience, Achievements) using only categories that have content. Keep it factual — do not invent details not present in the entries. Plain text output, no markdown headers with #, use simple ALL-CAPS or Title Case section labels and blank lines between sections.`
  const user = `Name: ${fullName || 'Student'}\n\nArchive entries by category:\n${context}`

  return chatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    { temperature: 0.4 }
  )
}

// --- Embeddings (in-browser, free, no API key needed) ---

let embedderPromise = null

async function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers')
      return pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    })()
  }
  return embedderPromise
}

export async function embedText(text) {
  const extractor = await getEmbedder()
  const output = await extractor(text.slice(0, 2000), { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}

export async function embedQuery(query) {
  return embedText(query)
}

// Plain cosine similarity between two equal-length numeric vectors.
// Used by relationships.js to compare document embeddings directly
// (document-to-document), separate from the query-to-document search
// path that already existed. Returns 0 for missing/mismatched input
// instead of throwing, so a bad embedding never breaks the upload flow.
export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}