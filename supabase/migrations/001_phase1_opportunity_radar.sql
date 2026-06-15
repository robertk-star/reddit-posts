create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  site_url text not null,
  link_to_promote text not null,
  notes text,
  created_at timestamptz default now()
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null,
  config jsonb default '{}'::jsonb,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists monitoring_rules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  source_id uuid not null references sources(id) on delete cascade,
  keywords text[] not null,
  target_locations text[] default '{}',
  min_relevance_score numeric default 0.45,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists candidate_threads (
  id uuid primary key default gen_random_uuid(),
  monitoring_rule_id uuid not null references monitoring_rules(id) on delete cascade,
  source_id uuid references sources(id),
  project_id uuid references projects(id) on delete cascade,
  external_id text not null,
  url text not null,
  title text,
  body_excerpt text,
  full_body text,
  author text,
  subreddit text,
  posted_at timestamptz,
  platform_score int default 0,
  comment_count int default 0,
  relevance_score numeric,
  why_relevant text,
  risk_level text default 'medium',
  status text default 'new',
  discovered_at timestamptz default now(),
  last_checked_at timestamptz,
  unique (source_id, external_id)
);

create table if not exists scan_runs (
  id uuid primary key default gen_random_uuid(),
  monitoring_rule_id uuid references monitoring_rules(id) on delete cascade,
  started_at timestamptz default now(),
  completed_at timestamptz,
  threads_found int default 0,
  status text,
  error_message text
);

create table if not exists voice_profiles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  tone_description text,
  key_points text[] default '{}',
  link_phrasing_examples text[] default '{}',
  avoid_phrases text[] default '{}',
  updated_at timestamptz default now()
);

create table if not exists draft_versions (
  id uuid primary key default gen_random_uuid(),
  candidate_thread_id uuid not null references candidate_threads(id) on delete cascade,
  draft_text text not null,
  draft_type text default 'two_options',
  generated_at timestamptz default now(),
  model_used text,
  risk_notes text,
  is_selected boolean default false
);

create table if not exists posting_actions (
  id uuid primary key default gen_random_uuid(),
  candidate_thread_id uuid not null references candidate_threads(id) on delete cascade,
  draft_id uuid references draft_versions(id),
  action text not null,
  edited_text text,
  acted_at timestamptz default now(),
  notes text
);

insert into sources (name, type, config, active)
values ('Reddit', 'reddit_api', '{}'::jsonb, true)
on conflict (name) do update set active = true;
