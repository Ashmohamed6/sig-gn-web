// app/(protected)/cartographie/components/MapContainer.tsx

"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";

import {
  type LayerConfig,
  BASEMAPS,
  MAP_CONFIG,
  getLayerById,
} from "../config/layersConfig";
import {
  createMarkerIcon,
  getGeoJSONStyle,
  getHoverStyle,
  createClusterIcon,
  MARKER_CSS,
} from "../config/layerStyles";
import { generatePopupContent, POPUP_CSS } from "../config/popupTemplates";

// ============================================================
// TYPES
// ============================================================



interface MapContainerProps {
  visibleLayerIds: string[];
  layerData: Record<string, any>;
  activeBasemap: string;
  neutralBg?: "gray" | "white";
  onBasemapFallback?: (basemapId: string) => void;
  showRegionLabels?: boolean;
  showPrefectureLabels?: boolean;
  showCommuneLabels?: boolean;
  onLayerLoad?: (layerId: string, featureCount: number) => void;
  onLayerError?: (layerId: string, message: string) => void;
  onMapReady?: (map: L.Map) => void;
  onFeatureClick?: (layerId: string, feature: any, latlng: L.LatLng) => void;
}

const LOCALITES_LABEL_MIN_ZOOM = 12;
const LOCALITES_LABEL_MAX_COUNT = 1000;
const LEAFLET_PANE_Z_INDEX: Record<string, number> = {
  tilePane: 200,
  overlayPane: 400,
  shadowPane: 500,
  markerPane: 600,
  tooltipPane: 650,
  popupPane: 700,
};

// ============================================================
// COMPONENT
// ============================================================

