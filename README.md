# MemoryVerse AI

An AI-powered digital identity system for students. Upload certificates, resumes,
project reports, internship letters, and portfolio links — MemoryVerse reads them,
files them into the right category, connects them to your other work, plots them
on a timeline, and lets you retrieve any of it with a plain-language search.

Built for the MemoryVerse AI '26 Digital Identity Challenge.

## Stack

- **Frontend:** React + Vite + Tailwind CSS, React Router
- **Backend / DB:** Supabase (Postgres, Auth, Storage, Row Level Security)
- **AI categorization & relationship extraction:** OpenRouter (free model: "google/gemma-3-27b-it:free")
- **Embeddings / semantic search:** in-browser via `@xenova/transformers` (`all-MiniLM-L6-v2`, 384-dim) + Postgres `pgvector`
- **Text extraction:** `pdfjs-dist` for PDFs, native for plain text

No paid API is required to run this end to end.

## How the pipeline works

1. **Ingest** — user uploads a file, pastes a URL, or writes a note (`src/pages/Upload.jsx`)
2. **Extract** — text is pulled from the file client-side (`src/lib/extractText.js`)
3. **Categorize** — the raw text is sent to OpenRouter, which returns strict JSON:
   title, category (one of the 6 fixed categories), summary, tags, event year,
   and likely relationships (`src/lib/ai.js` → `categorizeDocument`)
4. **Embed** — the title + summary + tags are embedded locally in the browser
   (no API call, no cost) and stored as a `vector(384)` column
5. **Connect** — relationship hints (certification → skill → project → internship)
   are stored in the `relationships` table
6. **Retrieve** — `src/pages/Search.jsx` embeds the user's natural-language query
   and calls the `match_documents` Postgres function for cosine-similarity search
   over `pgvector`, returning the original files

## Local setup

```bash
npm install
cp .env.example .env   # fill in your own Supabase + OpenRouter keys
npm run dev
```

**Never commit your real `.env`.** It's already in `.gitignore`.

## Database

The schema lives in Supabase (tables: `profiles`, `categories`, `documents`,
`relationships`, `timeline_events`), plus a `pgvector`-powered `match_documents()`
function and a private `documents` storage bucket with per-user RLS policies.
See `ARCHITECTURE.md` for the full schema and diagram.

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
                   Dashboard, Upload, Timeline, Search
  components/      AppShell, AuthLayout, DocumentCard, ProtectedRoute, icons
  lib/
    supabase.js    Supabase client
    ai.js           OpenRouter categorization + in-browser embeddings
    extractText.js  PDF/text extraction
    AuthContext.jsx Session state
```
