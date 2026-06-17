import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const allowedStatuses = new Set(["new", "drafted", "posted", "skipped", "snoozed"]);

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const status = String(form.get("status") || "").trim();
    const ids = form.getAll("candidate_ids").map((value) => String(value)).filter(Boolean);

    if (!allowedStatuses.has(status) || ids.length === 0) {
      return NextResponse.redirect(new URL("/admin/candidates?bulk=missing", request.url), { status: 303 });
    }

    const { error } = await supabaseAdmin.from("candidate_threads").update({ status }).in("id", ids);
    if (error) throw error;

    return NextResponse.redirect(new URL(`/admin/candidates?bulk=${status}&count=${ids.length}`, request.url), { status: 303 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to update candidates" }, { status: 500 });
  }
}
