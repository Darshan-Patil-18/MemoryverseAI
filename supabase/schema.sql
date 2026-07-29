-- MemoryVerse AI — Database schema
-- Pulled directly from the live Supabase project (list_tables, execute_sql
-- against pg_policies / pg_proc / pg_trigger / storage.buckets) — this is
-- the actual running schema, not a reconstruction from docs/code.

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- profiles — one row per user, auto-created on signup
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id),
  full_name text,
  avatar_url text,
  email text,
  created_at timestamptz default now(),
  bio text,
  github_url text,
  linkedin_url text,
  theme text default 'dark',
  auto_categorize boolean default true,
  auto_relationships boolean default true
);

alter table public.profiles enable row level security;

create policy "Users manage own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- categories — fixed taxonomy, publicly readable
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text,
  description text
);

alter table public.categories enable row level security;

create policy "Categories are public read" on public.categories
  for select using (true);

insert into public.categories (name) values
  ('Projects'), ('Skills'), ('Certifications'),
  ('Internships'), ('Achievements'), ('Academics')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- documents — every ingested item
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  title text not null,
  original_filename text,
  file_url text,
  file_type text,
  source_type text default 'upload', -- 'upload' | 'url' | 'text'
  raw_text text,
  ai_summary text,
  category_id uuid references public.categories(id),
  tags text[] default '{}',
  event_year int,
  embedding vector(384),
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.documents enable row level security;

create policy "Users manage own documents" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists documents_embedding_idx on public.documents
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ---------------------------------------------------------------------------
-- relationships — directed links between two documents belonging to the same user
-- ---------------------------------------------------------------------------
create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  source_document_id uuid references public.documents(id),
  target_document_id uuid references public.documents(id),
  relation_type text not null, -- currently 'ai_inferred'
  confidence double precision default 0.5,
  label text,
  created_at timestamptz default now()
);

alter table public.relationships enable row level security;

create policy "Users manage own relationships" on public.relationships
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- timeline_events — year-indexed events for the Timeline view
-- ---------------------------------------------------------------------------
create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  document_id uuid references public.documents(id),
  title text not null,
  description text,
  event_year int not null,
  event_date date,
  created_at timestamptz default now()
);

alter table public.timeline_events enable row level security;

create policy "Users manage own timeline" on public.timeline_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- storage — private, per-user bucket for original files
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "Users manage own storage files"
  on storage.objects for all
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

-- ---------------------------------------------------------------------------
-- match_documents — semantic search RPC used by Search.jsx / the chatbot
-- ---------------------------------------------------------------------------
create or replace function public.match_documents(
  query_embedding vector,
  match_user_id uuid,
  match_count integer default 8
)
returns table (
  id uuid,
  title text,
  ai_summary text,
  category_id uuid,
  file_url text,
  similarity double precision
)
language sql
stable
set search_path to 'public'
as $$
  select d.id, d.title, d.ai_summary, d.category_id, d.file_url,
         1 - (d.embedding <=> query_embedding) as similarity
  from public.documents d
  where d.user_id = match_user_id and d.embedding is not null
  order by d.embedding <=> query_embedding
  limit match_count;
$$;