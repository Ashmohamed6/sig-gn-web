// app/(protected)/cartographie/config/layerStyles.ts

/**
 * Utilitaires pour générer les styles des couches Leaflet
 * Inclut les styles pour polygones, lignes, points et clusters
 */

import type * as LeafletNS from "leaflet";
import { LayerConfig, LayerStyle } from "./layersConfig";

function getLeafletRuntime(): typeof LeafletNS {
  if (typeof window === "undefined") {
    throw new Error("Leaflet runtime unavailable on server");
  }

  return require("leaflet") as typeof LeafletNS;
}

// ============================================================
// ICÔNES SVG POUR LES MARQUEURS
// ============================================================

/**
 * Génère une icône SVG pour un marqueur avec support des formes
 */
export function createMarkerIcon(
  iconName: string,
  color: string,
  size: number = 20,
  shape: "circle" | "square" | "diamond" = "circle"
): LeafletNS.DivIcon {
  const L = getLeafletRuntime();
  const svgIcon = getIconSvg(iconName, color);

  let borderRadius: string;
  let containerTransform = "";
  let innerTransform = "";

  switch (shape) {
    case "square":
      borderRadius = "4px";
      break;
    case "diamond":
      borderRadius = "4px";
      containerTransform = "transform: rotate(45deg);";
      innerTransform = "transform: rotate(-45deg);";
      break;
    case "circle":
    default:
      borderRadius = "50%";
      break;
  }

  return L.divIcon({
    html: `
      <div class="custom-marker" style="
        width: ${size + 10}px;
        height: ${size + 10}px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        border: 2px solid ${color};
        border-radius: ${borderRadius};
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ${containerTransform}
      ">
        <div style="${innerTransform} display: flex; align-items: center; justify-content: center;">
          ${svgIcon}
        </div>
      </div>
    `,
    className: "custom-div-icon",
    iconSize: [size + 10, size + 10],
    iconAnchor: [(size + 10) / 2, (size + 10) / 2],
    popupAnchor: [0, -(size + 10) / 2],
  });
}

/**
 * Génère le SVG d'une icône Lucide
 */
export function getIconSvg(iconName: string, color: string): string {
  const icons: Record<string, string> = {
    // Points
    MapPin: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,

    // Nature / Environnement
    Sprout: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></svg>`,
    Droplets: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/></svg>`,
    Droplet: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>`,
    CloudRain: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>`,
    Thermometer: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>`,
    TreePine: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/><path d="M12 22v-3"/></svg>`,

    // Infrastructures
    Building: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`,
    Building2: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`,
    Home: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    Store: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>`,
    Wrench: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,

    // Personnes
    Users: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    UserCheck: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>`,
    GraduationCap: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,

    // Autres
    Shield: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>`,
    Leaf: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`,
  };

  return icons[iconName] || icons["MapPin"];
}

// ============================================================
// STYLES POUR POLYGONES ET LIGNES
// ============================================================

/**
 * Génère les options de style pour un GeoJSON
 */
export function getGeoJSONStyle(
  layer: LayerConfig,
  featureProperties?: Record<string, unknown> | null
): LeafletNS.PathOptions {
  const style = layer.style;

  if (layer.geometryType === "Point") {
    // Les points utilisent des marqueurs, pas de style path
    return {};
  }

  const geomSource = String(featureProperties?.geom_source_label || "")
    .trim()
    .toLowerCase();
  const isEstimatedCepParcel =
    layer.id === "cep_parcelles" && geomSource.includes("estimee");

  if (isEstimatedCepParcel) {
    const baseFill = style.fillColor || style.color;
    const baseFillOpacity = style.fillOpacity ?? 0.2;
    return {
      color: style.color,
      weight: (style.weight || 2) + 0.5,
      opacity: 1,
      fillColor: baseFill,
      fillOpacity: Math.max(baseFillOpacity - 0.03, 0.14),
      dashArray: style.dashArray || "6,4",
    };
  }

  return {
    color: style.color,
    weight: style.weight || 2,
    opacity: style.opacity || 1,
    fillColor: style.fillColor || style.color,
    fillOpacity: style.fillOpacity || 0.2,
    dashArray: style.dashArray || "",
  };
}

