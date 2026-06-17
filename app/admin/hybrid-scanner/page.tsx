import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function HybridScannerPage({ searchParams }: { searchParams?: Promise<{ created?: string; found?: string }> }) {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const qs = searchParams ? await searchParams : {};
  const [{ data: profiles }, { data: runs }] = await Promise.all([
    supabaseAdmin.from("search_profiles").select("id,name").eq("active", true).order("name"),
    supabaseAdmin.from("web_scan_runs").select("*, search_profiles(name)").order("started_at", { ascending: false }).limit(10)
  ]);

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin/phase3" className="text-sm font-semibold text-cyan-700 hover:underline">Back to Phase 3</Link>
        {qs.created ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Saved {qs.created} candidates from {qs.found || 0} found URLs.</p> : null}
        <section className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-700">Phase 3C</p>
          <h1 className="mt-2 text-2xl font-bold">Hybrid Web Scanner</h1>
          <p className="mt-3 text-sm text-slate-600">Scans source domains from active Search Profiles and saves new opportunities into the candidate queue.</p>
          <form action="/api/scan/hybrid" method="post" className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
            <select name="search_profile_id" className="rounded-xl border border-slate-300 px-4 py-3">
              <option value="">All active search profiles</option>
              {(profiles || []).map((profile: any) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
            <button className="rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-700">Run Hybrid Scan</button>
          </form>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/admin/search-profiles" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Manage Profiles</Link>
            <Link href="/admin/candidates" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">View Candidates</Link>
          </div>
        </section>
        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-bold">Recent Hybrid Scans</h2>
          <div className="mt-4 grid gap-3">
            {(runs || []).length === 0 ? <p className="text-sm text-slate-600">No hybrid scans yet.</p> : null}
            {(runs || []).map((run: any) => (
              <div key={run.id} className="rounded-2xl border border-slate-200 p-4 text-sm">
                <strong>{run.search_profiles?.name || "Profile"} · {run.status}</strong>
                <p className="mt-1 text-slate-600">Checked {run.sources_checked || 0} sources · Found {run.urls_found || 0} URLs · Saved {run.candidates_created || 0} candidates</p>
                {run.error_message ? <p className="mt-2 whitespace-pre-line text-xs text-red-700">{run.error_message}</p> : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
