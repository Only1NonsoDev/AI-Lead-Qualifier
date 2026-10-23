import type { Region } from "./types";

const EU = new Set(["IE", "DE", "FR", "NL", "ES", "IT", "SE", "DK", "FI", "BE", "AT", "PT", "PL", "NO", "CH"]);

export function regionOf(country: string): Region {
  const c = country.trim().toUpperCase();
  if (c === "US" || c === "USA") return "US";
  if (c === "CA") return "CA";
  if (c === "GB" || c === "UK") return "UK";
  if (EU.has(c)) return "EU";
  return "Other";
}

export const COUNTRIES: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "IE", name: "Ireland" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "AU", name: "Australia" },
];

export function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code.toUpperCase())?.name ?? code;
}

export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at < 0 ? "" : email.slice(at + 1).trim().toLowerCase();
}
