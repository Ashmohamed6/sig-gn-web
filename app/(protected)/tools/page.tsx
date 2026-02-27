"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Database,
  FolderSync,
  Home,
  Loader2,
  LogOut,
  Map,
  Play,
  RefreshCw,
  Settings,
  Shield,
  Terminal,
  Wrench,
  XCircle,
} from "lucide-react";
import { getCurrentProject, getUser, logout, type RefProject } from "@/utils/authClient";
import { hasRole, normalizeUserRole } from "@/types/roles";
import { getTablesByProject, type TableConfig } from "../data/config/tablesConfig";

interface UserInfo {
  first_name?: string;
  last_name?: string;
  username?: string;
  role?: string;
  user_role?: string;
}

type CheckStatus = "ok" | "error";

interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  httpStatus?: number;
  detail: string;
}

interface ApiTestResult {
  status: number;
  ok: boolean;
  preview: string;
}

interface EndpointResult {
  status: number;
  ok: boolean;
  raw: string;
  data: unknown;
}

interface QualitySnapshot {
  samplePath: string;
  importsRuns: number;
  importsFailed: number;
  importsRowsError: number;
  workflowTotal: number;
  workflowPending: number;
  sampleRows: number;
  sampleMissingId: number;
  sampleMissingGeom: number;
  sampleMojibake: number;
}

const DEFAULT_TEST_PATH = "/api/proxy/data/cep-parcelles/?page=1&page_size=1";

function toProxyPath(endpoint: string, query?: string): string {
  const normalized = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const withTrailing = normalized.endsWith("/") ? normalized : `${normalized}/`;
  return `/api/proxy${withTrailing}${query ? `?${query}` : ""}`;
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim().length === 0) return false;
  return true;
}

function extractRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"));
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const p = payload as Record<string, unknown>;
  if (Array.isArray(p.results)) {
    return p.results.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"));
  }

  if (Array.isArray(p.features)) {
    return p.features
      .filter((feature): feature is Record<string, unknown> => Boolean(feature && typeof feature === "object"))
      .map((feature) => {
        const f = feature as Record<string, unknown>;
        const props = (f.properties || {}) as Record<string, unknown>;
        return { ...props, geometry: f.geometry };
      });
  }

  return [];
}

function countMojibake(value: unknown): number {
  if (typeof value === "string") {
    return /[\u00C3\u00C2\u00E2]/.test(value) ? 1 : 0;
  }

  if (Array.isArray(value)) {
    return value.reduce((acc, item) => acc + countMojibake(item), 0);
  }

  if (!value || typeof value !== "object") {
    return 0;
  }

  const entries = Object.values(value as Record<string, unknown>);
  return entries.reduce<number>((acc, item) => acc + countMojibake(item), 0);
}

function inferIdField(table: TableConfig | null, row?: Record<string, unknown>): string {
  if (!table) return "id";

  const tableCandidates = table.columns.map((col) => col.key);
  const candidates = [
    ...tableCandidates.filter((key) => /^id$|^id_|_uuid$|uuid$/.test(key)),
    ...tableCandidates.filter((key) => key.startsWith("code_")),
    "id",
    "uuid",
  ];

  for (const candidate of candidates) {
    if (row) {
      if (hasValue(row[candidate])) return candidate;
      continue;
    }
    if (tableCandidates.includes(candidate)) return candidate;
  }

  return tableCandidates[0] || "id";
}

