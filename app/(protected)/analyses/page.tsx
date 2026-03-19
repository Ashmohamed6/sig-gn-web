"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { getCurrentProject } from "@/utils/authClient";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */
type ArchiveForm = {
  dataset_code: string;
  label: string;
  stage_table: string;
  metrics_count: number;
  snapshot_count: number;
  entities_count: number;
  years_available: number[];
  has_data: boolean;
  core_sources: string[];
};

type DirectEntity = {
  entity_id: string;
  entity_name: string;
  years: number[];
  records_count: number;
};

type CompareField = {
  field: string;
  label: string;
  value_a: unknown;
  value_b: unknown;
  delta: number | null;
  delta_pct: number | null;
  trend: string;
  changed?: boolean;
};

type CompareEntityResponse = {
  entity_id: string;
  year_a: number;
  year_b: number;
  fields: CompareField[];
  records_a: Record<string, unknown>[];
  records_b: Record<string, unknown>[];
  summary: {
    total_fields: number;
    progressions: number;
    regressions: number;
    stables: number;
    changed_text: number;
  };
};

type GlobalField = {
  field: string;
  label: string;
  type: string;
  value_a: number | null;
  value_b: number | null;
  delta: number | null;
  delta_pct: number | null;
  trend: string;
  entities_a: number;
  entities_b: number;
};

type CompareGlobalResponse = {
  fields: GlobalField[];
};

type ArchivePreviewSource = {
  source_reference: string;
  table_name: string;
  columns: string[];
  column_labels?: Record<string, string>;
  rows: Record<string, unknown>[];
  returned_rows: number;
  error?: string;
};

type ArchivePreviewResponse = {
  dataset_code: string;
  label: string;
  source_count: number;
  sources: ArchivePreviewSource[];
};

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
function defaultYears() {
  const current = new Date().getFullYear();
  return { yearA: current - 1, yearB: current };
}

function parseApiError(payload: unknown, status: number): string {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return `Erreur ${status}`;
  const obj = payload as Record<string, unknown>;
  for (const key of ["detail", "message", "error", "non_field_errors"]) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value;
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") return String(value[0]);
  }
  return `Erreur ${status}`;
}

async function fetchJson<T>(url: string, projectCode: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { "X-Project-Code": projectCode },
  });
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) throw new Error(parseApiError(payload, response.status));
  return payload as T;
}

function fmt(value: number | null | undefined, unit = "") {
  if (value === null || value === undefined) return "\u2014";
  const formatted = value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  return unit ? `${formatted} ${unit}` : formatted;
}

function renderCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "\u2014";
  if (typeof value === "number") return value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "object") {
    try { return JSON.stringify(value); } catch { return "[objet]"; }
  }
  return String(value);
}

