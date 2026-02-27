// app/(protected)/cartographie/config/popupTemplates.ts

/**
 * Templates de popup pour les différentes couches cartographiques
 * Formatage propre des données selon le type de champ
 */

import { LayerConfig, PopupField } from "./layersConfig";

// ============================================================
// FORMATTERS
// ============================================================

/**
 * Formate une valeur selon son type
 */
export function formatValue(
  value: any,
  format?: PopupField["format"],
  suffix?: string
): string {
  if (value === null || value === undefined || value === "") {
    return '<span class="text-gray-400">Non renseigné</span>';
  }

  switch (format) {
    case "number":
      const num = typeof value === "number" ? value : parseFloat(value);
      if (isNaN(num)) return String(value);
      return new Intl.NumberFormat("fr-FR").format(num) + (suffix ? ` ${suffix}` : "");

    case "area":
      const area = typeof value === "number" ? value : parseFloat(value);
      if (isNaN(area)) return String(value);
      return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(area) + (suffix ? ` ${suffix}` : "");

    case "length":
      const length = typeof value === "number" ? value : parseFloat(value);
      if (isNaN(length)) return String(value);
      return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(length) + (suffix ? ` ${suffix}` : "");

    case "date":
      try {
        const date = new Date(value);
        return date.toLocaleDateString("fr-FR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch {
        return String(value);
      }

    case "boolean":
      if (value === true || value === "true" || value === "oui" || value === "Oui" || value === 1) {
        return '<span class="text-green-600 font-medium">Oui</span>';
      }
      if (value === false || value === "false" || value === "non" || value === "Non" || value === 0) {
        return '<span class="text-red-600 font-medium">Non</span>';
      }
      return String(value);

    default:
      return String(value);
  }
}

// ============================================================
// GÉNÉRATION DU POPUP
// ============================================================

/**
 * Génère le contenu HTML d'un popup pour une feature
 */
export function generatePopupContent(
  layer: LayerConfig,
  properties: Record<string, any>
): string {
  const fields = layer.popupFields;

  if (!fields || fields.length === 0) {
    return `<div class="popup-empty">Aucune information disponible</div>`;
  }

  // Titre du popup (premier champ ou nom de la couche)
  const titleField = fields[0];
  const title = properties[titleField.key] || layer.name;

  // Couleur de la couche pour le header
  const color = layer.style.color;

  // Génère les lignes du tableau
  const rows = fields
    .slice(1) // Skip le premier champ (utilisé comme titre)
    .map((field) => {
      const value = properties[field.key];
      const formattedValue = formatValue(value, field.format, field.suffix);
      return `
        <tr>
          <td class="popup-label">${field.label}</td>
          <td class="popup-value">${formattedValue}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="popup-container">
      <div class="popup-header" style="border-left: 4px solid ${color};">
        <h3 class="popup-title">${title}</h3>
        <span class="popup-layer-name">${layer.name}</span>
      </div>
      <table class="popup-table">
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Génère un popup simple (sans configuration de champs)
 */
export function generateSimplePopup(
  properties: Record<string, any>,
  excludeKeys: string[] = ["geom", "geometry", "id", "gid", "ogc_fid"]
): string {
  const entries = Object.entries(properties)
    .filter(([key]) => !excludeKeys.includes(key.toLowerCase()))
    .filter(([, value]) => value !== null && value !== undefined && value !== "");

  if (entries.length === 0) {
    return `<div class="popup-empty">Aucune information disponible</div>`;
  }

  const rows = entries
    .map(([key, value]) => {
      // Formater la clé en label lisible
      const label = key
        .replace(/_/g, " ")
        .replace(/([A-Z])/g, " $1")
        .trim()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");

      return `
        <tr>
          <td class="popup-label">${label}</td>
          <td class="popup-value">${value}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="popup-container">
      <table class="popup-table">
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

// ============================================================
// CSS DES POPUPS
// ============================================================

export const POPUP_CSS = `
  .popup-container {
    min-width: 200px;
    max-width: 350px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .popup-header {
    padding: 8px 12px;
    background: #f8fafc;
    border-radius: 4px 4px 0 0;
    margin: -12px -16px 12px -16px;
    padding-left: 16px;
  }
  
  .popup-title {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 2px 0;
    line-height: 1.3;
  }
  
  .popup-layer-name {
    font-size: 11px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .popup-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .popup-table tr:not(:last-child) {
    border-bottom: 1px solid #e2e8f0;
  }
  
  .popup-label {
    padding: 6px 8px 6px 0;
    font-size: 12px;
    color: #64748b;
    white-space: nowrap;
    vertical-align: top;
    width: 40%;
  }
  
  .popup-value {
    padding: 6px 0;
    font-size: 13px;
    color: #1e293b;
    font-weight: 500;
    vertical-align: top;
  }
  
  .popup-empty {
    padding: 16px;
    text-align: center;
    color: #94a3b8;
    font-style: italic;
  }
  
  /* Scrollbar pour les longs popups */
  .leaflet-popup-content {
    max-height: 300px;
    overflow-y: auto;
  }
  
  .leaflet-popup-content::-webkit-scrollbar {
    width: 6px;
  }
  
  .leaflet-popup-content::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }
  
  .leaflet-popup-content::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
  
  .leaflet-popup-content::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;
