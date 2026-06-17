import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = { params: Promise<{ id: string }> };

function lines(value: FormDataEntryValue | null) {
  return String(value || "").split("\n").map((item) => item.trim()).filter(Boolean);
}

export async function POST(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const form = await request.formData();
    const minScore = Math.max(0, Math.min(1, Number(form.get("min_result_quality_score") || 0.2)));
    const { error } = await supabaseAdmin.from("search_profiles").update({
      domain_allowlist: lines(form.get("domain_allowlist")),
      domain_blocklist: lines(form.get("domain_blocklist")),
      min_result_quality_score: minScore,
      updated_at: new Date().toISOString()
    }).eq("id", id);
    if (error) throw error;
    return NextResponse.redirect(new URL(`/admin/search-profiles/${id}/quality?saved=1`, request.url), { status: 303 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to save quality settings" }, { status: 500 });
  }
}
