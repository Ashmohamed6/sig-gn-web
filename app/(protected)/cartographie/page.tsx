// app/(protected)/cartographie/page.tsx

"use client";

import React, { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type {
  GeoJSON as LeafletGeoJSON,
  Layer as LeafletLayer,
  LeafletMouseEvent,
  Map as LeafletMap,
} from "leaflet";
import {
  Layers,
  Map as MapIcon,
  Loader2,
  AlertCircle,
  Menu,
  X,
  LogOut,
  FolderSync,
  Home,
} from "lucide-react";

import {
  getCurrentProject,
  logout,
  getUser,
  type RefProject,
} from "@/utils/authClient";
import { useMapLayers } from "./hooks/useMapLayers";
import { clearGeoJSONCache } from "./hooks/useGeoJSON";
import { getLayerById } from "./config/layersConfig";
import { getLegendPreview } from "./config/layerStyles";
import { exportMap, getMapBounds } from "./utils/printUtils";
import type { PrintConfig } from "./components/PrintModal";

// Import dynamique des composants (pas de SSR pour Leaflet)
const MapContainer = dynamic(() => import("./components/MapContainer"), {
  ssr: false,
  loading: () => <MapLoading />,
});

const MapToolbar = dynamic(() => import("./components/MapToolbar"), {
  ssr: false,
});

const LayerPanel = dynamic(() => import("./components/LayerPanel"), {
  ssr: false,
});

const PrintModal = dynamic(() => import("./components/PrintModal"), {
  ssr: false,
});

const MeasureTools = dynamic(() => import("./components/MeasureTools"), {
  ssr: false,
});

// ============================================================
// TYPES
// ============================================================

interface UserInfo {
  first_name?: string;
  last_name?: string;
  username?: string;
}
interface GeoJSONPaginationMeta {
  page?: number;
  page_size?: number;
  has_next?: boolean;
  next?: string | null;
}
interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  name?: string;
  features: unknown[];
  pagination?: GeoJSONPaginationMeta;
}

type LegendGeometry = "point" | "line" | "polygon";

const CARTO_GEOJSON_PAGE_SIZE = 20000;
const CARTO_GEOJSON_MAX_PAGES = 500;

const CARTO_LAYER_ID_KEYS: Record<string, string[]> = {
  cep_parcelles: ["cep_uuid", "code_parcelle", "id_cep"],
  intrants: ["intrant_uuid"],
  tetes_sources: ["ts_uuid", "nom_source", "id_ts"],
  stations_meteo: ["station_uuid", "code_station"],
  ouvrages: ["ouvrage_uuid", "code_ouvrage"],
  couloirs: ["id_couloir", "nom_couloir"],
  zones_degradees: ["zone_uuid", "id_zone"],
  organisations: ["org_uuid", "id_org"],
  menages: ["menage_uuid", "id_menage"],
  comites: ["comite_uuid", "id_comite"],
  marches: ["marche_uuid"],
  entreprises: ["ent_uuid", "id_ent"],
  formations: ["formation_uuid", "id_formation"],
  sortants: ["suivi_uuid", "id_sortant"],
  emplois: ["emploi_dom_uuid", "id_ent"],
  insertions: ["insertion_dom_uuid", "id_ent"],
};
const CARTO_LAYER_ALIASES: Record<string, string> = {
  cep: "cep_parcelles",
};

const LEGEND_GEOMETRY_ORDER: Record<LegendGeometry, number> = {
  point: 0,
  line: 1,
  polygon: 2,
};

type LeafletModule = typeof import("leaflet");
let leafletModulePromise: Promise<LeafletModule> | null = null;

function loadLeafletModule(): Promise<LeafletModule> {
  if (!leafletModulePromise) {
    leafletModulePromise = import("leaflet");
  }
  return leafletModulePromise;
}

function appendQueryParams(endpoint: string, queryParams: Record<string, string>): string {
  const [pathPart, queryPart = ""] = endpoint.split("?");
  const params = new URLSearchParams(queryPart);
  Object.entries(queryParams).forEach(([key, value]) => {
    params.set(key, value);
  });
  const query = params.toString();
  return query ? `${pathPart}?${query}` : pathPart;
}

