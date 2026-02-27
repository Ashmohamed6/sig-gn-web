// app/(protected)/data/components/EntitySheet.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  MapPin,
  Printer,
  Download,
  Pencil,
  ExternalLink,
  Calendar,
  User,
  ChevronRight,
  Hash,
  Info,
  Save,
} from "lucide-react";
import type { TableConfig, ColumnConfig } from "../config/tablesConfig";

interface EntitySheetProps {
  isOpen: boolean;
  onClose: () => void;
  data: Record<string, any> | null;
  tableConfig: TableConfig;
  onViewMap?: (data: Record<string, any>) => void;
  onEdit?: (data: Record<string, any>) => void;
  onPrint?: (data: Record<string, any>) => void;
  editMode?: boolean;
  onCancelEdit?: () => void;
  onSaveEdit?: (changes: Record<string, unknown>) => Promise<void>;
}

const READONLY_KEYS = new Set([
  "id",
  "project_code",
  "created_at",
  "updated_at",
  "record_source",
  "id_region",
  "id_prefecture",
  "id_commune",
  "geometry",
  "geom",
  "wkb_geometry",
]);

function isReadonlyByPattern(key: string): boolean {
  return (
    key.endsWith("_uuid") ||
    key.endsWith("_label") ||
    key.endsWith("_labels") ||
    key.endsWith("_nom") ||
    key.startsWith("id_") ||
    key.startsWith("code_") ||
    key.startsWith("nom_")
  );
}

