import type { AnalysisMap } from "./analyze";
import { countryName } from "./regions";
import { NURTURE_LABEL, UNASSIGNED } from "./routing";
import { TIER_LABEL, type Lead, type Tier } from "./types";

export type ExportFormat = "generic" | "hubspot" | "salesforce";

/** Quote a CSV cell. Cells starting with = + - @ get a leading apostrophe so spreadsheets never run them as formulas. */
export function csvCell(value: string | number): string {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: (string | number)[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export const HUBSPOT_COLUMNS = ["First Name", "Last Name", "Email", "Company Name", "Job Title", "Lifecycle Stage", "Lead Status", "HubSpot Owner", "Lead Score"];
export const SALESFORCE_COLUMNS = ["FirstName", "LastName", "Email", "Company", "Title", "LeadSource", "Status", "Rating", "Owner", "Country", "NumberOfEmployees", "Industry", "Description"];
export const GENERIC_COLUMNS = ["First Name", "Last Name", "Email", "Company", "Job Title", "Industry", "Country", "Employees", "Source", "Score", "Tier", "Owner", "Received At", "Decision Reason"];

const LIFECYCLE: Record<Tier, string> = { hot: "salesqualifiedlead", warm: "marketingqualifiedlead", cold: "lead" };
const HS_STATUS: Record<Tier, string> = { hot: "OPEN", warm: "NEW", cold: "NEW" };
const SF_STATUS: Record<Tier, string> = { hot: "Working - Contacted", warm: "Open - Not Contacted", cold: "Open - Not Contacted" };

/** Only approved leads leave the app. Owner is blank for nurture and unassigned leads. */
export function exportableLeads(leads: Lead[]): Lead[] {
  return leads.filter((l) => l.status === "approved");
}

export function buildCsv(format: ExportFormat, leads: Lead[], analysis: AnalysisMap): string {
  const rows = exportableLeads(leads).flatMap((l) => {
    const a = analysis.get(l.id);
    if (!a) return [];
    const owner = a.owner === NURTURE_LABEL || a.owner === UNASSIGNED ? "" : a.owner;
    const score = a.score.total;
    if (format === "hubspot") return [[l.firstName, l.lastName, l.email, l.company, l.title, LIFECYCLE[a.tier], HS_STATUS[a.tier], owner, score]];
    if (format === "salesforce")
      return [[l.firstName, l.lastName || "(not provided)", l.email, l.company, l.title, l.source, SF_STATUS[a.tier], TIER_LABEL[a.tier], owner, countryName(l.country), l.employees ?? "", l.industry, `Lead Desk score ${score}/100 (${TIER_LABEL[a.tier]}).`]];
    return [[l.firstName, l.lastName, l.email, l.company, l.title, l.industry, countryName(l.country), l.employees ?? "", l.source, score, TIER_LABEL[a.tier], a.owner, l.receivedAt, l.decisionReason ?? ""]];
  });
  const header = format === "hubspot" ? HUBSPOT_COLUMNS : format === "salesforce" ? SALESFORCE_COLUMNS : GENERIC_COLUMNS;
  return toCsv(header, rows);
}

export function exportFileName(format: ExportFormat, now: Date): string {
  return `lead-desk-${format}-${now.toISOString().slice(0, 10)}.csv`;
}
