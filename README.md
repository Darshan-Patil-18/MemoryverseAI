# MemoryVerse AI

## Demo flow

1. Upload a certificate, internship letter, or project report.
2. Review the AI-generated category, year, summary, skills, and proposed connections —
   if the document has no date in it anywhere, MemoryVerse flags the year for you to
   confirm instead of silently guessing one.
3. Keep only the evidence-backed relationships you want to save.
4. Search naturally, such as "my AI projects" or "latest resume" (typo-tolerant —
   "achivements" still finds your Achievements), and open the original file.
5. Use the chatbot for a cited answer and show the journey timeline by year.

An AI-powered digital identity system for students. Upload certificates, resumes,
project reports, internship letters, and portfolio links — MemoryVerse reads them,
files them into the right category, connects them to your other work, plots them
on a timeline, and lets you retrieve any of it with a plain-language search.

Built for the MemoryVerse AI '26 Digital Identity Challenge.

## Stack

- **Frontend:** React + Vite + Tailwind CSS, React Router
- **Backend / DB:** Supabase (Postgres, Auth, Storage, Row Level Security, `pgvector`)
- **AI categorization & relationship extraction:** OpenRouter (`openrouter/free`)
- **Embeddings / semantic search:** in-browser via `@xenova/transformers` (`all-MiniLM-L6-v2`, 384-dim) + Postgres `pgvector`
- **Text extraction:** `pdfjs-dist` for PDFs (with OCR fallback via `tesseract.js` for scanned pages/images), native for plain text

No paid API is required to run this end to end.

## How the pipeline works

1. **Ingest** — user uploads a file, pastes a URL, or writes a note (`src/pages/Upload.jsx`)
2. **Extract** — text is pulled from the file client-side, and sanitized of control
   characters PDF text layers occasionally introduce (`src/lib/extractText.js`)
3. **Categorize** — the raw text, plus today's real date, is sent to OpenRouter,
   which returns strict JSON: title, category (chosen via an explicit priority
   order so overlapping documents land consistently — e.g. internship evidence
   always outranks "looks like a project"), summary, tags, event year, and
   relationship hints (`src/lib/ai.js` → `categorizeDocument`). If the document
   has no year anywhere in its text, the year is flagged `unconfirmed` rather
   than trusting the model's guess, and the review screen asks the user to
   confirm it.
4. **Embed** — the title + summary + tags are embedded locally in the browser
   (no API call, no cost) and stored as a `vector(384)` column
5. **Connect** — two places compute relationships, deliberately using the same
   two core signals so they never contradict each other:
   - `src/lib/relationships.js`, at upload-review time: shared tags + embedding
     cosine similarity + the LLM's own relation hints (e.g. `certification_to_skill`),
     shown as suggestions the user approves before they're written to the
     `relationships` table.
   - `src/lib/tagGraph.js`, for the Connections graph / Dashboard / Profile stats:
     recomputed live from saved documents using shared tags + embedding
     similarity. (Relation hints aren't persisted as a document column, so
     they only influence the initial suggestion, not the graph after reload.)
6. **Retrieve** — `src/pages/Search.jsx` embeds the user's natural-language query
   and calls the `match_documents` Postgres function for cosine-similarity search
   over `pgvector`; results are then re-ranked in `rankArchiveDocuments`
   (`src/lib/ai.js`) combining keyword match, category intent, and similarity
   score, with light typo tolerance on category words, returning the original files.

## Local setup

```bash
npm install
cp .env.example .env   # fill in your own Supabase + OpenRouter keys
npm run dev
```

**Never commit your real `.env`.** It's already in `.gitignore`.

## Database

The full schema — tables, RLS policies, storage bucket policy, and the
`match_documents()` function — is in [`supabase/schema.sql`](./supabase/schema.sql).
See `ARCHITECTURE.md` for the diagram and design rationale.

## Enabling Google sign-in

Google OAuth needs to be turned on in the Supabase dashboard (this can't be
done via API):

1. Go to **Authentication → Providers → Google** in your Supabase project
2. Toggle it on, paste in your **Client ID** and **Client Secret** from Google Cloud Console
3. In Google Cloud Console, add this as an **Authorized redirect URI**:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. In **Authentication → URL Configuration**, set your **Site URL** to your
   deployed URL (or `http://localhost:5173` while developing) and add
   `/auth/callback` to the allowed redirect URLs

Email/password sign-up works out of the box — Supabase sends the confirmation
email automatically; the link routes back to `/auth/callback` in this app.

## Deploying

Any static host works (Vercel, Netlify, Cloudflare Pages):

```bash
npm run build
```

Deploy the `dist/` folder, and set the three env vars from `.env.example` in
your host's dashboard. After deploying, update the Supabase **Site URL** and
**Google redirect URI** to your live domain.

## Project structure

```
src/
  pages/          Landing, SignUp, SignIn, CheckEmail, AuthCallback,
                   Dashboard, Upload, Timeline, Search, Connections, Profile
  components/      AppShell, AuthLayout, DocumentCard, ProtectedRoute, icons,
                   EditDocumentModal, FloatingChat
  lib/
    supabase.js     Supabase client
    ai.js            OpenRouter categorization + in-browser embeddings + search ranking
    extractText.js   PDF/text/image extraction (OCR fallback via tesseract.js)
    relationships.js Upload-time relationship suggestions (tags + semantic + LLM hints)
    tagGraph.js      Live Connections-graph edges (tags + semantic)
    AuthContext.jsx  Session state
supabase/
  schema.sql        Full Postgres schema, RLS policies, and match_documents()
```