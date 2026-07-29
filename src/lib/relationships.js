import { supabase } from './supabase'
import { cosineSimilarity } from './ai'

/**
 * relationships.js
 * ================
 * Handles the Supabase `relationships` table.
 *
 * MATCHING RULES (three signals, combined):
 *  1. Shared tags        — case-insensitive, trimmed exact match.
 *  2. Semantic similarity — cosine similarity between document embeddings
 *                           (title + summary + tags, already computed for
 *                           search). Catches connections where two documents
 *                           are related in meaning but share no literal tag
 *                           (e.g. "Data Science Internship" <-> "Python
 *                           Course Achievement").
 *  3. LLM relation hints  — the `relations` field returned by
 *                           categorizeDocument (e.g. certification_to_skill,
 *                           target_hint: "Python"). Matched against other
 *                           documents' tags/title.
 *
 * A pair connects if ANY signal fires. The label lists every signal that
 * matched, so the UI stays transparent about why two documents are linked.
 */

const SEMANTIC_THRESHOLD = 0.55 // cosine similarity cutoff for "related in meaning"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function normaliseTag(t) {
  return String(t).toLowerCase().trim()
}

function tagSet(doc) {
  return new Set((doc.tags || []).map(normaliseTag).filter((t) => t.length > 0))
}

// ---------------------------------------------------------------------------
// Core: combined candidate detection (tags + semantic + relation hints)
// ---------------------------------------------------------------------------

/**
 * Find documents related to `newDoc` using shared tags, embedding
 * similarity, and the LLM's relation hints.
 *
 * @param {{ newDoc: Object, existingDocs: Object[] }} param0
 *   newDoc may optionally carry `embedding` (array or pgvector string) and
 *   `relations` (the raw array from categorizeDocument).
 * @returns {{ documentId, title, label, sharedTags, confidence }[]}
 */
export function findRelationshipCandidates({ newDoc, existingDocs }) {
  const newTagSet = tagSet(newDoc)
  const newEmbedding = parseEmbedding(newDoc.embedding)
  const relationHints = (newDoc.relations || [])
    .map((r) => (r?.target_hint ? String(r.target_hint).toLowerCase().trim() : null))
    .filter(Boolean)

  const candidates = []

  for (const doc of existingDocs) {
    if (doc.id === newDoc.id) continue

    const reasons = []
    let sharedTags = []
    let confidence = 0

    // Signal 1: shared tags
    const docTagSet = tagSet(doc)
    sharedTags = [...newTagSet].filter((t) => docTagSet.has(t))
    if (sharedTags.length > 0) {
      reasons.push(`tag: ${sharedTags.join(', ')}`)
      confidence = Math.max(confidence, Math.min(0.75 + sharedTags.length * 0.08, 0.95))
    }

    // Signal 2: semantic similarity (embeddings), independent of tag overlap
    const docEmbedding = parseEmbedding(doc.embedding)
    if (newEmbedding && docEmbedding) {
      const similarity = cosineSimilarity(newEmbedding, docEmbedding)
      if (similarity >= SEMANTIC_THRESHOLD) {
        reasons.push(`semantic match (${similarity.toFixed(2)})`)
        confidence = Math.max(confidence, Math.min(0.5 + similarity * 0.4, 0.9))
      }
    }

    // Signal 3: LLM relation hints (e.g. certification_to_skill -> "Python")
    if (relationHints.length > 0) {
      const haystack = `${doc.title || ''} ${(doc.tags || []).join(' ')}`.toLowerCase()
      const matchedHint = relationHints.find(
        (hint) => haystack.includes(hint) || hint.includes(normaliseTag(doc.title || ''))
      )
      if (matchedHint) {
        reasons.push(`relation: ${matchedHint}`)
        confidence = Math.max(confidence, 0.8)
      }
    }

    if (reasons.length === 0) continue

    candidates.push({
      documentId: doc.id,
      title: doc.title,
      label: reasons.join(' + '),
      sharedTags,
      confidence
    })
  }

  return candidates
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4)
}

// ---------------------------------------------------------------------------
// Row builder (used by Upload.jsx before inserting into Supabase)
// ---------------------------------------------------------------------------

export function buildRelationshipRows({ userId, newDoc, existingDocs, approvedTargetIds }) {
  const approved = approvedTargetIds ? new Set(approvedTargetIds) : null
  return findRelationshipCandidates({ newDoc, existingDocs })
    .filter((candidate) => !approved || approved.has(candidate.documentId))
    .map((candidate) => ({
      user_id: userId,
      source_document_id: newDoc.id,
      target_document_id: candidate.documentId,
      relation_type: 'ai_inferred',
      label: candidate.label,
      confidence: candidate.confidence
    }))
}

// ---------------------------------------------------------------------------
// Rebuild all relationships for a user (called from Upload batch save)
// ---------------------------------------------------------------------------

export async function rebuildRelationshipsForUser({ userId, documents }) {
  await supabase.from('relationships').delete().eq('user_id', userId)
  const rows = documents.flatMap((doc, index) =>
    buildRelationshipRows({
      userId,
      newDoc: doc,
      existingDocs: documents.slice(0, index)
    })
  )
  if (rows.length) {
    const { error } = await supabase.from('relationships').insert(rows)
    if (error) throw error
  }
  return rows.length
}

// ---------------------------------------------------------------------------
// Fetch (kept for legacy Profile export — graph does NOT use this)
// ---------------------------------------------------------------------------

export async function fetchRelationshipsForUser(userId) {
  const { data, error } = await supabase.from('relationships').select('*').eq('user_id', userId)
  if (error) throw error
  return (data || []).filter((r) => r.source_document_id !== r.target_document_id)
}

// ---------------------------------------------------------------------------
// Cleanup on document delete
// ---------------------------------------------------------------------------

export async function deleteRelationshipsForDocument(documentId) {
  await supabase.from('relationships').delete().or(
    `source_document_id.eq.${documentId},target_document_id.eq.${documentId}`
  )
}
