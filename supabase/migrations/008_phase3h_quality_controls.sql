alter table search_profiles
  add column if not exists domain_allowlist text[] default '{}',
  add column if not exists domain_blocklist text[] default '{}',
  add column if not exists min_result_quality_score numeric default 0.2;

alter table candidate_threads
  add column if not exists result_quality_score numeric,
  add column if not exists result_quality_reason text,
  add column if not exists backfill_enriched_at timestamptz;

create index if not exists idx_candidate_threads_result_quality_score on candidate_threads(result_quality_score);
create index if not exists idx_candidate_threads_backfill_enriched_at on candidate_threads(backfill_enriched_at desc);
