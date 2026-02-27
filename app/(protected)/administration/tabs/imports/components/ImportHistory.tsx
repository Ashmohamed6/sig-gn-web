"use client";

import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import type { ImportLogEntry } from "../hooks/useImportApi";

interface ImportHistoryProps {
  logs: ImportLogEntry[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR");
}

export default function ImportHistory({
  logs,
  loading,
  page,
  pageSize,
  total,
  statusFilter,
  onStatusFilterChange,
  onPageChange,
  onRefresh,
}: ImportHistoryProps) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Journal des imports</p>
          <p className="text-xs text-slate-500">{total.toLocaleString("fr-FR")} lot(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          >
            <option value="">Tous statuts</option>
            <option value="success">Succes</option>
            <option value="partial_success">Succes partiel</option>
            <option value="failed">Echec</option>
            <option value="failed_validation">Validation KO</option>
            <option value="failed_runtime">Erreur runtime</option>
          </select>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualiser
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Date</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Utilisateur</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Dataset</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Region</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Lignes</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  Aucun import
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.import_uuid}>
                  <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{formatDate(log.started_at)}</td>
                  <td className="px-3 py-2 text-slate-700">{log.actor_username || "-"}</td>
                  <td className="px-3 py-2 text-slate-700">{log.dataset_code}</td>
                  <td className="px-3 py-2 text-slate-700">{log.region_id || "-"}</td>
                  <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                    {log.rows_ok ?? 0}/{log.rows_total ?? 0}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {log.status || "-"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-md p-1 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4 text-slate-600" />
        </button>
        <span className="text-xs text-slate-600">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-md p-1 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4 text-slate-600" />
        </button>
      </div>
    </div>
  );
}

