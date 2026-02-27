"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Wrench,
  XCircle,
} from "lucide-react";
import type { UserRole } from "../../config/adminConfig";

type CheckStatus = "ok" | "error";

interface ToolsTabProps {
  userRole: UserRole;
  activeProjectCode?: string;
}

interface DiagnosticTarget {
  id: string;
  label: string;
  path: string;
  includeProjectHeader?: boolean;
}

interface DiagnosticResult {
  id: string;
  label: string;
  status: CheckStatus;
  httpStatus: number;
  detail: string;
}

const DIAGNOSTIC_TARGETS: DiagnosticTarget[] = [
  { id: "session", label: "Session API", path: "/api/proxy/accounts/me", includeProjectHeader: false },
  { id: "users", label: "API utilisateurs", path: "/api/proxy/admin/users?page=1&page_size=1" },
  { id: "imports", label: "Journal imports", path: "/api/proxy/import/log?page=1&page_size=1" },
  { id: "workflow", label: "Soumissions workflow", path: "/api/proxy/workflow/submissions?page=1&page_size=1" },
  { id: "refs", label: "Schema referentiel", path: "/api/proxy/data/referentiels/admin-region/schema" },
];

function parsePayload(raw: string): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function getPayloadDetail(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const count = record.count;
    if (typeof count === "number") {
      return `${count} element(s).`;
    }
    const detail = record.detail || record.message || record.error;
    if (typeof detail === "string" && detail.trim()) {
      return detail.trim();
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload.trim().slice(0, 180);
  }

  return "Requete traitee.";
}

function getErrorDetail(payload: unknown, status: number): string {
  const detail = getPayloadDetail(payload);
  if (detail && detail !== "Requete traitee.") return detail;
  return `Erreur HTTP ${status}.`;
}

export default function ToolsTab({ userRole, activeProjectCode }: ToolsTabProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const runDiagnostics = useCallback(async () => {
    setLoading(true);
    try {
      const checks = await Promise.all(
        DIAGNOSTIC_TARGETS.map(async (target): Promise<DiagnosticResult> => {
          try {
            const headers = new Headers({ Accept: "application/json" });
            if (target.includeProjectHeader !== false && activeProjectCode) {
              headers.set("X-Project-Code", activeProjectCode);
            }

            const response = await fetch(target.path, {
              method: "GET",
              headers,
              credentials: "include",
              cache: "no-store",
            });

            const raw = await response.text();
            const payload = parsePayload(raw);

            if (response.ok) {
              return {
                id: target.id,
                label: target.label,
                status: "ok",
                httpStatus: response.status,
                detail: getPayloadDetail(payload),
              };
            }

            return {
              id: target.id,
              label: target.label,
              status: "error",
              httpStatus: response.status,
              detail: getErrorDetail(payload, response.status),
            };
          } catch (errorValue: unknown) {
            return {
              id: target.id,
              label: target.label,
              status: "error",
              httpStatus: 0,
              detail: errorValue instanceof Error ? errorValue.message : "Erreur reseau.",
            };
          }
        })
      );

      setResults(checks);
      setLastRun(new Date().toLocaleString("fr-FR"));
    } finally {
      setLoading(false);
    }
  }, [activeProjectCode]);

  useEffect(() => {
    void runDiagnostics();
  }, [runDiagnostics]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-emerald-700" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Tools admin</p>
              <p className="text-xs text-slate-500">
                Role: <span className="font-mono">{userRole}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void runDiagnostics()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Relancer checks
          </button>
        </div>

        <div className="p-4">
          {lastRun ? <p className="text-xs text-slate-500 mb-3">Derniere execution: {lastRun}</p> : null}
          <div className="space-y-2">
            {results.map((result) => (
              <div
                key={result.id}
                className={`rounded-lg border px-3 py-2 ${
                  result.status === "ok"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-rose-200 bg-rose-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-slate-800">{result.label}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-medium">
                    {result.status === "ok" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-600" />
                    )}
                    {result.httpStatus > 0 ? `HTTP ${result.httpStatus}` : "Erreur"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">{result.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <p className="text-sm font-semibold text-slate-800 mb-2">Acces rapide</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          <Link
            href="/tools"
            className="inline-flex items-center justify-between gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Ouvrir module Tools
            <ExternalLink className="h-4 w-4" />
          </Link>
          <Link
            href="/workflow"
            className="inline-flex items-center justify-between gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Workflow
            <ExternalLink className="h-4 w-4" />
          </Link>
          <Link
            href="/data"
            className="inline-flex items-center justify-between gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Data
            <ExternalLink className="h-4 w-4" />
          </Link>
          <Link
            href="/cartographie"
            className="inline-flex items-center justify-between gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cartographie
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
