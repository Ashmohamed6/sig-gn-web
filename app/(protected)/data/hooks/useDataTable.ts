// app/(protected)/data/hooks/useDataTable.ts

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { TableConfig } from "../config/tablesConfig";
import { normalizeMojibakeDeep } from "../utils/textEncoding";

// Base API (doit pointer vers ton backend Django)
// Exemple local: http://localhost:9000/api
const API_BASE = "/api/proxy";
const TABLE_PRIMARY_ID_FIELD: Record<string, string> = {
  cep: "cep_uuid",
  intrants: "intrant_uuid",
  ouvrages: "ouvrage_uuid",
  zones_degradees: "zone_uuid",
  tetes_sources: "ts_uuid",
  couloirs: "id_couloir",
  organisations: "org_uuid",
  menages: "menage_uuid",
  comites: "comite_uuid",
  stations_meteo: "station_uuid",
  marches: "marche_uuid",
  formations: "formation_uuid",
  entreprises: "ent_uuid",
  sortants: "suivi_uuid",
  emplois: "emploi_dom_uuid",
  insertions: "insertion_dom_uuid",
};

interface UseDataTableOptions {
  tableConfig: TableConfig | undefined;
  projectCode?: string;
  initialFilters?: Record<string, any>;
  initialSort?: { key: string; direction: "asc" | "desc" };
  initialPageSize?: number;
}

interface UseDataTableReturn {
  // Données
  data: Record<string, any>[];
  totalCount: number;
  loading: boolean;
  error: string | null;

  // Pagination
  currentPage: number;
  pageSize: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Tri
  sortKey: string | undefined;
  sortDirection: "asc" | "desc";
  setSort: (key: string, direction: "asc" | "desc") => void;

  // Filtres
  filters: Record<string, any>;
  setFilter: (key: string, value: any) => void;
  resetFilters: () => void;
  activeFiltersCount: number;

  // Recherche
  searchValue: string;
  setSearchValue: (value: string) => void;

  // Sélection
  selectedRows: string[];
  setSelectedRows: (ids: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Actions
  refresh: () => Promise<void>;
  exportData: (format: "csv" | "xlsx" | "pdf" | "geojson") => Promise<void>;
}

export function useDataTable({
  tableConfig,
  projectCode,
  initialFilters = {},
  initialSort,
  initialPageSize = 25,
}: UseDataTableOptions): UseDataTableReturn {
  // États
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState<boolean>(Boolean(tableConfig?.endpoint));
  const [error, setError] = useState<string | null>(null);

  // Anti-race conditions / annulation
  const abortRef = useRef<AbortController | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Tri - avec guards pour tableConfig undefined
  const [sortKey, setSortKey] = useState<string | undefined>(
    initialSort?.key || tableConfig?.defaultSort?.key
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    initialSort?.direction || tableConfig?.defaultSort?.direction || "asc"
  );

  // Filtres
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);
  const [searchValue, setSearchValue] = useState("");

  // Debounce (évite un fetch à chaque frappe)
  const debouncedSearch = useDebouncedValue(searchValue, 300);

  // Sélection
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Quand on change de table, on réinitialise page + sélection + tri par défaut
  useEffect(() => {
    if (!tableConfig) return;
    setCurrentPage(1);
    setSelectedRows([]);
    setError(null);
    setSortKey(initialSort?.key || tableConfig.defaultSort?.key);
    setSortDirection(initialSort?.direction || tableConfig.defaultSort?.direction || "asc");
  }, [tableConfig?.id, initialSort?.key, initialSort?.direction]);

