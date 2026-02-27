// app/(protected)/cartographie/hooks/useMapLayers.ts

/**
 * Hook pour gérer l'état des couches cartographiques
 * - Visibilité des couches
 * - Chargement des données
 * - Persistance des préférences
 *
 * Notes:
 * - Basemap par défaut: "none" (fond neutre)
 * - Normalise quelques alias possibles: "openstreetmap" -> "osm", "satellite" -> "sat"
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { LayerConfig, LayerGroup } from "../config/layersConfig";
import {
  getLayersForProject,
  getLayerGroupsForProject,
} from "../config/layersConfig";

// ============================================================
// TYPES
// ============================================================

export interface LayerState {
  id: string;
  visible: boolean;
  loading: boolean;
  error: string | null;
  featureCount: number;
}

export interface GroupState {
  id: string;
  collapsed: boolean;
}

export type BasemapId = "none" | "plan" | "osm" | "sat";

// ============================================================
// STORAGE KEYS
// ============================================================

const STORAGE_KEY_LAYERS = "map_layers_visibility";
const STORAGE_KEY_GROUPS = "map_groups_collapsed";

const STORAGE_KEY_BASEMAP = "map_basemap";
const STORAGE_KEY_BASEMAP_COLLAPSED = "map_basemap_collapsed";

const STORAGE_KEY_NEUTRAL_BG = "map_neutral_bg";

const STORAGE_KEY_LABEL_REGIONS = "map_label_regions";
const STORAGE_KEY_LABEL_PREFECTURES = "map_label_prefectures";
const STORAGE_KEY_LABEL_COMMUNES = "map_label_communes";

// ============================================================
// HELPERS (UI normalization)
// ============================================================

function normalizeBasemapId(value: string): BasemapId {
  const v = (value || "").toLowerCase().trim();
  if (v === "openstreetmap") return "osm";
  if (v === "satellite") return "sat";
  if (v === "ign" || v === "plan_ign" || v === "administratif") return "plan";
  if (v === "osm" || v === "sat" || v === "plan" || v === "none") return v as BasemapId;
  return "none";
}

// ============================================================
// HOOK
// ============================================================

export function useMapLayers(projectCode: string) {
  // Couches disponibles pour ce projet
  const availableLayers = useMemo(
    () => getLayersForProject(projectCode),
    [projectCode]
  );

  // Groupes disponibles pour ce projet
  const availableGroups = useMemo(
    () => getLayerGroupsForProject(projectCode),
    [projectCode]
  );

  // État des couches
  const [layerStates, setLayerStates] = useState<Record<string, LayerState>>(
    () => initializeLayerStates(availableLayers)
  );

  // État des groupes
  const [groupStates, setGroupStates] = useState<Record<string, GroupState>>(
    () => initializeGroupStates(availableGroups)
  );

  // Fond de carte actif
  const [activeBasemap, setActiveBasemap] = useState<BasemapId>(() => {
    if (typeof window !== "undefined") {
      return normalizeBasemapId(localStorage.getItem(STORAGE_KEY_BASEMAP) || "none");
    }
    return "none";
  });

  // Groupe "Fonds de carte" replié/déplié
  const [basemapCollapsed, setBasemapCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY_BASEMAP_COLLAPSED) === "1";
    }
    return false;
  });

  // Fond neutre (quand aucun fond de carte)
  const [neutralBg, setNeutralBg] = useState<"gray" | "white">(() => {
    if (typeof window !== "undefined") {
      const v = (localStorage.getItem(STORAGE_KEY_NEUTRAL_BG) as "gray" | "white") || "gray";
      return v === "white" ? "white" : "gray";
    }
    return "gray";
  });

  // Labels administratifs séparés
  const [showRegionLabels, setShowRegionLabels] = useState<boolean>(() => {
    if (typeof window !== "undefined") return localStorage.getItem(STORAGE_KEY_LABEL_REGIONS) === "1";
    return false;
  });
  const [showPrefectureLabels, setShowPrefectureLabels] = useState<boolean>(() => {
    if (typeof window !== "undefined") return localStorage.getItem(STORAGE_KEY_LABEL_PREFECTURES) === "1";
    return false;
  });
  const [showCommuneLabels, setShowCommuneLabels] = useState<boolean>(() => {
    if (typeof window !== "undefined") return localStorage.getItem(STORAGE_KEY_LABEL_COMMUNES) === "1";
    return false;
  });

  // Ref pour éviter les mises à jour inutiles
  const isInitialized = useRef(false);
  const lastProjectCodeRef = useRef<string>("");

  // Si le projet change, on repart sur les définitions du projet courant
  // (ensuite le loader localStorage appliquera les préférences existantes)
  useEffect(() => {
    if (lastProjectCodeRef.current === projectCode) return;
    lastProjectCodeRef.current = projectCode;

    // Re-init état brut (couches & groupes du projet courant)
    setLayerStates(initializeLayerStates(availableLayers));
    setGroupStates(initializeGroupStates(availableGroups));

    // Permet au loader de prefs de rejouer
    isInitialized.current = false;
  }, [projectCode, availableLayers, availableGroups]);

  // Charger les préférences sauvegardées (une seule fois par cycle init)
  useEffect(() => {
    if (typeof window === "undefined" || isInitialized.current) return;
    isInitialized.current = true;

    try {
      const savedLayers = localStorage.getItem(STORAGE_KEY_LAYERS);
      if (savedLayers) {
        const parsed = JSON.parse(savedLayers);
        setLayerStates((prev) => {
          const updated = { ...prev };
          Object.keys(parsed).forEach((id) => {
            if (updated[id]) updated[id] = { ...updated[id], visible: !!parsed[id] };
          });
          return updated;
        });
      }

      const savedGroups = localStorage.getItem(STORAGE_KEY_GROUPS);
      if (savedGroups) {
        const parsed = JSON.parse(savedGroups);
        setGroupStates((prev) => {
          const updated = { ...prev };
          Object.keys(parsed).forEach((id) => {
            if (updated[id]) updated[id] = { ...updated[id], collapsed: !!parsed[id] };
          });
          return updated;
        });
      }
    } catch (e) {
      console.warn("Erreur chargement préférences couches:", e);
    }
  }, []);

  // Sauvegarder les préférences de visibilité
  useEffect(() => {
    if (typeof window === "undefined" || !isInitialized.current) return;

    const visibility: Record<string, boolean> = {};
    Object.entries(layerStates).forEach(([id, state]) => (visibility[id] = state.visible));
    localStorage.setItem(STORAGE_KEY_LAYERS, JSON.stringify(visibility));
  }, [layerStates]);

  // Sauvegarder les préférences de groupes
  useEffect(() => {
    if (typeof window === "undefined" || !isInitialized.current) return;

    const collapsed: Record<string, boolean> = {};
    Object.entries(groupStates).forEach(([id, state]) => (collapsed[id] = state.collapsed));
    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(collapsed));
  }, [groupStates]);

  // Sauvegardes UI
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_BASEMAP, activeBasemap);
  }, [activeBasemap]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_BASEMAP_COLLAPSED, basemapCollapsed ? "1" : "0");
  }, [basemapCollapsed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_NEUTRAL_BG, neutralBg);
  }, [neutralBg]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_LABEL_REGIONS, showRegionLabels ? "1" : "0");
  }, [showRegionLabels]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_LABEL_PREFECTURES, showPrefectureLabels ? "1" : "0");
  }, [showPrefectureLabels]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_LABEL_COMMUNES, showCommuneLabels ? "1" : "0");
  }, [showCommuneLabels]);

  // ============================================================
  // ACTIONS
  // ============================================================

  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayerStates((prev) => {
      if (!prev[layerId]) return prev;
      return { ...prev, [layerId]: { ...prev[layerId], visible: !prev[layerId].visible } };
    });
  }, []);

  const showLayer = useCallback((layerId: string) => {
    setLayerStates((prev) => {
      if (!prev[layerId] || prev[layerId].visible) return prev;
      return { ...prev, [layerId]: { ...prev[layerId], visible: true } };
    });
  }, []);

  const hideLayer = useCallback((layerId: string) => {
    setLayerStates((prev) => {
      if (!prev[layerId] || !prev[layerId].visible) return prev;
      return { ...prev, [layerId]: { ...prev[layerId], visible: false } };
    });
  }, []);

  const showGroupLayers = useCallback(
    (groupId: string) => {
      const group = availableGroups.find((g) => g.id === groupId);
      if (!group) return;

      setLayerStates((prev) => {
        const updated = { ...prev };
        let changed = false;
        group.layers.forEach((layerId) => {
          if (updated[layerId] && !updated[layerId].visible) {
            updated[layerId] = { ...updated[layerId], visible: true };
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    },
    [availableGroups]
  );

  const hideGroupLayers = useCallback(
    (groupId: string) => {
      const group = availableGroups.find((g) => g.id === groupId);
      if (!group) return;

      setLayerStates((prev) => {
        const updated = { ...prev };
        let changed = false;
        group.layers.forEach((layerId) => {
          if (updated[layerId] && updated[layerId].visible) {
            updated[layerId] = { ...updated[layerId], visible: false };
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    },
    [availableGroups]
  );

  const toggleGroupCollapsed = useCallback((groupId: string) => {
    setGroupStates((prev) => {
      if (!prev[groupId]) return prev;
      return { ...prev, [groupId]: { ...prev[groupId], collapsed: !prev[groupId].collapsed } };
    });
  }, []);

  const setLayerLoading = useCallback((layerId: string, loading: boolean) => {
    setLayerStates((prev) => {
      if (!prev[layerId] || prev[layerId].loading === loading) return prev;
      return { ...prev, [layerId]: { ...prev[layerId], loading } };
    });
  }, []);

  const setLayerError = useCallback((layerId: string, error: string | null) => {
    setLayerStates((prev) => {
      if (!prev[layerId] || prev[layerId].error === error) return prev;
      return { ...prev, [layerId]: { ...prev[layerId], error, loading: false } };
    });
  }, []);

  const setLayerFeatureCount = useCallback((layerId: string, count: number) => {
    setLayerStates((prev) => {
      if (!prev[layerId] || prev[layerId].featureCount === count) return prev;
      return { ...prev, [layerId]: { ...prev[layerId], featureCount: count, loading: false } };
    });
  }, []);

  const changeBasemap = useCallback((basemapId: BasemapId | string) => {
    const next = normalizeBasemapId(String(basemapId));
    setActiveBasemap((prev) => (prev === next ? prev : next));
  }, []);

  const toggleBasemapCollapsed = useCallback(() => {
    setBasemapCollapsed((prev) => !prev);
  }, []);

  const setNeutralBackground = useCallback((bg: "gray" | "white") => {
    setNeutralBg(bg === "white" ? "white" : "gray");
  }, []);

  // Labels
  const setAdminLabelMode = useCallback(
    (key: "regions" | "prefectures" | "communes", value: boolean) => {
      if (key === "regions") setShowRegionLabels(value);
      if (key === "prefectures") setShowPrefectureLabels(value);
      if (key === "communes") setShowCommuneLabels(value);
    },
    []
  );

  const resetToDefaults = useCallback(() => {
    setLayerStates(initializeLayerStates(availableLayers));
    setGroupStates(initializeGroupStates(availableGroups));

    setActiveBasemap("none");
    setBasemapCollapsed(false);
    setNeutralBg("gray");

    setShowRegionLabels(false);
    setShowPrefectureLabels(false);
    setShowCommuneLabels(false);

    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_LAYERS);
      localStorage.removeItem(STORAGE_KEY_GROUPS);
      localStorage.removeItem(STORAGE_KEY_BASEMAP);
      localStorage.removeItem(STORAGE_KEY_BASEMAP_COLLAPSED);
      localStorage.removeItem(STORAGE_KEY_NEUTRAL_BG);
      localStorage.removeItem(STORAGE_KEY_LABEL_REGIONS);
      localStorage.removeItem(STORAGE_KEY_LABEL_PREFECTURES);
      localStorage.removeItem(STORAGE_KEY_LABEL_COMMUNES);
    }
  }, [availableLayers, availableGroups]);

  // ============================================================
  // GETTERS
  // ============================================================

  const visibleLayers = useMemo(
    () => availableLayers.filter((layer) => layerStates[layer.id]?.visible),
    [availableLayers, layerStates]
  );

  const visibleLayerIds = useMemo(
    () => visibleLayers.map((layer) => layer.id),
    [visibleLayers]
  );

  const isGroupFullyVisible = useCallback(
    (groupId: string): boolean => {
      const group = availableGroups.find((g) => g.id === groupId);
      if (!group) return false;
      return group.layers.every((layerId) => layerStates[layerId]?.visible);
    },
    [availableGroups, layerStates]
  );

  const isGroupPartiallyVisible = useCallback(
    (groupId: string): boolean => {
      const group = availableGroups.find((g) => g.id === groupId);
      if (!group) return false;
      return group.layers.some((layerId) => layerStates[layerId]?.visible);
    },
    [availableGroups, layerStates]
  );

  const totalVisibleFeatures = useMemo(() => {
    return Object.values(layerStates)
      .filter((s) => s.visible)
      .reduce((sum, s) => sum + (s.featureCount || 0), 0);
  }, [layerStates]);

  return {
    // états
    layerStates,
    groupStates,

    // basemap
    activeBasemap,
    basemapCollapsed,
    neutralBg,

    // labels
    showRegionLabels,
    showPrefectureLabels,
    showCommuneLabels,

    // données
    availableLayers,
    availableGroups,
    visibleLayers,
    visibleLayerIds,
    totalVisibleFeatures,

    // actions couches
    toggleLayerVisibility,
    showLayer,
    hideLayer,
    setLayerLoading,
    setLayerError,
    setLayerFeatureCount,

    // actions groupes
    toggleGroupCollapsed,
    showGroupLayers,
    hideGroupLayers,
    isGroupFullyVisible,
    isGroupPartiallyVisible,

    // actions basemap
    changeBasemap,
    toggleBasemapCollapsed,
    setNeutralBackground,

    // actions labels
    setAdminLabelMode,

    resetToDefaults,
  };
}

// ============================================================
// HELPERS
// ============================================================

function initializeLayerStates(layers: LayerConfig[]): Record<string, LayerState> {
  const states: Record<string, LayerState> = {};
  layers.forEach((layer) => {
    states[layer.id] = {
      id: layer.id,
      visible: !!layer.visible,
      loading: false,
      error: null,
      featureCount: 0,
    };
  });
  return states;
}

function initializeGroupStates(groups: LayerGroup[]): Record<string, GroupState> {
  const states: Record<string, GroupState> = {};
  groups.forEach((group) => {
    states[group.id] = {
      id: group.id,
      collapsed: !!group.collapsed,
    };
  });
  return states;
}
