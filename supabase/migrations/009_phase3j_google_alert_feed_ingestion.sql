-- Opportunity Radar Phase 3J
-- Automated Google Alerts RSS/feed ingestion.

alter table search_profiles
  add column if not exists google_alert_feed_urls text[] default '{}',
  add column if not exists google_alert_feed_enabled boolean default true,
  add column if not exists last_google_alert_scan_at timestamptz,
  add column if not exists last_google_alert_scan_status text,
  add column if not exists last_google_alert_scan_error text;

create table if not exists google_alert_feed_runs (
  id uuid primary key default gen_random_uuid(),
  search_profile_id uuid references search_profiles(id) on delete set null,
  started_at timestamptz default now(),
  completed_at timestamptz,
  feeds_checked int default 0,
  urls_found int default 0,
  candidates_created int default 0,
  status text default 'running',
  error_message text
);

create index if not exists idx_google_alert_feed_runs_profile on google_alert_feed_runs(search_profile_id, started_at desc);
create index if not exists idx_google_alert_feed_runs_started_at on google_alert_feed_runs(started_at desc);

alter table google_alert_feed_runs enable row level security;
