import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function RulesPage() {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const { data: rules } = await supabaseAdmin.from("monitoring_rules").select("*, projects(name), sources(name)").order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="text-sm font-semibold text-cyan-700 hover:underline">Back to dashboard</Link>
        <div className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold">Monitoring Rules</h1>
          <div className="mt-6 grid gap-4">
            {(rules || []).map((rule: any) => (
              <div key={rule.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-bold">{rule.projects?.name} · {rule.sources?.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">Targets: {(rule.target_locations || []).join(", ")}</p>
                    <p className="mt-1 text-sm text-slate-500">Keywords: {(rule.keywords || []).join(", ")}</p>
                    <p className="mt-1 text-xs text-slate-500">Active: {rule.active ? "Yes" : "No"} · Min score: {rule.min_relevance_score}</p>
                  </div>
                  <Link href={`/admin/rules/${rule.id}`} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">Edit</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
