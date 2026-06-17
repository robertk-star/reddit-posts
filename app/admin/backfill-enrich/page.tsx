import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";

export default async function BackfillEnrichPage({ searchParams }: { searchParams?: Promise<{ updated?: string; skipped?: string }> }) {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const qs = searchParams ? await searchParams : {};

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin" className="text-sm font-semibold text-cyan-700 hover:underline">Back to dashboard</Link>
        <section className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-700">Phase 3H</p>
          <h1 className="mt-2 text-2xl font-bold">Backfill Existing Opportunities</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">The database fields and enrichment helpers are installed. The backfill action route was blocked during upload, so this page is a placeholder until the route can be added safely.</p>
          {qs.updated ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Updated {qs.updated} opportunities. Skipped {qs.skipped || 0}.</p> : null}
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold">What is ready:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>New fields for page titles, descriptions, previews, and quality scores.</li>
              <li>Hybrid Scanner now applies domain blocklists and quality scoring to new results.</li>
              <li>Search Profile quality settings are available from the Search Profiles page.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
