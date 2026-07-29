import { cosineSimilarity } from './ai'

/**
 * tagGraph.js
 * ============
 * Computes the document-to-document edges shown in the Connections graph,
 * and used for the Dashboard / Profile connection counts.
 *
 * MATCHING RULES (two signals — was tag-only, now also semantic):
 *  1. Shared tags — case-insensitive, trimmed exact match.
 *  2. Semantic similarity between document embeddings (cosine >= threshold).
 *     Catches connections where the LLM tagged two related documents with
 *     different wording (e.g. "Hackathon" vs "Ingenious Hackathon") — a
 *     real gap with tag-only matching, since a small free model isn't
 *     perfectly consistent about tag granularity between calls.
 *
 * Note: this file (unlike relationships.js at Upload time) cannot use the
 * LLM's `relations` hints, because `relations` is never persisted to the
 * documents table — it only exists in memory during the upload review
 * step. Once a document is saved and reloaded, tags + embedding are all
 * that's available here.
 */

const SEMANTIC_THRESHOLD = 0.55

function normalise(t) {
  return String(t).toLowerCase().trim()
}

function tagSet(doc) {
  return new Set((doc.tags || []).map(normalise).filter((t) => t.length > 0))
}

// Postgres pgvector columns often come back through supabase-js as a string
// like "[0.01,-0.02,...]" rather than a JS array. Normalise both cases.
function parseEmbedding(raw) {
  if (!raw) return null
  if (Array.isArray(raw)) return raw
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * Build every edge between documents that share a tag OR are semantically
 * similar by embedding.
 *
 * @param {Object[]} documents - array of document rows (needs `tags`, optionally `embedding`)
 * @returns {Object[]} edges — { sourceId, targetId, label, sharedTags, from, to }
 */
export function buildTagEdges(documents) {
  const edges = []

  for (let i = 0; i < documents.length; i++) {
    const a = documents[i]
    const tagsA = tagSet(a)
    const embA = parseEmbedding(a.embedding)

    for (let j = i + 1; j < documents.length; j++) {
      const b = documents[j]
      const tagsB = tagSet(b)
      const embB = parseEmbedding(b.embedding)

      const shared = [...tagsA].filter((t) => tagsB.has(t))

      let similarity = 0
      if (embA && embB) similarity = cosineSimilarity(embA, embB)
      const isSemanticMatch = similarity >= SEMANTIC_THRESHOLD

      if (shared.length === 0 && !isSemanticMatch) continue

      const labelParts = []
      if (shared.length > 0) labelParts.push('tag: ' + shared.join(', '))
      if (isSemanticMatch) labelParts.push(`semantic match (${similarity.toFixed(2)})`)

      edges.push({
        sourceId: a.id,
        targetId: b.id,
        label: labelParts.join(' + '),
        sharedTags: shared,
        from: a,
        to: b,
      })
    }
  }

  return edges
}

/**
 * Count unique connections — matches the edge count shown in the graph.
 * Use this for stat cards so the number is always in sync.
 *
 * @param {Object[]} documents
 * @returns {number}
 */
export function countTagConnections(documents) {
  return buildTagEdges(documents).length
}

/**
 * Return all edges that involve a specific document id.
 *
 * @param {Object[]} documents
 * @param {string}   docId
 * @returns {Object[]} edges where sourceId or targetId === docId
 */
export function edgesForDocument(documents, docId) {
  return buildTagEdges(documents).filter(
    (e) => e.sourceId === docId || e.targetId === docId
  )
}