export default function ToolsPage() {
  const router = useRouter();

  const [project, setProject] = useState<RefProject | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [diagnosticBusy, setDiagnosticBusy] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<CheckResult[]>([]);
  const [lastDiagnosticRun, setLastDiagnosticRun] = useState<string | null>(null);

  const [qualityBusy, setQualityBusy] = useState(false);
  const [qualityResults, setQualityResults] = useState<CheckResult[]>([]);
  const [qualitySnapshot, setQualitySnapshot] = useState<QualitySnapshot | null>(null);
  const [lastQualityRun, setLastQualityRun] = useState<string | null>(null);

  const [apiPath, setApiPath] = useState(DEFAULT_TEST_PATH);
  const [apiBusy, setApiBusy] = useState(false);
  const [apiResult, setApiResult] = useState<ApiTestResult | null>(null);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError(null);

        const currentProject = getCurrentProject();
        if (!currentProject) {
          router.push("/project-selection");
          return;
        }
        setProject(currentProject);

        const userData = await getUser();
        if (!userData) {
          router.push("/login");
          return;
        }
        setUser(userData as unknown as UserInfo);
      } catch (err: any) {
        setError(err?.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  const userName = useMemo(() => {
    const full = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
    return full || user?.username || "Utilisateur";
  }, [user]);

  const role = normalizeUserRole(String(user?.role || user?.user_role || ""));
  const canAccessAdmin = hasRole(role, "chef_projet");

  const projectTables = useMemo(() => {
    if (!project?.code_fonc) return [];
    return getTablesByProject(project.code_fonc);
  }, [project?.code_fonc]);

  const sampleTable = useMemo<TableConfig | null>(() => {
    if (projectTables.length === 0) return null;
    return projectTables[0] || null;
  }, [projectTables]);

  const samplePath = useMemo(() => {
    if (!sampleTable) return "/api/proxy/data/cep-parcelles/?page=1&page_size=30";
    return toProxyPath(sampleTable.endpoint, "page=1&page_size=30");
  }, [sampleTable]);

  useEffect(() => {
    if (apiPath === DEFAULT_TEST_PATH || apiPath.trim().length === 0) {
      const next = samplePath.replace("page=1&page_size=30", "page=1&page_size=1");
      setApiPath(next);
    }
  }, [samplePath, apiPath]);

  const fetchEndpoint = useCallback(
    async (path: string, includeProjectHeader = true): Promise<EndpointResult> => {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      const headers: Record<string, string> = { Accept: "application/json" };

      if (includeProjectHeader && project?.code_fonc) {
        headers["X-Project-Code"] = project.code_fonc;
      }

      const response = await fetch(normalizedPath, {
        method: "GET",
        headers,
        credentials: "include",
        cache: "no-store",
      });

      const raw = await response.text();
      let data: unknown = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = raw;
      }

      return {
        status: response.status,
        ok: response.ok,
        raw,
        data,
      };
    },
    [project?.code_fonc]
  );

  const runDiagnostics = useCallback(async () => {
    setDiagnosticBusy(true);
    setDiagnosticResults([]);

    const checks: Array<{ id: string; label: string; path: string; includeProjectHeader?: boolean }> = [
      { id: "session", label: "Session utilisateur", path: "/api/auth/me", includeProjectHeader: false },
      { id: "proxy_data", label: "Proxy donnees", path: samplePath.replace("page=1&page_size=30", "page=1&page_size=1") },
      { id: "proxy_workflow", label: "Proxy workflow", path: "/api/proxy/workflow/submissions/?page=1&page_size=1" },
    ];

    const results: CheckResult[] = [];

    for (const check of checks) {
      try {
        const result = await fetchEndpoint(check.path, check.includeProjectHeader !== false);
        results.push({
          id: check.id,
          label: check.label,
          status: result.ok ? "ok" : "error",
          httpStatus: result.status,
          detail: result.ok
            ? "Requete reussie."
            : "Reponse non OK. Verifier droits, endpoint ou scope projet.",
        });
      } catch (errorValue: unknown) {
        results.push({
          id: check.id,
          label: check.label,
          status: "error",
          detail: errorValue instanceof Error ? errorValue.message : "Erreur reseau",
        });
      }
    }

    setDiagnosticResults(results);
    setLastDiagnosticRun(new Date().toLocaleString("fr-FR"));
    setDiagnosticBusy(false);
  }, [fetchEndpoint, samplePath]);

  const runQualityAudit = useCallback(async () => {
    setQualityBusy(true);
    setQualityResults([]);
    setQualitySnapshot(null);

    const results: CheckResult[] = [];
    let importsRuns = 0;
    let importsFailed = 0;
    let importsRowsError = 0;
    let workflowTotal = 0;
    let workflowPending = 0;
    let sampleRows = 0;
    let sampleMissingId = 0;
    let sampleMissingGeom = 0;
    let sampleMojibake = 0;

    try {
      const importsRes = await fetchEndpoint("/api/proxy/import/log/?page=1&page_size=30", true);
      if (importsRes.ok) {
        const rows = extractRows(importsRes.data);
        importsRuns = rows.length;
        importsFailed = rows.filter((row) => String(row.status || "").toLowerCase().startsWith("failed")).length;
        importsRowsError = rows.reduce((acc, row) => acc + Number(row.rows_error || 0), 0);

        results.push({
          id: "imports_quality",
          label: "Qualite imports",
          status: importsFailed === 0 && importsRowsError === 0 ? "ok" : "error",
          httpStatus: importsRes.status,
          detail:
            importsRuns === 0
              ? "Aucun lot recent."
              : `${importsFailed} lot(s) en echec, ${importsRowsError} ligne(s) en erreur sur ${importsRuns} lot(s).`,
        });
      } else {
        results.push({
          id: "imports_quality",
          label: "Qualite imports",
          status: "error",
          httpStatus: importsRes.status,
          detail: "Impossible de lire le journal d'import.",
        });
      }
    } catch (errorValue: unknown) {
      results.push({
        id: "imports_quality",
        label: "Qualite imports",
        status: "error",
        detail: errorValue instanceof Error ? errorValue.message : "Erreur reseau",
      });
    }

    try {
      const workflowRes = await fetchEndpoint("/api/proxy/workflow/submissions/?page=1&page_size=50", true);
      if (workflowRes.ok) {
        const rows = extractRows(workflowRes.data);
        workflowTotal = rows.length;
        workflowPending = rows.filter((row) => {
          const status = String(row.status || "").toLowerCase();
          return status === "submitted" || status === "validated";
        }).length;

        const rejected = rows.filter((row) => String(row.status || "").toLowerCase() === "rejected").length;

        results.push({
          id: "workflow_quality",
          label: "Pipeline workflow",
          status: rejected === 0 ? "ok" : "error",
          httpStatus: workflowRes.status,
          detail:
            workflowTotal === 0
              ? "Aucune soumission recente."
              : `${workflowPending} en attente, ${rejected} rejetee(s), ${workflowTotal} observee(s).`,
        });
      } else {
        results.push({
          id: "workflow_quality",
          label: "Pipeline workflow",
          status: "error",
          httpStatus: workflowRes.status,
          detail: "Impossible de lire les soumissions workflow.",
        });
      }
    } catch (errorValue: unknown) {
      results.push({
        id: "workflow_quality",
        label: "Pipeline workflow",
        status: "error",
        detail: errorValue instanceof Error ? errorValue.message : "Erreur reseau",
      });
    }

    try {
      const sampleRes = await fetchEndpoint(samplePath, true);
      if (sampleRes.ok) {
        const rows = extractRows(sampleRes.data);
        sampleRows = rows.length;

        const idField = inferIdField(sampleTable, rows[0]);
        sampleMissingId = rows.filter((row) => !hasValue(row[idField])).length;

        const geometryField = sampleTable?.geometryField || "geom";
        const needGeometry = Boolean(sampleTable?.hasGeometry);
        sampleMissingGeom = needGeometry
          ? rows.filter((row) => !hasValue(row[geometryField]) && !hasValue(row.geometry)).length
          : 0;

        sampleMojibake = rows.reduce((acc, row) => acc + countMojibake(row), 0);

        results.push({
          id: "sample_quality",
          label: "Echantillon table active",
          status: sampleMissingId === 0 && sampleMissingGeom === 0 && sampleMojibake === 0 ? "ok" : "error",
          httpStatus: sampleRes.status,
          detail:
            sampleRows === 0
              ? "Aucune ligne chargee pour l'echantillon."
              : `${sampleMissingId} id manquant(s), ${sampleMissingGeom} geometrie(s) manquante(s), ${sampleMojibake} chaine(s) suspecte(s).`,
        });
      } else {
        results.push({
          id: "sample_quality",
          label: "Echantillon table active",
          status: "error",
          httpStatus: sampleRes.status,
          detail: `Impossible de lire l'echantillon (${sampleTable?.name || "table"}).`,
        });
      }
    } catch (errorValue: unknown) {
      results.push({
        id: "sample_quality",
        label: "Echantillon table active",
        status: "error",
        detail: errorValue instanceof Error ? errorValue.message : "Erreur reseau",
      });
    }

    setQualityResults(results);
    setQualitySnapshot({
      samplePath,
      importsRuns,
      importsFailed,
      importsRowsError,
      workflowTotal,
      workflowPending,
      sampleRows,
      sampleMissingId,
      sampleMissingGeom,
      sampleMojibake,
    });
    setLastQualityRun(new Date().toLocaleString("fr-FR"));
    setQualityBusy(false);
  }, [fetchEndpoint, samplePath, sampleTable]);

  const runApiTest = useCallback(async () => {
    setApiBusy(true);
    setApiResult(null);
    try {
      const result = await fetchEndpoint(apiPath, true);
      const preview = result.raw.length > 1800 ? `${result.raw.slice(0, 1800)}\n...` : result.raw;
      setApiResult({
        ok: result.ok,
        status: result.status,
        preview,
      });
    } catch (errorValue: unknown) {
      setApiResult({
        ok: false,
        status: 0,
        preview: errorValue instanceof Error ? errorValue.message : "Erreur reseau",
      });
    } finally {
      setApiBusy(false);
    }
  }, [apiPath, fetchEndpoint]);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/login");
  }, [router]);

  const handleChangeProject = useCallback(() => {
    router.push("/project-selection?change=true");
  }, [router]);

  const handleGoToDashboard = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Chargement des outils...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={handleGoToDashboard}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <header className="flex-shrink-0 bg-gradient-to-r from-[#CE1126] via-[#FFCD00] to-[#009639] shadow-lg rounded-xl overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white drop-shadow">Outils</h1>
              <p className="text-xs text-white/85">{project?.libelle_public || project?.code_fonc}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGoToDashboard}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition text-sm text-white"
              title="Tableau de bord"
            >
              <Home className="h-4 w-4" />
              <span className="hidden md:inline">Dashboard</span>
            </button>

            <button
              onClick={handleChangeProject}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition text-sm text-white"
              title="Changer de projet"
            >
              <FolderSync className="h-4 w-4" />
              <span className="hidden md:inline">Projet</span>
            </button>

            <div className="text-right hidden sm:block px-2">
              <p className="text-sm font-medium text-white">{userName}</p>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition"
              title="Deconnexion"
            >
              <LogOut className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      <main className="mt-4 grid grid-cols-1 xl:grid-cols-12 gap-4">
        <section className="xl:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-800">Diagnostic rapide</h2>
          </div>

          <p className="text-xs text-slate-500 mb-3">
            Controle session, proxy donnees et workflow pour verifier que l&apos;environnement tourne correctement.
          </p>

          <button
            onClick={() => void runDiagnostics()}
            disabled={diagnosticBusy}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-60"
          >
            {diagnosticBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Lancer le diagnostic
          </button>

          {lastDiagnosticRun && (
            <p className="mt-2 text-[11px] text-slate-500">Derniere execution: {lastDiagnosticRun}</p>
          )}

          <div className="mt-3 space-y-2">
            {diagnosticResults.length === 0 ? (
              <p className="text-xs text-slate-500">Aucun resultat pour le moment.</p>
            ) : (
              diagnosticResults.map((item) => (
                <ResultCard key={item.id} item={item} />
              ))
            )}
          </div>
        </section>

        <section className="xl:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-800">Testeur API proxy</h2>
          </div>

          <p className="text-xs text-slate-500 mb-3">
            Test GET sur un endpoint local avec cookies de session et header projet automatique.
          </p>

          <div className="flex flex-col md:flex-row gap-2">
            <input
              value={apiPath}
              onChange={(event) => setApiPath(event.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
              placeholder="/api/proxy/..."
            />
            <button
              onClick={() => void runApiTest()}
              disabled={apiBusy}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm disabled:opacity-60"
            >
              {apiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Tester
            </button>
          </div>

          {apiResult && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-700">
                Statut:{" "}
                <span className={apiResult.ok ? "text-emerald-700" : "text-rose-700"}>
                  {apiResult.status || "Erreur reseau"}
                </span>
              </p>
              <pre className="mt-2 max-h-72 overflow-auto text-[11px] leading-relaxed text-slate-700 bg-white border border-slate-200 rounded p-2 whitespace-pre-wrap">
                {apiResult.preview || "(Reponse vide)"}
              </pre>
            </div>
          )}
        </section>

        <section className="xl:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-semibold text-slate-800">Diagnostic qualite donnees</h2>
          </div>

          <p className="text-xs text-slate-500 mb-3">
            Audit base sur les imports recents, le pipeline workflow et un echantillon de table active.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void runQualityAudit()}
              disabled={qualityBusy}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-60"
            >
              {qualityBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Lancer l'audit qualite
            </button>
            {lastQualityRun && (
              <span className="text-[11px] text-slate-500">Derniere execution: {lastQualityRun}</span>
            )}
          </div>

          {qualitySnapshot && (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              <MetricCard label="Imports (runs)" value={qualitySnapshot.importsRuns} />
              <MetricCard label="Imports en echec" value={qualitySnapshot.importsFailed} danger={qualitySnapshot.importsFailed > 0} />
              <MetricCard label="Rows error" value={qualitySnapshot.importsRowsError} danger={qualitySnapshot.importsRowsError > 0} />
              <MetricCard label="Workflow pending" value={qualitySnapshot.workflowPending} />
              <MetricCard label="Rows sample" value={qualitySnapshot.sampleRows} />
              <MetricCard label="ID manquants" value={qualitySnapshot.sampleMissingId} danger={qualitySnapshot.sampleMissingId > 0} />
              <MetricCard label="Geom manquante" value={qualitySnapshot.sampleMissingGeom} danger={qualitySnapshot.sampleMissingGeom > 0} />
              <MetricCard label="Mojibake detecte" value={qualitySnapshot.sampleMojibake} danger={qualitySnapshot.sampleMojibake > 0} />
            </div>
          )}

          {qualitySnapshot && (
            <p className="mt-2 text-[11px] text-slate-500 font-mono break-all">
              Source echantillon: {qualitySnapshot.samplePath}
            </p>
          )}

          <div className="mt-3 space-y-2">
            {qualityResults.length === 0 ? (
              <p className="text-xs text-slate-500">Aucun resultat pour le moment.</p>
            ) : (
              qualityResults.map((item) => (
                <ResultCard key={item.id} item={item} />
              ))
            )}
          </div>
        </section>

        <section className="xl:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-4 w-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-800">Actions rapides</h2>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <QuickLink href="/data" icon={<Database className="h-4 w-4" />} label="Donnees" />
            <QuickLink href="/cartographie" icon={<Map className="h-4 w-4" />} label="Cartographie" />
            <QuickLink href="/workflow" icon={<FolderSync className="h-4 w-4" />} label="Workflow" />
            {canAccessAdmin && (
              <QuickLink href="/administration" icon={<Shield className="h-4 w-4" />} label="Administration" />
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 space-y-2 text-sm text-slate-700">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Prochaines briques</p>
            <p className="rounded-lg border border-slate-200 px-3 py-2">Assistant import CSV/Excel avec mapping guide</p>
            <p className="rounded-lg border border-slate-200 px-3 py-2">Conversion geo (WKT/GeoJSON + simplification)</p>
            <p className="rounded-lg border border-slate-200 px-3 py-2">Export pack projet (CSV + GeoJSON + resume)</p>
          </div>
        </section>
      </main>
    </div>
  );
}

function ResultCard({ item }: { item: CheckResult }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        item.status === "ok" ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-800">{item.label}</p>
        <span className="inline-flex items-center gap-1 text-xs">
          {item.status === "ok" ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
          )}
          {item.httpStatus ? `HTTP ${item.httpStatus}` : "Erreur"}
        </span>
      </div>
      <p className="text-[11px] text-slate-600 mt-1">{item.detail}</p>
    </div>
  );
}

function MetricCard({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        danger ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`text-lg font-semibold ${danger ? "text-rose-700" : "text-slate-800"}`}>
        {Number(value || 0).toLocaleString("fr-FR")}
      </p>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-sm text-slate-700"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
