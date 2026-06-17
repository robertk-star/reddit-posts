import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";

export default async function Phase3Page() {
  if (!(await isAdminRequest())) redirect("/admin/login");

  const links = [
    ["Search Profiles", "/admin/search-profiles", "Create separate searches for Disability Benefits, Background Screening, and future campaigns."],
    ["Google Alerts Import", "/admin/google-alerts", "Coming next: paste Google Alert emails or result blocks into the right profile."],
    ["Hybrid Scanner", "/admin/hybrid-scanner", "Coming next: scan web/forum sources and dedupe into the opportunity queue."],
    ["Candidates", "/admin/candidates", "Review opportunities and copy draft replies."]
  ];

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="text-sm font-semibold text-cyan-700 hover:underline">Back to dashboard</Link>
        <section className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-700">Opportunity Radar</p>
          <h1 className="mt-2 text-2xl font-bold">Phase 3 — Hybrid Web Scanner</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Phase 3A adds Search Profiles. The next parts will add Google Alerts import, web/forum scanning, dedupe, and profile-based opportunity queues.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {links.map(([title, href, description]) => (
              <Link key={href} href={href} className="rounded-2xl border border-slate-200 p-5 hover:bg-slate-50">
                <h2 className="font-bold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
