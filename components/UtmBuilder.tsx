"use client";

import { useMemo, useState } from "react";

type ProjectLink = {
  id: string;
  name: string;
  link_to_promote: string;
  site_url: string;
};

export function UtmBuilder({ projects }: { projects: ProjectLink[] }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [source, setSource] = useState("reddit");
  const [medium, setMedium] = useState("organic_reply");
  const [campaign, setCampaign] = useState("helpful_answers");
  const [copied, setCopied] = useState(false);

  const selected = projects.find((project) => project.id === projectId) || projects[0];

  const builtUrl = useMemo(() => {
    const base = selected?.link_to_promote || selected?.site_url || "";
    if (!base) return "";
    try {
      const url = new URL(base);
      url.searchParams.set("utm_source", source || "reddit");
      url.searchParams.set("utm_medium", medium || "organic_reply");
      url.searchParams.set("utm_campaign", campaign || "helpful_answers");
      return url.toString();
    } catch {
      return base;
    }
  }, [selected, source, medium, campaign]);

  async function copyUrl() {
    await navigator.clipboard.writeText(builtUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-bold">UTM Link Builder</h2>
      <p className="mt-1 text-sm text-slate-600">Create a trackable link for a manual Reddit reply.</p>
      <div className="mt-5 grid gap-3">
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3">
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        <input value={source} onChange={(event) => setSource(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3" placeholder="utm_source" />
        <input value={medium} onChange={(event) => setMedium(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3" placeholder="utm_medium" />
        <input value={campaign} onChange={(event) => setCampaign(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3" placeholder="utm_campaign" />
        <textarea readOnly value={builtUrl} className="min-h-24 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm" />
        <button type="button" onClick={copyUrl} className="rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white hover:bg-slate-800">
          {copied ? "Copied" : "Copy UTM Link"}
        </button>
      </div>
    </div>
  );
}
