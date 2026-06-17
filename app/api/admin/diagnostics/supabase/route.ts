import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getSupabaseEnvStatus, supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    await requireAdmin();
    const env = getSupabaseEnvStatus();
    const ping = await supabaseAdmin.from("projects").select("id", { count: "exact", head: true });
    return NextResponse.json({ env, ok: !ping.error, database_error: ping.error?.message || null });
  } catch (error: any) {
    return NextResponse.json({ ok: false, env: getSupabaseEnvStatus(), error: error?.message || String(error) }, { status: 500 });
  }
}