export default function MapContainer({
  visibleLayerIds,
  layerData,
  activeBasemap,
  neutralBg = "gray",
  onBasemapFallback,
  showRegionLabels = false,
  showPrefectureLabels = false,
  showCommuneLabels = false,
  onLayerLoad,
  onLayerError,
  onMapReady,
  onFeatureClick,
}: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const basemapLayerRef = useRef<L.TileLayer | null>(null);
  const layersRef = useRef<Map<string, L.Layer>>(new Map());
  const labelsRef = useRef<L.LayerGroup | null>(null);

  const [isMapReady, setIsMapReady] = useState(false);

  // ============================================================
  // INITIALISATION DE LA CARTE
  // ============================================================

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Injecter les styles CSS
    injectStyles();

    // CrÃ©er la carte
    const map = L.map(mapContainerRef.current, {
      center: [MAP_CONFIG.center.lat, MAP_CONFIG.center.lng],
      zoom: MAP_CONFIG.defaultZoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      zoomControl: false,
      attributionControl: true,
    });

    mapRef.current = map;
    applyLeafletPaneOrder(map);

    // Groupe labels (au-dessus)
    labelsRef.current = L.layerGroup().addTo(map);

    // Controls - avec vÃ©rification que les propriÃ©tÃ©s existent
    const showZoomControl = (MAP_CONFIG as any).showZoomControl ?? true;
    const zoomControlPosition = (MAP_CONFIG as any).zoomControlPosition ?? "topright";
    
    if (showZoomControl) {
      L.control
        .zoom({ position: zoomControlPosition as L.ControlPosition })
        .addTo(map);
    }

    setIsMapReady(true);
    onMapReady?.(map);

    return () => {
      map.remove();
      mapRef.current = null;
      basemapLayerRef.current = null;
      layersRef.current.clear();
      labelsRef.current = null;
    };
  }, [onMapReady]);

  // ============================================================
  // BASemap + fond neutre
  // ============================================================

  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;
    const map = mapRef.current;
    let cancelled = false;

    try {
      map.stop();
    } catch {
      // map may already be stopped or removed
    }

    // Fond neutre (quand aucun basemap)
    try {
      const container = map.getContainer();
      if (container) {
        container.style.background = neutralBg === "white" ? "#ffffff" : "#e5e7eb";
      }
    } catch {
      // ignore if container not available
    }

    // Remove existing basemap
    if (basemapLayerRef.current) {
      try {
        basemapLayerRef.current.off();
        map.removeLayer(basemapLayerRef.current);
      } catch {
        // ignore stale layer detach race
      }
      basemapLayerRef.current = null;
    }

    const { basemapKey, conf } = resolveBasemap(activeBasemap);
    if (!basemapKey || basemapKey === "none" || !conf || !conf.url) {
      return;
    }

    if (cancelled) return;

    const basemapNativeMaxZoom = Number.isFinite(conf.maxZoom)
      ? Number(conf.maxZoom)
      : MAP_CONFIG.maxZoom;

    let tile: L.TileLayer;
    try {
      const tileOptions: L.TileLayerOptions = {
        attribution: conf.attribution ?? "",
        maxZoom: MAP_CONFIG.maxZoom,
        maxNativeZoom: basemapNativeMaxZoom,
        minZoom: conf.minZoom ?? MAP_CONFIG.minZoom,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 4,
      };
      if (conf.crossOrigin) {
        tileOptions.crossOrigin = true;
      }
      tile = L.tileLayer(conf.url, tileOptions);
      if (cancelled) return;
      basemapLayerRef.current = tile;
      tile.addTo(map);
    } catch {
      basemapLayerRef.current = null;
      if (!cancelled) onBasemapFallback?.("osm");
      return;
    }

    // Satellite timeout -> fallback OSM
    if (basemapKey === "sat" || basemapKey === "satellite") {
      let loadedOnce = false;
      let errorCount = 0;

      const onLoad = () => {
        loadedOnce = true;
      };
      const onErr = () => {
        errorCount += 1;
        if (errorCount >= 8 && !cancelled) {
          onBasemapFallback?.("osm");
        }
      };

      tile.on("tileload", onLoad);
      tile.on("tileerror", onErr);

      const t = window.setTimeout(() => {
        if (!loadedOnce && !cancelled) onBasemapFallback?.("osm");
      }, 8000);

      return () => {
        cancelled = true;
        window.clearTimeout(t);
        tile.off("tileload", onLoad);
        tile.off("tileerror", onErr);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [isMapReady, activeBasemap, neutralBg, onBasemapFallback]);

  // ============================================================
  // GESTION DES COUCHES (vecteurs / points)
  // ============================================================

  const createLayer = useCallback(
    (layerId: string, geojson: any) => {
      const config = getLayerById(layerId);
      if (!config) return null;

      try {
        // Prefer configured geometry, but avoid point rendering for mixed/surface datasets.
        const geometrySummary = summarizeGeometryTypes(geojson);
        const isPointConfig = config.geometryType === "Point";
        const hasLinearOrSurfaceGeom = geometrySummary.hasLine || geometrySummary.hasPolygon;
        const shouldRenderAsPointLayer = isPointConfig && !hasLinearOrSurfaceGeom;

        if (shouldRenderAsPointLayer) {
          return createPointLayer(config, geojson, onFeatureClick);
        }
        return createVectorLayer(config, geojson, onFeatureClick);
      } catch (e: any) {
        onLayerError?.(layerId, e?.message || "Erreur creation couche");
        return null;
      }
    },
    [onFeatureClick, onLayerError]
  );

  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;
    const map = mapRef.current;

    // Remove layers not visible anymore
    for (const [layerId, layer] of layersRef.current.entries()) {
      if (!visibleLayerIds.includes(layerId)) {
        layer.remove();
        layersRef.current.delete(layerId);
      }
    }

    // Add/update visible layers
    visibleLayerIds.forEach((layerId) => {
      const existing = layersRef.current.get(layerId);
      const geojson = layerData[layerId];

      if (!geojson) return;

      if (!existing) {
        const layer = createLayer(layerId, geojson);
        if (layer) {
          layer.addTo(map);
          layersRef.current.set(layerId, layer);

          const featureCount = countFeatures(geojson);
          onLayerLoad?.(layerId, featureCount);
        }
      }
    });

    // Keep basemap beneath
    basemapLayerRef.current?.bringToBack();
  }, [isMapReady, visibleLayerIds, layerData, createLayer, onLayerLoad]);

  // ============================================================
  // LABELS (regions, prefectures, communes)
  // ============================================================

  useEffect(() => {
    if (!isMapReady || !mapRef.current || !labelsRef.current) return;
    const map = mapRef.current;
    const labelGroup = labelsRef.current;

    const getName = (f: any, level: "region" | "pref" | "commune") => {
      const p = f?.properties || {};
      const nom = (p.nom ?? "").toString().trim();
      if (nom) return nom;

      if (level === "region") return (p.nom_region ?? "").toString().trim();
      if (level === "pref") return (p.nom_prefecture ?? "").toString().trim();
      if (level === "commune") return (p.nom_commune ?? "").toString().trim();
      return "";
    };

    const addLabels = (layerId: string, level: "region" | "pref" | "commune") => {
      const geojson = layerData[layerId];
      if (!geojson) return;

      const feats = geojson?.features || [];
      feats.forEach((f: any) => {
        const name = getName(f, level);
        if (!name) return;

        const center = getFeatureCenter(f);
        if (!center) return;

        const icon = makeAdminLabelIcon(name, level);
        const m = L.marker(center, { icon, interactive: false });

        if (level === "region") (m as any).setZIndexOffset?.(1300);
        if (level === "pref") (m as any).setZIndexOffset?.(1200);
        if (level === "commune") (m as any).setZIndexOffset?.(1100);

        m.addTo(labelGroup);
      });
    };

    const getLocaliteName = (f: any) => {
      const p = f?.properties || {};
      const candidates = [p.nom_localite, p.nom, p.localite_nom, p.name];
      for (const candidate of candidates) {
        const value = String(candidate ?? "").trim();
        if (value.length > 0) return value;
      }
      return "";
    };

    const addLocaliteLabels = () => {
      const geojson = layerData.localites;
      if (!geojson) return;

      const feats = geojson?.features || [];
      const mapBounds = map.getBounds();
      let rendered = 0;

      feats.forEach((f: any) => {
        if (rendered >= LOCALITES_LABEL_MAX_COUNT) return;

        const name = getLocaliteName(f);
        if (!name) return;

        const center = getFeatureCenter(f);
        if (!center || !mapBounds.contains(center)) return;

        const icon = makeLocaliteLabelIcon(name);
        const marker = L.marker(center, { icon, interactive: false });
        (marker as any).setZIndexOffset?.(1050);
        marker.addTo(labelGroup);
        rendered += 1;
      });
    };

    const renderLabels = () => {
      labelGroup.clearLayers();
      const zoom = map.getZoom();

      if (showRegionLabels && zoom <= 9) addLabels("regions", "region");
      if (showPrefectureLabels && zoom >= 8 && zoom <= 12) addLabels("prefectures", "pref");
      if (showCommuneLabels && zoom >= 10) addLabels("communes", "commune");

      if (visibleLayerIds.includes("localites") && zoom >= LOCALITES_LABEL_MIN_ZOOM) {
        addLocaliteLabels();
      }

      basemapLayerRef.current?.bringToBack();
    };

    renderLabels();
    map.on("zoomend", renderLabels);
    map.on("moveend", renderLabels);

    return () => {
      map.off("zoomend", renderLabels);
      map.off("moveend", renderLabels);
    };
  }, [
    isMapReady,
    layerData,
    visibleLayerIds,
    showRegionLabels,
    showPrefectureLabels,
    showCommuneLabels,
  ]);

  // ============================================================
  // RENDER
  // ============================================================

  return <div ref={mapContainerRef} className="h-full w-full relative" style={{ zIndex: 0 }} />;
}

