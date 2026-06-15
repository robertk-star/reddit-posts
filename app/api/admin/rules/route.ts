import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const projectId = String(form.get("project_id") || "");
    const sourceId = String(form.get("source_id") || "");
    const keywords = String(form.get("keywords") || "")
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
    const targetLocations = String(form.get("target_locations") || "")
      .split("\n")
      .map((v) => v.replace(/^r\//i, "").trim())
      .filter(Boolean);

    if (!projectId || !sourceId || keywords.length === 0 || targetLocations.length === 0) {
      return NextResponse.redirect(new URL("/admin?error=missing-rule", request.url), { status: 303 });
    }

    const { error } = await supabaseAdmin.from("monitoring_rules").insert({
      project_id: projectId,
      source_id: sourceId,
      keywords,
      target_locations: targetLocations,
      min_relevance_score: 0.45,
      active: true
    });

    if (error) throw error;
    return NextResponse.redirect(new URL("/admin?created=rule", request.url), { status: 303 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to create monitoring rule" }, { status: 500 });
  }
}
