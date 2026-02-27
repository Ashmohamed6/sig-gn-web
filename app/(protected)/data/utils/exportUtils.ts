// app/(protected)/data/utils/exportUtils.ts

import type { ColumnConfig } from "../config/tablesConfig";

type Row = Record<string, unknown>;

/**
 * Format a value for export based on column type.
 * (Used for CSV/PDF mostly — XLSX keeps some numeric values as numbers.)
 */
export function formatExportValue(value: unknown, column: ColumnConfig): string {
  if (value === null || value === undefined) return "";

  switch (column.type) {
    case "percent": {
      const n = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(n)) return String(value);
      return `${n.toFixed(1)}%`;
    }

    case "boolean":
      return value ? "Oui" : "Non";

    case "date": {
      if (value instanceof Date) return value.toLocaleDateString("fr-FR");
      if (typeof value === "string") {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("fr-FR");
      }
      return String(value);
    }

    case "currency": {
      const n = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(n)) return String(value);
      return `${n.toLocaleString("fr-FR")} GNF`;
    }

    case "number": {
      const n = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(n)) return String(value);
      return n.toLocaleString("fr-FR");
    }

    default:
      return String(value);
  }
}

/**
 * Export data to CSV format (semicolon-separated for FR locales).
 */
export function exportToCSV(data: Row[], columns: ColumnConfig[], filename: string): void {
  const BOM = "\uFEFF";
  const headers = columns.map((c) => `"${String(c.label).replace(/"/g, '""')}"`).join(";");

  const rows = data.map((row) =>
    columns.map((c) => `"${formatExportValue(row[c.key], c).replace(/"/g, '""')}"`).join(";")
  );

  const csvContent = `${BOM}${headers}\n${rows.join("\n")}`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export data to XLSX (Excel).
 * Keeps number/currency/percent as numbers when possible.
 */
export async function exportToXLSX(data: Row[], columns: ColumnConfig[], filename: string): Promise<void> {
  let XLSX: any;
  try {
    XLSX = await import("xlsx");
  } catch {
    throw new Error("Dépendance manquante: installez le package 'xlsx' pour exporter en Excel.");
  }

  const wsData: unknown[][] = [
    columns.map((c) => c.label),
    ...data.map((row) =>
      columns.map((c) => {
        const v = row[c.key];
        if (v === null || v === undefined) return "";

        if (c.type === "number" || c.type === "currency" || c.type === "percent") {
          const n = typeof v === "number" ? v : Number(v);
          return Number.isNaN(n) ? String(v) : n;
        }

        return formatExportValue(v, c);
      })
    ),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-fit column widths (best effort)
  const colWidths = columns.map((c) => {
    const headerLen = String(c.label ?? "").length;
    return { wch: Math.min(Math.max(headerLen + 2, 10), 50) };
  });
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Données");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export data to PDF format (tabular).
 */
export async function exportToPDF(
  data: Row[],
  columns: ColumnConfig[],
  filename: string,
  title?: string
): Promise<void> {
  let jsPDF: any;
  let autoTable: any;

  try {
    jsPDF = (await import("jspdf")).jsPDF;
  } catch {
    throw new Error("Dépendance manquante: installez le package 'jspdf' pour exporter en PDF.");
  }

  try {
    autoTable = (await import("jspdf-autotable")).default;
  } catch {
    throw new Error("Dépendance manquante: installez le package 'jspdf-autotable' pour exporter en PDF.");
  }

  const orientation = columns.length > 6 ? "landscape" : "portrait";
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

  const startY = title ? 30 : 20;
  if (title) {
    doc.setFontSize(16);
    doc.setTextColor(5, 150, 105);
    doc.text(title, 14, 20);
  }

  const headers = columns.map((c) => c.label);
  const body = data.map((row) => columns.map((c) => formatExportValue(row[c.key], c)));

  autoTable(doc, {
    head: [headers],
    body,
    startY,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { top: 20, right: 14, bottom: 20, left: 14 },
    didDrawPage: (hook: any) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);

      const y = doc.internal.pageSize.height - 10;
      doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, 14, y);
      doc.text(`Page ${hook.pageNumber} / ${pageCount}`, doc.internal.pageSize.width / 2, y, { align: "center" });
      doc.text("FIERE & AGRIECO", doc.internal.pageSize.width - 14, y, { align: "right" });
    },
  });

  doc.save(`${filename}.pdf`);
}

/**
 * Export data to GeoJSON (FeatureCollection).
 * Default geometry field matches what we produce in the data hook (`geometry`).
 */
export function exportToGeoJSON(
  data: Row[],
  columns: ColumnConfig[],
  filename: string,
  geometryField: string = "geometry"
): void {
  const features = data
    .map((row) => {
      const rawGeom = row[geometryField] ?? row["geom"] ?? row["wkb_geometry"];
      if (!rawGeom) return null;

      let geometry: any = rawGeom;
      if (typeof geometry === "string") {
        try {
          geometry = JSON.parse(geometry);
        } catch {
          return null;
        }
      }

      if (!geometry || typeof geometry !== "object" || !("type" in geometry) || !("coordinates" in geometry)) {
        return null;
      }

      const properties: Record<string, unknown> = {};
      for (const c of columns) {
        if (c.key === geometryField || c.key === "geom" || c.key === "wkb_geometry") continue;
        properties[c.key] = row[c.key];
      }

      return { type: "Feature" as const, geometry, properties };
    })
    .filter(Boolean);

  const geojson = {
    type: "FeatureCollection" as const,
    crs: { type: "name", properties: { name: "EPSG:4326" } },
    features,
  };

  const blob = new Blob([JSON.stringify(geojson, null, 2)], {
    type: "application/geo+json;charset=utf-8;",
  });
  downloadBlob(blob, `${filename}.geojson`);
}

/**
 * Helper to download a blob
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a filename with timestamp YYYYMMDD
 */
export function generateFilename(tableId: string, prefix?: string): string {
  const d = new Date();
  const yyyymmdd = d.toISOString().slice(0, 10).replace(/-/g, "");
  return `${prefix ? `${prefix}_` : ""}${tableId}_${yyyymmdd}`;
}
