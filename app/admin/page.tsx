import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function dt(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default async function AdminPage() {
  if (!(await isAdminRequest())) redirect("/admin/login");

  const [projectsRes, profilesRes, rulesRes, candidatesRes, webRunsRes, alertImportsRes] = await Promise.all([
    supabaseAdmin.from("projects").select("id").limit(1000),
    supabaseAdmin.from("search_profiles").select("id,active").limit(1000),
    supabaseAdmin.from("monitoring_rules").select("id,active").limit(1000),
    supabaseAdmin.from("candidate_threads").select("id,status,risk_level").limit(1000),
    supabaseAdmin.from("web_scan_runs").select("*").order("started_at", { ascending: false }).limit(5),
    supabaseAdmin.from("google_alert_imports").select("*").order("created_at", { ascending: false }).limit(5)
  ]);

  const projects = projectsRes.data || [];
  const profiles = profilesRes.data || [];
  const rules = rulesRes.data || [];
  const candidates = candidatesRes.data || [];
  const webRuns = webRunsRes.data || [];
  const alertImports = alertImportsRes.data || [];

  const activeCandidates = candidates.filter((item: any) => ["new", "drafted", "snoozed"].includes(item.status));
  const highRisk = candidates.filter((item: any) => item.risk_level === "high");

  const cards = [
    ["Run Hybrid Scan", "/admin/hybrid-scanner", "Scan active Search Profiles and create new opportunities."],
    ["Opportunities", "/admin/candidates", "Filter, draft, copy, skip, snooze, or mark items posted."],
    ["Google Alerts", "/admin/google-alerts", "Paste Google Alert results and dedupe them into the queue."],
    ["Search Profiles", "/admin/search-profiles", "Manage separate searches for Disability, Background Screening, and more."],
    ["Monitoring Rules", "/admin/rules", "Add, edit, pause, or delete source rules."],
    ["UTM Builder", "/admin/tools/utm", "Create tracking links for manual replies."]
  ];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-700">Opportunity Radar</p>
            <h1 className="mt-1 text-2xl font-bold">Hybrid Opportunity Dashboard</h1>
          </div>
          <form action="/api/admin/logout" method="post">
            <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Logout</button>
          </form>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-4 md:grid-cols-5">
          <Stat label="Projects" value={projects.length} />
          <Stat label="Active Profiles" value={profiles.filter((p: any) => p.active).length} />
          <Stat label="Active Rules" value={rules.filter((r: any) => r.active).length} />
          <Stat label="Active Opportunities" value={activeCandidates.length} />
          <Stat label="High Risk" value={highRisk.length} />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map(([title, href, description]) => (
            <Link key={href} href={href} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
              <h2 className="text-lg font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold">Recent Hybrid Scans</h2>
            <div className="mt-4 space-y-3">
              {webRuns.length === 0 ? <p className="text-sm text-slate-600">No hybrid scans yet.</p> : null}
              {webRuns.map((run: any) => (
                <div key={run.id} className="rounded-2xl border border-slate-200 p-4 text-sm">
                  <div className="flex justify-between gap-3"><strong>{run.status}</strong><span>{dt(run.started_at)}</span></div>
                  <p className="mt-1 text-slate-600">Checked {run.sources_checked || 0} sources · Found {run.urls_found || 0} URLs · Saved {run.candidates_created || 0}</p>
                  {run.error_message ? <p className="mt-2 text-red-700">{run.error_message}</p> : null}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold">Recent Google Alert Imports</h2>
            <div className="mt-4 space-y-3">
              {alertImports.length === 0 ? <p className="text-sm text-slate-600">No Google Alert imports yet.</p> : null}
              {alertImports.map((item: any) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 p-4 text-sm">
                  <div className="flex justify-between gap-3"><strong>Import</strong><span>{dt(item.created_at)}</span></div>
                  <p className="mt-1 text-slate-600">Found {item.urls_found || 0} URLs · Saved {item.candidates_created || 0}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>;
}