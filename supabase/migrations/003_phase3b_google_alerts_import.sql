-- Opportunity Radar Phase 3B
-- Google Alerts import: paste Google Alert emails/results, extract URLs, dedupe, and save opportunities.

alter table candidate_threads
  alter column monitoring_rule_id drop not null;

insert into sources (name, type, config, active)
values ('Google Alerts', 'manual', '{"phase":"3B","import":"manual_paste"}'::jsonb, true)
on conflict (name) do update set active = true, type = excluded.type, config = excluded.config;

create table if not exists google_alert_imports (
  id uuid primary key default gen_random_uuid(),
  search_profile_id uuid references search_profiles(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  raw_content text not null,
  notes text,
  urls_found int default 0,
  candidates_created int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_google_alert_imports_profile on google_alert_imports(search_profile_id, created_at desc);
create index if not exists idx_google_alert_imports_created_at on google_alert_imports(created_at desc);

alter table google_alert_imports enable row level security;

alter table candidate_threads
  add column if not exists imported_from text,
  add column if not exists import_batch_id uuid references google_alert_imports(id) on delete set null;

create index if not exists idx_candidate_threads_import_batch on candidate_threads(import_batch_id);
