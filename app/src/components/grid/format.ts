import type { ValueFormatterParams } from "ag-grid-community";
export const fmtMoney = (v: number | null | undefined, cents = false) =>
  v == null ? "—" : v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents || v % 1 ? 2 : 0, maximumFractionDigits: 2 });
export const moneyFmt = (p: ValueFormatterParams) => (p.value == null || p.value === "" ? "" : fmtMoney(Number(p.value)));
export const dateFmt = (p: ValueFormatterParams) =>
  p.value ? new Date(p.value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" }) : "";
export const dateTimeFmt = (p: ValueFormatterParams) =>
  p.value ? new Date(p.value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET" : "";
export const relFmt = (p: ValueFormatterParams) => {
  if (!p.value) return "";
  const s = Math.round((Date.now() - new Date(p.value).getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)}d ago`;
  return dateFmt(p);
};
/** Date filter comparator for ISO strings. */
export const isoDateComparator = (filterDate: Date, cell: string | null) => {
  if (!cell) return -1;
  const d = new Date(cell); const c = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return c < filterDate.getTime() ? -1 : c > filterDate.getTime() ? 1 : 0;
};
