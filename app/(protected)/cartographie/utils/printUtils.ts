// app/(protected)/cartographie/utils/printUtils.ts

/**
 * Utilities for map export (PDF / image)
 */

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { PrintConfig } from "../components/PrintModal";

// ============================================================
// TYPES
// ============================================================

interface LayerLegendItem {
  id: string;
  name: string;
  color: string;
  type?: "point" | "line" | "polygon";
  legendPreviewHtml?: string;
}

interface PrintContext {
  config: PrintConfig;
  mapElement: HTMLElement;
  layers: LayerLegendItem[];
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

// ============================================================
// CONSTANTS
// ============================================================

const DPI_MAP = {
  standard: 150,
  high: 300,
  ultra: 600,
};

const PAGE_SIZES = {
  landscape: { width: 297, height: 210 },
  portrait: { width: 210, height: 297 },
};

const MARGINS = {
  top: 6,
  right: 6,
  bottom: 6,
  left: 6,
};

// Try frontend public first, then backend static through proxy.
const OFFICIAL_LOGO_PATHS = [
  "/armoirie-446x500.png",
  "/api/proxy/static/armoirie-446x500.png",
];

const LEGEND_TYPE_ORDER: Record<NonNullable<LayerLegendItem["type"]>, number> = {
  point: 0,
  line: 1,
  polygon: 2,
};

// ============================================================
// MAIN EXPORT
// ============================================================

export async function exportMap(context: PrintContext): Promise<void> {
  const { config } = context;

  switch (config.format) {
    case "pdf":
      await exportToPDF(context);
      break;
    case "jpg":
      await exportToImage(context, "jpeg");
      break;
    case "png":
      await exportToImage(context, "png");
      break;
    default:
      throw new Error(`Format non supporté: ${config.format}`);
  }
}

// ============================================================
// PDF EXPORT
// ============================================================

async function exportToPDF(context: PrintContext): Promise<void> {
  const { config, mapElement, layers, bounds } = context;
  const orderedLayers = sortLegendLayers(layers);
  const pageSize = PAGE_SIZES[config.orientation];

  const pdf = new jsPDF({
    orientation: config.orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pageSize.width;
  const pageHeight = pageSize.height;
  const contentWidth = pageWidth - MARGINS.left - MARGINS.right;

  let currentY = MARGINS.top;

  const logoGuineeBase64 = await loadFirstImageAsBase64(OFFICIAL_LOGO_PATHS);

  // 1) Official header
  currentY = drawOfficialHeader(pdf, config, currentY, pageWidth, logoGuineeBase64);

  // 2) Map + legend layout (carto rules)
  currentY += 2;

  const hasLegend = config.showLegend && orderedLayers.length > 0;
  const layout = getPdfLayout(config, pageWidth, pageHeight, currentY, hasLegend);

  // 3) Map
  await drawMapImage(pdf, mapElement, layout.mapX, layout.mapY, layout.mapW, layout.mapH, config.quality);

  // Neatline ticks + coords corners
  if (config.showCoordinates) {
    drawNeatlineTicks(pdf, layout.mapX, layout.mapY, layout.mapW, layout.mapH, bounds);
  } else {
    drawNeatlineTicks(pdf, layout.mapX, layout.mapY, layout.mapW, layout.mapH, undefined);
  }

  // 4) Legend
  if (hasLegend) {
    await drawLegend(pdf, orderedLayers, layout.legendX, layout.legendY, layout.legendW, layout.legendH);
  }

  // 5) North arrow (IN map frame)
  if (config.showNorthArrow) {
    const pos = getNorthArrowPositionInMap(layout.mapX, layout.mapY, layout.mapW);
    drawNorthArrow(pdf, pos.x, pos.y);
  }

  // 6) Scale bar (IN map frame)
  if (config.showScaleBar) {
    const pos = getScaleBarPositionInMap(layout.mapX, layout.mapY, layout.mapH);
    drawScaleBar(pdf, pos.x, pos.y);
  }

  // 7) Footer / cartouche
  const footerY = layout.footerY;
  await drawFooter(pdf, config, footerY, pageWidth, pageHeight, bounds);

  // 6) Download
  const filename = generateFilename(config.titreThematique, "pdf");
  pdf.save(filename);
}

// ============================================================
// IMAGE EXPORT
// ============================================================

async function exportToImage(context: PrintContext, format: "jpeg" | "png"): Promise<void> {
  const { config, mapElement, layers } = context;
  const dpi = DPI_MAP[config.quality];
  const scale = dpi / 96;
  const orderedLayers = sortLegendLayers(layers);

  const logoGuineeBase64 = await loadFirstImageAsBase64(OFFICIAL_LOGO_PATHS);
  const mapSnapshotDataUrl = await captureMapAsDataUrl(mapElement, config.quality);
  const container = createImageContainer(
    { ...context, layers: orderedLayers },
    logoGuineeBase64,
    mapSnapshotDataUrl
  );
  document.body.appendChild(container);

  try {
    await new Promise((resolve) => setTimeout(resolve, 350));

    const canvas = await html2canvas(container, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    } as any);

    const dataUrl = canvas.toDataURL(`image/${format}`, format === "jpeg" ? 0.95 : undefined);
    const filename = generateFilename(config.titreThematique, format === "jpeg" ? "jpg" : "png");
    downloadDataUrl(dataUrl, filename);
  } finally {
    document.body.removeChild(container);
  }
}

// ============================================================
// DRAW HELPERS
// ============================================================

function drawOfficialHeader(
  pdf: jsPDF,
  config: PrintConfig,
  startY: number,
  pageWidth: number,
  logoGuineeBase64?: string
): number {
  const centerX = pageWidth / 2;
  let y = startY;

  const logoWidth = 14;
  const logoHeight = 16;

  if (logoGuineeBase64) {
    try {
      pdf.addImage(logoGuineeBase64, "PNG", MARGINS.left, y, logoWidth, logoHeight);
      pdf.addImage(
        logoGuineeBase64,
        "PNG",
        pageWidth - MARGINS.right - logoWidth,
        y,
        logoWidth,
        logoHeight
      );
    } catch (e) {
      console.warn("Erreur ajout logo officiel:", e);
    }
  }

  const textY = y + 3.5;

  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("RÉPUBLIQUE DE GUINÉE", centerX, textY, { align: "center" });

  pdf.setFontSize(11);
  pdf.text(`Région de ${config.region}`, centerX, textY + 5.5, { align: "center" });

  pdf.setFontSize(10);
  pdf.setTextColor(206, 17, 38);
  pdf.text(`Carte thématique : ${config.titreThematique}`, centerX, textY + 11, {
    align: "center",
  });

  y = startY + logoHeight + 2.5;
  pdf.setDrawColor(0, 150, 57);
  pdf.setLineWidth(0.4);
  pdf.line(MARGINS.left, y, pageWidth - MARGINS.right, y);

  return y + 2.5;
}

async function drawMapImage(
  pdf: jsPDF,
  mapElement: HTMLElement,
  x: number,
  y: number,
  width: number,
  height: number,
  quality: PrintConfig["quality"]
): Promise<void> {
  const sourceCanvas = await captureMapCanvas(mapElement, quality);

  // Create output canvas with exact PDF dimensions
  const targetRatio = width / height;
  const outputCanvas = createFillCanvas(sourceCanvas, targetRatio);
  const imgData = outputCanvas.toDataURL("image/jpeg", 0.93);

  // Thin border for map frame
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.25);
  pdf.rect(x, y, width, height);

  // Add map image - fills entire space
  pdf.addImage(imgData, "JPEG", x + 0.2, y + 0.2, width - 0.4, height - 0.4);
}

async function drawLegend(
  pdf: jsPDF,
  layers: LayerLegendItem[],
  x: number,
  y: number,
  width: number,
  maxHeight: number
): Promise<void> {
  const legendCard = createLegendCardElement(layers, 290);
  legendCard.style.position = "fixed";
  legendCard.style.left = "-9999px";
  legendCard.style.top = "-9999px";
  document.body.appendChild(legendCard);

  try {
    const canvas = await html2canvas(legendCard, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    } as any);

    const imageHeight = Math.min(maxHeight, (canvas.height * width) / canvas.width);

    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.2);
    pdf.rect(x, y, width, imageHeight, "D");

    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", x + 0.4, y + 0.4, width - 0.8, imageHeight - 0.8);
  } finally {
    document.body.removeChild(legendCard);
  }
}