// ============================================================
// LAYER FACTORY (local)
// ============================================================

function createPointLayer(
  config: LayerConfig,
  geojson: any,
  onFeatureClick?: (layerId: string, feature: any, latlng: L.LatLng) => void
) {
  const clusterColor = config.style.clusterColor || config.style.iconColor || config.style.color || "#64748B";
  
  const markers = (L as any).markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    iconCreateFunction: createClusterIcon(clusterColor),
  });

  const layer = L.geoJSON(geojson, {
    pointToLayer: (_feature, latlng) => {
      const iconName = config.style.icon || "MapPin";
      const iconColor = config.style.iconColor || config.style.color || "#64748B";
      const iconSize = config.style.iconSize || 20;
      const shape = config.style.markerShape || "circle";
      const icon = createMarkerIcon(iconName, iconColor, iconSize, shape);
      return L.marker(latlng, { icon });
    },
    onEachFeature: (feature: any, leafletLayer: any) => {
      const html = generatePopupContent(config, feature.properties || {});
      if (html) leafletLayer.bindPopup(html);

      leafletLayer.on("click", (e: any) => {
        onFeatureClick?.(config.id, feature, e.latlng);
      });
    },
  });

  markers.addLayer(layer as any);
  return markers as any;
}

function createVectorLayer(
  config: LayerConfig,
  geojson: any,
  onFeatureClick?: (layerId: string, feature: any, latlng: L.LatLng) => void
) {
  const layer = L.geoJSON(geojson, {
    style: (feature: any) =>
      getGeoJSONStyle(config, (feature as any)?.properties || null),
    // Fallback when point features are present in non-point layers.
    pointToLayer: (_feature, latlng) => {
      if (config.id === "cep_parcelles") {
        return L.marker(latlng, {
          icon: L.divIcon({
            className: "cep-parcelle-fallback",
            html: "<span></span>",
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          }),
        });
      }

      return L.circleMarker(latlng, {
        radius: 6,
        fillColor: config.style.fillColor || config.style.color,
        fillOpacity: config.style.fillOpacity || 0.5,
        color: config.style.color,
        weight: config.style.weight || 2,
        opacity: config.style.opacity || 1,
      });
    },
    onEachFeature: (feature: any, leafletLayer: any) => {
      const html = generatePopupContent(config, feature.properties || {});
      if (html) leafletLayer.bindPopup(html);

      if (typeof leafletLayer.setStyle === "function") {
        leafletLayer.on("mouseover", () => {
          leafletLayer.setStyle(getHoverStyle(config));
        });
        leafletLayer.on("mouseout", () => {
          leafletLayer.setStyle(
            getGeoJSONStyle(config, feature?.properties || null)
          );
        });
      }
      leafletLayer.on("click", (e: any) => {
        onFeatureClick?.(config.id, feature, e.latlng);
      });
    },
  });
  return layer;
}

