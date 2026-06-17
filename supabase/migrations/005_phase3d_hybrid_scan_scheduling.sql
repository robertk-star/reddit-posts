-- Opportunity Radar Phase 3D
-- Hybrid scan scheduling controls and URL dedupe support.

alter table search_profiles
  add column if not exists web_scan_enabled boolean default true,
  add column if not exists web_scan_frequency text default 'daily',
  add column if not exists max_sources_per_scan int default 10,
  add column if not exists last_web_scan_at timestamptz,
  add column if not exists last_web_scan_status text,
  add column if not exists last_web_scan_error text;

alter table candidate_threads
  add column if not exists url_hash text;

create index if not exists idx_search_profiles_web_scan_enabled on search_profiles(web_scan_enabled, active);
create index if not exists idx_candidate_threads_url_hash on candidate_threads(url_hash);

update search_profiles
set web_scan_enabled = true
where web_scan_enabled is null;

update search_profiles
set max_sources_per_scan = 10
where max_sources_per_scan is null;
