"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Database,
  RefreshCw,
  Columns,
  X,
  AlertCircle,
  Loader2,
  Menu,
  LogOut,
  FolderSync,
  Home,
  MapPin,
  Trash2,
} from "lucide-react";

// Components
import DataTable from "./components/DataTable";
import DataFilters from "./components/DataFilters";
import EntitySheet from "./components/EntitySheet";
import ExportMenu from "./components/ExportMenu";

// Config & Hooks
import { GLOBAL_FILTERS, getTablesByProject, TableConfig, UserRole } from "./config/tablesConfig";
import { useDataTable } from "./hooks/useDataTable";
import { normalizeMojibakeDeep } from "./utils/textEncoding";
import { normalizeUserRole, hasRole } from "@/types/roles";

import {
  getCurrentProject,
  logout,
  getUser,
  type RefProject,
} from "@/utils/authClient";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface UserInfo {
  first_name?: string;
  last_name?: string;
  username?: string;
  role?: string;
  user_role?: string;
}

interface DeleteConfirmationContext {
  ids: string[];
  idField: string;
}

const DATA_TABLE_TO_CARTO_LAYER: Record<string, string> = {
  cep: "cep_parcelles",
};

const DATA_TABLE_PRIMARY_ID_FIELDS: Record<string, string[]> = {
  cep: ["cep_uuid", "id_cep"],
  intrants: ["intrant_uuid"],
  ouvrages: ["ouvrage_uuid", "code_ouvrage"],
  zones_degradees: ["zone_uuid", "id_zone"],
  tetes_sources: ["ts_uuid", "id_ts"],
  couloirs: ["id_couloir"],
  organisations: ["org_uuid", "id_org"],
  menages: ["menage_uuid", "id_menage"],
  comites: ["comite_uuid", "id_comite"],
  stations_meteo: ["station_uuid", "code_station"],
  marches: ["marche_uuid", "id_marche"],
  formations: ["formation_uuid", "id_formation"],
  entreprises: ["ent_uuid", "id_ent"],
  sortants: ["suivi_uuid", "id_sortant"],
  emplois: ["emploi_dom_uuid", "id_ent"],
  insertions: ["insertion_dom_uuid", "id_ent"],
};