function drawNorthArrow(pdf: jsPDF, x: number, y: number): void {
  const size = 7;

  // Circle background
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(80, 80, 80);
  pdf.setLineWidth(0.25);
  pdf.circle(x, y, size / 2 + 2.5, "FD");

  // North arrow triangle
  pdf.setFillColor(0, 0, 0);
  pdf.triangle(x, y - size / 2, x - 2.5, y + size / 2, x + 2.5, y + size / 2, "F");

  // "N" label
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("N", x, y - size / 2 - 3, { align: "center" });
}

function drawScaleBar(pdf: jsPDF, x: number, y: number): void {
  const barWidth = 22;
  const barHeight = 2.5;

  // Background box
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.15);
  pdf.roundedRect(x - 1.5, y - 4.5, barWidth + 12, 8, 1, 1, "FD");

  // Scale bar segments
  pdf.setFillColor(0, 0, 0);
  pdf.rect(x, y, barWidth / 2, barHeight, "F");
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.2);
  pdf.rect(x + barWidth / 2, y, barWidth / 2, barHeight, "FD");
  pdf.rect(x, y, barWidth, barHeight, "D");

  // Labels
  pdf.setFontSize(6);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(40, 40, 40);
  pdf.text("0", x, y - 1.2);
  pdf.text("10 km", x + barWidth - 2, y - 1.2);
}

