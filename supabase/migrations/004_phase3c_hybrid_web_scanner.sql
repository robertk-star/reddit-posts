insert into sources (name, type, config, active)
values ('Hybrid Web Scanner', 'manual', '{}'::jsonb, true)
on conflict (name) do update set active = true;

create table if not exists web_scan_runs (
  id uuid primary key default gen_random_uuid(),
  search_profile_id uuid references search_profiles(id) on delete set null,
  started_at timestamptz default now(),
  completed_at timestamptz,
  sources_checked int default 0,
  urls_found int default 0,
  candidates_created int default 0,
  status text default 'running',
  error_message text
);

create index if not exists idx_web_scan_runs_profile on web_scan_runs(search_profile_id, started_at desc);
create index if not exists idx_web_scan_runs_started_at on web_scan_runs(started_at desc);

alter table web_scan_runs enable row level security;

alter table candidate_threads
  add column if not exists scanned_from text,
  add column if not exists web_scan_run_id uuid references web_scan_runs(id) on delete set null;

create index if not exists idx_candidate_threads_web_scan_run on candidate_threads(web_scan_run_id);
