import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const form = await request.formData();
    const status = String(form.get("status") || "");
    if (!["new", "drafted", "posted", "skipped", "snoozed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("candidate_threads").update({ status }).eq("id", id);
    if (error) throw error;
    return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to update status" }, { status: 500 });
  }
}
