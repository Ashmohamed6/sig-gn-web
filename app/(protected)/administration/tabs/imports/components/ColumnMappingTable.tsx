"use client";

import type { ColumnMappingEntry } from "../types/importTypes";

interface ColumnMappingTableProps {
  mapping: ColumnMappingEntry[];
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    matched: "bg-emerald-100 text-emerald-800",
    unmatched: "bg-red-100 text-red-700",
    auto_filled: "bg-blue-100 text-blue-700",
  };
  const labels: Record<string, string> = {
    matched: "OK",
    unmatched: "Ignore",
    auto_filled: "Auto",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[status] || "bg-slate-100 text-slate-600"}`}>
      {labels[status] || status}
    </span>
  );
}

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return <span className="text-slate-400">-</span>;
  const styles: Record<string, string> = {
    system: "bg-slate-200 text-slate-700",
    kobo_meta: "bg-violet-100 text-violet-700",
    data: "bg-amber-100 text-amber-800",
  };
  const labels: Record<string, string> = {
    system: "Systeme",
    kobo_meta: "Kobo",
    data: "Metier",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[category] || "bg-slate-100 text-slate-600"}`}>
      {labels[category] || category}
    </span>
  );
}

export default function ColumnMappingTable({ mapping }: ColumnMappingTableProps) {
  if (!mapping || mapping.length === 0) return null;

  const matched = mapping.filter((m) => m.status === "matched");
  const unmatched = mapping.filter((m) => m.status === "unmatched");
  const autoFilled = mapping.filter((m) => m.status === "auto_filled");

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">Mapping colonnes CSV / Stage</p>
        <div className="flex gap-2 text-[10px] text-slate-500">
          <span>{matched.length} reconnues</span>
          <span>{unmatched.length} ignorees</span>
          <span>{autoFilled.length} auto</span>
        </div>
      </div>
      <div className="overflow-x-auto max-h-72">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">En-tete CSV</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Colonne Stage</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Statut</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mapping.map((entry, idx) => (
              <tr
                key={`${entry.csv_header || entry.stage_column}-${idx}`}
                className={entry.status === "unmatched" ? "bg-red-50/40" : ""}
              >
                <td className="px-3 py-1.5 font-mono text-slate-700">
                  {entry.csv_header || <span className="text-slate-400 italic">-</span>}
                </td>
                <td className="px-3 py-1.5 font-mono text-slate-700">
                  {entry.stage_column || <span className="text-slate-400 italic">-</span>}
                </td>
                <td className="px-3 py-1.5">
                  <StatusBadge status={entry.status} />
                </td>
                <td className="px-3 py-1.5">
                  <CategoryBadge category={entry.category} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
