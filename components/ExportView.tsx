"use client";

import { useState } from "react";

import type { AnalysisMap } from "@/lib/analyze";
import { buildCsv, exportableLeads, exportFileName, type ExportFormat } from "@/lib/export";
import type { Lead } from "@/lib/types";
import { fullName } from "@/lib/analyze";
import { EmptyState, Icon, TierBadge } from "./ui";

const FORMATS: { id: ExportFormat; title: string; body: string }[] = [
  { id: "generic", title: "Plain CSV", body: "Everything we know: score, tier, owner, source and the decision reason. Good for spreadsheets." },
  { id: "hubspot", title: "HubSpot import", body: "First Name, Last Name, Email, Company Name, Job Title, Lifecycle Stage, Lead Status, HubSpot Owner, Lead Score." },
  { id: "salesforce", title: "Salesforce import", body: "Standard Lead fields: FirstName, LastName, Company, Title, LeadSource, Status, Rating, Owner and more." },
];

function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ExportView({ leads, analysis }: { leads: Lead[]; analysis: AnalysisMap }) {
  const ready = exportableLeads(leads);
  const [done, setDone] = useState<string | null>(null);
  return (
    <div className="stack">
      <div className="page-head">
        <h1 className="h1-sm">Export approved leads</h1>
        <p className="muted">Only leads you approved are exported. The file downloads to your computer: nothing is pushed to HubSpot, Salesforce or anywhere else. You import it yourself.</p>
      </div>
      {ready.length === 0 ? (
        <EmptyState icon="export" title="Nothing approved yet">Approve a lead in the inbox and it will show up here.</EmptyState>
      ) : (
        <>
          <section className="panel stack-sm" aria-labelledby="ex-list"><h2 id="ex-list">{ready.length} approved lead{ready.length === 1 ? "" : "s"}</h2>
            <ul className="export-list">
              {ready.map((l) => { const a = analysis.get(l.id)!; return (
                <li key={l.id}><span className="ellipsis"><b>{fullName(l)}</b> <span className="muted">{l.company}</span></span><span className="muted small">Owner: {a.owner} · Score {a.score.total}</span><TierBadge tier={a.tier} overridden={!!l.override?.tier} /></li>
              ); })}
            </ul></section>
          <div className="export-grid">
            {FORMATS.map((f) => (
              <div key={f.id} className="panel export-card stack-sm">
                <h3>{f.title}</h3><p className="muted small">{f.body}</p>
                <button type="button" className="btn btn-primary" onClick={() => { download(exportFileName(f.id, new Date()), buildCsv(f.id, leads, analysis)); setDone(f.title); }}><Icon name="download" /> Download CSV</button>
              </div>
            ))}
          </div>
          {done && <p className="notice notice-pass" role="status"><Icon name="check" size={16} /> Downloaded {done}. Nothing was sent anywhere.</p>}
        </>
      )}
    </div>
  );
}
