import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = { params: Promise<{ id: string }>; searchParams?: Promise<{ saved?: string }> };

export default async function QualitySettingsPage({ params, searchParams }: Params) {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const { id } = await params;
  const qs = searchParams ? await searchParams : {};
  const { data: profile } = await supabaseAdmin.from("search_profiles").select("*").eq("id", id).single();
  if (!profile) redirect("/admin/search-profiles");

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/search-profiles" className="text-sm font-semibold text-cyan-700 hover:underline">Back to Search Profiles</Link>
        <section className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-700">Phase 3H</p>
          <h1 className="mt-2 text-2xl font-bold">Quality Controls</h1>
          <p className="mt-2 text-sm text-slate-600">Set domain rules for {profile.name}. These controls apply to new Hybrid Scanner results.</p>
          {qs.saved ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Quality settings saved.</p> : null}
          <form action={`/api/admin/search-profiles/${id}/quality`} method="post" className="mt-6 grid gap-4">
            <label className="grid gap-1 text-sm font-semibold">
              Minimum result quality score, 0 to 1
              <input name="min_result_quality_score" type="number" min="0" max="1" step="0.05" defaultValue={profile.min_result_quality_score ?? 0.2} className="rounded-xl border border-slate-300 px-4 py-3 font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Domain allowlist, optional, one per line
              <textarea name="domain_allowlist" defaultValue={(profile.domain_allowlist || []).join("\n")} placeholder={'reddit.com\nquora.com\nssdfacts.com'} className="min-h-32 rounded-xl border border-slate-300 px-4 py-3 font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Domain blocklist, one per line
              <textarea name="domain_blocklist" defaultValue={(profile.domain_blocklist || []).join("\n")} placeholder={'pinterest.com\nfacebook.com\nspam-example.com'} className="min-h-32 rounded-xl border border-slate-300 px-4 py-3 font-normal" />
            </label>
            <button className="rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-700">Save Quality Controls</button>
          </form>
        </section>
      </div>
    </main>
  );
}