async function drawFooter(
  pdf: jsPDF,
  config: PrintConfig,
  y: number,
  pageWidth: number,
  pageHeight: number,
  bounds?: PrintContext["bounds"]
): Promise<void> {
  const leftX = MARGINS.left;
  const rightX = pageWidth - MARGINS.right;
  const logoSize = 10;

  pdf.setDrawColor(210, 210, 210);
  pdf.setLineWidth(0.2);
  pdf.line(leftX, y, rightX, y);

  y += 2.5;

  let textStartX = leftX;
  if (config.logosStructure[0]) {
    try {
      pdf.addImage(config.logosStructure[0].dataUrl, "PNG", leftX, y, logoSize, logoSize);
      textStartX = leftX + logoSize + 2.5;
    } catch (e) {
      console.warn("Erreur logo structure 1:", e);
    }
  }

  pdf.setFontSize(6.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(70, 70, 70);
  pdf.text("Source : Dispositif SIG", textStartX, y + 3.5);

  // Cartouche technique (projection)
  pdf.setFontSize(6.2);
  pdf.setTextColor(90, 90, 90);
  pdf.text("Projection : Web Mercator (EPSG:3857)", textStartX, y + 7.2);

  const centerText = [config.author, config.date].filter(Boolean).join(" - ");
  if (centerText) {
    pdf.text(centerText, pageWidth / 2, y + 3.5, { align: "center" });
  }

  if (config.showCoordinates && bounds) {
    const degree = "\u00B0";
    const south = `${Math.abs(bounds.south).toFixed(2)}${degree}${bounds.south >= 0 ? "N" : "S"}`;
    const north = `${Math.abs(bounds.north).toFixed(2)}${degree}${bounds.north >= 0 ? "N" : "S"}`;
    const west = `${Math.abs(bounds.west).toFixed(2)}${degree}${bounds.west >= 0 ? "E" : "W"}`;
    const east = `${Math.abs(bounds.east).toFixed(2)}${degree}${bounds.east >= 0 ? "E" : "W"}`;
    const coordText = `${south} - ${north} / ${west} - ${east}`;
    pdf.setFontSize(5.5);
    pdf.text(coordText, pageWidth / 2, y + 7.5, { align: "center" });
  }

  let rightLogoX = rightX - logoSize;
  if (config.showMiniMapEnabel) {
    try {
      const enabelLogoWidth = logoSize * 1.6;
      const enabelLogoHeight = logoSize * 0.8;

      pdf.setFillColor(232, 114, 34);
      pdf.roundedRect(
        rightLogoX - enabelLogoWidth - 2.5,
        y + 0.8,
        enabelLogoWidth,
        enabelLogoHeight,
        0.8,
        0.8,
        "F"
      );
      pdf.setFontSize(5.5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text("ENABEL", rightLogoX - enabelLogoWidth / 2 - 2.5, y + enabelLogoHeight / 2 + 1.8, {
        align: "center",
      });

      rightLogoX -= enabelLogoWidth + 6;
    } catch (e) {
      console.warn("Erreur logo Enabel:", e);
    }
  }

  if (config.logosStructure[1]) {
    try {
      pdf.addImage(config.logosStructure[1].dataUrl, "PNG", rightLogoX, y, logoSize, logoSize);
    } catch (e) {
      console.warn("Erreur logo structure 2:", e);
    }
  }

  if (config.customNotes) {
    pdf.setFontSize(5.5);
    pdf.setTextColor(110, 110, 110);
    pdf.setFont("helvetica", "normal");
    const noteLines = pdf.splitTextToSize(config.customNotes, pageWidth - leftX - MARGINS.right);
    pdf.text(noteLines, leftX, y + 12);
  }
}

// ============================================================
// IMAGE CONTAINER
// ============================================================

function createImageContainer(
  context: PrintContext,
  officialLogoDataUrl?: string,
  mapSnapshotDataUrl?: string
): HTMLDivElement {
  const { config, mapElement, layers } = context;
  const isLandscape = config.orientation === "landscape";
  const width = isLandscape ? 1400 : 1000;
  const height = isLandscape ? 1000 : 1400;

  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: -9999px;
    width: ${width}px;
    height: ${height}px;
    background: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 20px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  `;

  const logoSrc = officialLogoDataUrl || OFFICIAL_LOGO_PATHS[0];

  const header = document.createElement("div");
  header.style.cssText =
    "display:flex; align-items:center; justify-content:space-between; margin-bottom:15px; padding-bottom:10px; border-bottom:2px solid #009639;";
  header.innerHTML = `
    <img src="${logoSrc}" alt="Armoiries Guinée" style="width:60px; height:67px; object-fit:contain;">
    <div style="text-align:center; flex:1; padding:0 20px;">
      <p style="font-size:20px; font-weight:bold; color:#000; margin:0;">RÉPUBLIQUE DE GUINÉE</p>
      <p style="font-size:16px; font-weight:bold; color:#000; margin:4px 0;">Région de ${escapeHtml(config.region)}</p>
      <p style="font-size:14px; font-weight:bold; color:#CE1126; margin:4px 0;">Carte thématique : ${escapeHtml(
        config.titreThematique
      )}</p>
    </div>
    <img src="${logoSrc}" alt="Armoiries Guinée" style="width:60px; height:67px; object-fit:contain;">
  `;
  container.appendChild(header);

  const mapContainer = document.createElement("div");
  mapContainer.style.cssText = isLandscape
    ? "display:flex; gap:15px; flex:1; min-height:0;"
    : "display:flex; flex-direction:column; gap:12px; flex:1; min-height:0;";

  const mapCard = document.createElement("div");
  mapCard.style.cssText = `
    flex: 1;
    border: 1px solid #ccc;
    border-radius: 4px;
    overflow: hidden;
    background: #ffffff;
    min-height: 0;
  `;

  if (mapSnapshotDataUrl) {
    const mapImage = document.createElement("img");
    mapImage.src = mapSnapshotDataUrl;
    mapImage.alt = "Carte exportée";
    mapImage.style.cssText = "display:block; width:100%; height:100%; object-fit:cover; background:#ffffff;";
    mapCard.appendChild(mapImage);
  } else {
    const mapClone = mapElement.cloneNode(true) as HTMLElement;
    mapClone.style.cssText = "width:100%; height:100%; overflow:hidden;";
    mapCard.appendChild(mapClone);
  }

  mapContainer.appendChild(mapCard);

  if (config.showLegend && layers.length > 0) {
    const legendCard = createLegendCardElement(layers, isLandscape ? 240 : 960);
    legendCard.style.width = isLandscape ? "240px" : "100%";
    legendCard.style.maxHeight = isLandscape ? "none" : "240px";
    legendCard.style.overflow = "auto";
    mapContainer.appendChild(legendCard);
  }

  container.appendChild(mapContainer);

  const footer = document.createElement("div");
  footer.style.cssText =
    "margin-top:15px; padding-top:10px; border-top:1px solid #ddd; font-size:10px; color:#666; display:flex; justify-content:space-between; align-items:center;";
  footer.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px;">
      ${
        config.logosStructure[0]
          ? `<img src="${config.logosStructure[0].dataUrl}" style="height:30px; object-fit:contain;">`
          : ""
      }
      <span>Source : Dispositif SIG</span>
    </div>
    <span>${escapeHtml([config.author, config.date].filter(Boolean).join(" - "))}</span>
    <div style="display:flex; align-items:center; gap:10px;">
      ${
        config.showMiniMapEnabel
          ? `<div style="background:#E87222; color:white; padding:4px 10px; border-radius:4px; font-size:10px; font-weight:bold;">ENABEL</div>`
          : ""
      }
      ${
        config.logosStructure[1]
          ? `<img src="${config.logosStructure[1].dataUrl}" style="height:30px; object-fit:contain;">`
          : ""
      }
    </div>
  `;
  container.appendChild(footer);

  return container;
}

// ============================================================
// LEGEND DOM
// ============================================================

function createLegendCardElement(layers: LayerLegendItem[], widthPx: number): HTMLDivElement {
  const orderedLayers = sortLegendLayers(layers);
  const card = document.createElement("div");
  card.style.cssText = `
    width: ${widthPx}px;
    max-width: ${widthPx}px;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 12px 10px;
    box-sizing: border-box;
    overflow: hidden;
  `;

  const title = document.createElement("div");
  title.style.cssText = "font-size: 13px; font-weight: 700; margin-bottom: 10px; color: #111827; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb;";
  title.textContent = "Légende";
  card.appendChild(title);

  // Multi-column layout for many layers
  const columns = orderedLayers.length > 32 ? 3 : orderedLayers.length > 18 ? 2 : 1;

  const list = document.createElement("div");
  list.style.cssText = `
    column-count: ${columns};
    column-gap: 10px;
    max-height: 100%;
  `;
  card.appendChild(list);

  for (const layer of orderedLayers) {
    const row = document.createElement("div");
    row.style.cssText =
      "display:grid; grid-template-columns: 34px 1fr; align-items:center; gap:6px; margin:5px 0; min-height:22px; break-inside:avoid;";

    const symbolContainer = document.createElement("div");
    symbolContainer.style.cssText =
      "display:flex; align-items:center; justify-content:center; width:34px; height:22px;";

    const symbol = document.createElement("div");
    symbol.style.cssText = "display:flex; align-items:center; justify-content:center;";
    // Use custom preview HTML if available, otherwise use fallback
    symbol.innerHTML = layer.legendPreviewHtml || getFallbackLegendSymbolHtml(layer);
    symbolContainer.appendChild(symbol);

    const label = document.createElement("span");
    label.style.cssText =
      "font-size:10.5px; color:#1f2937; line-height:1.3; word-wrap:break-word; overflow-wrap:break-word;";
    label.textContent = layer.name;

    row.appendChild(symbolContainer);
    row.appendChild(label);
    list.appendChild(row);
  }

  return card;
}

function getFallbackLegendSymbolHtml(layer: LayerLegendItem): string {
  const color = normalizeColor(layer.color);

  if (layer.type === "line") {
    return `<div style="display:inline-block; width:26px; height:3px; background:${color}; border-radius:1px;"></div>`;
  }
  if (layer.type === "polygon") {
    return `<div style="display:inline-block; width:20px; height:14px; border:2px solid ${color}; background:${color}; opacity:0.5; border-radius:2px;"></div>`;
  }
  return `<div style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${color}; border:1px solid rgba(0,0,0,0.1);"></div>`;
}

// ============================================================
// GENERIC HELPERS
// ============================================================

function sortLegendLayers(layers: LayerLegendItem[]): LayerLegendItem[] {
  return [...layers].sort((a, b) => {
    const orderA = LEGEND_TYPE_ORDER[a.type ?? "polygon"] ?? 99;
    const orderB = LEGEND_TYPE_ORDER[b.type ?? "polygon"] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
  });
}

async function waitForLeafletTiles(mapElement: HTMLElement, timeoutMs: number = 4500): Promise<void> {
  const stablePassesRequired = 2;
  let stablePasses = 0;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const tileImages = getVisibleLeafletTiles(mapElement);
    if (tileImages.length === 0) return;

    const loadedCount = tileImages.filter((img) => img.complete && img.naturalWidth > 0).length;
    const expectedTileCount = estimateExpectedTileCount(mapElement);
    const requiredLoadedCount = Math.min(tileImages.length, expectedTileCount);

    if (loadedCount >= requiredLoadedCount) {
      stablePasses += 1;
      if (stablePasses >= stablePassesRequired) {
        return;
      }
    } else {
      stablePasses = 0;
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
}

function forceLeafletTilePanesFullSizeForSnapshot(mapElement: HTMLElement): () => void {
  const W = mapElement.clientWidth;
  const H = mapElement.clientHeight;

  const selectors = [
    ".leaflet-pane",
    ".leaflet-map-pane",
    ".leaflet-tile-pane",
    ".leaflet-tile-pane .leaflet-layer",
    ".leaflet-tile-container",
  ];

  const snapshots: Array<{
    el: HTMLElement;
    style: Partial<CSSStyleDeclaration>;
  }> = [];

  const apply = (el: HTMLElement, next: Partial<CSSStyleDeclaration>) => {
    snapshots.push({
      el,
      style: {
        width: el.style.width,
        height: el.style.height,
        overflow: el.style.overflow,
        position: el.style.position,
        left: el.style.left,
        top: el.style.top,
        willChange: el.style.willChange,
        contain: (el.style as any).contain,
      },
    });

    if (next.width !== undefined) el.style.width = next.width;
    if (next.height !== undefined) el.style.height = next.height;
    if (next.overflow !== undefined) el.style.overflow = next.overflow;
    if (next.position !== undefined) el.style.position = next.position;
    if (next.left !== undefined) el.style.left = next.left;
    if (next.top !== undefined) el.style.top = next.top;
    if (next.willChange !== undefined) el.style.willChange = next.willChange;
    if ((next as any).contain !== undefined) (el.style as any).contain = (next as any).contain;
  };

  const seen = new Set<HTMLElement>();
  for (const sel of selectors) {
    const nodes = mapElement.querySelectorAll<HTMLElement>(sel);
    for (const el of nodes) {
      if (seen.has(el)) continue;
      seen.add(el);

      apply(el, {
        width: `${W}px`,
        height: `${H}px`,
        overflow: "visible",
        position: "absolute",
        left: "0px",
        top: "0px",
        willChange: "auto",
        contain: "none" as any,
      });
    }
  }

  const containerSnapshot = {
    el: mapElement,
    style: {
      overflow: mapElement.style.overflow,
      background: mapElement.style.background,
    } as any,
  };
  mapElement.style.overflow = "visible";
  mapElement.style.background = "#ffffff";

  return () => {
    for (const s of snapshots) {
      s.el.style.width = s.style.width || "";
      s.el.style.height = s.style.height || "";
      s.el.style.overflow = s.style.overflow || "";
      s.el.style.position = s.style.position || "";
      s.el.style.left = s.style.left || "";
      s.el.style.top = s.style.top || "";
      s.el.style.willChange = s.style.willChange || "";
      (s.el.style as any).contain = (s.style as any).contain || "";
    }
    mapElement.style.overflow = containerSnapshot.style.overflow || "";
    mapElement.style.background = containerSnapshot.style.background || "";
  };
}

async function captureMapCanvas(
  mapElement: HTMLElement,
  quality: PrintConfig["quality"]
): Promise<HTMLCanvasElement> {
  const dpi = DPI_MAP[quality];
  const scale = dpi / 96;
  const maxAttempts = 3;
  let lastCanvas: HTMLCanvasElement | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await waitForLeafletTiles(mapElement, 9000);
    const restoreLeafletTransforms = normalizeLeafletTransformsForSnapshot(mapElement);
    const restoreFullSizePanes = forceLeafletTilePanesFullSizeForSnapshot(mapElement);

    try {
      lastCanvas = await html2canvas(mapElement, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        ignoreElements: (element: HTMLElement) => element.classList.contains("leaflet-control"),
      } as any);
    } finally {
      restoreFullSizePanes();
      restoreLeafletTransforms();
    }

    if (!hasLikelyBlankTileGap(mapElement, lastCanvas)) {
      return lastCanvas;
    }
    await new Promise((resolve) => setTimeout(resolve, 260));
  }

  if (lastCanvas) return lastCanvas;
  throw new Error("Impossible de capturer la carte.");
}

async function captureMapAsDataUrl(
  mapElement: HTMLElement,
  quality: PrintConfig["quality"]
): Promise<string> {
  const canvas = await captureMapCanvas(mapElement, quality);
  return canvas.toDataURL("image/png");
}

function normalizeColor(color: string): string {
  const value = String(color || "").trim();
  if (!value) return "#334155";
  return value;
}

function generateFilename(title: string, extension: string): string {
  const sanitized = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .substring(0, 40);

  const date = new Date().toISOString().split("T")[0];
  const safeName = sanitized || "carte";
  return `carte_${safeName}_${date}.${extension}`;
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeHtml(value: string): string {
  return String(value || "").replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#039;";
      default:
        return ch;
    }
  });
}

