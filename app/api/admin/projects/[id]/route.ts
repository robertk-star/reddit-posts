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
      const { error } = await supabaseAdmin.from("projects").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.redirect(new URL("/admin?deleted=project", request.url), { status: 303 });
    }

    const name = String(form.get("name") || "").trim();
    const siteUrl = String(form.get("site_url") || "").trim();
    const linkToPromote = String(form.get("link_to_promote") || siteUrl).trim();
    const notes = String(form.get("notes") || "").trim();
    const toneDescription = String(form.get("tone_description") || "").trim();
    const keyPoints = String(form.get("key_points") || "")
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
    const avoidPhrases = String(form.get("avoid_phrases") || "")
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);

    if (!name || !siteUrl) {
      return NextResponse.redirect(new URL(`/admin/projects/${id}?error=missing`, request.url), { status: 303 });
    }

    const { error: projectError } = await supabaseAdmin
      .from("projects")
      .update({ name, site_url: siteUrl, link_to_promote: linkToPromote, notes })
      .eq("id", id);
    if (projectError) throw projectError;

    const { data: existingVoice } = await supabaseAdmin.from("voice_profiles").select("id").eq("project_id", id).maybeSingle();
    if (existingVoice?.id) {
      const { error: voiceError } = await supabaseAdmin
        .from("voice_profiles")
        .update({ tone_description: toneDescription, key_points: keyPoints, avoid_phrases: avoidPhrases, updated_at: new Date().toISOString() })
        .eq("id", existingVoice.id);
      if (voiceError) throw voiceError;
    } else {
      const { error: voiceError } = await supabaseAdmin.from("voice_profiles").insert({
        project_id: id,
        tone_description: toneDescription,
        key_points: keyPoints,
        link_phrasing_examples: [],
        avoid_phrases: avoidPhrases
      });
      if (voiceError) throw voiceError;
    }

    return NextResponse.redirect(new URL(`/admin/projects/${id}?saved=1`, request.url), { status: 303 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to update project" }, { status: 500 });
  }
}
