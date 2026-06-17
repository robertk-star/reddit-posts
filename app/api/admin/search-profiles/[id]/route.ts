import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = { params: Promise<{ id: string }> };

function lines(value: FormDataEntryValue | null) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function POST(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const form = await request.formData();
    const action = String(form.get("_action") || "update");

    if (action === "delete") {
      const { error } = await supabaseAdmin.from("search_profiles").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.redirect(new URL("/admin/search-profiles?deleted=1", request.url), { status: 303 });
    }

    const projectId = String(form.get("project_id") || "") || null;
    const name = String(form.get("name") || "").trim();
    const description = String(form.get("description") || "").trim();
    const intent = String(form.get("intent") || "").trim();
    const linkToPromote = String(form.get("link_to_promote") || "").trim();
    const voiceInstructions = String(form.get("voice_instructions") || "").trim();
    const active = String(form.get("active") || "") === "on";

    if (!name) {
      return NextResponse.redirect(new URL(`/admin/search-profiles/${id}?error=missing-name`, request.url), { status: 303 });
    }

    const { error } = await supabaseAdmin
      .from("search_profiles")
      .update({
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
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.redirect(new URL(`/admin/search-profiles/${id}?saved=1`, request.url), { status: 303 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to update search profile" }, { status: 500 });
  }
}