function summarizeGeometryTypes(geojson: any): {
  hasPoint: boolean;
  hasLine: boolean;
  hasPolygon: boolean;
} {
  const summary = {
    hasPoint: false,
    hasLine: false,
    hasPolygon: false,
  };

  const features = geojson?.features;
  if (!Array.isArray(features) || features.length === 0) return summary;

  for (const feature of features) {
    const geometryType = String(feature?.geometry?.type || "");
    if (geometryType === "Point" || geometryType === "MultiPoint") {
      summary.hasPoint = true;
      continue;
    }
    if (geometryType === "LineString" || geometryType === "MultiLineString") {
      summary.hasLine = true;
      continue;
    }
    if (geometryType === "Polygon" || geometryType === "MultiPolygon") {
      summary.hasPolygon = true;
      continue;
    }
  }

  return summary;
}

// ============================================================
// LABELS HELPERS
// ============================================================

function makeAdminLabelIcon(text: string, level: "region" | "pref" | "commune") {
  const cls =
    level === "region"
      ? "admin-label admin-label-region"
      : level === "pref"
      ? "admin-label admin-label-pref"
      : "admin-label admin-label-commune";

  return L.divIcon({
    className: cls,
    html: `<span>${escapeHtml(text)}</span>`,
    iconSize: undefined,
  });
}

function makeLocaliteLabelIcon(text: string) {
  return L.divIcon({
    className: "admin-label admin-label-localite",
    html: `<span>${escapeHtml(text)}</span>`,
    iconSize: undefined,
  });
}

function getFeatureCenter(feature: any): L.LatLng | null {
  try {
    const g = feature?.geometry;
    if (!g) return null;

    // Point
    if (g.type === "Point") {
      const [lng, lat] = g.coordinates;
      return L.latLng(lat, lng);
    }

    // Polygon / MultiPolygon
    const bounds = L.geoJSON(feature as any).getBounds();
    const c = bounds.getCenter();
    return c;
  } catch {
    return null;
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => {
    const m: any = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return m[c] || c;
  });
}

