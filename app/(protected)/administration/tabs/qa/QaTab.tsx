"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileDown,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { getCurrentProject } from "@/utils/authClient";
import type { UserRole } from "../../config/adminConfig";
import {
  type ImportLogEntry,
  type RefreshViewsResult,
  useImportApi,
} from "../imports/hooks/useImportApi";

interface QaTabProps {
  userRole: UserRole;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR");
}

function formatInt(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("fr-FR");
}

function statusBadgeClass(status: string | null): string {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "success") {
    return "bg-emerald-100 text-emerald-800 ring-emerald-600/20";
  }
  if (normalized === "partial_success") {
    return "bg-amber-100 text-amber-800 ring-amber-600/20";
  }
  if (normalized.startsWith("failed")) {
    return "bg-red-100 text-red-800 ring-red-600/20";
  }
  return "bg-slate-100 text-slate-700 ring-slate-600/20";
}

function escapeCsv(value: unknown): string {
  const raw = String(value ?? "");
  return `"${raw.replaceAll('"', '""')}"`;
}

export default function QaTab({ userRole }: QaTabProps) {
  const router = useRouter();
  const { fetchImportLogs, refreshViews } = useImportApi();

  const projectCode = useMemo(() => getCurrentProject()?.code_fonc || "-", []);

  const canRefreshMarts = userRole === "admin";

  const [rows, setRows] = useState<ImportLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [statusFilter, setStatusFilter] = useState("");
  const [datasetFilter, setDatasetFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [refreshingViews, setRefreshingViews] = useState(false);
  const [refreshResult, setRefreshResult] = useState<RefreshViewsResult | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchImportLogs({
        page,
        pageSize,
        status: statusFilter || undefined,
        datasetCode: datasetFilter || undefined,
        regionId: regionFilter || undefined,
      });
      setRows(Array.isArray(response?.results) ? response.results : []);
      setTotal(Number(response?.count || 0));
    } catch (errorValue: unknown) {
      setRows([]);
      setTotal(0);
      setError(
        errorValue instanceof Error && errorValue.message.trim()
          ? errorValue.message
          : "Impossible de charger le journal QA."
      );
    } finally {
      setLoading(false);
    }
  }, [fetchImportLogs, page, pageSize, statusFilter, datasetFilter, regionFilter]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const summary = useMemo(() => {
    let okRuns = 0;
    let koRuns = 0;
    let rowsTotal = 0;
    let rowsError = 0;

    for (const row of rows) {
      const status = String(row.status || "").toLowerCase();
      if (status === "success" || status === "partial_success") okRuns += 1;
      if (status.startsWith("failed")) koRuns += 1;

      rowsTotal += Number(row.rows_total || 0);
      rowsError += Number(row.rows_error || 0);
    }

    const successBase = okRuns + koRuns;
    const successRate = successBase > 0 ? Math.round((okRuns / successBase) * 100) : 0;

    return {
      runsOnPage: rows.length,
      okRuns,
      koRuns,
      rowsTotal,
      rowsError,
      successRate,
    };
  }, [rows]);

  const datasetOptions = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .map((row) => String(row.dataset_code || "").trim())
          .filter((value) => value.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "fr"));
  }, [rows]);

  const regionOptions = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .map((row) => String(row.region_id || "").trim())
          .filter((value) => value.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "fr"));
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

  const handleExportCsv = () => {
    const headers = [
      "started_at",
      "ended_at",
      "actor_username",
      "dataset_code",
      "project_code",
      "region_id",
      "rows_total",
      "rows_ok",
      "rows_error",
      "status",
      "import_uuid",
    ];

    const lines = [
      headers.join(";"),
      ...rows.map((row) =>
        [
          row.started_at,
          row.ended_at,
          row.actor_username,
          row.dataset_code,
          row.project_code,
          row.region_id,
          row.rows_total,
          row.rows_ok,
          row.rows_error,
          row.status,
          row.import_uuid,
        ]
          .map(escapeCsv)
          .join(";")
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `qa_imports_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleRefreshViews = async () => {
    if (!canRefreshMarts) return;
    setRefreshingViews(true);
    setRefreshError(null);
    setRefreshResult(null);

    try {
      const result = await refreshViews();
      setRefreshResult(result);
    } catch (errorValue: unknown) {
      setRefreshError(
        errorValue instanceof Error && errorValue.message.trim()
          ? errorValue.message
          : "Echec du refresh des vues."
      );
    } finally {
      setRefreshingViews(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-800">QA - Qualite des imports</h2>
            <p className="text-xs text-slate-500">
              Projet: <span className="font-semibold">{projectCode}</span> | Role:{" "}
              <span className="font-mono font-semibold">{userRole}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown className="w-4 h-4" />
              Exporter CSV
            </button>

            <button
              type="button"
              onClick={() => router.push("/cartographie")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              <MapPin className="w-4 h-4" />
              Voir sur la carte
            </button>

            <button
              type="button"
              onClick={() => void loadLogs()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Rafraichir
            </button>

            <button
              type="button"
              onClick={() => void handleRefreshViews()}
              disabled={!canRefreshMarts || refreshingViews}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                canRefreshMarts
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
              title={canRefreshMarts ? "Refresh core/marts" : "Reserve Admin global"}
            >
              <ShieldCheck className={`w-4 h-4 ${refreshingViews ? "animate-pulse" : ""}`} />
              {refreshingViews ? "Refresh..." : "Refresh vues core/marts"}
            </button>
          </div>
        </div>

        {!canRefreshMarts && (
          <div className="px-4 py-2 border-b border-slate-200 bg-amber-50 text-amber-800 text-xs">
            Le refresh des vues materialisees est reserve a l&apos;admin global.
          </div>
        )}

        {refreshError && (
          <div className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{refreshError}</span>
          </div>
        )}

        {refreshResult && (
          <div className="m-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-800">
            <p className="font-medium">{refreshResult.detail}</p>
            <p className="text-xs mt-1">
              run_id: <span className="font-mono">{refreshResult.run_id}</span> | status:{" "}
              <span className="font-semibold">{refreshResult.status}</span> | refreshed:{" "}
              <span className="font-semibold">{formatInt(refreshResult.refreshed_count)}</span> | failed:{" "}
              <span className="font-semibold">{formatInt(refreshResult.failed_count)}</span>
            </p>
          </div>
        )}

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Lots (page)</p>
            <p className="text-xl font-semibold text-slate-800">{formatInt(summary.runsOnPage)}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs text-emerald-700">Succes</p>
            <p className="text-xl font-semibold text-emerald-800">{formatInt(summary.okRuns)}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-700">Echecs</p>
            <p className="text-xl font-semibold text-red-800">{formatInt(summary.koRuns)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Lignes traitees</p>
            <p className="text-xl font-semibold text-slate-800">{formatInt(summary.rowsTotal)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Taux succes</p>
            <p className="text-xl font-semibold text-slate-800">{summary.successRate}%</p>
          </div>
        </div>

        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Statut</label>
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            >
              <option value="">Tous</option>
              <option value="success">success</option>
              <option value="partial_success">partial_success</option>
              <option value="failed">failed</option>
              <option value="failed_validation">failed_validation</option>
              <option value="failed_runtime">failed_runtime</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Dataset</label>
            <select
              value={datasetFilter}
              onChange={(event) => {
                setPage(1);
                setDatasetFilter(event.target.value);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            >
              <option value="">Tous</option>
              {datasetOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Region</label>
            <select
              value={regionFilter}
              onChange={(event) => {
                setPage(1);
                setRegionFilter(event.target.value);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            >
              <option value="">Toutes</option>
              {regionOptions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Lignes/page</label>
            <select
              value={pageSize}
              onChange={(event) => {
                setPage(1);
                setPageSize(Number(event.target.value));
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Utilisateur</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Dataset</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Projet</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Region</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Lignes ok/total</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Erreurs</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Chargement du journal QA...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10">
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    Aucun lot sur ces filtres.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.import_uuid}>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                      {formatDate(row.started_at)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.actor_username || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{row.dataset_code}</td>
                    <td className="px-3 py-2 text-slate-700">{row.project_code || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{row.region_id || "-"}</td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                      {formatInt(row.rows_ok)}/{formatInt(row.rows_total)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-slate-700">
                        {Number(row.rows_error || 0) > 0 ? (
                          <TriangleAlert className="w-4 h-4 text-amber-600" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        )}
                        {formatInt(row.rows_error)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${statusBadgeClass(
                          row.status
                        )}`}
                      >
                        {row.status || "-"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Prec.
          </button>
          <span className="text-slate-600">
            Page <span className="font-semibold">{page}</span> / {totalPages} ({formatInt(total)} lots)
          </span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suiv.
          </button>
        </div>
      </div>
    </div>
  );
}