async function loadFirstImageAsBase64(paths: string[]): Promise<string | undefined> {
  for (const path of paths) {
    try {
      return await loadImageAsBase64(path);
    } catch {
      // try next path
    }
  }
  return undefined;
}

/**
 * Load an image path and convert to base64.
 */
async function loadImageAsBase64(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Impossible de créer le contexte canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error(`Impossible de charger l'image: ${path}`));
    img.src = path;
  });
}

function getVisibleLeafletTiles(mapElement: HTMLElement): HTMLImageElement[] {
  return Array.from(
    mapElement.querySelectorAll<HTMLImageElement>(".leaflet-tile-pane img.leaflet-tile")
  ).filter((img) => img.clientWidth > 0 && img.clientHeight > 0);
}

function estimateExpectedTileCount(mapElement: HTMLElement): number {
  const tileSize = 256;
  const cols = Math.max(1, Math.ceil(mapElement.clientWidth / tileSize) + 1);
  const rows = Math.max(1, Math.ceil(mapElement.clientHeight / tileSize) + 1);
  return cols * rows;
}

function normalizeLeafletTransformsForSnapshot(mapElement: HTMLElement): () => void {
  const selectors = [
    ".leaflet-map-pane",
    ".leaflet-tile-pane",
    ".leaflet-tile-pane .leaflet-layer",
    ".leaflet-tile-container",
    ".leaflet-overlay-pane",
    ".leaflet-shadow-pane",
    ".leaflet-marker-pane",
    ".leaflet-tooltip-pane",
    ".leaflet-popup-pane",
  ];

  const snapshots: Array<{
    element: HTMLElement;
    transform: string;
    willChange: string;
  }> = [];
  const seen = new Set<HTMLElement>();

  for (const selector of selectors) {
    const nodes = mapElement.querySelectorAll<HTMLElement>(selector);
    for (const pane of nodes) {
      if (seen.has(pane)) continue;
      seen.add(pane);

      const computedTransform = window.getComputedStyle(pane).transform;
      const translate = parseTranslateTransform(computedTransform || pane.style.transform);
      if (!translate) continue;

      snapshots.push({
        element: pane,
        transform: pane.style.transform,
        willChange: pane.style.willChange,
      });

      // html2canvas handles translate(...) more reliably than matrix3d(...) on Leaflet panes.
      pane.style.transform = `translate(${translate.x}px, ${translate.y}px)`;
      pane.style.willChange = "auto";
    }
  }

  return () => {
    for (const snapshot of snapshots) {
      snapshot.element.style.transform = snapshot.transform;
      snapshot.element.style.willChange = snapshot.willChange;
    }
  };
}