function countFeatures(geojson: any): number {
  const feats = geojson?.features;
  return Array.isArray(feats) ? feats.length : 0;
}

// ============================================================
// STYLES
// ============================================================

function injectStyles() {
  if (typeof document === "undefined") return;

  if (!document.getElementById("sig-popup-css")) {
    const style = document.createElement("style");
    style.id = "sig-popup-css";
    style.innerHTML = POPUP_CSS;
    document.head.appendChild(style);
  }

  if (!document.getElementById("sig-marker-css")) {
    const style = document.createElement("style");
    style.id = "sig-marker-css";
    style.innerHTML = MARKER_CSS;
    document.head.appendChild(style);
  }

  if (!document.getElementById("sig-admin-labels-css")) {
    const style = document.createElement("style");
    style.id = "sig-admin-labels-css";
    style.innerHTML = `
      .admin-label {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        padding: 0;
        white-space: nowrap;
        transform: translate(-50%, -52%);
        pointer-events: none;
        text-rendering: geometricPrecision;
        max-width: 180px;
        color: #0f172a;
        font-weight: 700;
        text-shadow:
          -1px -1px 0 rgba(255, 255, 255, 0.95),
          1px -1px 0 rgba(255, 255, 255, 0.95),
          -1px 1px 0 rgba(255, 255, 255, 0.95),
          1px 1px 0 rgba(255, 255, 255, 0.95),
          0 0 3px rgba(255, 255, 255, 0.95);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      }
      .admin-label span {
        display: block;
        line-height: 1.3;
        padding: 1px 0;
        max-width: 100%;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: visible;
      }
      .admin-label-region { font-weight: 800; font-size: 14px; }
      .admin-label-pref { font-weight: 700; font-size: 11px; }
      .admin-label-commune { font-weight: 700; font-size: 9px; }
      .admin-label-localite {
        font-weight: 600;
        font-size: 9px;
        color: #475569;
        transform: translate(-50%, -105%);
        max-width: 140px;
      }
      .cep-parcelle-fallback {
        background: transparent !important;
        border: none !important;
      }
      .cep-parcelle-fallback span {
        display: block;
        width: 10px;
        height: 10px;
        border: 2px solid #166534;
        border-radius: 2px;
        background: rgba(74, 222, 128, 0.36);
        transform: rotate(10deg);
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.2);
      }
    `;
    document.head.appendChild(style);
  }
}

function resolveBasemap(activeBasemap: string): { basemapKey: string; conf: any | null } {
  let basemapKey = String(activeBasemap || "").trim();
  if (basemapKey === "satellite") basemapKey = "sat";
  if (basemapKey === "openstreetmap") basemapKey = "osm";
  if (basemapKey === "osm_fr") basemapKey = "plan";
  if (!basemapKey || basemapKey === "none") return { basemapKey, conf: null };

  // Map UI IDs to BASEMAPS array IDs
  const idMapping: Record<string, string[]> = {
    sat: ["sat", "satellite"],
    plan: ["plan", "osm_fr"],
    osm: ["osm"],
    terrain: ["terrain"],
    light: ["light"],
    dark: ["dark"],
  };

  if (Array.isArray(BASEMAPS)) {
    const candidateIds = idMapping[basemapKey] || [basemapKey];
    const conf = BASEMAPS.find((bm) => bm && candidateIds.includes(bm.id));
    return { basemapKey, conf: conf || null };
  }

  return { basemapKey, conf: (BASEMAPS as any)[basemapKey] ?? null };
}

function applyLeafletPaneOrder(map: L.Map): void {
  Object.entries(LEAFLET_PANE_Z_INDEX).forEach(([paneName, zIndex]) => {
    const pane = map.getPane(paneName as keyof typeof LEAFLET_PANE_Z_INDEX);
    if (!pane) return;
    pane.style.zIndex = String(zIndex);
  });
}
