import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { optionalEnv } from "@/lib/env";
import { fetchGoogleAlertFeed } from "@/lib/googleAlertFeeds";
import { scanSourceUrl } from "@/lib/hybridWeb";
import { scoreThread } from "@/lib/relevance";
import { scoreResultQuality } from "@/lib/resultQuality";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function authorized(request: Request) {
  const url = new URL(request.url);
  const secret = optionalEnv("CRON_SECRET");
  const auth = request.headers.get("authorization") || "";
  if (secret && auth === `Bearer ${secret}`) return true;
  if (secret && request.headers.get("x-cron-secret") === secret) return true;
  if (secret && url.searchParams.get("secret") === secret) return true;
  return isAdminRequest();
}

async function runHybridScan(profileId?: string | null) {
  const { data: webSource } = await supabaseAdmin.from("sources").select("id").eq("name", "Hybrid Web Scanner").single();
  const { data: alertSource } = await supabaseAdmin.from("sources").select("id").eq("name", "Google Alerts").single();
  let profileQuery = supabaseAdmin.from("search_profiles").select("*").eq("active", true);
  if (profileId) profileQuery = profileQuery.eq("id", profileId);
  const { data: profiles } = await profileQuery;
  let totalFound = 0;
  let totalCreated = 0;

  for (const profile of profiles || []) {
    const minQuality = Number(profile.min_result_quality_score ?? 0.2);
    const sourcesToScan = profile.web_scan_enabled === false ? [] : (profile.source_domains || []).slice(0, Math.max(1, Number(profile.max_sources_per_scan || 10)));
    const feedUrls = profile.google_alert_feed_enabled === false ? [] : (profile.google_alert_feed_urls || []);
    const { data: run } = await supabaseAdmin.from("web_scan_runs").insert({ search_profile_id: profile.id, status: "running" }).select("id").single();
    let checked = 0;
    let found = 0;
    let created = 0;
    let skipped = 0;
    let errorMessage = "";

    for (const feedUrl of feedUrls) {
      try {
        checked += 1;
        const items = await fetchGoogleAlertFeed(feedUrl);
        found += items.length;
        for (const item of items) {
          const existing = await supabaseAdmin.from("candidate_threads").select("id").eq("url_hash", item.externalId).maybeSingle();
          if (existing.data?.id) { skipped += 1; continue; }
          const quality = scoreResultQuality({ url: item.url, title: item.title, description: item.description, preview: item.description, keywords: profile.keywords || [], excludedTerms: profile.excluded_terms || [], allowlist: profile.domain_allowlist || [], blocklist: profile.domain_blocklist || [] });
          if (quality.blocked || quality.score < minQuality) { skipped += 1; continue; }
          const relevance = scoreThread({ title: item.title, body: item.description || item.url, keywords: profile.keywords || [] });
          const saved = await supabaseAdmin.from("candidate_threads").insert({ monitoring_rule_id: null, source_id: alertSource?.id, project_id: profile.project_id, search_profile_id: profile.id, external_id: item.externalId, url_hash: item.externalId, url: item.url, title: item.title, body_excerpt: item.description || `Google Alert result from ${item.host}`, full_body: `${item.url}\n${item.title}\n${item.description || ""}`, author: "Google Alerts Feed", posted_at: item.publishedAt ? new Date(item.publishedAt).toISOString() : null, relevance_score: relevance.score, why_relevant: `Google Alerts feed match. ${relevance.why}`, risk_level: relevance.riskLevel, status: "new", imported_from: "google_alert_feed", source_host: item.host, page_title: item.title, page_description: item.description, page_preview: item.description, page_fetched_at: new Date().toISOString(), result_quality_score: quality.score, result_quality_reason: quality.reason, web_scan_run_id: run?.id, last_checked_at: new Date().toISOString() });
          if (saved.error) skipped += 1;
          else created += 1;
        }
      } catch (error: any) {
        errorMessage += `${feedUrl}: ${error.message || String(error)}\n`;
      }
    }

    for (const sourceValue of sourcesToScan) {
      try {
        checked += 1;
        const links = await scanSourceUrl(sourceValue, profile.keywords || [], profile.excluded_terms || []);
        found += links.length;
        for (const link of links) {
          const existing = await supabaseAdmin.from("candidate_threads").select("id").eq("url_hash", link.externalId).maybeSingle();
          if (existing.data?.id) { skipped += 1; continue; }
          const quality = scoreResultQuality({ url: link.url, title: link.title, description: link.pageDescription, preview: link.pagePreview, keywords: profile.keywords || [], excludedTerms: profile.excluded_terms || [], allowlist: profile.domain_allowlist || [], blocklist: profile.domain_blocklist || [] });
          if (quality.blocked || quality.score < minQuality) { skipped += 1; continue; }
          const relevance = scoreThread({ title: link.title, body: link.pagePreview || link.pageDescription || link.url, keywords: profile.keywords || [] });
          const saved = await supabaseAdmin.from("candidate_threads").insert({ monitoring_rule_id: null, source_id: webSource?.id, project_id: profile.project_id, search_profile_id: profile.id, external_id: link.externalId, url_hash: link.externalId, url: link.url, title: link.title, body_excerpt: link.pageDescription || link.pagePreview || `Found by Hybrid Web Scanner from ${link.sourceUrl}`, full_body: `${link.url}\n${link.pageTitle}\n${link.pageDescription}\n${link.pagePreview}\n${profile.intent || ""}`, author: "Hybrid Web Scanner", relevance_score: relevance.score, why_relevant: `Hybrid scan match. ${relevance.why}`, risk_level: relevance.riskLevel, status: "new", imported_from: "hybrid_web", scanned_from: link.sourceUrl, source_host: link.host, page_title: link.pageTitle, page_description: link.pageDescription, page_preview: link.pagePreview, page_fetched_at: link.pageFetchedAt, result_quality_score: quality.score, result_quality_reason: quality.reason, web_scan_run_id: run?.id, last_checked_at: new Date().toISOString() });
          if (saved.error) skipped += 1;
          else created += 1;
        }
      } catch (error: any) {
        errorMessage += `${sourceValue}: ${error.message || String(error)}\n`;
      }
    }

    const status = errorMessage ? "error" : "success";
    if (run?.id) await supabaseAdmin.from("web_scan_runs").update({ completed_at: new Date().toISOString(), sources_checked: checked, urls_found: found, candidates_created: created, status, error_message: errorMessage || null }).eq("id", run.id);
    await supabaseAdmin.from("search_profiles").update({ last_web_scan_at: new Date().toISOString(), last_web_scan_status: `${status}: ${created} saved, ${skipped} skipped`, last_web_scan_error: errorMessage || null, last_google_alert_scan_at: new Date().toISOString(), last_google_alert_scan_status: `${status}: ${created} saved`, last_google_alert_scan_error: errorMessage || null }).eq("id", profile.id);
    totalFound += found;
    totalCreated += created;
  }
  return { totalFound, totalCreated };
}

export async function GET(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await runHybridScan(new URL(request.url).searchParams.get("profile")));
}

export async function POST(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const result = await runHybridScan(form ? String(form.get("search_profile_id") || "") : null);
  return NextResponse.redirect(new URL(`/admin/hybrid-scanner?created=${result.totalCreated}&found=${result.totalFound}`, request.url), { status: 303 });
}
