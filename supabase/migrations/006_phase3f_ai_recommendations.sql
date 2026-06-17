-- Opportunity Radar Phase 3F
-- AI Recommendation Layer for opportunities.

alter table candidate_threads
  add column if not exists ai_recommendation text,
  add column if not exists ai_recommendation_reason text,
  add column if not exists ai_reply_angle text,
  add column if not exists ai_risk_warning text,
  add column if not exists ai_link_guidance text,
  add column if not exists ai_recommendation_model text,
  add column if not exists ai_recommendation_at timestamptz;

create index if not exists idx_candidate_threads_ai_recommendation on candidate_threads(ai_recommendation);
create index if not exists idx_candidate_threads_ai_recommendation_at on candidate_threads(ai_recommendation_at desc);
