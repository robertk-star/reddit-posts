import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = { searchParams?: Promise<{ created?: string; found?: string }> };

function dt(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default async function GoogleAlertFeedsPage({ searchParams }: Params) {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const qs = searchParams ? await searchParams : {};
  const [{ data: profiles }, { data: runs }] = await Promise.all([
    supabaseAdmin.from("search_profiles").select("id,name,active,google_alert_feed_enabled,google_alert_feed_urls,last_google_alert_scan_at,last_google_alert_scan_status,last_google_alert_scan_error").order("name"),
    supabaseAdmin.from("web_scan_runs").select("*, search_profiles(name)").order("started_at", { ascending: false }).limit(8)
  ]);

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin" className="text-sm font-semibold text-cyan-700 hover:underline">Back to dashboard</Link>
          <Link href="/admin/hybrid-scanner" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white">Hybrid Scanner</Link>
        </div>
        {qs.created ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Google Alert feed scan saved {qs.created} opportunities from {qs.found || 0} results.</p> : null}
        <section className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-700">Google Alerts</p>
          <h1 className="mt-2 text-2xl font-bold">Automated Alert Feed Ingestion</h1>
          <p className="mt-2 text-sm text-slate-600">Save Google Alert RSS/feed URLs under each Search Profile. The Hybrid Scanner will ingest them automatically with no copy/paste.</p>
          <form action="/api/scan/hybrid" method="post" className="mt-5 flex flex-wrap gap-3">
            <button className="rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-700">Run All Alert Feeds Now</button>
          </form>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-bold">Search Profile Feeds</h2>
          <div className="mt-5 grid gap-4">
            {(profiles || []).map((profile: any) => (
              <article key={profile.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                      <span className={profile.active ? "rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800" : "rounded-full bg-slate-100 px-2.5 py-1 text-slate-700"}>{profile.active ? "Active" : "Paused"}</span>
                      <span className={profile.google_alert_feed_enabled ? "rounded-full bg-cyan-100 px-2.5 py-1 text-cyan-800" : "rounded-full bg-slate-100 px-2.5 py-1 text-slate-700"}>{profile.google_alert_feed_enabled ? "Feeds On" : "Feeds Off"}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-bold">{profile.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">Feed URLs: {(profile.google_alert_feed_urls || []).length}</p>
                    <p className="mt-1 text-xs text-slate-500">Last scan: {dt(profile.last_google_alert_scan_at)} · {profile.last_google_alert_scan_status || "No status yet"}</p>
                    {profile.last_google_alert_scan_error ? <p className="mt-2 rounded-xl bg-red-50 p-2 text-xs text-red-700">{profile.last_google_alert_scan_error}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/search-profiles/${profile.id}/alert-feeds`} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">Feed URLs</Link>
                    <form action="/api/scan/hybrid" method="post">
                      <input type="hidden" name="search_profile_id" value={profile.id} />
                      <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Scan Profile</button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-bold">Recent Scan Runs</h2>
          <div className="mt-4 grid gap-3">
            {(runs || []).length === 0 ? <p className="text-sm text-slate-600">No scans yet.</p> : null}
            {(runs || []).map((run: any) => (
              <div key={run.id} className="rounded-2xl border border-slate-200 p-4 text-sm">
                <div className="flex justify-between gap-3"><strong>{run.search_profiles?.name || "Profile"} · {run.status}</strong><span>{dt(run.started_at)}</span></div>
                <p className="mt-1 text-slate-600">Checked {run.sources_checked || 0} feeds/sources · Found {run.urls_found || 0} results · Saved {run.candidates_created || 0}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
