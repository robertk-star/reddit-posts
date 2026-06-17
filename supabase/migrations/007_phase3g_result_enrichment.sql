-- Opportunity Radar Phase 3G
-- Better result titles, source host, meta descriptions, and page previews.

alter table candidate_threads
  add column if not exists source_host text,
  add column if not exists page_title text,
  add column if not exists page_description text,
  add column if not exists page_preview text,
  add column if not exists page_fetched_at timestamptz;

create index if not exists idx_candidate_threads_source_host on candidate_threads(source_host);
create index if not exists idx_candidate_threads_page_fetched_at on candidate_threads(page_fetched_at desc);
