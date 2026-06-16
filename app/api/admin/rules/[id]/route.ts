import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const form = await request.formData();
    const action = String(form.get("_action") || "update");

    if (action === "delete") {
      const { error } = await supabaseAdmin.from("monitoring_rules").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.redirect(new URL("/admin?deleted=rule", request.url), { status: 303 });
    }

    const projectId = String(form.get("project_id") || "");
    const sourceId = String(form.get("source_id") || "");
    const active = String(form.get("active") || "") === "on";
    const minRelevanceScore = Number(form.get("min_relevance_score") || 0.45);
    const keywords = String(form.get("keywords") || "")
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
    const targetLocations = String(form.get("target_locations") || "")
      .split("\n")
      .map((value) => value.replace(/^r\//i, "").trim())
      .filter(Boolean);

    if (!projectId || !sourceId || keywords.length === 0 || targetLocations.length === 0) {
      return NextResponse.redirect(new URL(`/admin/rules/${id}?error=missing`, request.url), { status: 303 });
    }

    const { error } = await supabaseAdmin
      .from("monitoring_rules")
      .update({
        project_id: projectId,
        source_id: sourceId,
        keywords,
        target_locations: targetLocations,
        min_relevance_score: minRelevanceScore,
        active
      })
      .eq("id", id);
    if (error) throw error;

    return NextResponse.redirect(new URL(`/admin/rules/${id}?saved=1`, request.url), { status: 303 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to update rule" }, { status: 500 });
  }
}
