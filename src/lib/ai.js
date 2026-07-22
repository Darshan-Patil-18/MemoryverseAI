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
- event_year is your best guess of the year the document/event is from (integer). If unknown, use the current year.
- tags should be 2-6 concrete skills/keywords/technologies found in the text.
- relations should capture how this item likely connects to other parts of someone's journey (certification -> skill, skill -> project, project -> internship, internship -> career path). target_hint is a free-text guess, not an ID.
- Output ONLY the JSON object.`

function stripCodeFences(text) {
  return text.replace(/```json\s*|\s*```/g, '').trim()
}

export async function categorizeDocument({ rawText, filename, sourceType }) {
  const userContent = `Filename: ${filename || 'n/a'}\nSource type: ${sourceType}\n\nExtracted text:\n${(rawText || '').slice(0, 6000)}`

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'MemoryVerse AI'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ]
    })
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenRouter request failed (${res.status}): ${errText}`)
  }

  const data = await res.json()
  const raw = data?.choices?.[0]?.message?.content || '{}'

  let parsed
  try {
    parsed = JSON.parse(stripCodeFences(raw))
  } catch {
    parsed = {
      title: filename || 'Untitled document',
      category: 'Academics',
      summary: 'Could not auto-summarize this document.',
      tags: [],
      event_year: new Date().getFullYear(),
      relations: []
    }
  }

  if (!CATEGORY_NAMES.includes(parsed.category)) {
    parsed.category = 'Academics'
  }

  return parsed
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