function parseTranslateTransform(transform: string): { x: number; y: number } | null {
  const value = String(transform || "").trim();
  if (!value || value === "none") return null;

  const matrixMatch = value.match(/^matrix\(([^)]+)\)$/);
  if (matrixMatch) {
    const parts = matrixMatch[1].split(",").map((n) => Number.parseFloat(n.trim()));
    if (parts.length === 6 && Number.isFinite(parts[4]) && Number.isFinite(parts[5])) {
      return { x: parts[4], y: parts[5] };
    }
    return null;
  }

  const matrix3dMatch = value.match(/^matrix3d\(([^)]+)\)$/);
  if (matrix3dMatch) {
    const parts = matrix3dMatch[1].split(",").map((n) => Number.parseFloat(n.trim()));
    if (parts.length === 16 && Number.isFinite(parts[12]) && Number.isFinite(parts[13])) {
      return { x: parts[12], y: parts[13] };
    }
    return null;
  }

  const translate3dMatch = value.match(/^translate3d\(([-\d.]+)px,\s*([-\d.]+)px,\s*[-\d.]+px\)$/);
  if (translate3dMatch) {
    return {
      x: Number.parseFloat(translate3dMatch[1]),
      y: Number.parseFloat(translate3dMatch[2]),
    };
  }

  const translateMatch = value.match(/^translate\(([-\d.]+)px(?:,\s*([-\d.]+)px)?\)$/);
  if (translateMatch) {
    return {
      x: Number.parseFloat(translateMatch[1]),
      y: Number.parseFloat(translateMatch[2] || "0"),
    };
  }

  return null;
}

