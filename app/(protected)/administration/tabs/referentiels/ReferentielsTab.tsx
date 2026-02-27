"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Database,
  Eye,
  FileDown,
  Layers3,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useAdminApi } from "../../hooks/useAdminApi";
import type { UserRole } from "../../config/adminConfig";

interface ReferentielsTabProps {
  userRole: UserRole;
  rawRole?: string;
}

interface RefOption {
  value: string;
  label: string;
}

interface RefLayerDefinition {
  id: string;
  label: string;
  description: string;
  endpoint: string;
  idProperty: string;
  mapLayerId: string;
  supportsRegion: boolean;
  supportsPrefecture: boolean;
}

interface GeoJsonFeature {
  type?: string;
  geometry?: { type?: string | null } | null;
  properties?: Record<string, unknown> | null;
}

interface GeoJsonResponse {
  type?: string;
  name?: string;
  features?: GeoJsonFeature[];
}

interface RefSchemaColumn {
  name: string;
  data_type: string;
  required: boolean;
  editable: boolean;
  is_geometry: boolean;
  is_id: boolean;
}

interface RefLayerSchemaResponse {
  layer_id: string;
  id_column: string;
  geom_column: string;
  columns: RefSchemaColumn[];
}

interface RefMutationResponse {
  detail?: string;
  layer_id?: string;
  record_id?: string;
}

interface RefUploadResponse {
  detail?: string;
  status?: "success" | "partial_success" | "failed";
  created?: number;
  updated?: number;
  failed?: number;
  errors?: Array<{ line?: number; error?: string }>;
}

interface CorePurgeResponse {
  detail?: string;
  table?: string;
  project_code?: string;
  purged_count?: number;
}

const REF_LAYER_DEFINITIONS: RefLayerDefinition[] = [
  {
    id: "admin-region",
    label: "Limites - Regions",
    description: "Reference administrative niveau region",
    endpoint: "/data/carto/admin-region/",
    idProperty: "id_region",
    mapLayerId: "regions",
    supportsRegion: true,
    supportsPrefecture: false,
  },
  {
    id: "admin-prefecture",
    label: "Limites - Prefectures",
    description: "Reference administrative niveau prefecture",
    endpoint: "/data/carto/admin-prefecture/",
    idProperty: "id_prefecture",
    mapLayerId: "prefectures",
    supportsRegion: true,
    supportsPrefecture: false,
  },
  {
    id: "admin-commune",
    label: "Limites - Communes",
    description: "Reference administrative niveau commune",
    endpoint: "/data/carto/admin-commune/",
    idProperty: "id_commune",
    mapLayerId: "communes",
    supportsRegion: true,
    supportsPrefecture: true,
  },
  {
    id: "equipements",
    label: "Infrastructures - Equipements",
    description: "Ecoles, centres, infrastructures publiques",
    endpoint: "/data/carto/equipements/",
    idProperty: "equip_id",
    mapLayerId: "equipements",
    supportsRegion: true,
    supportsPrefecture: false,
  },
  {
    id: "localites",
    label: "Infrastructures - Localites",
    description: "Villages et localites",
    endpoint: "/data/carto/localites/",
    idProperty: "localite_id",
    mapLayerId: "localites",
    supportsRegion: true,
    supportsPrefecture: false,
  },
  {
    id: "agglomerations",
    label: "Infrastructures - Agglomerations",
    description: "Agglomerations et zones urbaines",
    endpoint: "/data/carto/agglomerations/",
    idProperty: "agglom_id",
    mapLayerId: "agglomerations",
    supportsRegion: true,
    supportsPrefecture: false,
  },
  {
    id: "aire-protegee",
    label: "Environnement - Aires protegees",
    description: "Zones de conservation",
    endpoint: "/data/carto/aire-protegee/",
    idProperty: "ap_id",
    mapLayerId: "aires_protegees",
    supportsRegion: true,
    supportsPrefecture: false,
  },
  {
    id: "zone-humide",
    label: "Environnement - Zones humides",
    description: "References zones humides",
    endpoint: "/data/carto/zone-humide/",
    idProperty: "zh_id",
    mapLayerId: "zones_humides",
    supportsRegion: true,
    supportsPrefecture: false,
  },
  {
    id: "zone-sableuse",
    label: "Environnement - Zones sableuses",
    description: "References zones sableuses",
    endpoint: "/data/carto/zone-sableuse/",
    idProperty: "zs_id",
    mapLayerId: "zones_sableuses",
    supportsRegion: true,
    supportsPrefecture: false,
  },
  {
    id: "occupation-sol",
    label: "Environnement - Occupation du sol",
    description: "Classes d occupation du sol",
    endpoint: "/data/carto/occupation-sol/",
    idProperty: "occsol_id",
    mapLayerId: "occupation_sol",
    supportsRegion: true,
    supportsPrefecture: false,
  },
  {
    id: "hydrographie",
    label: "Environnement - Hydrographie",
    description: "Cours d eau",
    endpoint: "/data/carto/hydrographie/",
    idProperty: "id",
    mapLayerId: "hydrographie",
    supportsRegion: false,
    supportsPrefecture: false,
  },
  {
    id: "reseau-routier",
    label: "Infrastructures - Reseau routier",
    description: "References reseau routier",
    endpoint: "/data/carto/reseau-routier/",
    idProperty: "id",
    mapLayerId: "reseau_routier",
    supportsRegion: false,
    supportsPrefecture: false,
  },
  {
    id: "habitations-dispersees",
    label: "Infrastructures - Habitations dispersees",
    description: "Points d habitat disperse",
    endpoint: "/data/carto/habitations-dispersees/",
    idProperty: "hab_id",
    mapLayerId: "habitations_dispersees",
    supportsRegion: true,
    supportsPrefecture: false,
  },
];