function isGeoJSONFeatureCollection(payload: unknown): payload is GeoJSONFeatureCollection {
  if (!payload || typeof payload !== "object") return false;
  const asRecord = payload as Record<string, unknown>;
  return asRecord.type === "FeatureCollection" && Array.isArray(asRecord.features);
}

function hasNextGeoJSONPage(pagination: GeoJSONPaginationMeta | undefined): boolean {
  if (!pagination || typeof pagination !== "object") return false;
  if (pagination.has_next === true) return true;
  return typeof pagination.next === "string" && pagination.next.trim().length > 0;
}

function extractRegionNameFromFeature(feature: unknown): string {
  const asRecord = (feature && typeof feature === "object" ? feature : null) as
    | Record<string, unknown>
    | null;
  const props =
    asRecord && typeof asRecord.properties === "object" && asRecord.properties
      ? (asRecord.properties as Record<string, unknown>)
      : null;
  if (!props) return "";

  const candidates = [props.nom_region, props.nom, props.region_nom, props.name];
  for (const value of candidates) {
    const region = String(value ?? "").trim();
    if (region) return region;
  }
  return "";
}

function extractRegionOptions(payload: GeoJSONFeatureCollection): string[] {
  return Array.from(
    new Set(
      (payload.features || [])
        .map((feature) => extractRegionNameFromFeature(feature))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
}

function mapGeometryToLegendType(geometryType: string): LegendGeometry {
  if (geometryType === "Point") return "point";
  if (geometryType.includes("Line")) return "line";
  return "polygon";
}

function sortLegendLayers<T extends { name: string; type?: LegendGeometry }>(layers: T[]): T[] {
  return [...layers].sort((a, b) => {
    const orderA = LEGEND_GEOMETRY_ORDER[a.type ?? "polygon"] ?? 99;
    const orderB = LEGEND_GEOMETRY_ORDER[b.type ?? "polygon"] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
  });
}

async function fetchGeoJSONLayer(
  endpoint: string,
  projectCode: string
): Promise<GeoJSONFeatureCollection> {
  const baseUrl = "/api/proxy";
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-Project-Code": projectCode,
  };

  const mergedFeatures: unknown[] = [];
  let layerName = "";
  let page = 1;

  while (page <= CARTO_GEOJSON_MAX_PAGES) {
    const pagedEndpoint = appendQueryParams(endpoint, {
      paginate: "1",
      page: String(page),
      page_size: String(CARTO_GEOJSON_PAGE_SIZE),
    });

    const response = await fetch(`${baseUrl}${pagedEndpoint}`, {
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (!isGeoJSONFeatureCollection(payload)) {
      throw new Error("Format GeoJSON invalide");
    }

    if (!layerName && payload.name) {
      layerName = payload.name;
    }
    mergedFeatures.push(...payload.features);

    if (!hasNextGeoJSONPage(payload.pagination)) {
      return {
        type: "FeatureCollection",
        name: layerName || payload.name,
        features: mergedFeatures,
      };
    }

    page += 1;
  }

  throw new Error("Pagination GeoJSON incoherente: trop de pages");
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CartographiePage() {
  return (
    <Suspense fallback={<MapLoading />}>
      <CartographiePageContent />
    </Suspense>
  );
}

function CartographiePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Etat global
  const [project, setProject] = useState<RefProject | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(true);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const [printRegionOptions, setPrintRegionOptions] = useState<string[]>([]);

  // Hook de gestion des couches
  const projectCode = project?.code_fonc || "";
  const {
    layerStates,
    groupStates,

    // Basemap + fond neutre
    activeBasemap,
    basemapCollapsed,
    neutralBg,
    changeBasemap,
    toggleBasemapCollapsed,
    setNeutralBackground,

    // Labels admin
    showRegionLabels,
    showPrefectureLabels,
    showCommuneLabels,
    setAdminLabelMode,

    // Donnees
    availableLayers,
    availableGroups,
    visibleLayers,
    visibleLayerIds,
    totalVisibleFeatures,

    // Actions couches/groupes
    toggleLayerVisibility,
    showLayer,
    toggleGroupCollapsed,
    showGroupLayers,
    hideGroupLayers,

    // Actions data
    resetToDefaults,
    setLayerLoading,
    setLayerError,
    setLayerFeatureCount,
  } = useMapLayers(projectCode);

  // Donnees GeoJSON pour les couches visibles
  const [layerData, setLayerData] = useState<Record<string, any>>({});

  // Ref pour eviter les doubles chargements
  const loadingLayersRef = useRef<Set<string>>(new Set());
  const focusedDeepLinkRef = useRef<string>("");
  const deepLinkHighlightRef = useRef<LeafletLayer | null>(null);

  const deepLinkLayerId = useMemo(() => {
    const raw = (searchParams.get("layer") || "").trim();
    if (!raw) return "";
    return CARTO_LAYER_ALIASES[raw] || raw;
  }, [searchParams]);

  const deepLinkIds = useMemo(
    () =>
      (searchParams.get("ids") || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    [searchParams]
  );

  const deepLinkIdField = useMemo(
    () => (searchParams.get("id_field") || "").trim(),
    [searchParams]
  );
  const deepLinkHints = useMemo(
    () => ({
      domaine: (searchParams.get("hint_domaine") || "").trim(),
      typeInsertion: (searchParams.get("hint_type_insertion") || "").trim(),
      annee: (searchParams.get("hint_annee") || "").trim(),
      raisonSociale: (searchParams.get("hint_raison_sociale") || "").trim(),
    }),
    [searchParams]
  );

  const clearDeepLinkHighlight = useCallback(() => {
    if (!deepLinkHighlightRef.current) return;
    deepLinkHighlightRef.current.remove();
    deepLinkHighlightRef.current = null;
  }, []);

  // ============================================================
  // CHARGEMENT INITIAL
  // ============================================================

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
        setUser(userData);
      } catch (err: any) {
        setError(err.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  useEffect(() => {
    if (!projectCode) return;
    let cancelled = false;

    const loadRegionOptions = async () => {
      try {
        const geojson = await fetchGeoJSONLayer("/data/carto/admin-region/", projectCode);
        if (cancelled) return;
        setPrintRegionOptions(extractRegionOptions(geojson));
      } catch {
        if (!cancelled) {
          setPrintRegionOptions([]);
        }
      }
    };

    void loadRegionOptions();
    return () => {
      cancelled = true;
    };
  }, [projectCode]);

  // ============================================================
  // CHARGEMENT DES DONNEES GEOJSON
  // ============================================================

  useEffect(() => {
    if (!project) return;

    const loadLayerData = async () => {
      for (const layerId of visibleLayerIds) {
        // Skip si deja charge ou en cours de chargement
        if (layerData[layerId] || loadingLayersRef.current.has(layerId)) {
          continue;
        }

        const layerConfig = getLayerById(layerId);
        if (!layerConfig) continue;

        // Marquer comme en cours de chargement
        loadingLayersRef.current.add(layerId);
        setLayerLoading(layerId, true);

        try {
          const code = project?.code_fonc;
          if (!code) continue;
          const geojson = await fetchGeoJSONLayer(layerConfig.endpoint, code);

          setLayerData((prev) => ({
            ...prev,
            [layerId]: geojson,
          }));

          setLayerFeatureCount(layerId, geojson.features?.length || 0);
        } catch (err: any) {
          setLayerError(layerId, err.message);
        } finally {
          loadingLayersRef.current.delete(layerId);
        }
      }
    };

    loadLayerData();
  }, [
    visibleLayerIds,
    project,
    layerData,
    setLayerLoading,
    setLayerError,
    setLayerFeatureCount,
  ]);

  useEffect(() => {
    return () => {
      clearDeepLinkHighlight();
    };
  }, [clearDeepLinkHighlight]);

  useEffect(() => {
    if (!deepLinkLayerId || !projectCode) return;
    if (!availableLayers.some((layer) => layer.id === deepLinkLayerId)) return;
    showLayer(deepLinkLayerId);
  }, [deepLinkLayerId, projectCode, availableLayers, showLayer]);

  useEffect(() => {
    if (!mapInstance || !deepLinkLayerId || deepLinkIds.length === 0) return;

    let cancelled = false;

    const applyDeepLinkFocus = async () => {
      const targetLayerData = layerData[deepLinkLayerId];
      if (!targetLayerData?.features?.length) return;

      const idKeys = CARTO_LAYER_ID_KEYS[deepLinkLayerId] || [];
      const orderedIdKeys = Array.from(
        new Set(
          [deepLinkIdField, ...idKeys]
            .map((v) => String(v || "").trim())
            .filter(Boolean)
        )
      );
      if (orderedIdKeys.length === 0) return;

      const wantedIds = new Set(deepLinkIds.map((v) => String(v)));
      let matchedKey = "";
      let matchedFeatures: any[] = [];

      for (const key of orderedIdKeys) {
        const byKey = targetLayerData.features.filter((feature: any) => {
          const value = feature?.properties?.[key];
          return value !== null && value !== undefined && wantedIds.has(String(value));
        });

        if (byKey.length > 0) {
          matchedKey = key;
          matchedFeatures = byKey;
          break;
        }
      }

      clearDeepLinkHighlight();

      if (matchedFeatures.length > 1 && deepLinkIds.length === 1) {
        const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();
        const narrowByHint = (rows: any[], propKey: string, hintValue: string) => {
          const hint = normalize(hintValue);
          if (!hint || rows.length <= 1) return rows;
          const narrowed = rows.filter((feature: any) => {
            const propValue = feature?.properties?.[propKey];
            return normalize(propValue) === hint;
          });
          return narrowed.length > 0 ? narrowed : rows;
        };

        matchedFeatures = narrowByHint(matchedFeatures, "raison_sociale", deepLinkHints.raisonSociale);
        matchedFeatures = narrowByHint(matchedFeatures, "domaine_label", deepLinkHints.domaine);
        matchedFeatures = narrowByHint(matchedFeatures, "type_insertion_label", deepLinkHints.typeInsertion);
        matchedFeatures = narrowByHint(matchedFeatures, "annee_ref", deepLinkHints.annee);
      }

      if (matchedFeatures.length === 0) return;

      const leaflet = await loadLeafletModule();
      if (cancelled) return;

      const highlightLayer = createDeepLinkHighlightLayer(leaflet, matchedFeatures);
      if (highlightLayer) {
        highlightLayer.addTo(mapInstance);
        if (typeof (highlightLayer as any).bringToFront === "function") {
          (highlightLayer as any).bringToFront();
        }
        deepLinkHighlightRef.current = highlightLayer;
      }

      const focusKey = `${deepLinkLayerId}::${matchedKey}::${deepLinkIds.join(",")}::${deepLinkHints.domaine}::${deepLinkHints.typeInsertion}::${deepLinkHints.annee}::${deepLinkHints.raisonSociale}`;
      if (focusedDeepLinkRef.current === focusKey) return;

      if (matchedFeatures.length === 1) {
        const geometry = matchedFeatures[0]?.geometry;
        if (
          geometry?.type === "Point" &&
          Array.isArray(geometry.coordinates) &&
          geometry.coordinates.length >= 2
        ) {
          const lng = Number(geometry.coordinates[0]);
          const lat = Number(geometry.coordinates[1]);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            mapInstance.flyTo([lat, lng], 18, { animate: true, duration: 0.7 });
            focusedDeepLinkRef.current = focusKey;
            return;
          }
        }
      }

      const boundsLayer = leaflet.geoJSON({
        type: "FeatureCollection",
        features: matchedFeatures,
      } as any);
      const bounds = boundsLayer.getBounds();
      boundsLayer.remove();

      if (!bounds.isValid()) return;

      if (matchedFeatures.length === 1) {
        mapInstance.fitBounds(bounds.pad(0.12), { maxZoom: 17, animate: true });
      } else {
        mapInstance.fitBounds(bounds.pad(0.2), { maxZoom: 15, animate: true });
      }
      focusedDeepLinkRef.current = focusKey;
    };

    void applyDeepLinkFocus();

    return () => {
      cancelled = true;
    };
  }, [
    mapInstance,
    layerData,
    deepLinkLayerId,
    deepLinkIds,
    deepLinkIdField,
    deepLinkHints,
    clearDeepLinkHighlight,
  ]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleLogout = useCallback(() => {
    clearGeoJSONCache();
    logout();
    router.push("/login");
  }, [router]);

  const handleChangeProject = useCallback(() => {
    clearGeoJSONCache();
    router.push("/project-selection?change=true");
  }, [router]);

  const handleGoToDashboard = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const handleMapReady = useCallback((map: LeafletMap) => {
    setMapInstance(map);
  }, []);

  const handlePrintClick = useCallback(() => {
    setIsPrintModalOpen(true);
  }, []);

  const printLegendLayers = useMemo(
    () =>
      sortLegendLayers(
        visibleLayers.map((layer) => ({
          id: layer.id,
          name: layer.name,
          color: layer.style.iconColor || layer.style.fillColor || layer.style.color,
          type: mapGeometryToLegendType(layer.geometryType),
          legendPreviewHtml: getLegendPreview(layer),
        }))
      ),
    [visibleLayers]
  );

  const handlePrint = useCallback(
    async (config: PrintConfig) => {
      if (!mapInstance) {
        throw new Error("Carte non initialisee");
      }

      const mapElement = mapInstance.getContainer();
      if (!mapElement) {
        throw new Error("Element carte introuvable");
      }

      // Stop any ongoing animations/panning
      mapInstance.stop();

      // Close any open popups/tooltips so they don't appear in the export
      try { mapInstance.closePopup(); } catch { /* no popup open */ }
      try { mapInstance.closeTooltip(); } catch { /* no tooltip open */ }

      // Capture the current bounds BEFORE any size manipulation
      const bounds = getMapBounds(mapInstance);

      // Wait for tiles to stabilize at current view
      await new Promise((r) => setTimeout(r, 400));

      await exportMap({
        config,
        mapElement,
        layers: printLegendLayers,
        bounds,
      });
    },
    [mapInstance, printLegendLayers]
  );

  const handleResetLayers = useCallback(() => {
    setLayerData({});
    loadingLayersRef.current.clear();
    clearGeoJSONCache();
    resetToDefaults();
  }, [resetToDefaults]);

  const handleLayerLoad = useCallback(
    (layerId: string, count: number) => {
      setLayerFeatureCount(layerId, count);
    },
    [setLayerFeatureCount]
  );

  const handleLayerError = useCallback(
    (layerId: string, error: string) => {
      setLayerError(layerId, error);
    },
    [setLayerError]
  );

  // ============================================================
  // COMPUTED
  // ============================================================

  const userName = useMemo(() => {
    const full = [user?.first_name, user?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    return full || user?.username || "Utilisateur";
  }, [user]);

  const visibleCount = useMemo(
    () => Object.values(layerStates).filter((s) => s.visible).length,
    [layerStates]
  );

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (loading) {
    return <MapLoading />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-red-950/50 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-4" />
          <p className="text-red-200">{error}</p>
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

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <header className="flex-shrink-0 bg-gradient-to-r from-[#CE1126] via-[#FFCD00] to-[#009639] shadow-lg z-30">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
              className="lg:hidden p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              {isLayerPanelOpen ? (
                <X className="h-5 w-5 text-white" />
              ) : (
                <Menu className="h-5 w-5 text-white" />
              )}
            </button>

            <div>
              <h1 className="text-lg font-bold text-white drop-shadow flex items-center gap-2">
                <MapIcon className="h-5 w-5" />
                Cartographie
              </h1>
              <p className="text-xs text-white/80">
                {project?.libelle_public || project?.code_fonc}
              </p>
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

      {/* Main content */}
      <main className="flex-1 relative overflow-hidden">
        {/* Map */}
        <div className="map-wrapper absolute inset-0">
          <MapContainer
            visibleLayerIds={visibleLayerIds}
            layerData={layerData}
            activeBasemap={activeBasemap}
            neutralBg={neutralBg}
            onBasemapFallback={changeBasemap}
            showRegionLabels={showRegionLabels}
            showPrefectureLabels={showPrefectureLabels}
            showCommuneLabels={showCommuneLabels}
            onMapReady={handleMapReady}
            onLayerLoad={handleLayerLoad}
            onLayerError={handleLayerError}
          />
        </div>

        {/* Layer Panel */}
        <LayerPanel
          isOpen={isLayerPanelOpen}
          onClose={() => setIsLayerPanelOpen(false)}
          layers={availableLayers}
          groups={availableGroups}
          layerStates={layerStates}
          groupStates={groupStates}
          totalVisibleFeatures={totalVisibleFeatures}
          basemapId={activeBasemap as any}
          basemapCollapsed={basemapCollapsed}
          onToggleBasemapCollapsed={toggleBasemapCollapsed}
          onBasemapChange={(id) => changeBasemap(id as any)}
          neutralBg={neutralBg}
          onChangeNeutralBg={setNeutralBackground}
          showRegionLabels={showRegionLabels}
          showPrefectureLabels={showPrefectureLabels}
          showCommuneLabels={showCommuneLabels}
          onChangeRegionLabels={(v) => setAdminLabelMode("regions", v)}
          onChangePrefectureLabels={(v) => setAdminLabelMode("prefectures", v)}
          onChangeCommuneLabels={(v) => setAdminLabelMode("communes", v)}
          onToggleLayer={toggleLayerVisibility}
          onToggleGroupCollapsed={toggleGroupCollapsed}
          onShowGroup={showGroupLayers}
          onHideGroup={hideGroupLayers}
        />

        {/* Toggle button (quand panel ferme) */}
        {!isLayerPanelOpen && (
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={() => setIsLayerPanelOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg shadow-md transition-all bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            >
              <Layers className="h-4 w-4" />
              <span className="text-sm font-medium">Couches</span>
              {visibleCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  {visibleCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Map Toolbar */}
        <div className="absolute top-4 right-4 z-10">
          <MapToolbar
            map={mapInstance}
            onPrintClick={handlePrintClick}
            onResetLayers={handleResetLayers}
          />
        </div>

        {/* Measure Tools */}
        <div className="absolute top-44 right-4 z-10">
          <MeasureTools map={mapInstance} />
        </div>

        {/* Coordinates display */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <CoordinatesDisplay map={mapInstance} />
        </div>
      </main>

      {/* Print Modal */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        onPrint={handlePrint}
        visibleLayers={printLegendLayers}
        projectName={project?.libelle_public || project?.code_fonc || "SIGMA"}
        regionOptions={printRegionOptions}
      />
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function MapLoading() {
  return (
    <div className="h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Chargement de la carte...</p>
      </div>
    </div>
  );
}

interface CoordinatesDisplayProps {
  map: LeafletMap | null;
}

function CoordinatesDisplay({ map }: CoordinatesDisplayProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!map) return;

    const handleMouseMove = (e: LeafletMouseEvent) => {
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    };

    map.on("mousemove", handleMouseMove);

    return () => {
      map.off("mousemove", handleMouseMove);
    };
  }, [map]);

  if (!coords) return null;

  const latDir = coords.lat >= 0 ? "N" : "S";
  const lngDir = coords.lng >= 0 ? "E" : "W";
  const degree = "\u00B0";

  return (
    <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md text-xs text-slate-600 font-mono">
      {Math.abs(coords.lat).toFixed(5)}
      {degree} {latDir}, {Math.abs(coords.lng).toFixed(5)}
      {degree} {lngDir}
    </div>
  );
}
function createDeepLinkHighlightLayer(
  leaflet: LeafletModule,
  features: any[]
): LeafletGeoJSON | null {
  if (!features || features.length === 0) return null;

  return leaflet.geoJSON(
    {
      type: "FeatureCollection",
      features,
    } as any,
    {
      style: () => ({
        color: "#facc15",
        weight: 4,
        opacity: 1,
        fillColor: "#fde047",
        fillOpacity: 0.4,
      }),
      pointToLayer: (_feature, latlng) =>
        leaflet.circleMarker(latlng, {
          radius: 12,
          color: "#facc15",
          weight: 4,
          opacity: 1,
          fillColor: "#fde047",
          fillOpacity: 0.55,
        }),
    }
  );
}