const formatDetailValue = (value: any, column: ColumnConfig): React.ReactNode => {
  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-400 italic">Non renseigne</span>;
  }

  switch (column.type) {
    case "number": {
      const num = typeof value === "number" ? value : parseFloat(value);
      if (Number.isNaN(num)) return <span className="text-gray-800">{String(value)}</span>;
      return (
        <span className="font-medium tabular-nums">
          {column.prefix}
          {num.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          {column.suffix}
        </span>
      );
    }

    case "currency": {
      const curr = typeof value === "number" ? value : parseFloat(value);
      if (Number.isNaN(curr)) return <span className="text-gray-800">{String(value)}</span>;
      return <span className="font-bold text-emerald-700 tabular-nums">{curr.toLocaleString("fr-FR")} GNF</span>;
    }

    case "percent": {
      const pct = typeof value === "number" ? value : parseFloat(value);
      if (Number.isNaN(pct)) return <span className="text-gray-800">{String(value)}</span>;
      const pctColor = pct > 30 ? "text-red-600" : pct > 15 ? "text-amber-600" : "text-green-600";
      return <span className={`font-medium tabular-nums ${pctColor}`}>{pct.toFixed(1)}%</span>;
    }

    case "date": {
      try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) throw new Error("invalid date");
        return (
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            {date.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        );
      } catch {
        return <span className="text-gray-800">{String(value)}</span>;
      }
    }

    case "boolean":
      return value ? (
        <span className="inline-flex items-center gap-1.5 text-green-600 font-medium">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          Oui
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-red-600 font-medium">
          <span className="w-2 h-2 bg-red-500 rounded-full" />
          Non
        </span>
      );

    case "badge": {
      const badgeColors: Record<string, string> = {
        emerald: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
        green: "bg-green-100 text-green-800 ring-green-600/20",
        blue: "bg-blue-100 text-blue-800 ring-blue-600/20",
        amber: "bg-amber-100 text-amber-800 ring-amber-600/20",
        yellow: "bg-yellow-100 text-yellow-800 ring-yellow-600/20",
        orange: "bg-orange-100 text-orange-800 ring-orange-600/20",
        red: "bg-red-100 text-red-800 ring-red-600/20",
        purple: "bg-purple-100 text-purple-800 ring-purple-600/20",
        gray: "bg-gray-100 text-gray-800 ring-gray-600/20",
      };
      const color = column.badgeColors?.[value] || "gray";
      return (
        <span
          className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ring-1 ring-inset ${
            badgeColors[color] || badgeColors.gray
          }`}
        >
          {String(value)}
        </span>
      );
    }

    case "link":
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Voir le document
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      );

    default:
      return <span className="text-gray-800">{String(value)}</span>;
  }
};

function toDateInputValue(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeEditValue(value: unknown, column: ColumnConfig): unknown {
  if (column.type === "boolean") {
    if (typeof value === "boolean") return value;
    const asText = String(value ?? "").trim().toLowerCase();
    return ["true", "1", "yes", "oui"].includes(asText);
  }

  if (column.type === "number" || column.type === "currency" || column.type === "percent") {
    if (value === null || value === undefined || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }

  if (column.type === "date") {
    const txt = String(value ?? "").trim();
    return txt ? txt : null;
  }

  const txt = String(value ?? "").trim();
  return txt === "" ? null : txt;
}

function areSameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if ((a === null || a === undefined) && (b === null || b === undefined)) return true;
  return String(a ?? "") === String(b ?? "");
}

function renderEditableInput(
  column: ColumnConfig,
  value: unknown,
  onChange: (next: unknown) => void
): React.ReactNode {
  const baseClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";

  if (column.type === "boolean") {
    return (
      <select
        className={baseClass}
        value={value ? "true" : "false"}
        onChange={(e) => onChange(e.target.value === "true")}
      >
        <option value="true">Oui</option>
        <option value="false">Non</option>
      </select>
    );
  }

  if (column.type === "number" || column.type === "currency" || column.type === "percent") {
    return (
      <input
        type="number"
        step="any"
        className={baseClass}
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (column.type === "date") {
    return (
      <input
        type="date"
        className={baseClass}
        value={toDateInputValue(value)}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <input
      type="text"
      className={baseClass}
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function EntitySheet({
  isOpen,
  onClose,
  data,
  tableConfig,
  onViewMap,
  onEdit,
  onPrint,
  editMode = false,
  onCancelEdit,
  onSaveEdit,
}: EntitySheetProps) {
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !data) return;
    setFormValues({ ...data });
    setSaving(false);
    setSaveError(null);
  }, [isOpen, data, editMode]);

  const entityData: Record<string, any> = data || {};

  const identificationKeys = useMemo(
    () =>
      new Set([
        "id_cep",
        "id_org",
        "id_zone",
        "id_ts",
        "id_couloir",
        "id_ouvrage",
        "id_session",
        "id_marche",
        "id_distribution",
        "id_ent",
        "id_menage",
        "id_comite",
        "id_sortant",
        "code_ouvrage",
        "code_station",
        "nom_org",
        "nom_couloir",
        "nom_comite",
        "nom_station",
        "nom_chef_menage",
        "nom_sortant",
        "theme",
        "raison_sociale",
      ]),
    []
  );

  const locationKeys = useMemo(
    () => new Set(["commune_nom", "prefecture_nom", "region_nom", "localite"]),
    []
  );

  const hiddenKeys = useMemo(() => new Set(["geometry", "geom", "wkb_geometry"]), []);

  const { identificationCols, locationCols, dataCols } = useMemo(() => {
    const cols = tableConfig.columns || [];

    const identification = cols.filter((c) => identificationKeys.has(c.key));
    const location = cols.filter((c) => locationKeys.has(c.key));
    const other = cols.filter(
      (c) =>
        !identificationKeys.has(c.key) &&
        !locationKeys.has(c.key) &&
        c.type !== "hidden" &&
        !hiddenKeys.has(c.key)
    );

    return { identificationCols: identification, locationCols: location, dataCols: other };
  }, [tableConfig.columns, identificationKeys, locationKeys, hiddenKeys]);

  const editableCols = useMemo(
    () =>
      dataCols.filter((c) => {
        if (READONLY_KEYS.has(c.key)) return false;
        if (isReadonlyByPattern(c.key)) return false;
        return true;
      }),
    [dataCols]
  );

  const editableKeySet = useMemo(() => new Set(editableCols.map((c) => c.key)), [editableCols]);
  const canEditInSheet = editMode && Boolean(onSaveEdit);

  const entityTitle = useMemo(() => {
    const nameFields = [
      "nom_org",
      "nom_couloir",
      "nom_comite",
      "nom_station",
      "nom_chef_menage",
      "nom_sortant",
      "raison_sociale",
      "theme_label",
      "theme",
    ];
    for (const field of nameFields) {
      if (entityData[field]) return String(entityData[field]);
    }
    const idFields = [
      "id_cep",
      "id_org",
      "id_zone",
      "id_ts",
      "id_couloir",
      "id_ouvrage",
      "id_session",
      "id_marche",
      "id_ent",
      "id_menage",
      "id_comite",
      "id_sortant",
      "code_ouvrage",
      "code_station",
      "id",
    ];
    for (const field of idFields) {
      if (entityData[field]) return String(entityData[field]);
    }
    return "Detail";
  }, [data]);

  const canExportPdf = Boolean(onPrint);

  const setFieldValue = (field: string, nextValue: unknown) => {
    setFormValues((prev) => ({ ...prev, [field]: nextValue }));
  };

  const handleSave = async () => {
    if (!onSaveEdit) return;

    const changes: Record<string, unknown> = {};
    for (const col of editableCols) {
      const current = normalizeEditValue(formValues[col.key], col);
      const initial = normalizeEditValue(entityData[col.key], col);
      if (!areSameValue(current, initial)) {
        changes[col.key] = current;
      }
    }

    if (Object.keys(changes).length === 0) {
      setSaveError("Aucune modification detectee.");
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);
      await onSaveEdit(changes);
    } catch (error: any) {
      setSaveError(error?.message || "Echec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !data) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-label={`${tableConfig.name} - ${entityTitle}`}
      >
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-600 to-teal-600">
          <div className="flex items-start justify-between gap-4">
            <div className="text-white min-w-0">
              <p className="text-sm opacity-80 truncate">{tableConfig.name}</p>
              <h2 className="text-xl font-semibold mt-1 break-words">{entityTitle}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors shrink-0"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            {tableConfig.hasGeometry && onViewMap && (
              <button
                onClick={() => onViewMap(entityData)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm transition-colors"
              >
                <MapPin className="w-4 h-4" />
                Voir sur la carte
              </button>
            )}

            {onPrint && (
              <button
                onClick={() => onPrint(entityData)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm transition-colors"
              >
                <Printer className="w-4 h-4" />
                Imprimer / PDF
              </button>
            )}

            {!canEditInSheet && onEdit && (
              <button
                onClick={() => onEdit(entityData)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Modifier
              </button>
            )}

            {canEditInSheet && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving || editableCols.length === 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    saving || editableCols.length === 0
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-white text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button
                  onClick={() => onCancelEdit?.()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm transition-colors"
                >
                  <X className="w-4 h-4" />
                  Annuler
                </button>
              </>
            )}
          </div>

          {canEditInSheet && editableCols.length === 0 && (
            <p className="text-xs text-white/90 mt-3">
              Aucun champ editable expose pour cette entite.
            </p>
          )}

          {saveError && (
            <div className="mt-3 rounded-lg bg-red-100 text-red-700 text-sm px-3 py-2">{saveError}</div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {identificationCols.length > 0 && (
            <div className="p-6 border-b border-gray-100">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                <Hash className="w-4 h-4" />
                Identification
              </h3>
              <div className="space-y-4">
                {identificationCols.map((col) => (
                  <div key={col.key} className="flex justify-between items-start gap-4">
                    <span className="text-sm text-gray-500">{col.label}</span>
                    <span className="text-sm text-right max-w-[60%] break-words">
                      {formatDetailValue(entityData[col.key], col)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {locationCols.length > 0 && (
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                <MapPin className="w-4 h-4" />
                Localisation
              </h3>
              <div className="space-y-3">
                {locationCols.map((col) => (
                  <div key={col.key} className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500 w-24">{col.label}</span>
                    <span className="text-sm font-medium text-gray-800 break-words">
                      {entityData[col.key] || <span className="text-gray-400 italic">-</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dataCols.length > 0 && (
            <div className="p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                <Info className="w-4 h-4" />
                Informations
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {dataCols.map((col) => {
                  const isEditableField = canEditInSheet && editableKeySet.has(col.key);
                  return (
                    <div key={col.key} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">{col.label}</p>
                      <div className="text-sm break-words">
                        {isEditableField
                          ? renderEditableInput(col, formValues[col.key], (next) => setFieldValue(col.key, next))
                          : formatDetailValue(entityData[col.key], col)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(entityData.created_at || entityData.updated_at || entityData.record_source) && (
            <div className="p-6 border-t border-gray-200 bg-gray-50/50">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                <User className="w-4 h-4" />
                Metadonnees
              </h3>
              <div className="space-y-2 text-xs text-gray-500">
                {entityData.created_at && <p>Cree le {new Date(entityData.created_at).toLocaleDateString("fr-FR")}</p>}
                {entityData.updated_at && <p>Modifie le {new Date(entityData.updated_at).toLocaleDateString("fr-FR")}</p>}
                {entityData.record_source && <p>Source : {String(entityData.record_source)}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Fermer
            </button>

            <button
              onClick={() => onPrint?.(entityData)}
              disabled={!canExportPdf}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                canExportPdf
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
              title={canExportPdf ? "Exporter en PDF" : "Action PDF non configuree"}
            >
              <Download className="w-4 h-4" />
              Exporter PDF
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
