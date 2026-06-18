-- Opportunity Radar Phase 3J safety update
-- Use Google Alert feeds as the default intake method.
-- Direct web scanning can still be re-enabled per Search Profile when a source allows fetching.

update search_profiles
set web_scan_enabled = false
where web_scan_enabled is distinct from false;