function hasLikelyBlankTileGap(mapElement: HTMLElement, canvas: HTMLCanvasElement): boolean {
  const tiles = getVisibleLeafletTiles(mapElement);
  if (tiles.length === 0) return false;

  const loadedCount = tiles.filter((img) => img.complete && img.naturalWidth > 0).length;
  const requiredLoadedCount = Math.min(tiles.length, estimateExpectedTileCount(mapElement));
  const tilesNotReady = loadedCount < requiredLoadedCount;
  if (tilesNotReady) return true;

  return estimateNearWhiteRatio(canvas) > 0.74;
}

function estimateNearWhiteRatio(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  const { width, height } = canvas;
  if (width <= 0 || height <= 0) return 0;
  const sampleStep = Math.max(6, Math.floor(Math.min(width, height) / 120));
  const imageData = ctx.getImageData(0, 0, width, height).data;

  let total = 0;
  let nearWhite = 0;
  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const idx = (y * width + x) * 4;
      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];
      const a = imageData[idx + 3];
      if (a < 30) continue;
      total += 1;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max - min;
      if (r >= 242 && g >= 242 && b >= 242 && saturation <= 8) {
        nearWhite += 1;
      }
    }
  }

  if (total === 0) return 0;
  return nearWhite / total;
}

function createFillCanvas(source: HTMLCanvasElement, targetRatio: number): HTMLCanvasElement {
  const sourceRatio = source.width / Math.max(1, source.height);

  // Calculate output dimensions based on target ratio
  // We want to maintain a standard width and adjust height
  const outputWidth = Math.max(source.width, 2000); // Minimum quality
  const outputHeight = Math.round(outputWidth / targetRatio);

  const output = document.createElement("canvas");
  output.width = outputWidth;
  output.height = outputHeight;

  const ctx = output.getContext("2d");
  if (!ctx) {
    return source;
  }

  // Fill background with white
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outputWidth, outputHeight);

  // Calculate source crop to fill target (cover mode)
  let sx = 0;
  let sy = 0;
  let sw = source.width;
  let sh = source.height;

  if (sourceRatio > targetRatio) {
    // Source is wider - crop width
    sw = Math.round(sh * targetRatio);
    sx = Math.round((source.width - sw) / 2);
  } else if (sourceRatio < targetRatio) {
    // Source is taller - crop height
    sh = Math.round(sw / targetRatio);
    sy = Math.round((source.height - sh) / 2);
  }

  // Draw cropped source to fill output
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);

  return output;
}