const DATA_EDIT_ALLOWED_RAW_ROLES = new Set(["manager", "project_manager", "admin"]);

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export default function DataPage() {
  const router = useRouter();

  // Auth / Projet (meme logique que Cartographie)
  const [project, setProject] = useState<RefProject | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI
  const [isTabsOpen, setIsTabsOpen] = useState(true);

  // Colonnes
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());

  // Fiche entite
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Record<string, unknown> | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DeleteConfirmationContext | null>(null);
  const [mutationFeedback, setMutationFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Tables
  const projectCode = project?.code_fonc || "";
  const availableTables = useMemo(() => {
    if (!projectCode) return [];
    return getTablesByProject(projectCode).map((table) => normalizeMojibakeDeep(table));
  }, [projectCode]);
  const normalizedGlobalFilters = useMemo(
    () => normalizeMojibakeDeep(GLOBAL_FILTERS),
    []
  );

  const [activeTableId, setActiveTableId] = useState<string>("");

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);

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
        setUser(userData as UserInfo);
      } catch (err: any) {
        setError(err?.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  // Initialiser l'onglet actif
  useEffect(() => {
    if (availableTables.length > 0 && !activeTableId) {
      setActiveTableId(availableTables[0].id);
    }
  }, [availableTables, activeTableId]);

  const activeTableConfig = useMemo<TableConfig | undefined>(() => {
    if (availableTables.length === 0) return undefined;
    return availableTables.find((t) => t.id === activeTableId) || availableTables[0];
  }, [availableTables, activeTableId]);

  // Reset colonnes visibles quand on change de table
  useEffect(() => {
    if (activeTableConfig) {
      setVisibleColumns(
        new Set(activeTableConfig.columns.filter((c) => c.visible !== false).map((c) => c.key))
      );
    }
  }, [activeTableConfig]);

  const displayedColumns = useMemo(() => {
    if (!activeTableConfig) return [];
    return activeTableConfig.columns.filter((col) => visibleColumns.has(col.key));
  }, [activeTableConfig, visibleColumns]);

  // Token (meme logique que carto)
  const userRole: UserRole = normalizeUserRole((user?.role || user?.user_role) as string | undefined);
  const rawUserRole = useMemo(
    () => String(user?.role || user?.user_role || "").trim().toLowerCase(),
    [user]
  );
  const canEditEntity = useMemo(() => {
    if (rawUserRole && DATA_EDIT_ALLOWED_RAW_ROLES.has(rawUserRole)) return true;
    return hasRole(userRole, "chef_projet");
  }, [rawUserRole, userRole]);

  const tableActions = useMemo(() => {
    if (!activeTableConfig) return [];
    const baseActions = Array.isArray(activeTableConfig.actions) ? activeTableConfig.actions : [];
    if (!canEditEntity) return baseActions;
    if (baseActions.some((action) => action.id === "delete")) return baseActions;
    return [
      ...baseActions,
      {
        id: "delete",
        label: "Supprimer",
        icon: "Trash2",
        type: "row" as const,
        minRole: "chef_projet" as const,
      },
    ];
  }, [activeTableConfig, canEditEntity]);

  const {
    data,
    totalCount,
    loading: tableLoading,
    error: tableError,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    sortKey,
    sortDirection,
    setSort,
    filters,
    setFilter,
    resetFilters,
    activeFiltersCount,
    searchValue,
    setSearchValue,
    selectedRows,
    setSelectedRows,
    refresh,
    exportData,
  } = useDataTable({
    tableConfig: activeTableConfig,
    projectCode: project?.code_fonc,
    initialPageSize: activeTableConfig?.pageSize || 25,
  });

  const userName = useMemo(() => {
    const full = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
    return full || user?.username || "Utilisateur";
  }, [user]);

  useEffect(() => {
    setMutationFeedback(null);
  }, [activeTableConfig?.id]);

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

  const handleRowClick = useCallback((row: Record<string, unknown>) => {
    setEditMode(false);
    setSelectedEntity(row);
    setSheetOpen(true);
  }, []);

  const handleViewOnMap = useCallback(
    (rows: Record<string, unknown>[]) => {
      if (rows.length === 0 || !activeTableConfig) return;

      const idField = getIdField(activeTableConfig, rows[0]);
      const ids = Array.from(
        new Set(
          rows
            .map((r) => r[idField])
            .filter((v) => v !== null && v !== undefined && String(v).trim().length > 0)
            .map((v) => String(v))
        )
      );
      if (ids.length === 0) return;

      const layerId = resolveCartoLayerId(activeTableConfig.id);
      const params = new URLSearchParams();
      params.set("layer", layerId);
      params.set("ids", ids.join(","));
      params.set("id_field", idField);
      if (rows.length === 1) {
        const row = rows[0];
        const asText = (value: unknown) => String(value ?? "").trim();
        const hintDomaine = asText(row["domaine_label"]);
        const hintTypeInsertion = asText(row["type_insertion_label"]);
        const hintAnnee = asText(row["annee_ref"]);
        const hintRaisonSociale = asText(row["raison_sociale"]);

        if (hintDomaine) params.set("hint_domaine", hintDomaine);
        if (hintTypeInsertion) params.set("hint_type_insertion", hintTypeInsertion);
        if (hintAnnee) params.set("hint_annee", hintAnnee);
        if (hintRaisonSociale) params.set("hint_raison_sociale", hintRaisonSociale);
      }
      router.push(`/cartographie?${params.toString()}`);
    },
    [router, activeTableConfig]
  );

  // Export PDF d'une fiche individuelle
  const handleExportEntityPdf = useCallback(
    async (entity: Record<string, unknown>) => {
      if (!activeTableConfig) return;

      const jsPDFModule = await import("jspdf");
      const jsPDF = (jsPDFModule as any).jsPDF ?? (jsPDFModule as any).default;
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      const title = activeTableConfig.name;
      doc.setFontSize(16);
      doc.text(title, 14, 20);
      doc.setFontSize(10);
      doc.text(`Projet : ${project?.libelle_public || project?.code_fonc || ""}`, 14, 28);
      doc.text(`Export\u00e9 le ${new Date().toLocaleDateString("fr-FR")}`, 14, 34);

      const tableData = activeTableConfig.columns
        .filter((col) => col.type !== "hidden")
        .map((col) => {
          const val = entity[col.key];
          let display = val === null || val === undefined ? "" : String(val);
          if (col.type === "boolean") display = val ? "Oui" : "Non";
          if (col.type === "currency" && typeof val === "number") display = `${val.toLocaleString("fr-FR")} GNF`;
          if (col.type === "percent" && typeof val === "number") display = `${val.toFixed(1)}%`;
          if (col.suffix) display += col.suffix;
          return [col.label, display];
        });

      autoTable(doc, {
        startY: 42,
        head: [["Champ", "Valeur"]],
        body: tableData,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [16, 185, 129] },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 } },
      });

      doc.save(`${activeTableConfig.id}_fiche.pdf`);
    },
    [activeTableConfig, project]
  );

  const handleEditEntity = useCallback(
    (entity: Record<string, unknown>) => {
      setSelectedEntity(entity);
      setEditMode(true);
      setSheetOpen(true);
    },
    []
  );

  const handleSaveEntity = useCallback(
    async (changes: Record<string, unknown>) => {
      if (!activeTableConfig || !selectedEntity) {
        throw new Error("Aucune entit\u00e9 s\u00e9lectionn\u00e9e.");
      }
      if (!project?.code_fonc) {
        throw new Error("Projet actif introuvable.");
      }

      const idField = getIdField(activeTableConfig, selectedEntity);
      const entityId = selectedEntity[idField];
      if (entityId === null || entityId === undefined || String(entityId).trim().length === 0) {
        throw new Error(`Identifiant introuvable (${idField}).`);
      }

      const response = await fetch(
        `/api/proxy/data/entities/${encodeURIComponent(activeTableConfig.id)}/update/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Project-Code": project.code_fonc,
            "X-SIG-Intent": "1",
          },
          credentials: "include",
          body: JSON.stringify({
            id: String(entityId),
            id_field: idField,
            changes,
          }),
        }
      );

      const rawPayload = await response.text();
      let payload: any = null;
      try {
        payload = rawPayload ? JSON.parse(rawPayload) : null;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(payload?.detail || payload?.message || `Erreur ${response.status}`);
      }

      setSelectedEntity((prev) => (prev ? { ...prev, ...changes } : prev));
      setEditMode(false);
      await refresh();
      setMutationFeedback({ type: "success", message: "Modification enregistree." });
    },
    [activeTableConfig, selectedEntity, project?.code_fonc, refresh]
  );

  const handleDeleteRows = useCallback(
    async (rows: Record<string, unknown>[]) => {
      if (!canEditEntity) {
        setMutationFeedback({ type: "error", message: "Suppression reservee aux admins N1/N2/global." });
        return;
      }
      if (!activeTableConfig || !project?.code_fonc) {
        setMutationFeedback({ type: "error", message: "Contexte table/projet introuvable." });
        return;
      }
      if (!rows.length) {
        setMutationFeedback({ type: "error", message: "Aucune ligne selectionnee pour suppression." });
        return;
      }

      const idField = getIdField(activeTableConfig, rows[0]);
      const ids = Array.from(
        new Set(
          rows
            .map((row) => row?.[idField])
            .filter((value) => value !== null && value !== undefined && String(value).trim().length > 0)
            .map((value) => String(value).trim())
        )
      );

      if (!ids.length) {
        setMutationFeedback({ type: "error", message: `Identifiant introuvable (${idField}).` });
        return;
      }

      setPendingDelete({ ids, idField });
    },
    [activeTableConfig, canEditEntity, project?.code_fonc]
  );

  const executeDeleteRows = useCallback(
    async ({ ids, idField }: DeleteConfirmationContext) => {
      if (!activeTableConfig || !project?.code_fonc) {
        setMutationFeedback({ type: "error", message: "Contexte table/projet introuvable." });
        return;
      }

      setMutationBusy(true);
      setMutationFeedback(null);

      try {
        if (ids.length === 1) {
          const response = await fetch(
            `/api/proxy/data/entities/${encodeURIComponent(activeTableConfig.id)}/records/${encodeURIComponent(
              ids[0]
            )}/?id_field=${encodeURIComponent(idField)}`,
            {
              method: "DELETE",
              headers: {
                "X-Project-Code": project.code_fonc,
                "X-SIG-Intent": "1",
              },
              credentials: "include",
            }
          );

          const rawPayload = await response.text();
          let payload: any = null;
          try {
            payload = rawPayload ? JSON.parse(rawPayload) : null;
          } catch {
            payload = null;
          }

          if (!response.ok) {
            throw new Error(payload?.detail || payload?.message || `Erreur ${response.status}`);
          }
        } else {
          const response = await fetch(
            `/api/proxy/data/entities/${encodeURIComponent(activeTableConfig.id)}/bulk-delete/`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Project-Code": project.code_fonc,
                "X-SIG-Intent": "1",
              },
              credentials: "include",
              body: JSON.stringify({
                id_field: idField,
                ids,
              }),
            }
          );

          const rawPayload = await response.text();
          let payload: any = null;
          try {
            payload = rawPayload ? JSON.parse(rawPayload) : null;
          } catch {
            payload = null;
          }

          if (!response.ok) {
            throw new Error(payload?.detail || payload?.message || `Erreur ${response.status}`);
          }
        }

        const nextSelectedRows = selectedRows.filter((value: string) => !ids.includes(String(value)));
        setSelectedRows(nextSelectedRows);
        const selectedEntityId = selectedEntity?.[idField];
        if (
          selectedEntityId !== null &&
          selectedEntityId !== undefined &&
          ids.includes(String(selectedEntityId))
        ) {
          setSheetOpen(false);
          setEditMode(false);
          setSelectedEntity(null);
        }

        await refresh();
        setMutationFeedback({
          type: "success",
          message:
            ids.length === 1
              ? "Suppression enregistree."
              : `Suppression en lot terminee (${ids.length} demandes).`,
        });
      } catch (errorValue: unknown) {
        setMutationFeedback({
          type: "error",
          message:
            errorValue instanceof Error && errorValue.message.trim()
              ? errorValue.message
              : "Echec suppression.",
        });
      } finally {
        setMutationBusy(false);
      }
    },
    [activeTableConfig, project?.code_fonc, refresh, selectedEntity, selectedRows, setSelectedRows]
  );

  const handleBulkDeleteSelected = useCallback(async () => {
    if (!activeTableConfig || selectedRows.length === 0) return;
    const idField = getIdField(activeTableConfig, data[0]);
    const selectedData = data.filter((row) => selectedRows.includes(String(row[idField])));
    await handleDeleteRows(selectedData);
  }, [activeTableConfig, data, selectedRows, handleDeleteRows]);

  const handleAction = useCallback(
    (actionId: string, rows: Record<string, unknown>[]) => {
      switch (actionId) {
        case "view_map":
          handleViewOnMap(rows);
          break;
        case "view_detail":
          if (rows[0]) {
            setEditMode(false);
            setSelectedEntity(rows[0]);
            setSheetOpen(true);
          }
          break;
        case "export_pdf":
          if (rows[0]) {
            handleExportEntityPdf(rows[0]);
          }
          break;
        case "export":
          exportData("pdf");
          break;
        case "edit":
          if (canEditEntity && rows[0]) {
            handleEditEntity(rows[0]);
          }
          break;
        case "delete":
          if (canEditEntity && rows[0]) {
            void handleDeleteRows([rows[0]]);
          }
          break;
        case "print":
          if (rows[0]) {
            handleExportEntityPdf(rows[0]);
          }
          break;
        default:
          break;
      }
    },
    [exportData, handleViewOnMap, handleExportEntityPdf, handleEditEntity, canEditEntity, handleDeleteRows]
  );

  const toggleColumn = useCallback((key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    const toDelete = pendingDelete;
    setPendingDelete(null);
    void executeDeleteRows(toDelete);
  }, [pendingDelete, executeDeleteRows]);

  // ------------------------------------------------------------
  // States (meme style que Cartographie)
  // ------------------------------------------------------------

  if (loading) {
    return <DataLoading />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white border border-red-200 rounded-xl p-6 max-w-md text-center shadow-sm">
          <AlertCircle className="h-10 w-10 text-red-600 mx-auto mb-4" />
          <p className="text-slate-800">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  if (!activeTableConfig) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md text-center shadow-sm">
          <p className="text-slate-700">Aucune table disponible pour ce projet.</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      {/* Header (copie sur Cartographie) */}
      <header className="flex-shrink-0 bg-gradient-to-r from-[#CE1126] via-[#FFCD00] to-[#009639] shadow-lg z-30">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsTabsOpen(!isTabsOpen)}
              className="lg:hidden p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              title="Afficher/masquer les tables"
            >
              {isTabsOpen ? (
                <X className="h-5 w-5 text-white" />
              ) : (
                <Menu className="h-5 w-5 text-white" />
              )}
            </button>

            <div>
              <h1 className="text-lg font-bold text-white drop-shadow flex items-center gap-2">
                <Database className="h-5 w-5" />
                {"Donn\u00e9es"}
              </h1>
              <p className="text-xs text-white/80">{project?.libelle_public || project?.code_fonc}</p>
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
              title="D\u00e9connexion"
            >
              <LogOut className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 relative overflow-hidden">
        <div className="h-full flex flex-col gap-4 p-4 min-w-0">
          {/* Tabs */}
          {isTabsOpen && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-visible">
              <div className="px-4 py-3 border-b border-slate-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Tables</h2>
                  <p className="text-xs text-slate-500">{"S\u00e9lectionnez une table"}</p>
                </div>

                {/* Actions globales (table) */}
                <div className="relative z-30 flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
                  <button
                    onClick={refresh}
                    disabled={tableLoading}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                    title="Rafra\u00eechir"
                  >
                    <RefreshCw className={`w-4 h-4 ${tableLoading ? "animate-spin" : ""}`} />
                  </button>

                  <ExportMenu
                    onExport={exportData}
                    selectedCount={selectedRows.length}
                    totalCount={totalCount}
                    hasGeometry={activeTableConfig.hasGeometry}
                  />

                  {canEditEntity && (
                    <button
                      onClick={() => void handleBulkDeleteSelected()}
                      disabled={mutationBusy || selectedRows.length === 0}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      title={
                        selectedRows.length > 0
                          ? "Supprimer les lignes selectionnees"
                          : "Selectionnez des lignes pour supprimer"
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  )}

                  {/* Colonnes */}
                  <div className="relative">
                    <button
                      onClick={() => setColumnsMenuOpen(!columnsMenuOpen)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
                    >
                      <Columns className="w-4 h-4" />
                      Colonnes
                    </button>

                    {columnsMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setColumnsMenuOpen(false)} />
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-20 max-h-96 overflow-auto">
                          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-800">Colonnes visibles</span>
                            <button onClick={() => setColumnsMenuOpen(false)}>
                              <X className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                          <div className="py-2">
                            {activeTableConfig.columns.map((col) => (
                              <label
                                key={col.key}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={visibleColumns.has(col.key)}
                                  onChange={() => toggleColumn(col.key)}
                                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-sm text-gray-700">{col.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-2 py-2 overflow-x-auto">
                <div className="flex items-center gap-1">
                  {availableTables.map((table) => {
                    const isActive = table.id === activeTableId;
                    return (
                      <button
                        key={table.id}
                        onClick={() => setActiveTableId(table.id)}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                          ${isActive ? "bg-emerald-100 text-emerald-700" : "text-slate-600 hover:bg-slate-100"}
                        `}
                      >
                        {table.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
            {/* Title */}
            <div className="px-1">
              <h3 className="text-lg font-semibold text-slate-800">{activeTableConfig.name}</h3>
              <p className="text-sm text-slate-500">{activeTableConfig.description}</p>
            </div>

            {/* Filters */}
            <DataFilters
              globalFilters={normalizedGlobalFilters}
              tableFilters={activeTableConfig.filters}
              values={filters}
              onChange={setFilter}
              onReset={resetFilters}
              onSearch={setSearchValue}
              searchValue={searchValue}
              loading={tableLoading}
              activeFiltersCount={activeFiltersCount}
              projectCode={project?.code_fonc}
            />

            {/* Selection bar */}
            {selectedRows.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-sm font-medium text-emerald-700">
                  {selectedRows.length} {"\u00e9l\u00e9ment(s) s\u00e9lectionn\u00e9(s)"}
                </span>
                <div className="flex flex-wrap items-center gap-2 ml-auto">
                  <ExportMenu
                    onExport={exportData}
                    selectedCount={selectedRows.length}
                    totalCount={totalCount}
                    hasGeometry={activeTableConfig.hasGeometry}
                  />
                  {canEditEntity && (
                    <button
                      onClick={() => void handleBulkDeleteSelected()}
                      disabled={mutationBusy}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      {mutationBusy ? "Suppression..." : "Supprimer"}
                    </button>
                  )}
                  {activeTableConfig.hasGeometry && (
                    <button
                      onClick={() => {
                        const idField = getIdField(activeTableConfig, data[0]);
                        const selectedData = data.filter((d) => selectedRows.includes(String(d[idField])));
                        handleViewOnMap(selectedData);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
                    >
                      <MapPin className="w-4 h-4" />
                      Voir sur la carte
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedRows([])}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                  >
                    {"D\u00e9s\u00e9lectionner"}
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {tableError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{tableError}</p>
                <button
                  onClick={refresh}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  {"R\u00e9essayer"}
                </button>
              </div>
            )}

            {mutationFeedback && (
              <div
                className={`p-4 rounded-lg border ${
                  mutationFeedback.type === "error"
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}
              >
                <p className="text-sm">{mutationFeedback.message}</p>
              </div>
            )}

            {/* Table */}
            <div className="flex-1 min-h-[20rem] md:min-h-[22rem]">
              <DataTable
                columns={displayedColumns}
                data={data}
                actions={tableActions}
                loading={tableLoading}
                totalCount={totalCount}
                pageSize={pageSize}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                onSort={setSort}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onRowClick={handleRowClick}
                onAction={handleAction}
                selectedRows={selectedRows}
                onSelectionChange={setSelectedRows}
                idField={getIdField(activeTableConfig, data[0])}
                userRole={userRole}
                emptyMessage={`Aucune donn\u00e9e ${activeTableConfig.name.toLowerCase()} trouv\u00e9e`}
              />
            </div>
          </div>
        </div>
      </main>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Confirmer la suppression</h3>
            </div>
            <div className="space-y-2 px-5 py-4">
              <p className="text-sm text-slate-700">
                {pendingDelete.ids.length === 1
                  ? `Voulez-vous vraiment supprimer l'enregistrement ${pendingDelete.ids[0]} ?`
                  : `Voulez-vous vraiment supprimer ${pendingDelete.ids.length} enregistrements selectionnes ?`}
              </p>
              <p className="text-xs text-slate-500">Cette action est irreversible.</p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                onClick={() => setPendingDelete(null)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel fiche entite */}
      <EntitySheet
        isOpen={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditMode(false);
        }}
        data={selectedEntity}
        tableConfig={activeTableConfig}
        onViewMap={(row) => handleViewOnMap([row])}
        editMode={editMode}
        onCancelEdit={() => setEditMode(false)}
        onSaveEdit={canEditEntity ? handleSaveEntity : undefined}
        onEdit={canEditEntity ? (row) => handleEditEntity(row) : undefined}
        onPrint={(row) => handleExportEntityPdf(row)}
      />
    </div>
  );
}

// ------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------

function DataLoading() {
  return (
    <div className="h-screen bg-slate-100 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mx-auto mb-4" />
        <p className="text-slate-600">{"Chargement des donn\u00e9es..."}</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function resolveCartoLayerId(tableId: string): string {
  return DATA_TABLE_TO_CARTO_LAYER[tableId] || tableId;
}

function getIdField(
  tableConfig: TableConfig,
  sampleRow?: Record<string, unknown> | null
): string {
  const primaryCandidates = DATA_TABLE_PRIMARY_ID_FIELDS[tableConfig.id] || [];
  for (const key of primaryCandidates) {
    if (
      tableConfig.columns.some((c) => c.key === key) ||
      (sampleRow && sampleRow[key] !== undefined && sampleRow[key] !== null)
    ) {
      return key;
    }
  }

  const possibleIds = [
    "id",
    "uuid",
    "id_cep",
    "id_org",
    "id_zone",
    "id_ts",
    "id_couloir",
    "code_ouvrage",
    "id_ouvrage",
    "id_session",
    "id_formation",
    "id_marche",
    "marche_uuid",
    "id_distribution",
    "intrant_uuid",
    "id_ent",
    "id_menage",
    "id_comite",
    "code_station",
    "id_sortant",
    "emploi_dom_uuid",
    "insertion_dom_uuid",
    "cep_uuid",
    "org_uuid",
    "zone_uuid",
    "ts_uuid",
    "couloir_uuid",
    "ouvrage_uuid",
    "session_uuid",
    "menage_uuid",
    "comite_uuid",
    "station_uuid",
    "suivi_uuid",
  ];

  for (const col of tableConfig.columns) {
    if (possibleIds.includes(col.key)) {
      return col.key;
    }
  }

  if (sampleRow) {
    for (const key of possibleIds) {
      if (sampleRow[key] !== undefined && sampleRow[key] !== null) {
        return key;
      }
    }
  }

  return "id";
}


