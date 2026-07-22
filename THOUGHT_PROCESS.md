# Thought Process — MemoryVerse AI

## The problem, restated

Students accumulate proof of their own growth — certificates, project reports,
internship letters — but it sits scattered across drives and emails. The
brief's real ask isn't "build a file uploader," it's "build something that
understands what a file *means* in the context of everything else the person
has done."

## Key decisions and why

**One AI call does classification + summarization + tagging + relationship
hinting, instead of four separate ones.** A single structured-JSON prompt
keeps the system fast and free-tier-friendly, and keeps the categories,
summary, and relationships mutually consistent — they're reasoned about
together, not stitched from independent calls.

**Embeddings run in the browser, not through an API.** RAG-style semantic
search needs an embedding on every document and every query. Doing that
through a paid API doesn't scale to "search every time you type," so the
embedding model runs locally via `@xenova/transformers` — free, private, and
fast enough for a few hundred documents.

**Fixed six-category taxonomy, not free-form tags for the top-level sort.**
The brief specifies Projects / Skills / Certifications / Internships /
Achievements / Academics. Constraining the LLM's output to exactly those six
values (validated after parsing, with a safe fallback) keeps the dashboard
and timeline predictable instead of accumulating dozens of near-duplicate
categories over time. Tags stay free-form underneath, so nuance isn't lost.

**Relationships are stored as directed hints, not a rigid graph schema.**
At hackathon scale, forcing every relationship to resolve to a confirmed
target document on first upload would mean losing the connection whenever
the related item hasn't been uploaded yet (e.g. the certificate arrives
before the project it enabled). Storing `relation_type: "certification_to_skill:Python"`
keeps the signal even when the other end of the link doesn't exist yet — a
natural next iteration is a background job that re-resolves these hints
every time a new document lands.

**Original files are never rewritten or converted.** Everything ingested
stays in its original format in Storage; the database only stores what was
*learned* about it. This directly answers the brief's instruction that files
must "remain accessible in their original format."

## What would come next with more time

- Re-resolve `relationships` hints into real document-to-document edges as
  the archive grows, and visualize them as a graph, not just a list
- OCR for scanned certificates (currently falls back to filename + user notes)
- A "career path" rollup view that reads the relationship graph end-to-end
  (certification → skill → project → internship → suggested next step)
- Batch re-embedding if the embedding model version changes