// ============================================================
// LAYOUT HELPERS (CARTO-STYLE)
// ============================================================

function getPdfLayout(
  config: PrintConfig,
  pageWidth: number,
  pageHeight: number,
  currentY: number,
  hasLegend: boolean
) {
  const footerHeight = 26;
  const contentWidth = pageWidth - MARGINS.left - MARGINS.right;
  const availableHeight = pageHeight - currentY - footerHeight - MARGINS.bottom - 3;

  const isLandscape = config.orientation === "landscape";

  if (!hasLegend) {
    return {
      mapX: MARGINS.left,
      mapY: currentY,
      mapW: contentWidth,
      mapH: availableHeight,
      legendX: 0,
      legendY: 0,
      legendW: 0,
      legendH: 0,
      legendPlacement: "none" as const,
      footerY: currentY + availableHeight + 4,
    };
  }

  if (isLandscape) {
    const legendW = 72;
    const gap = 4;
    const mapW = contentWidth - legendW - gap;
    const mapH = availableHeight;

    return {
      mapX: MARGINS.left,
      mapY: currentY,
      mapW,
      mapH,
      legendX: MARGINS.left + mapW + gap,
      legendY: currentY,
      legendW,
      legendH: mapH,
      legendPlacement: "right" as const,
      footerY: currentY + mapH + 4,
    };
  }

  const legendH = Math.min(78, Math.max(50, Math.round(availableHeight * 0.30)));
  const gap = 4;
  const mapH = availableHeight - legendH - gap;

  return {
    mapX: MARGINS.left,
    mapY: currentY,
    mapW: contentWidth,
    mapH,
    legendX: MARGINS.left,
    legendY: currentY + mapH + gap,
    legendW: contentWidth,
    legendH,
    legendPlacement: "bottom" as const,
    footerY: currentY + availableHeight + 4,
  };
}