const CORE_TABLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "cep", label: "CEP Parcelles" },
  { value: "intrants", label: "Intrants distribution" },
  { value: "ouvrages", label: "Ouvrages" },
  { value: "zones_degradees", label: "Zones degradees" },
  { value: "tetes_sources", label: "Tetes sources" },
  { value: "couloirs", label: "Couloirs" },
  { value: "organisations", label: "Organisations" },
  { value: "menages", label: "Menages" },
  { value: "comites", label: "Comites" },
  { value: "stations_meteo", label: "Stations meteo" },
  { value: "marches", label: "Marches" },
  { value: "formations", label: "Formations" },
  { value: "entreprises", label: "Entreprises" },
  { value: "sortants", label: "Sortants" },
  { value: "emplois", label: "Emplois (ent_emploi_dom)" },
  { value: "insertions", label: "Insertions (ent_insertion_dom)" },
];

function cleanCell(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) return value.map(cleanCell).join(", ");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[object]";
    }
  }
  const text = String(value).trim();
  return text.length > 0 ? text : "-";
}

function escapeCsv(value: unknown): string {
  return `"${cleanCell(value).replaceAll('"', '""')}"`;
}

function dedupeOptions(items: RefOption[]): RefOption[] {
  const byValue = new Map<string, RefOption>();
  for (const item of items) {
    const key = String(item.value || "").trim();
    if (!key) continue;
    if (!byValue.has(key)) byValue.set(key, item);
  }
  return Array.from(byValue.values());
}

function getFeatureBaseKey(feature: GeoJsonFeature): string {
  const props = feature.properties || {};
  const candidates = [
    props.id_region,
    props.id_prefecture,
    props.id_commune,
    props.equip_id,
    props.localite_id,
    props.agglom_id,
    props.ap_id,
    props.zh_id,
    props.zs_id,
    props.occsol_id,
    props.id,
    props.hab_id,
  ];
  for (const candidate of candidates) {
    const asText = String(candidate || "").trim();
    if (asText) return asText.replaceAll("|", "_");
  }
  return "row";
}

function getFeatureRowKey(feature: GeoJsonFeature, layerId: string, globalIndex: number): string {
  const base = getFeatureBaseKey(feature);
  return `${layerId}|${base}|${globalIndex}`;
}

function safeString(value: unknown): string {
  return String(value ?? "").trim();
}

function parseJsonObjectOrThrow(input: string, label: string): Record<string, unknown> {
  const text = input.trim();
  if (!text) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (errorValue: unknown) {
    const message = errorValue instanceof Error ? errorValue.message : "JSON invalide";
    throw new Error(`${label}: ${message}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label}: objet JSON attendu.`);
  }

  return parsed as Record<string, unknown>;
}