/**
 * Style au survol
 */
export function getHoverStyle(layer: LayerConfig): LeafletNS.PathOptions {
  const style = layer.style;

  return {
    weight: (style.weight || 2) + 1,
    fillOpacity: (style.fillOpacity || 0.2) + 0.1,
  };
}

/**
 * Réinitialise le style après survol
 */
export function resetStyle(
  layer: LayerConfig,
  featureProperties?: Record<string, unknown> | null
): LeafletNS.PathOptions {
  return getGeoJSONStyle(layer, featureProperties);
}

// ============================================================
// STYLES POUR LES CLUSTERS
// ============================================================

/**
 * Génère les styles CSS pour les clusters
 */
export function getClusterIconStyle(color: string, count: number): string {
  const size = count < 10 ? 30 : count < 100 ? 40 : 50;
  const fontSize = count < 10 ? 12 : count < 100 ? 14 : 16;

  return `
    background-color: ${color};
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: ${fontSize}px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    border: 3px solid white;
  `;
}

/**
 * Crée une icône de cluster personnalisée
 */
export function createClusterIcon(color: string): (cluster: any) => LeafletNS.DivIcon {
  const L = getLeafletRuntime();
  return (cluster: any) => {
    const count = cluster.getChildCount();
    const size = count < 10 ? 30 : count < 100 ? 40 : 50;

    return L.divIcon({
      html: `<div style="${getClusterIconStyle(color, count)}">${count}</div>`,
      className: "marker-cluster-custom",
      iconSize: L.point(size, size),
    });
  };
}

// ============================================================
// LÉGENDE
// ============================================================

/**
 * Génère l'aperçu de style pour la légende
 */
export function getLegendPreview(layer: LayerConfig): string {
  const style = layer.style;

  if (layer.geometryType === "Point") {
    const shape = style.markerShape || "circle";
    const iconSvg = getIconSvg(style.icon || "MapPin", style.color);

    let borderRadius: string;
    let containerTransform = "";
    let innerTransform = "";

    switch (shape) {
      case "square":
        borderRadius = "4px";
        break;
      case "diamond":
        borderRadius = "4px";
        containerTransform = "transform: rotate(45deg);";
        innerTransform = "transform: rotate(-45deg);";
        break;
      case "circle":
      default:
        borderRadius = "50%";
        break;
    }

    return `
      <div style="
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        border: 2px solid ${style.color};
        border-radius: ${borderRadius};
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        ${containerTransform}
      ">
        <div style="${innerTransform} display: flex; align-items: center; justify-content: center;">
          ${iconSvg.replace(/width="16"/g, 'width="12"').replace(/height="16"/g, 'height="12"')}
        </div>
      </div>
    `;
  }

  if (layer.geometryType === "LineString" || layer.geometryType === "MultiLineString") {
    // Ligne
    return `
      <div style="
        width: 30px;
        height: 4px;
        background: ${style.color};
        border-radius: 2px;
        ${style.dashArray ? `background: repeating-linear-gradient(90deg, ${style.color} 0, ${style.color} 5px, transparent 5px, transparent 10px);` : ""}
      "></div>
    `;
  }

  // Polygone
  return `
    <div style="
      width: 24px;
      height: 16px;
      background: ${style.fillColor || style.color};
      opacity: ${style.fillOpacity || 0.5};
      border: 2px solid ${style.color};
      border-radius: 3px;
    "></div>
  `;
}

// ============================================================
// CSS GLOBAL POUR LES MARQUEURS
// ============================================================

export const MARKER_CSS = `
  .custom-div-icon {
    background: transparent !important;
    border: none !important;
  }

  .custom-marker {
    transition: transform 0.2s ease;
  }

  .custom-marker:hover {
    transform: scale(1.1);
  }

  .marker-cluster-custom {
    background: transparent !important;
    border: none !important;
  }

  .leaflet-popup-content-wrapper {
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  .leaflet-popup-content {
    margin: 12px 16px;
    font-size: 14px;
  }

  .leaflet-popup-tip {
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
`;