  // Nombre de filtres actifs
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    Object.entries(filters).forEach(([_, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        if (Array.isArray(value)) {
          if (value.length > 0) count++;
        } else if (typeof value === "object") {
          if (Object.values(value).some((v) => v)) count++;
        } else {
          count++;
        }
      }
    });
    if (searchValue) count++;
    return count;
  }, [filters, searchValue]);

  // Total pages
  const totalPages = useMemo(() => {
    if (!pageSize || pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);

  // Construire l'URL avec les paramètres
  const buildUrl = useCallback(() => {
    if (!tableConfig?.endpoint) return "";
    
    const params = new URLSearchParams();

    // Pagination
    params.set("page", currentPage.toString());
    params.set("page_size", pageSize.toString());

    // Tri
    if (sortKey) {
      params.set("ordering", sortDirection === "desc" ? `-${sortKey}` : sortKey);
    }

    // Recherche
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    }

    // Filtres
    Object.entries(filters).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") return;

      if (Array.isArray(value) && value.length > 0) {
        // Multiselect: joindre les valeurs
        params.set(key, value.join(","));
      } else if (typeof value === "object" && value !== null && ("start" in value || "end" in value)) {
        // DateRange: start/end
        const v: any = value;
        // Compat: certains endpoints attendent _from/_to, d'autres _after/_before
        if (v.start) {
          params.set(`${key}_from`, v.start);
          params.set(`${key}_after`, v.start);
        }
        if (v.end) {
          params.set(`${key}_to`, v.end);
          params.set(`${key}_before`, v.end);
        }
      } else {
        params.set(key, String(value));
      }
    });

    const endpoint = normalizeEndpoint(tableConfig.endpoint);
    const base = API_BASE.replace(/\/$/, "");
      return `${base}${endpoint}?${params.toString()}`;
  }, [tableConfig?.endpoint, currentPage, pageSize, sortKey, sortDirection, debouncedSearch, filters]);

  // Charger les données
  const fetchData = useCallback(async () => {
    // Ne pas charger si pas de config
    if (!tableConfig?.endpoint) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = buildUrl();
      if (!url) {
        setLoading(false);
        return;
      }

      // Annule la requête précédente (si changement rapide de filtres/onglets)
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Ajouter le code projet si disponible
      if (projectCode) {
        headers["X-Project-Code"] = projectCode;
      }

      // Inclure les cookies pour l'auth Django session
      const response = await fetch(url, {
        headers,
        credentials: "include",
        signal: controller.signal,
      });

      if (response.status === 401) {
        setError("Session expirée. Veuillez vous reconnecter.");
        setData([]);
        setTotalCount(0);
        return;
      }

      if (response.status === 403) {
        setError("Accès refusé. Vous n'avez pas les droits pour accéder à ces données.");
        setData([]);
        setTotalCount(0);
        return;
      }

      if (response.status === 404) {
        setError(
          "Endpoint introuvable (404). Vérifie l'URL côté backend (urls.py) et la configuration (tablesConfig.ts)."
        );
        setData([]);
        setTotalCount(0);
        return;
      }

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json") ? await response.json() : null;

      // Adapter selon le format de réponse DRF
      if (result.results && typeof result.count === "number") {
        // Format DRF paginé standard
        const normalizedRows = normalizeMojibakeDeep(result.results as Record<string, any>[]);
        setData(normalizedRows);
        setTotalCount(result.count);
      } else if (Array.isArray(result)) {
        // Format tableau simple
        const normalizedRows = normalizeMojibakeDeep(result as Record<string, any>[]);
        setData(normalizedRows);
        setTotalCount(result.length);
      } else if (result.features) {
        // Format GeoJSON
        const rows = result.features.map((f: any) =>
          normalizeMojibakeDeep({ ...f.properties, geometry: f.geometry })
        );
        setData(rows);
        setTotalCount(result.features.length);
      } else {
        setData([]);
        setTotalCount(0);
      }
    } catch (err) {
      // Si la requête est annulée, on ignore (nouvelle requête en cours)
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setData([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [buildUrl, projectCode, tableConfig?.endpoint]);

  // Abort au démontage
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Charger au montage et quand les paramètres changent
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchValue, sortKey, sortDirection]);

  // Setters avec gestion de la cascade géographique
  const setFilter = useCallback((key: string, value: any) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      
      if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }

      // Gérer les cascades géographiques
      // Si on change la région, effacer préfecture et commune
      if (key === "region_id") {
        delete newFilters.prefecture_id;
        delete newFilters.commune_id;
      } 
      // Si on change la préfecture, effacer commune
      else if (key === "prefecture_id") {
        delete newFilters.commune_id;
      }

      return newFilters;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({});
    setSearchValue("");
  }, []);

  const setSort = useCallback((key: string, direction: "asc" | "desc") => {
    setSortKey(key);
    setSortDirection(direction);
  }, []);

  const selectAll = useCallback(() => {
    if (!tableConfig) return;
    const idField = getIdField(tableConfig, data[0]);
    setSelectedRows(data.map((row) => String(row[idField])));
  }, [data, tableConfig]);

  const clearSelection = useCallback(() => {
    setSelectedRows([]);
  }, []);

  // Export
  const exportData = useCallback(
    async (format: "csv" | "xlsx" | "pdf" | "geojson") => {
      if (!tableConfig?.columns?.length) {
        throw new Error("Aucune configuration de colonnes pour l'export");
      }

      // Colonnes exportées : visibles uniquement (comme indiqué dans l'UI)
      const columns = getExportColumns(tableConfig);

      // Données exportées : sélection si dispo, sinon données chargées
      const idField = getIdField(tableConfig, data[0]);
      const rows = selectedRows.length
        ? data.filter((row) => selectedRows.includes(String(row[idField])))
        : data;

      if (!rows.length) {
        throw new Error("Aucune donnée à exporter");
      }

      const filename = generateExportFilename(tableConfig.id, projectCode);

      switch (format) {
        case "csv":
          exportRowsToCSV(rows, columns, filename);
          return;
        case "xlsx":
          await exportRowsToXLSX(rows, columns, filename);
          return;
        case "pdf":
          await exportRowsToPDF(rows, columns, filename, tableConfig.name);
          return;
        case "geojson":
          exportRowsToGeoJSON(rows, columns, filename, tableConfig.geometryField || "geom");
          return;
        default:
          return;
      }
    },
    [tableConfig, data, selectedRows, projectCode]
  );

  return {
    // Données
    data,
    totalCount,
    loading,
    error,

    // Pagination
    currentPage,
    pageSize,
    totalPages,
    setCurrentPage,
    setPageSize,

    // Tri
    sortKey,
    sortDirection,
    setSort,

    // Filtres
    filters,
    setFilter,
    resetFilters,
    activeFiltersCount,

    // Recherche
    searchValue,
    setSearchValue,

    // Sélection
    selectedRows,
    setSelectedRows,
    selectAll,
    clearSelection,

    // Actions
    refresh: fetchData,
    exportData,
  };
}

