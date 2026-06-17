import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function lines(value: FormDataEntryValue | null) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const projectId = String(form.get("project_id") || "") || null;
    const name = String(form.get("name") || "").trim();
    const description = String(form.get("description") || "").trim();
    const intent = String(form.get("intent") || "").trim();
    const linkToPromote = String(form.get("link_to_promote") || "").trim();
    const voiceInstructions = String(form.get("voice_instructions") || "").trim();
    const active = String(form.get("active") || "on") === "on";
    const webScanEnabled = String(form.get("web_scan_enabled") || "on") === "on";
    const webScanFrequency = String(form.get("web_scan_frequency") || "daily").trim();
    const maxSourcesPerScan = Math.max(1, Number(form.get("max_sources_per_scan") || 10));

    if (!name) {
      return NextResponse.redirect(new URL("/admin/search-profiles?error=missing-name", request.url), { status: 303 });
    }

    const { error } = await supabaseAdmin.from("search_profiles").insert({
      project_id: projectId,
      name,
      description,
      intent,
      link_to_promote: linkToPromote,
      voice_instructions: voiceInstructions,
      keywords: lines(form.get("keywords")),
      excluded_terms: lines(form.get("excluded_terms")),
      source_domains: lines(form.get("source_domains")),
      google_alert_queries: lines(form.get("google_alert_queries")),
      active,
      web_scan_enabled: webScanEnabled,
      web_scan_frequency: webScanFrequency,
      max_sources_per_scan: maxSourcesPerScan
    });

    if (error) throw error;
    return NextResponse.redirect(new URL("/admin/search-profiles?created=1", request.url), { status: 303 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to create search profile" }, { status: 500 });
  }
}