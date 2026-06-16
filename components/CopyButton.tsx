"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copy Draft" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    await navigator.clipboard.writeText(text || "");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button type="button" onClick={copyText} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
      {copied ? "Copied" : label}
    </button>
  );
}