function getNorthArrowPositionInMap(mapX: number, mapY: number, mapW: number) {
  return { x: mapX + mapW - 10, y: mapY + 12 };
}

function getScaleBarPositionInMap(mapX: number, mapY: number, mapH: number) {
  return { x: mapX + 7, y: mapY + mapH - 10 };
}

function drawNeatlineTicks(
  pdf: jsPDF,
  mapX: number,
  mapY: number,
  mapW: number,
  mapH: number,
  bounds?: { north: number; south: number; east: number; west: number }
) {
  pdf.setDrawColor(60, 60, 60);
  pdf.setLineWidth(0.2);

  const tick = 2.2;
  const steps = 5;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;

    const x = mapX + t * mapW;
    pdf.line(x, mapY, x, mapY + tick);
    pdf.line(x, mapY + mapH, x, mapY + mapH - tick);

    const y = mapY + t * mapH;
    pdf.line(mapX, y, mapX + tick, y);
    pdf.line(mapX + mapW, y, mapX + mapW - tick, y);
  }

  if (!bounds) return;

  const degree = "\u00B0";
  const fmtLat = (v: number) =>
    `${Math.abs(v).toFixed(2)}${degree}${v >= 0 ? "N" : "S"}`;
  const fmtLng = (v: number) =>
    `${Math.abs(v).toFixed(2)}${degree}${v >= 0 ? "E" : "W"}`;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(5.5);
  pdf.setTextColor(40, 40, 40);

  pdf.text(`${fmtLat(bounds.north)} / ${fmtLng(bounds.west)}`, mapX + 1, mapY - 1.2);
  pdf.text(`${fmtLat(bounds.north)} / ${fmtLng(bounds.east)}`, mapX + mapW - 1, mapY - 1.2, { align: "right" });

  pdf.text(`${fmtLat(bounds.south)} / ${fmtLng(bounds.west)}`, mapX + 1, mapY + mapH + 3.6);
  pdf.text(`${fmtLat(bounds.south)} / ${fmtLng(bounds.east)}`, mapX + mapW - 1, mapY + mapH + 3.6, { align: "right" });
}

export function getMapBounds(map: L.Map): PrintContext["bounds"] {
  const bounds = map.getBounds();
  return {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest(),
  };
}
