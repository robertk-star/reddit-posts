import Link from "next/link";
import { redirect } from "next/navigation";
import { UtmBuilder } from "@/components/UtmBuilder";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function UtmToolPage() {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const { data: projects } = await supabaseAdmin.from("projects").select("id,name,site_url,link_to_promote").order("name");

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin" className="text-sm font-semibold text-cyan-700 hover:underline">Back to dashboard</Link>
        <div className="mt-4">
          <UtmBuilder projects={(projects || []).map((project: any) => ({ id: project.id, name: project.name, site_url: project.site_url, link_to_promote: project.link_to_promote }))} />
        </div>
      </div>
    </main>
  );
}