function buildGeometryPayload(rawInput: string): Record<string, unknown> {
  const text = rawInput.trim();
  if (!text) return {};

  try {
    const parsed = JSON.parse(text);
    return { geometry_geojson: parsed };
  } catch {
    return { geometry_wkt: text };
  }
}

export default function ReferentielsTab({ userRole, rawRole }: ReferentielsTabProps) {
  const router = useRouter();
  const { apiFetch } = useAdminApi();

  const canManageReferentiels = userRole === "admin" || userRole === "chef_projet";
  const normalizedRawRole = String(rawRole || "").trim().toLowerCase();
  const canRunCorePurge =
    userRole === "admin" || normalizedRawRole === "project_manager" || normalizedRawRole === "admin";

  const [selectedLayerId, setSelectedLayerId] = useState<string>(REF_LAYER_DEFINITIONS[0].id);
  const [regionFilter, setRegionFilter] = useState("");
  const [prefectureFilter, setPrefectureFilter] = useState("");

  const [regions, setRegions] = useState<RefOption[]>([]);
  const [prefectures, setPrefectures] = useState<RefOption[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(false);
  const [lookupsError, setLookupsError] = useState<string | null>(null);

  const [features, setFeatures] = useState<GeoJsonFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [schemaColumns, setSchemaColumns] = useState<RefSchemaColumn[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutationSuccess, setMutationSuccess] = useState<string | null>(null);
  const [coreTableId, setCoreTableId] = useState<string>(CORE_TABLE_OPTIONS[0].value);
  const [corePurgeConfirmText, setCorePurgeConfirmText] = useState("");
  const [corePurgeLoading, setCorePurgeLoading] = useState(false);

  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [createValuesInput, setCreateValuesInput] = useState("{}");
  const [createGeometryInput, setCreateGeometryInput] = useState("");

  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editValuesInput, setEditValuesInput] = useState("{}");
  const [editGeometryInput, setEditGeometryInput] = useState("");

  const [uploadPanelOpen, setUploadPanelOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"upsert" | "insert">("upsert");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<RefUploadResponse | null>(null);

  const selectedLayer = useMemo(
    () => REF_LAYER_DEFINITIONS.find((layer) => layer.id === selectedLayerId) || REF_LAYER_DEFINITIONS[0],
    [selectedLayerId]
  );

  const editableColumnNames = useMemo(() => {
    return new Set(
      schemaColumns
        .filter((column) => column.editable && !column.is_geometry && !column.is_id)
        .map((column) => column.name)
    );
  }, [schemaColumns]);

  const requiredCreateTemplate = useMemo(() => {
    const template: Record<string, unknown> = {};
    for (const column of schemaColumns) {
      if (column.is_geometry) continue;
      if (!column.required) continue;
      template[column.name] = "";
    }
    return JSON.stringify(template, null, 2);
  }, [schemaColumns]);

  const loadLayerSchema = useCallback(async () => {
    if (!canManageReferentiels) {
      setSchemaColumns([]);
      setSchemaError(null);
      return;
    }

    setSchemaLoading(true);
    setSchemaError(null);
    try {
      const response = await apiFetch<RefLayerSchemaResponse>(
        `/data/referentiels/${selectedLayer.id}/schema/`,
        { method: "GET" }
      );
      const columns = Array.isArray(response?.columns) ? response.columns : [];
      setSchemaColumns(columns);
    } catch (errorValue: unknown) {
      setSchemaColumns([]);
      setSchemaError(
        errorValue instanceof Error && errorValue.message.trim()
          ? errorValue.message
          : "Schema referentiel indisponible."
      );
    } finally {
      setSchemaLoading(false);
    }
  }, [apiFetch, canManageReferentiels, selectedLayer.id]);

  const loadRegions = useCallback(async () => {
    try {
      const response = await apiFetch<GeoJsonResponse>("/data/carto/admin-region/", { method: "GET" });
      const options = (Array.isArray(response?.features) ? response.features : [])
        .map((feature) => {
          const props = feature?.properties || {};
          const value = String(props.id_region ?? props.code_region ?? "").trim();
          const label = String(props.nom_region ?? props.nom ?? "").trim();
          return value && label ? { value, label } : null;
        })
        .filter((row): row is RefOption => Boolean(row))
        .sort((a, b) => a.label.localeCompare(b.label, "fr"));
      setRegions(dedupeOptions(options));
    } catch (errorValue: unknown) {
      setRegions([]);
      setLookupsError(
        errorValue instanceof Error && errorValue.message.trim()
          ? errorValue.message
          : "Erreur de chargement des regions"
      );
    }
  }, [apiFetch]);

  const loadPrefectures = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (regionFilter) query.set("region", regionFilter);
      const suffix = query.toString() ? `?${query.toString()}` : "";
      const response = await apiFetch<GeoJsonResponse>(`/data/carto/admin-prefecture/${suffix}`, {
        method: "GET",
      });
      const options = (Array.isArray(response?.features) ? response.features : [])
        .map((feature) => {
          const props = feature?.properties || {};
          const value = String(props.id_prefecture ?? props.code_prefecture ?? "").trim();
          const label = String(props.nom_prefecture ?? props.nom ?? "").trim();
          return value && label ? { value, label } : null;
        })
        .filter((row): row is RefOption => Boolean(row))
        .sort((a, b) => a.label.localeCompare(b.label, "fr"));
      setPrefectures(dedupeOptions(options));
    } catch {
      setPrefectures([]);
    }
  }, [apiFetch, regionFilter]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLookupsLoading(true);
      setLookupsError(null);
      await loadRegions();
      await loadPrefectures();
      if (mounted) setLookupsLoading(false);
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [loadRegions, loadPrefectures]);

  useEffect(() => {
    void loadPrefectures();
  }, [loadPrefectures]);

  useEffect(() => {
    if (!selectedLayer.supportsPrefecture && prefectureFilter) {
      setPrefectureFilter("");
    }
  }, [selectedLayer, prefectureFilter]);

  const loadLayerData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      if (selectedLayer.supportsRegion && regionFilter) query.set("region", regionFilter);
      if (selectedLayer.supportsPrefecture && prefectureFilter) query.set("prefecture", prefectureFilter);

      const suffix = query.toString() ? `?${query.toString()}` : "";
      const response = await apiFetch<GeoJsonResponse>(`${selectedLayer.endpoint}${suffix}`, {
        method: "GET",
      });

      setFeatures(Array.isArray(response?.features) ? response.features : []);
      setPage(1);
    } catch (errorValue: unknown) {
      setFeatures([]);
      setError(
        errorValue instanceof Error && errorValue.message.trim()
          ? errorValue.message
          : "Erreur de chargement du referentiel."
      );
    } finally {
      setLoading(false);
    }
  }, [apiFetch, selectedLayer, regionFilter, prefectureFilter]);

  useEffect(() => {
    void loadLayerData();
  }, [loadLayerData]);

  useEffect(() => {
    void loadLayerSchema();
    setCreatePanelOpen(false);
    setUploadPanelOpen(false);
    setEditingRecordId(null);
    setMutationError(null);
    setMutationSuccess(null);
  }, [loadLayerSchema, selectedLayer.id]);

  const propertiesRows = useMemo(() => {
    return features.map((feature) => feature.properties || {});
  }, [features]);

  const derivedColumns = useMemo(() => {
    const keys = new Set<string>();
    for (const row of propertiesRows.slice(0, 200)) {
      for (const key of Object.keys(row)) keys.add(key);
    }

    const preferredOrder = [
      "id_region",
      "nom_region",
      "id_prefecture",
      "nom_prefecture",
      "id_commune",
      "nom_commune",
      "nom",
      "code",
      "type_equipement",
      "type_zone",
      "type_occupation",
      "commune_nom",
      "superficie",
      "longueur_km",
      "population",
    ];

    const preferred = preferredOrder.filter((key) => keys.has(key));
    const remaining = Array.from(keys)
      .filter((key) => !preferred.includes(key))
      .sort((a, b) => a.localeCompare(b, "fr"));

    const uniqueColumns: string[] = [];
    const seen = new Set<string>();
    for (const key of [...preferred, ...remaining]) {
      if (!seen.has(key)) {
        seen.add(key);
        uniqueColumns.push(key);
      }
    }

    return uniqueColumns;
  }, [propertiesRows]);

  const visibleColumns = useMemo(() => derivedColumns.slice(0, 10), [derivedColumns]);

  const geometrySummary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const feature of features) {
      const type = String(feature?.geometry?.type || "Unknown");
      counts[type] = (counts[type] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [features]);

  const totalPages = Math.max(1, Math.ceil(features.length / Math.max(1, pageSize)));
  const startIndex = (page - 1) * pageSize;
  const pageItems = features.slice(startIndex, startIndex + pageSize);

  const handleExportCsv = () => {
    const headers = derivedColumns;
    const lines = [
      headers.join(";"),
      ...features.map((feature) => {
        const row = feature.properties || {};
        return headers.map((header) => escapeCsv(row[header])).join(";");
      }),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `referentiel_${selectedLayer.id}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleOpenMap = () => {
    router.push(`/cartographie?layer=${encodeURIComponent(selectedLayer.mapLayerId)}`);
  };

  const getRecordIdFromRow = useCallback(
    (row: Record<string, unknown>): string => {
      const direct = safeString(row[selectedLayer.idProperty]);
      if (direct) return direct;

      const fallbackCandidates = [
        row.id_region,
        row.id_prefecture,
        row.id_commune,
        row.equip_id,
        row.localite_id,
        row.agglom_id,
        row.ap_id,
        row.zh_id,
        row.zs_id,
        row.occsol_id,
        row.hab_id,
        row.id,
      ];
      for (const candidate of fallbackCandidates) {
        const value = safeString(candidate);
        if (value) return value;
      }
      return "";
    },
    [selectedLayer.idProperty]
  );

  const handleStartCreate = () => {
    setMutationError(null);
    setMutationSuccess(null);
    setCreateValuesInput(requiredCreateTemplate || "{}");
    setCreateGeometryInput("");
    setCreatePanelOpen(true);
    setUploadPanelOpen(false);
    setEditingRecordId(null);
  };

  const handleCreateRecord = async () => {
    try {
      setMutationLoading(true);
      setMutationError(null);
      setMutationSuccess(null);

      const values = parseJsonObjectOrThrow(createValuesInput, "Values");
      const geometryPayload = buildGeometryPayload(createGeometryInput);

      const result = await apiFetch<RefMutationResponse>(
        `/data/referentiels/${selectedLayer.id}/records/`,
        {
          method: "POST",
          body: JSON.stringify({
            values,
            ...geometryPayload,
          }),
        }
      );

      setMutationSuccess(result?.detail || "Entite creee.");
      setCreatePanelOpen(false);
      await loadLayerData();
    } catch (errorValue: unknown) {
      setMutationError(
        errorValue instanceof Error && errorValue.message.trim()
          ? errorValue.message
          : "Echec creation referentiel."
      );
    } finally {
      setMutationLoading(false);
    }
  };

  const handleStartEdit = (row: Record<string, unknown>) => {
    const recordId = getRecordIdFromRow(row);
    if (!recordId) {
      setMutationError("Identifiant de la ligne introuvable.");
      return;
    }

    const filteredEntries = Object.entries(row).filter(([key]) => editableColumnNames.has(key));
    const filteredObject = Object.fromEntries(filteredEntries);

    setMutationError(null);
    setMutationSuccess(null);
    setEditingRecordId(recordId);
    setEditValuesInput(JSON.stringify(filteredObject, null, 2));
    setEditGeometryInput("");
    setCreatePanelOpen(false);
    setUploadPanelOpen(false);
  };

  const handleUpdateRecord = async () => {
    if (!editingRecordId) return;

    try {
      setMutationLoading(true);
      setMutationError(null);
      setMutationSuccess(null);

      const values = parseJsonObjectOrThrow(editValuesInput, "Values");
      const geometryPayload = buildGeometryPayload(editGeometryInput);

      const result = await apiFetch<RefMutationResponse>(
        `/data/referentiels/${selectedLayer.id}/records/${encodeURIComponent(editingRecordId)}/`,
        {
          method: "PATCH",
          body: JSON.stringify({
            values,
            ...geometryPayload,
          }),
        }
      );

      setMutationSuccess(result?.detail || "Entite mise a jour.");
      setEditingRecordId(null);
      await loadLayerData();
    } catch (errorValue: unknown) {
      setMutationError(
        errorValue instanceof Error && errorValue.message.trim()
          ? errorValue.message
          : "Echec mise a jour referentiel."
      );
    } finally {
      setMutationLoading(false);
    }
  };

  const handleDeleteRecord = async (row: Record<string, unknown>) => {
    const recordId = getRecordIdFromRow(row);
    if (!recordId) {
      setMutationError("Identifiant de la ligne introuvable.");
      return;
    }

    const confirmed = window.confirm(`Supprimer l'entite ${recordId} ?`);
    if (!confirmed) return;

    try {
      setMutationLoading(true);
      setMutationError(null);
      setMutationSuccess(null);

      const result = await apiFetch<RefMutationResponse>(
        `/data/referentiels/${selectedLayer.id}/records/${encodeURIComponent(recordId)}/`,
        { method: "DELETE" }
      );

      setMutationSuccess(result?.detail || "Entite supprimee.");
      await loadLayerData();
    } catch (errorValue: unknown) {
      setMutationError(
        errorValue instanceof Error && errorValue.message.trim()
          ? errorValue.message
          : "Echec suppression referentiel."
      );
    } finally {
      setMutationLoading(false);
    }
  };

  const handleUploadCsv = async () => {
    if (!uploadFile) {
      setMutationError("Selectionnez un fichier CSV.");
      return;
    }

    try {
      setMutationLoading(true);
      setMutationError(null);
      setMutationSuccess(null);
      setUploadResult(null);

      const body = new FormData();
      body.append("file", uploadFile);
      body.append("mode", uploadMode);

      const result = await apiFetch<RefUploadResponse>(
        `/data/referentiels/${selectedLayer.id}/upload-csv/`,
        {
          method: "POST",
          body,
        }
      );

      setUploadResult(result);
      setMutationSuccess(result?.detail || "Upload CSV termine.");
      if ((result?.created || 0) > 0 || (result?.updated || 0) > 0) {
        await loadLayerData();
      }
    } catch (errorValue: unknown) {
      setMutationError(
        errorValue instanceof Error && errorValue.message.trim()
          ? errorValue.message
          : "Echec upload CSV."
      );
    } finally {
      setMutationLoading(false);
    }
  };

  const handlePurgeCoreTable = async () => {
    if (!canRunCorePurge) {
      setMutationError("Purge core reservee aux admins N2/global.");
      return;
    }
    if (!coreTableId) {
      setMutationError("Selectionnez une table core a purger.");
      return;
    }

    if (corePurgeConfirmText.trim().toUpperCase() !== "PURGE") {
      setMutationError('Saisissez "PURGE" pour confirmer.');
      return;
    }

    const confirmed = window.confirm(
      `Confirmer la purge de la table ${coreTableId} pour le projet actif ?`
    );
    if (!confirmed) return;

    try {
      setCorePurgeLoading(true);
      setMutationError(null);
      setMutationSuccess(null);

      const result = await apiFetch<CorePurgeResponse>(`/data/entities/${coreTableId}/purge/`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      const purgedCount = Number(result?.purged_count || 0);
      setMutationSuccess(
        result?.detail
          ? `${result.detail} (${purgedCount} lignes supprimees)`
          : `Purge terminee (${purgedCount} lignes supprimees).`
      );
      setCorePurgeConfirmText("");
    } catch (errorValue: unknown) {
      setMutationError(
        errorValue instanceof Error && errorValue.message.trim()
          ? errorValue.message
          : "Echec purge core."
      );
    } finally {
      setCorePurgeLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Referentiels (ref.*)</h2>
            <p className="text-xs text-slate-500">
              Consultation des couches de reference et controle des attributs geographiques
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canManageReferentiels && (
              <button
                type="button"
                onClick={handleStartCreate}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </button>
            )}
            {canManageReferentiels && (
              <button
                type="button"
                onClick={() => {
                  setUploadPanelOpen((prev) => !prev);
                  setCreatePanelOpen(false);
                  setEditingRecordId(null);
                  setMutationError(null);
                  setMutationSuccess(null);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              >
                <Upload className="w-4 h-4" />
                Charger CSV
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenMap}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              <MapPin className="w-4 h-4" />
              Ouvrir cartographie
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={features.length === 0}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown className="w-4 h-4" />
              Exporter CSV
            </button>
            <button
              type="button"
              onClick={() => void loadLayerData()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Rafraichir
            </button>
          </div>
        </div>

        {canManageReferentiels ? (
          <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
            Edition referentiels activee: ajout, mise a jour, suppression et chargement CSV.
          </div>
        ) : (
          <div className="px-4 py-2 border-b border-slate-200 bg-amber-50 text-xs text-amber-800">
            Acces lecture uniquement pour votre role.
          </div>
        )}

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="xl:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Referentiel</label>
            <select
              value={selectedLayerId}
              onChange={(event) => setSelectedLayerId(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            >
              {REF_LAYER_DEFINITIONS.map((layer) => (
                <option key={layer.id} value={layer.id}>
                  {layer.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">{selectedLayer.description}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Region</label>
            <select
              value={regionFilter}
              onChange={(event) => {
                setRegionFilter(event.target.value);
                setPrefectureFilter("");
              }}
              disabled={!selectedLayer.supportsRegion}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">Toutes</option>
              {regions.map((region) => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Prefecture</label>
            <select
              value={prefectureFilter}
              onChange={(event) => setPrefectureFilter(event.target.value)}
              disabled={!selectedLayer.supportsPrefecture}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">Toutes</option>
              {prefectures.map((prefecture) => (
                <option key={prefecture.value} value={prefecture.value}>
                  {prefecture.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {lookupsError && (
          <div className="mx-4 mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{lookupsError}</span>
          </div>
        )}

        {schemaError && canManageReferentiels && (
          <div className="mx-4 mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{schemaError}</span>
          </div>
        )}

        {mutationError && (
          <div className="mx-4 mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{mutationError}</span>
          </div>
        )}

        {mutationSuccess && (
          <div className="mx-4 mb-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-800">
            {mutationSuccess}
          </div>
        )}

        <div className="mx-4 mb-4 rounded-lg border border-slate-200 bg-slate-50">
          <div className="px-4 py-3 border-b border-slate-200">
            <p className="text-sm font-semibold text-slate-800">Maintenance core.* (projet actif)</p>
            <p className="text-xs text-slate-500">
              Purge par table metier (scope projet). Operation reservee aux admins N2/global.
            </p>
          </div>
          <div className="p-4 grid grid-cols-1 xl:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Table core</label>
              <select
                value={coreTableId}
                onChange={(event) => setCoreTableId(event.target.value)}
                disabled={!canRunCorePurge || corePurgeLoading}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {CORE_TABLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Confirmation</label>
              <input
                value={corePurgeConfirmText}
                onChange={(event) => setCorePurgeConfirmText(event.target.value)}
                placeholder='Saisir "PURGE"'
                disabled={!canRunCorePurge || corePurgeLoading}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void handlePurgeCoreTable()}
                disabled={!canRunCorePurge || corePurgeLoading}
                className="inline-flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {corePurgeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Purger la table
              </button>
            </div>
          </div>
          {!canRunCorePurge && (
            <div className="px-4 pb-4 text-xs text-amber-700">
              Votre role autorise la gestion referentielle, mais pas la purge core (N2/global requis).
            </div>
          )}
        </div>

        {canManageReferentiels && createPanelOpen && (
          <div className="mx-4 mb-4 rounded-lg border border-emerald-200 bg-emerald-50/40">
            <div className="px-4 py-3 border-b border-emerald-200 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-emerald-900">Ajouter une entite ({selectedLayer.label})</p>
              <button
                type="button"
                onClick={() => setCreatePanelOpen(false)}
                className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900"
              >
                <X className="w-3 h-3" />
                Fermer
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600 mb-1">Values (JSON)</p>
                <textarea
                  value={createValuesInput}
                  onChange={(event) => setCreateValuesInput(event.target.value)}
                  rows={12}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Colonnes editables:{" "}
                  {schemaLoading
                    ? "chargement..."
                    : schemaColumns.filter((column) => column.editable && !column.is_geometry).map((c) => c.name).join(", ") ||
                      "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Geometrie (GeoJSON ou WKT, optionnel)</p>
                <textarea
                  value={createGeometryInput}
                  onChange={(event) => setCreateGeometryInput(event.target.value)}
                  rows={12}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCreateRecord()}
                    disabled={mutationLoading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {mutationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Creer
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatePanelOpen(false)}
                    className="px-3 py-2 rounded-lg text-sm border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {canManageReferentiels && uploadPanelOpen && (
          <div className="mx-4 mb-4 rounded-lg border border-slate-200 bg-slate-50">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-800">Charger un CSV ({selectedLayer.label})</p>
              <button
                type="button"
                onClick={() => setUploadPanelOpen(false)}
                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800"
              >
                <X className="w-3 h-3" />
                Fermer
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mode</label>
                <select
                  value={uploadMode}
                  onChange={(event) => setUploadMode(event.target.value as "upsert" | "insert")}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="upsert">upsert</option>
                  <option value="insert">insert</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Fichier CSV</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleUploadCsv()}
                  disabled={mutationLoading || !uploadFile}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {mutationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Envoyer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadFile(null);
                    setUploadResult(null);
                  }}
                  className="px-3 py-2 rounded-lg text-sm border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                >
                  Vider
                </button>
              </div>
            </div>
            {uploadResult && (
              <div className="px-4 pb-4 text-xs text-slate-700">
                status: <span className="font-semibold">{uploadResult.status || "-"}</span> | created:{" "}
                <span className="font-semibold">{uploadResult.created ?? 0}</span> | updated:{" "}
                <span className="font-semibold">{uploadResult.updated ?? 0}</span> | failed:{" "}
                <span className="font-semibold">{uploadResult.failed ?? 0}</span>
              </div>
            )}
          </div>
        )}

        {canManageReferentiels && editingRecordId && (
          <div className="mx-4 mb-4 rounded-lg border border-blue-200 bg-blue-50/40">
            <div className="px-4 py-3 border-b border-blue-200 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-blue-900">
                Modifier l&apos;entite {editingRecordId} ({selectedLayer.label})
              </p>
              <button
                type="button"
                onClick={() => setEditingRecordId(null)}
                className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900"
              >
                <X className="w-3 h-3" />
                Fermer
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600 mb-1">Values (JSON)</p>
                <textarea
                  value={editValuesInput}
                  onChange={(event) => setEditValuesInput(event.target.value)}
                  rows={12}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-700"
                />
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Geometrie (GeoJSON ou WKT, optionnel)</p>
                <textarea
                  value={editGeometryInput}
                  onChange={(event) => setEditGeometryInput(event.target.value)}
                  rows={12}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-700"
                />
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleUpdateRecord()}
                    disabled={mutationLoading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {mutationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRecordId(null)}
                    className="px-3 py-2 rounded-lg text-sm border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Features</p>
            <p className="text-xl font-semibold text-slate-800">{features.length.toLocaleString("fr-FR")}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Colonnes detectees</p>
            <p className="text-xl font-semibold text-slate-800">{derivedColumns.length.toLocaleString("fr-FR")}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Geometries</p>
            <p className="text-sm font-semibold text-slate-700 mt-1">
              {geometrySummary.length > 0
                ? geometrySummary.map(([type, count]) => `${type}: ${count}`).join(" | ")
                : "-"}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200">
          {loading || lookupsLoading ? (
            <div className="px-4 py-12 text-center text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Chargement du referentiel...
            </div>
          ) : error ? (
            <div className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 flex items-start gap-2 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : features.length === 0 ? (
            <div className="px-4 py-12 text-center text-slate-500">
              <Layers3 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              Aucun element pour ces filtres.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {visibleColumns.map((column, columnIndex) => (
                      <th
                        key={`th_${column}_${columnIndex}`}
                        className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                      >
                        {column}
                      </th>
                    ))}
                    {canManageReferentiels && (
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((feature, index) => {
                    const row = feature.properties || {};
                    const recordId = getRecordIdFromRow(row);
                    return (
                      <tr key={getFeatureRowKey(feature, selectedLayer.id, startIndex + index)}>
                        {visibleColumns.map((column, columnIndex) => (
                          <td key={`td_${column}_${columnIndex}`} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                            {cleanCell(row[column])}
                          </td>
                        ))}
                        {canManageReferentiels && (
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(row)}
                                disabled={!recordId || mutationLoading}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs disabled:opacity-50"
                              >
                                <Pencil className="w-3 h-3" />
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteRecord(row)}
                                disabled={!recordId || mutationLoading}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs disabled:opacity-50"
                              >
                                <Trash2 className="w-3 h-3" />
                                Supprimer
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="text-sm text-slate-600 inline-flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span>
              {(features.length === 0 ? 0 : startIndex + 1).toLocaleString("fr-FR")} a{" "}
              {Math.min(startIndex + pageSize, features.length).toLocaleString("fr-FR")} sur{" "}
              {features.length.toLocaleString("fr-FR")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(event) => {
                setPage(1);
                setPageSize(Number(event.target.value));
              }}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prec.
            </button>
            <span className="text-sm text-slate-600">
              {page} / {totalPages}
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
    </div>
  );
}
