import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const candidateThreadId = String(form.get("candidate_thread_id") || "");
    const draftId = String(form.get("draft_id") || "") || null;
    const action = String(form.get("action") || "");
    const editedText = String(form.get("edited_text") || "").trim() || null;
    const notes = String(form.get("notes") || "").trim() || null;

    if (!candidateThreadId || !["posted", "skipped", "snoozed"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { error: actionError } = await supabaseAdmin.from("posting_actions").insert({
      candidate_thread_id: candidateThreadId,
      draft_id: draftId,
      action,
      edited_text: editedText,
      notes
    });
    if (actionError) throw actionError;

    const { error: updateError } = await supabaseAdmin
      .from("candidate_threads")
      .update({ status: action })
      .eq("id", candidateThreadId);
    if (updateError) throw updateError;

    return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to save action" }, { status: 500 });
  }
}
