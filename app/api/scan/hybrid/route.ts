import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { optionalEnv } from "@/lib/env";
import { scanSourceUrl } from "@/lib/hybridWeb";
import { scoreThread } from "@/lib/relevance";
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
  const { data: source } = await supabaseAdmin.from("sources").select("id").eq("name", "Hybrid Web Scanner").single();
  let profileQuery = supabaseAdmin.from("search_profiles").select("*").eq("active", true);
  if (profileId) profileQuery = profileQuery.eq("id", profileId);
  const { data: profiles } = await profileQuery;

  let totalFound = 0;
  let totalCreated = 0;

  for (const profile of profiles || []) {
    const { data: run } = await supabaseAdmin.from("web_scan_runs").insert({ search_profile_id: profile.id, status: "running" }).select("id").single();
    let checked = 0;
    let found = 0;
    let created = 0;
    let errorMessage = "";

    for (const sourceValue of profile.source_domains || []) {
      try {
        checked += 1;
        const links = await scanSourceUrl(sourceValue, profile.keywords || [], profile.excluded_terms || []);
        found += links.length;
        for (const link of links) {
          const { data: existing } = await supabaseAdmin.from("candidate_threads").select("id").eq("url", link.url).maybeSingle();
          if (existing?.id) continue;
          const relevance = scoreThread({ title: link.title, body: link.url, keywords: profile.keywords || [] });
          const { error } = await supabaseAdmin.from("candidate_threads").insert({
            monitoring_rule_id: null,
            source_id: source?.id,
            project_id: profile.project_id,
            search_profile_id: profile.id,
            external_id: link.externalId,
            url: link.url,
            title: link.title,
            body_excerpt: `Found by Hybrid Web Scanner from ${link.sourceUrl}`,
            full_body: `${link.url}\n${profile.intent || ""}`,
            author: "Hybrid Web Scanner",
            relevance_score: relevance.score,
            why_relevant: `Hybrid scan match. ${relevance.why}`,
            risk_level: relevance.riskLevel,
            status: "new",
            imported_from: "hybrid_web",
            scanned_from: link.sourceUrl,
            web_scan_run_id: run?.id,
            last_checked_at: new Date().toISOString()
          });
          if (!error) created += 1;
        }
      } catch (error: any) {
        errorMessage += `${sourceValue}: ${error.message || String(error)}\n`;
      }
    }

    if (run?.id) {
      await supabaseAdmin.from("web_scan_runs").update({
        completed_at: new Date().toISOString(),
        sources_checked: checked,
        urls_found: found,
        candidates_created: created,
        status: errorMessage ? "error" : "success",
        error_message: errorMessage || null
      }).eq("id", run.id);
    }
    totalFound += found;
    totalCreated += created;
  }

  return { totalFound, totalCreated };
}

export async function GET(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  return NextResponse.json(await runHybridScan(url.searchParams.get("profile")));
}

export async function POST(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const profileId = form ? String(form.get("search_profile_id") || "") : "";
  const result = await runHybridScan(profileId || null);
  return NextResponse.redirect(new URL(`/admin/hybrid-scanner?created=${result.totalCreated}&found=${result.totalFound}`, request.url), { status: 303 });
}