// Helper pour déterminer le champ ID
function getIdField(
  tableConfig: TableConfig | undefined,
  sampleRow?: Record<string, unknown> | null
): string {
  if (!tableConfig?.columns) return "id";

  const preferred = TABLE_PRIMARY_ID_FIELD[tableConfig.id];
  if (
    preferred &&
    (tableConfig.columns.some((c) => c.key === preferred) ||
      (sampleRow && sampleRow[preferred] !== undefined && sampleRow[preferred] !== null))
  ) {
    return preferred;
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
    "cep_uuid",
    "org_uuid",
    "zone_uuid",
    "ts_uuid",
    "couloir_uuid",
    "ouvrage_uuid",
    "session_uuid",
  ];

  // Chercher dans les colonnes
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

// ---------------------------------------------------------------------------
// Helpers (URL, debounce, export)
// ---------------------------------------------------------------------------

function normalizeEndpoint(endpoint: string): string {
  // Endpoint attendu côté front : "/data/.../" (sans "/api")
  let out = endpoint.trim();
  if (!out.startsWith("/")) out = `/${out}`;
  // Evite les doubles slashes
  out = out.replace(/\/+/g, "/");
  if (!out.endsWith("/")) out = `${out}/`;
  return out;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

type ExportColumn = TableConfig["columns"][number];

function getExportColumns(tableConfig: TableConfig): ExportColumn[] {
  return (tableConfig.columns || []).filter((col) => {
    if ((col as any).type === "hidden") return false;
    if (col.visible === false) return false;
    return true;
  });
}

function generateExportFilename(tableId: string, projectCode?: string): string {
  const date = new Date();
  const ts = date.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = projectCode ? `${projectCode}_` : "";
  return `${prefix}${tableId}_${ts}`;
}

function formatExportValue(value: unknown, col: ExportColumn): string {
  if (value === null || value === undefined) return "";

  switch (col.type) {
    case "percent": {
      const n = typeof value === "number" ? value : Number(value);
      return Number.isFinite(n) ? `${n.toFixed(1)}%` : String(value);
    }
    case "boolean":
      return value ? "Oui" : "Non";
    case "date": {
      const d = value instanceof Date ? value : new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("fr-FR");
    }
    case "currency": {
      const n = typeof value === "number" ? value : Number(value);
      const base = Number.isFinite(n) ? n.toLocaleString("fr-FR") : String(value);
      return col.suffix ? `${base}${col.suffix}` : `${base} GNF`;
    }
    case "number": {
      const n = typeof value === "number" ? value : Number(value);
      return Number.isFinite(n) ? n.toLocaleString("fr-FR") : String(value);
    }
    default:
      return String(value);
  }
}

function exportRowsToCSV(rows: Record<string, any>[], columns: ExportColumn[], filename: string) {
  const BOM = "\uFEFF";
  const headers = columns.map((c) => `"${String(c.label).replace(/"/g, '""')}"`).join(";");
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const raw = row[c.key];
          const v = formatExportValue(raw, c);
          return `"${v.replace(/"/g, '""')}"`;
        })
        .join(";")
    )
    .join("\n");

  const csv = `${BOM}${headers}\n${body}`;
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
}

