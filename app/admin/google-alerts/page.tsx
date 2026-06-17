import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function GoogleAlertsPage({ searchParams }: { searchParams?: Promise<{ imported?: string; found?: string; error?: string }> }) {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const qs = searchParams ? await searchParams : {};
  const [{ data: profiles }, { data: imports }] = await Promise.all([
    supabaseAdmin.from("search_profiles").select("id,name").eq("active", true).order("name"),
    supabaseAdmin.from("google_alert_imports").select("*, search_profiles(name)").order("created_at", { ascending: false }).limit(10)
  ]);

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin/phase3" className="text-sm font-semibold text-cyan-700 hover:underline">Back to Phase 3</Link>
        <section className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-700">Phase 3B</p>
          <h1 className="mt-2 text-2xl font-bold">Google Alerts Import</h1>
          <p className="mt-3 text-sm text-slate-600">Paste a Google Alert email or copied result block. The app extracts links, dedupes them, and saves them to the candidate queue.</p>
          {qs.imported ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Imported {qs.imported} candidates from {qs.found || 0} URLs.</p> : null}
          {qs.error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">Missing profile or alert content.</p> : null}
          <form action="/api/admin/google-alerts/import" method="post" className="mt-6 grid gap-4">
            <select name="search_profile_id" className="rounded-xl border border-slate-300 px-4 py-3" required>
              <option value="">Choose Search Profile</option>
              {(profiles || []).map((profile: any) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
            <textarea name="raw_content" placeholder="Paste Google Alert content here" className="min-h-80 rounded-xl border border-slate-300 px-4 py-3" required />
            <input name="notes" placeholder="Notes, optional" className="rounded-xl border border-slate-300 px-4 py-3" />
            <button className="rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-700">Import Alert Results</button>
          </form>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Recent Imports</h2>
            <Link href="/admin/candidates" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">View Candidates</Link>
          </div>
          <div className="mt-4 grid gap-3">
            {(imports || []).length === 0 ? <p className="text-sm text-slate-600">No imports yet.</p> : null}
            {(imports || []).map((item: any) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-4 text-sm">
                <strong>{item.search_profiles?.name || "Unknown profile"}</strong>
                <p className="mt-1 text-slate-600">Found {item.urls_found || 0} URLs · Saved {item.candidates_created || 0} candidates</p>
                {item.notes ? <p className="mt-1 text-xs text-slate-500">{item.notes}</p> : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
