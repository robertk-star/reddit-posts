-- Opportunity Radar Phase 1
-- Reddit-only opportunity finder + AI draft review dashboard

create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  site_url text not null,
  link_to_promote text not null,
  notes text,
  created_at timestamptz default now()
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

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('reddit_api', 'rss', 'manual')),
  config jsonb default '{}'::jsonb,
  active boolean default true,
  created_at timestamptz default now(),
  unique(name)
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

create table if not exists scan_runs (
  id uuid primary key default gen_random_uuid(),
  monitoring_rule_id uuid references monitoring_rules(id) on delete cascade,
  started_at timestamptz default now(),
  completed_at timestamptz,
  threads_found int default 0,
  status text check (status in ('running', 'success', 'error', 'rate_limited')),
  error_message text
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
  risk_level text default 'medium' check (risk_level in ('low', 'medium', 'high')),
  status text default 'new' check (status in ('new', 'drafted', 'posted', 'skipped', 'snoozed')),
  discovered_at timestamptz default now(),
  last_checked_at timestamptz,
  unique (source_id, external_id)
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
  action text not null check (action in ('posted', 'skipped', 'snoozed')),
  edited_text text,
  acted_at timestamptz default now(),
  notes text
);

create index if not exists idx_monitoring_rules_active on monitoring_rules(active);
create index if not exists idx_candidate_threads_status on candidate_threads(status);
create index if not exists idx_candidate_threads_project_status on candidate_threads(project_id, status);
create index if not exists idx_candidate_threads_discovered_at on candidate_threads(discovered_at desc);
create index if not exists idx_scan_runs_started_at on scan_runs(started_at desc);
create index if not exists idx_draft_versions_candidate on draft_versions(candidate_thread_id, generated_at desc);

alter table projects enable row level security;
alter table voice_profiles enable row level security;
alter table sources enable row level security;
alter table monitoring_rules enable row level security;
alter table scan_runs enable row level security;
alter table candidate_threads enable row level security;
alter table draft_versions enable row level security;
alter table posting_actions enable row level security;

-- This app uses a Supabase elevated server key from server-side Next.js routes.
-- No browser-side Supabase client is used in Phase 1, so no public RLS policies are needed.

insert into sources (name, type, config, active)
values ('Reddit', 'reddit_api', '{"phase":"1","posting":"manual_only"}'::jsonb, true)
on conflict (name) do update set active = true, type = excluded.type, config = excluded.config;

-- DBS starter project and rule. Delete or edit these in Supabase if you want a blank install.
do $$
declare
  v_project_id uuid;
  v_source_id uuid;
begin
  select id into v_source_id from sources where name = 'Reddit' limit 1;

  select id into v_project_id from projects where name = 'Disability Benefits Screening' limit 1;

  if v_project_id is null then
    insert into projects (name, site_url, link_to_promote, notes)
    values (
      'Disability Benefits Screening',
      'https://www.disabilitybenefitsscreening.com',
      'https://www.disabilitybenefitsscreening.com/resources/what-to-gather-before-you-apply?utm_source=reddit&utm_medium=organic_reply&utm_campaign=dbs_helpful_answers',
      'Starter project for testing Reddit opportunity monitoring.'
    )
    returning id into v_project_id;
  end if;

  if not exists (select 1 from voice_profiles where project_id = v_project_id) then
    insert into voice_profiles (project_id, tone_description, key_points, link_phrasing_examples, avoid_phrases)
    values (
      v_project_id,
      'plain, practical, helpful, neutral, non-salesy, 8th to 10th grade reading level',
      array[
        'Disability Benefits Screening is an informational preparation tool, not SSA and not a law firm.',
        'Encourage people to gather medical records, work history, treatment details, and functional limitation notes.',
        'Use the phrase Readiness Screening, not qualify or approval odds.',
        'Suggest official SSA resources or a representative for personal case advice.'
      ],
      array[
        'This checklist may help you organize what to gather before applying.',
        'A prep checklist can make it easier to see what information is missing.'
      ],
      array[
        'guaranteed approval',
        'qualify instantly',
        'approval odds',
        'attorney referral'
      ]
    );
  end if;

  if not exists (
    select 1 from monitoring_rules where project_id = v_project_id and source_id = v_source_id
  ) then
    insert into monitoring_rules (project_id, source_id, keywords, target_locations, min_relevance_score, active)
    values (
      v_project_id,
      v_source_id,
      array[
        'apply for disability',
        'SSDI medical records',
        'disability application checklist',
        'SSDI denied',
        'how to prepare for disability',
        'work history disability'
      ],
      array['SocialSecurity', 'disability', 'SSDI'],
      0.45,
      true
    );
  end if;
end $$;
