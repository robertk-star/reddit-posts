import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const name = String(form.get("name") || "").trim();
    const siteUrl = String(form.get("site_url") || "").trim();
    const linkToPromote = String(form.get("link_to_promote") || siteUrl).trim() || siteUrl;
    const notes = String(form.get("notes") || "").trim();
    const toneDescription = String(form.get("tone_description") || "plain, practical, helpful, non-salesy").trim();
    const keyPoints = String(form.get("key_points") || "")
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);

    if (!name || !siteUrl) {
      return NextResponse.redirect(new URL("/admin?error=missing-project", request.url), { status: 303 });
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .insert({ name, site_url: siteUrl, link_to_promote: linkToPromote, notes })
      .select("id")
      .single();

    if (projectError || !project?.id) {
      console.error("Project insert failed", projectError);
      return NextResponse.json({ error: "Unable to create project", detail: projectError?.message || "Project insert returned no ID" }, { status: 500 });
    }

    const { error: voiceError } = await supabaseAdmin.from("voice_profiles").insert({
      project_id: project.id,
      tone_description: toneDescription,
      key_points: keyPoints,
      link_phrasing_examples: [],
      avoid_phrases: ["guaranteed approval", "qualify instantly", "best service"]
    });

    if (voiceError) {
      console.error("Voice profile insert failed, but project was created", voiceError);
      return NextResponse.redirect(new URL("/admin?created=project&voice=skipped", request.url), { status: 303 });
    }

    return NextResponse.redirect(new URL("/admin?created=project", request.url), { status: 303 });
  } catch (error: any) {
    console.error("Project create route failed", error);
    return NextResponse.json({ error: "Unable to create project", detail: error?.message || String(error) }, { status: 500 });
  }
}
