-- Opportunity Radar Phase 3A
-- Search Profiles let you keep separate searches for different businesses/topics.
-- Example: Disability Benefits, Background Screening, CashOfferChat, Lead Leak Report.

create table if not exists search_profiles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  name text not null,
  description text,
  intent text,
  link_to_promote text,
  voice_instructions text,
  keywords text[] default '{}',
  excluded_terms text[] default '{}',
  source_domains text[] default '{}',
  google_alert_queries text[] default '{}',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_search_profiles_active on search_profiles(active);
create index if not exists idx_search_profiles_project on search_profiles(project_id);

alter table search_profiles enable row level security;

alter table monitoring_rules
  add column if not exists search_profile_id uuid references search_profiles(id) on delete set null;

alter table candidate_threads
  add column if not exists search_profile_id uuid references search_profiles(id) on delete set null;

create index if not exists idx_monitoring_rules_search_profile on monitoring_rules(search_profile_id);
create index if not exists idx_candidate_threads_search_profile_status on candidate_threads(search_profile_id, status);

-- Seed Disability Benefits profile from the existing starter project.
do $$
declare
  v_project_id uuid;
begin
  select id into v_project_id from projects where name = 'Disability Benefits Screening' limit 1;

  if not exists (select 1 from search_profiles where name = 'Disability Benefits') then
    insert into search_profiles (
      project_id,
      name,
      description,
      intent,
      link_to_promote,
      voice_instructions,
      keywords,
      excluded_terms,
      source_domains,
      google_alert_queries,
      active
    ) values (
      v_project_id,
      'Disability Benefits',
      'Find public questions about SSDI, SSI, disability applications, medical records, denials, and preparation.',
      'Find people asking about SSDI, SSI, disability application preparation, medical records, denials, and missing documentation.',
      'https://www.disabilitybenefitsscreening.com/resources/what-to-gather-before-you-apply?utm_source=web&utm_medium=organic_reply&utm_campaign=dbs_helpful_answers',
      'Helpful, informational, not SSA, not a law firm, no promises, no qualify or approval-odds wording.',
      array[
        'SSDI denied',
        'apply for disability',
        'SSI application help',
        'disability application checklist',
        'SSDI medical records',
        'how to prepare for disability',
        'Social Security disability records'
      ],
      array[
        'lawyer advertising',
        'guaranteed approval',
        'instant approval'
      ],
      array[
        'reddit.com/r/SocialSecurity',
        'reddit.com/r/disability',
        'reddit.com/r/SSDI',
        'quora.com',
        'ssdfacts.com/forum',
        'agingcare.com',
        'city-data.com/forum',
        'forum.freeadvice.com'
      ],
      array[
        '"SSDI denied"',
        '"apply for disability" "medical records"',
        '"disability application checklist"',
        '"SSI application help"'
      ],
      true
    );
  end if;
end $$;

-- Seed Background Screening profile and create SaffHire project if needed.
do $$
declare
  v_project_id uuid;
begin
  select id into v_project_id from projects where name = 'SaffHire' limit 1;

  if v_project_id is null then
    insert into projects (name, site_url, link_to_promote, notes)
    values (
      'SaffHire',
      'https://www.saffhire.com',
      'https://www.saffhire.com?utm_source=web&utm_medium=organic_reply&utm_campaign=background_screening_helpful_answers',
      'Starter project for background screening search profile.'
    )
    returning id into v_project_id;
  end if;

  if not exists (select 1 from search_profiles where name = 'Background Screening') then
    insert into search_profiles (
      project_id,
      name,
      description,
      intent,
      link_to_promote,
      voice_instructions,
      keywords,
      excluded_terms,
      source_domains,
      google_alert_queries,
      active
    ) values (
      v_project_id,
      'Background Screening',
      'Find employers, HR teams, and business owners asking about background checks, screening delays, hiring risk, and compliance questions.',
      'Find employers and HR teams asking about pre-employment background checks, county criminal searches, FCRA process questions, screening delays, and hiring risk.',
      'https://www.saffhire.com?utm_source=web&utm_medium=organic_reply&utm_campaign=background_screening_helpful_answers',
      'Professional, practical, employer-focused, not legal advice, no scare tactics, no overpromising.',
      array[
        'background check taking too long',
        'employment background screening',
        'pre employment background check',
        'FCRA background check',
        'county criminal search',
        'background check for hiring',
        'candidate background check'
      ],
      array[
        'free background check',
        'personal dating background check',
        'tenant screening only'
      ],
      array[
        'reddit.com',
        'quora.com',
        'shrm.org',
        'hr.com',
        'forum.freeadvice.com',
        'avvo.com'
      ],
      array[
        '"background check taking too long" employer',
        '"pre employment background check" "FCRA"',
        '"county criminal search" "background check"',
        '"candidate background check" hiring'
      ],
      true
    );
  end if;
end $$;
