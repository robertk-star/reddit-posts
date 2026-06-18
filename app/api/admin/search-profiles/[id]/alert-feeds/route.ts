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
    const enabled = String(form.get("google_alert_feed_enabled") || "") === "on";
    const feedUrls = lines(form.get("google_alert_feed_urls"));
    const { error } = await supabaseAdmin.from("search_profiles").update({
      google_alert_feed_enabled: enabled,
      google_alert_feed_urls: feedUrls,
      updated_at: new Date().toISOString()
    }).eq("id", id);
    if (error) throw error;
    return NextResponse.redirect(new URL(`/admin/search-profiles/${id}/alert-feeds?saved=1`, request.url), { status: 303 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to save Google Alert feeds" }, { status: 500 });
  }
}