async function exportRowsToXLSX(rows: Record<string, any>[], columns: ExportColumn[], filename: string) {
  const XLSX = await import("xlsx");

  const wsData = [
    columns.map((c) => c.label),
    ...rows.map((row) =>
      columns.map((c) => {
        const v = row[c.key];
        // Garder les nombres tels quels quand c'est possible
        if (c.type === "number" || c.type === "currency" || c.type === "percent") {
          return v;
        }
        return formatExportValue(v, c);
      })
    ),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Largeur colonnes
  ws["!cols"] = columns.map((c) => {
    const max = Math.max(
      String(c.label).length,
      ...rows.map((r) => String(r[c.key] ?? "").length)
    );
    return { wch: Math.min(max + 2, 50) };
  });

  XLSX.utils.book_append_sheet(wb, ws, "Données");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

async function exportRowsToPDF(
  rows: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  title?: string
) {
  const jsPDFModule = await import("jspdf");
  const jsPDF = (jsPDFModule as any).jsPDF ?? (jsPDFModule as any).default;
  const autoTable = (await import("jspdf-autotable")).default;

  const orientation = columns.length > 6 ? "landscape" : "portrait";
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

  if (title) {
    doc.setFontSize(14);
    doc.text(title, 14, 16);
  }

  const head = [columns.map((c) => c.label)];
  const body = rows.map((row) => columns.map((c) => formatExportValue(row[c.key], c)));

  autoTable(doc, {
    head,
    body,
    startY: title ? 22 : 14,
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { top: 14, right: 10, bottom: 14, left: 10 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Page ${data.pageNumber} / ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 8,
        { align: "center" }
      );
      doc.text(
        `Généré le ${new Date().toLocaleDateString("fr-FR")}`,
        10,
        doc.internal.pageSize.height - 8
      );
    },
  });

  doc.save(`${filename}.pdf`);
}

function exportRowsToGeoJSON(
  rows: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  geometryField: string
) {
  const features = rows
    .map((row) => {
      let geometry: any = row[geometryField];
      if (!geometry) return null;

      if (typeof geometry === "string") {
        try {
          geometry = JSON.parse(geometry);
        } catch {
          return null;
        }
      }

      const properties: Record<string, unknown> = {};
      columns.forEach((c) => {
        if (c.key !== geometryField) {
          properties[c.key] = row[c.key];
        }
      });

      return {
        type: "Feature" as const,
        geometry,
        properties,
      };
    })
    .filter(Boolean);

  const fc = {
    type: "FeatureCollection" as const,
    crs: {
      type: "name" as const,
      properties: { name: "EPSG:4326" },
    },
    features,
  };

  downloadBlob(
    new Blob([JSON.stringify(fc, null, 2)], { type: "application/geo+json;charset=utf-8;" }),
    `${filename}.geojson`
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default useDataTable;