function TrendBadge({ trend }: { trend: string }) {
  switch (trend) {
    case "progression":
      return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">&#x2191; Progression</span>;
    case "regression":
      return <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">&#x2193; R&eacute;gression</span>;
    case "stable":
      return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">= Stable</span>;
    case "changed":
      return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">~ Modifi&eacute;</span>;
    case "insufficient_data":
      return <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">&#x2139; 1 p&eacute;riode</span>;
    default:
      return <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-xs text-slate-400">&mdash;</span>;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB BUTTON
   ═══════════════════════════════════════════════════════════════════════════ */
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
        active
          ? "border-emerald-600 text-emerald-700 bg-white"
          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STAT CARD
   ═══════════════════════════════════════════════════════════════════════════ */
function StatCard({ label, value, color = "slate" }: { label: string; value: string | number; color?: string }) {
  const colorMap: Record<string, string> = {
    slate: "border-slate-200 bg-slate-50 text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${colorMap[color] || colorMap.slate}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function AnalysesPage() {
  const defaults = useMemo(() => defaultYears(), []);

  /* ── Shared state ── */
  const [projectCode, setProjectCode] = useState("");
  const [forms, setForms] = useState<ArchiveForm[]>([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [yearA, setYearA] = useState(defaults.yearA);
  const [yearB, setYearB] = useState(defaults.yearB);
  const [regionId, setRegionId] = useState("");
  const [activeTab, setActiveTab] = useState<"entity" | "global" | "preview">("entity");
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Tab 1: Comparaison par entit&eacute; ── */
  const [directEntities, setDirectEntities] = useState<DirectEntity[]>([]);
  const [entitySearch, setEntitySearch] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [entityComparison, setEntityComparison] = useState<CompareEntityResponse | null>(null);
  const [isLoadingDirectEntities, setIsLoadingDirectEntities] = useState(false);
  const [isLoadingEntityCompare, setIsLoadingEntityCompare] = useState(false);

  /* ── Tab 2: Comparaison globale ── */
  const [globalComparison, setGlobalComparison] = useState<CompareGlobalResponse | null>(null);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);

  /* ── Tab 3: Aper&ccedil;u ── */
  const [preview, setPreview] = useState<ArchivePreviewResponse | null>(null);
  const [selectedSourceReference, setSelectedSourceReference] = useState("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  /* ── Init project ── */
  useEffect(() => {
    const project = getCurrentProject();
    const code = String(project?.code_fonc || "").trim().toUpperCase();
    setProjectCode(code);
  }, []);

  /* ── Load forms ── */
  useEffect(() => {
    if (!projectCode) return;
    let active = true;
    setIsLoadingForms(true);
    setError(null);

    fetchJson<{ results: ArchiveForm[] }>("/api/proxy/archive/forms", projectCode)
      .then((payload) => {
        if (!active) return;
        const rows = payload.results || [];
        setForms(rows);
        if (rows.length > 0) {
          setSelectedDataset((prev) => {
            if (prev && rows.some((item) => item.dataset_code === prev)) return prev;
            return rows[0].dataset_code;
          });
        } else {
          setSelectedDataset("");
        }
      })
      .catch((err) => {
        if (!active) return;
        setForms([]);
        setSelectedDataset("");
        setError(err instanceof Error ? err.message : "Erreur chargement formulaires.");
      })
      .finally(() => { if (active) setIsLoadingForms(false); });

    return () => { active = false; };
  }, [projectCode]);

  const selectedForm = useMemo(
    () => forms.find((item) => item.dataset_code === selectedDataset) || null,
    [forms, selectedDataset]
  );

  // Auto-set years
  useEffect(() => {
    if (!selectedForm) return;
    const years = [...(selectedForm.years_available || [])].sort((a, b) => a - b);
    if (years.length >= 2) { setYearA(years[years.length - 2]); setYearB(years[years.length - 1]); }
    else if (years.length === 1) { setYearA(years[0] - 1); setYearB(years[0]); }
  }, [selectedForm?.dataset_code]);

  // Reset on dataset change
  useEffect(() => {
    setSelectedEntityId("");
    setEntityComparison(null);
    setGlobalComparison(null);
    setDirectEntities([]);
    setPreview(null);
  }, [selectedDataset]);

  /* ── Tab 1: Direct entities ── */
  const loadDirectEntities = useCallback(async () => {
    if (!projectCode || !selectedDataset) return;
    setIsLoadingDirectEntities(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (entitySearch.trim()) params.set("q", entitySearch.trim());
      const qs = params.toString();
      const payload = await fetchJson<{ results: DirectEntity[] }>(
        `/api/proxy/archive/forms/${encodeURIComponent(selectedDataset)}/entities-direct/${qs ? `?${qs}` : ""}`,
        projectCode
      );
      setDirectEntities(payload.results || []);
    } catch (err) {
      setDirectEntities([]);
      setError(err instanceof Error ? err.message : "Erreur chargement des entit\u00e9s.");
    } finally {
      setIsLoadingDirectEntities(false);
    }
  }, [projectCode, selectedDataset, entitySearch]);

  useEffect(() => {
    if (activeTab === "entity" && projectCode && selectedDataset) loadDirectEntities();
  }, [activeTab, selectedDataset, projectCode]);

  const filteredDirectEntities = useMemo(() => {
    const search = entitySearch.trim().toUpperCase();
    if (!search) return directEntities;
    return directEntities.filter(
      (item) => item.entity_id.toUpperCase().includes(search) || item.entity_name.toUpperCase().includes(search)
    );
  }, [directEntities, entitySearch]);

  const runEntityComparison = useCallback(async (entityId?: string) => {
    const eid = entityId || selectedEntityId;
    if (!projectCode || !selectedDataset || !eid) {
      setError("S\u00e9lectionnez une entit\u00e9 pour comparer.");
      return;
    }
    setIsLoadingEntityCompare(true);
    setError(null);
    try {
      const params = new URLSearchParams({ entity_id: eid, year_a: String(yearA), year_b: String(yearB) });
      const payload = await fetchJson<CompareEntityResponse>(
        `/api/proxy/archive/forms/${encodeURIComponent(selectedDataset)}/compare-entity/?${params.toString()}`,
        projectCode
      );
      setEntityComparison(payload);
      setSelectedEntityId(eid);
    } catch (err) {
      setEntityComparison(null);
      setError(err instanceof Error ? err.message : "Erreur comparaison entit\u00e9.");
    } finally {
      setIsLoadingEntityCompare(false);
    }
  }, [projectCode, selectedDataset, selectedEntityId, yearA, yearB]);

  /* ── Tab 2: Global comparison ── */
  const runGlobalComparison = useCallback(async () => {
    if (!projectCode || !selectedDataset) return;
    setIsLoadingGlobal(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year_a: String(yearA), year_b: String(yearB) });
      if (regionId.trim()) params.set("region_id", regionId.trim().toUpperCase());
      const payload = await fetchJson<CompareGlobalResponse>(
        `/api/proxy/archive/forms/${encodeURIComponent(selectedDataset)}/compare-global/?${params.toString()}`,
        projectCode
      );
      setGlobalComparison(payload);
    } catch (err) {
      setGlobalComparison(null);
      setError(err instanceof Error ? err.message : "Erreur comparaison globale.");
    } finally {
      setIsLoadingGlobal(false);
    }
  }, [projectCode, selectedDataset, yearA, yearB, regionId]);

  /* ── Tab 3: Preview ── */
  const loadPreview = useCallback(async () => {
    if (!projectCode || !selectedDataset) return;
    setIsLoadingPreview(true);
    setError(null);
    try {
      const payload = await fetchJson<ArchivePreviewResponse>(
        `/api/proxy/archive/forms/${encodeURIComponent(selectedDataset)}/preview?limit=20`,
        projectCode
      );
      setPreview(payload);
      setSelectedSourceReference((current) => current || payload.sources?.[0]?.source_reference || "");
    } catch (err) {
      setPreview(null);
      setSelectedSourceReference("");
      setError(err instanceof Error ? err.message : "Erreur chargement aper\u00e7u.");
    } finally {
      setIsLoadingPreview(false);
    }
  }, [projectCode, selectedDataset]);

  useEffect(() => {
    if (activeTab === "preview" && projectCode && selectedDataset && !preview) loadPreview();
  }, [activeTab, selectedDataset, projectCode]);

  const activePreviewSource = useMemo(() => {
    if (!preview?.sources || preview.sources.length === 0) return null;
    return preview.sources.find((item) => item.source_reference === selectedSourceReference) || preview.sources[0];
  }, [preview, selectedSourceReference]);

  const entitySummary = entityComparison?.summary;

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* ── Header ── */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Analyses comparatives</h1>
        <p className="mt-1 text-sm text-slate-500">
          Comparez l&apos;&eacute;volution des indicateurs d&apos;une entit&eacute; ou de l&apos;ensemble des donn&eacute;es collect&eacute;es entre deux p&eacute;riodes.
        </p>
      </div>

      {!projectCode && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Aucun projet s&eacute;lectionn&eacute;. Choisissez d&apos;abord un projet depuis le menu.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
          <span className="mt-0.5">&#x26A0;</span>
          <span>{error}</span>
        </div>
      )}

      {/* ═══════════ FORMULAIRE + ANN&Eacute;ES ═══════════ */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Param&egrave;tres de l&apos;analyse</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
          <div className="md:col-span-5">
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Formulaire de collecte</label>
            <select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              disabled={isLoadingForms || forms.length === 0}
            >
              {forms.length === 0 ? (
                <option value="">Aucun formulaire disponible</option>
              ) : (
                forms.map((item) => (
                  <option key={item.dataset_code} value={item.dataset_code}>
                    {item.label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-slate-600">P&eacute;riode A</label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={yearA}
              onChange={(e) => setYearA(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-center font-mono focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-slate-600">P&eacute;riode B</label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={yearB}
              onChange={(e) => setYearB(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-center font-mono focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-1.5 block text-xs font-medium text-slate-600">R&eacute;gion (optionnel)</label>
            <input
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              placeholder="Ex: GN007"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </section>

      {/* ═══════════ ONGLETS ═══════════ */}
      <div className="flex gap-1 border-b border-slate-200 bg-slate-50 rounded-t-xl px-2 pt-2">
        <TabButton active={activeTab === "entity"} onClick={() => setActiveTab("entity")}>
          Comparaison par entit&eacute;
        </TabButton>
        <TabButton active={activeTab === "global"} onClick={() => setActiveTab("global")}>
          Comparaison globale
        </TabButton>
        <TabButton active={activeTab === "preview"} onClick={() => setActiveTab("preview")}>
          Aper&ccedil;u des donn&eacute;es
        </TabButton>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ONGLET 1 : COMPARAISON PAR ENTIT&Eacute;
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "entity" && (
        <section className="rounded-b-2xl rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* ── Panneau gauche : liste des entit&eacute;s ── */}
            <div className="lg:col-span-4 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Entit&eacute;s collect&eacute;es</h3>
              <p className="text-[11px] text-slate-500">
                Cliquez sur une entit&eacute; pr&eacute;sente dans les deux p&eacute;riodes pour voir l&apos;&eacute;volution.
              </p>

              <div className="flex gap-2">
                <input
                  value={entitySearch}
                  onChange={(e) => setEntitySearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadDirectEntities()}
                  placeholder="Rechercher une entit&eacute;..."
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={loadDirectEntities}
                  disabled={isLoadingDirectEntities || !selectedDataset}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {isLoadingDirectEntities ? "..." : "Chercher"}
                </button>
              </div>

              <div className="max-h-[480px] overflow-auto rounded-lg border border-slate-200">
                {filteredDirectEntities.length === 0 ? (
                  <p className="px-4 py-8 text-sm text-slate-400 text-center">
                    {isLoadingDirectEntities ? "Chargement en cours..." : "Aucune entit\u00e9 trouv\u00e9e. Cliquez sur \u00ab Chercher \u00bb."}
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {filteredDirectEntities.map((ent) => {
                      const hasA = ent.years.includes(yearA);
                      const hasB = ent.years.includes(yearB);
                      const canCompare = hasA && hasB;
                      const isSelected = selectedEntityId === ent.entity_id;
                      return (
                        <li
                          key={ent.entity_id}
                          className={`px-3 py-2.5 text-sm transition-colors cursor-pointer hover:bg-emerald-50 ${
                            isSelected ? "bg-emerald-50 border-l-3 border-emerald-500" : ""
                          }`}
                          onClick={() => runEntityComparison(ent.entity_id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate">{ent.entity_id}</p>
                              {ent.entity_name !== ent.entity_id && (
                                <p className="text-xs text-slate-500 truncate">{ent.entity_name}</p>
                              )}
                            </div>
                            <div className="flex-shrink-0 ml-2 flex items-center gap-1">
                              {canCompare ? (
                                <span className="text-emerald-600 text-sm font-bold" title="Donn&eacute;es dans les deux p&eacute;riodes">&#x25B6;</span>
                              ) : (
                                <span className="text-amber-500 text-[10px] font-medium" title="Donn&eacute;es dans une seule p&eacute;riode">1 an</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {ent.years.map((y) => (
                              <span
                                key={y}
                                className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                                  y === yearA || y === yearB
                                    ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {y}
                              </span>
                            ))}
                            <span className="text-[10px] text-slate-400 ml-auto self-center">
                              {ent.records_count} collecte{ent.records_count > 1 ? "s" : ""}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* ── Panneau droit : r&eacute;sultat comparaison ── */}
            <div className="lg:col-span-8 p-4 space-y-4">
              {isLoadingEntityCompare ? (
                <div className="flex items-center justify-center h-48">
                  <div className="text-sm text-slate-500 animate-pulse">Chargement de la comparaison...</div>
                </div>
              ) : !entityComparison ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </div>
                  <p className="text-sm text-slate-500">S&eacute;lectionnez une entit&eacute; dans la liste pour comparer</p>
                  <p className="text-xs text-slate-400 mt-1">L&apos;entit&eacute; doit &ecirc;tre pr&eacute;sente dans les deux p&eacute;riodes ({yearA} et {yearB})</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {entityComparison.entity_id}
                      </h3>
                      <p className="text-xs text-slate-500">
                        &Eacute;volution {entityComparison.year_a} &#x2192; {entityComparison.year_b}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => runEntityComparison()}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      Actualiser
                    </button>
                  </div>

                  {entitySummary && (
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                      <StatCard label="Champs" value={entitySummary.total_fields} />
                      <StatCard label="Progressions" value={entitySummary.progressions} color="emerald" />
                      <StatCard label="R&eacute;gressions" value={entitySummary.regressions} color="rose" />
                      <StatCard label="Stables" value={entitySummary.stables} />
                      <StatCard label="Texte modifi&eacute;" value={entitySummary.changed_text} color="amber" />
                    </div>
                  )}

                  <div className="overflow-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Indicateur</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">{entityComparison.year_a}</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">{entityComparison.year_b}</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">&Eacute;cart</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">%</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600">Tendance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {entityComparison.fields.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                              Aucune donn&eacute;e &agrave; comparer pour cette entit&eacute;.
                            </td>
                          </tr>
                        ) : (
                          entityComparison.fields.map((f) => (
                            <tr key={f.field} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5">
                                <span className="font-medium text-slate-800">{f.label}</span>
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-700">
                                {renderCell(f.value_a)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-700">
                                {renderCell(f.value_b)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-xs">
                                {f.delta !== null && f.delta !== undefined ? (
                                  <span className={f.delta > 0 ? "text-emerald-600" : f.delta < 0 ? "text-rose-600" : "text-slate-500"}>
                                    {f.delta > 0 ? "+" : ""}{fmt(f.delta)}
                                  </span>
                                ) : f.changed !== undefined ? (
                                  <span className={f.changed ? "text-amber-600 text-[11px]" : "text-slate-400"}>
                                    {f.changed ? "modifi\u00e9" : "\u2014"}
                                  </span>
                                ) : "\u2014"}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-xs">
                                {f.delta_pct !== null && f.delta_pct !== undefined ? (
                                  <span className={f.delta_pct > 0 ? "text-emerald-600" : f.delta_pct < 0 ? "text-rose-600" : "text-slate-500"}>
                                    {f.delta_pct > 0 ? "+" : ""}{fmt(f.delta_pct)}%
                                  </span>
                                ) : "\u2014"}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <TrendBadge trend={f.trend} />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ONGLET 2 : COMPARAISON GLOBALE
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "global" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Totaux agr&eacute;g&eacute;s &mdash; {selectedForm?.label || selectedDataset}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Somme ou moyenne de tous les indicateurs num&eacute;riques pour toutes les entit&eacute;s.
              </p>
            </div>
            <button
              type="button"
              onClick={runGlobalComparison}
              disabled={!selectedDataset || isLoadingGlobal}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isLoadingGlobal ? "Calcul en cours..." : "Lancer la comparaison"}
            </button>
          </div>

          {isLoadingGlobal ? (
            <p className="text-sm text-slate-500 animate-pulse py-8 text-center">Calcul des agr&eacute;gats en cours...</p>
          ) : !globalComparison ? (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="text-sm text-slate-500">Cliquez sur &laquo; Lancer la comparaison &raquo; pour voir les totaux.</p>
            </div>
          ) : globalComparison.fields.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Aucun indicateur num&eacute;rique trouv&eacute; pour ce formulaire.</p>
          ) : (
            <div className="overflow-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Indicateur</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600">Agr&eacute;gation</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">
                      {yearA}
                      {globalComparison.fields[0] && (
                        <span className="block text-[10px] font-normal text-slate-400">
                          {globalComparison.fields[0].entities_a} entit&eacute;{globalComparison.fields[0].entities_a > 1 ? "s" : ""}
                        </span>
                      )}
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">
                      {yearB}
                      {globalComparison.fields[0] && (
                        <span className="block text-[10px] font-normal text-slate-400">
                          {globalComparison.fields[0].entities_b} entit&eacute;{globalComparison.fields[0].entities_b > 1 ? "s" : ""}
                        </span>
                      )}
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">&Eacute;cart</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">%</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600">Tendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {globalComparison.fields.map((f) => (
                    <tr key={f.field} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-slate-800">{f.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          f.type === "MOY" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        }`}>
                          {f.type === "MOY" ? "Moyenne" : "Somme"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-700">{fmt(f.value_a)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-700">{fmt(f.value_b)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">
                        {f.delta !== null ? (
                          <span className={f.delta > 0 ? "text-emerald-600" : f.delta < 0 ? "text-rose-600" : "text-slate-500"}>
                            {f.delta > 0 ? "+" : ""}{fmt(f.delta)}
                          </span>
                        ) : "\u2014"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">
                        {f.delta_pct !== null ? (
                          <span className={f.delta_pct > 0 ? "text-emerald-600" : f.delta_pct < 0 ? "text-rose-600" : "text-slate-500"}>
                            {f.delta_pct > 0 ? "+" : ""}{fmt(f.delta_pct)}%
                          </span>
                        ) : "\u2014"}
                      </td>
                      <td className="px-4 py-2.5 text-center"><TrendBadge trend={f.trend} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ONGLET 3 : APER&Ccedil;U DES DONN&Eacute;ES
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "preview" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-slate-800">
                Aper&ccedil;u des donn&eacute;es collect&eacute;es &mdash; {selectedForm?.label || selectedDataset}
              </h3>
              <button
                type="button"
                onClick={loadPreview}
                disabled={!selectedDataset || isLoadingPreview}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {isLoadingPreview ? "..." : "Actualiser"}
              </button>
            </div>
            {preview?.sources && preview.sources.length > 1 && (
              <div className="w-full md:w-auto">
                <select
                  value={selectedSourceReference}
                  onChange={(e) => setSelectedSourceReference(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {preview.sources.map((source) => (
                    <option key={source.source_reference} value={source.source_reference}>
                      {source.source_reference}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {!selectedDataset ? (
            <p className="text-sm text-slate-400 py-8 text-center">S&eacute;lectionnez un formulaire pour voir ses donn&eacute;es.</p>
          ) : isLoadingPreview ? (
            <p className="text-sm text-slate-500 py-8 text-center animate-pulse">Chargement de l&apos;aper&ccedil;u...</p>
          ) : !activePreviewSource ? (
            <p className="text-sm text-slate-400 py-8 text-center">Aucun aper&ccedil;u disponible.</p>
          ) : activePreviewSource.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {activePreviewSource.error}
            </div>
          ) : activePreviewSource.rows.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Aucune donn&eacute;e dans cette table pour le moment.</p>
          ) : (
            <div className="overflow-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {activePreviewSource.columns.map((column) => (
                      <th key={column} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-slate-600">
                        {activePreviewSource.column_labels?.[column] || column.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activePreviewSource.rows.map((row, rowIndex) => (
                    <tr key={`preview-row-${rowIndex}`} className="hover:bg-slate-50/50">
                      {activePreviewSource.columns.map((column) => (
                        <td key={`${rowIndex}-${column}`} className="whitespace-nowrap px-4 py-2">
                          {renderCell(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            Affichage limit&eacute; aux 20 derni&egrave;res lignes. Les donn&eacute;es proviennent des tables core apr&egrave;s import et validation.
          </p>
        </section>
      )}
    </div>
  );
}
