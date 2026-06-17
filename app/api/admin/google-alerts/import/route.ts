import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { extractGoogleAlertUrls } from "@/lib/googleAlerts";
import { scoreThread } from "@/lib/relevance";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const searchProfileId = String(form.get("search_profile_id") || "");
    const rawContent = String(form.get("raw_content") || "").trim();
    const notes = String(form.get("notes") || "").trim();

    if (!searchProfileId || !rawContent) {
      return NextResponse.redirect(new URL("/admin/google-alerts?error=missing", request.url), { status: 303 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin.from("search_profiles").select("*").eq("id", searchProfileId).single();
    if (profileError) throw profileError;

    const { data: source, error: sourceError } = await supabaseAdmin.from("sources").select("id").eq("name", "Google Alerts").single();
    if (sourceError) throw sourceError;

    const extracted = extractGoogleAlertUrls(rawContent);
    const { data: importRow, error: importError } = await supabaseAdmin
      .from("google_alert_imports")
      .insert({ search_profile_id: searchProfileId, project_id: profile.project_id, raw_content: rawContent, notes, urls_found: extracted.length, candidates_created: 0 })
      .select("id")
      .single();
    if (importError) throw importError;

    let savedCount = 0;
    const keywords: string[] = profile.keywords || [];
    const excludedTerms: string[] = profile.excluded_terms || [];

    for (const item of extracted) {
      const testText = `${item.title} ${item.url} ${profile.intent || ""}`.toLowerCase();
      if (excludedTerms.some((term) => term && testText.includes(term.toLowerCase()))) continue;
      const relevance = scoreThread({ title: item.title, body: `${item.url}\n${profile.intent || ""}`, keywords });

      const { error: upsertError } = await supabaseAdmin.from("candidate_threads").upsert({
        monitoring_rule_id: null,
        source_id: source.id,
        project_id: profile.project_id,
        search_profile_id: searchProfileId,
        external_id: item.externalId,
        url: item.url,
        title: item.title,
        body_excerpt: `Imported alert link for ${profile.name}. Source: ${item.host}`,
        full_body: rawContent.slice(0, 4000),
        author: "Google Alerts",
        relevance_score: relevance.score,
        why_relevant: `Imported alert result. ${relevance.why}`,
        risk_level: relevance.riskLevel,
        status: "new",
        imported_from: "google_alerts",
        import_batch_id: importRow.id,
        last_checked_at: new Date().toISOString()
      }, { onConflict: "source_id,external_id", ignoreDuplicates: false });
      if (upsertError) throw upsertError;
      savedCount += 1;
    }

    await supabaseAdmin.from("google_alert_imports").update({ candidates_created: savedCount }).eq("id", importRow.id);
    return NextResponse.redirect(new URL(`/admin/google-alerts?imported=${savedCount}&found=${extracted.length}`, request.url), { status: 303 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to import alert content" }, { status: 500 });
  }
}
