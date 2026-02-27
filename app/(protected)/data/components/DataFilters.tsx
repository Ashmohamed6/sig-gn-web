// app/(protected)/data/components/DataFilters.tsx

"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Calendar,
  ChevronDown,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { FilterConfig } from "../config/tablesConfig";
import { decodeLikelyMojibake } from "../utils/textEncoding";

const API_BASE = "/api/proxy";

type FilterValue = Record<string, any>;

// Type pour les options de filtre
type Option = { value: string; label: string };

interface DataFiltersProps {
  globalFilters?: FilterConfig[];
  tableFilters?: FilterConfig[];
  values: FilterValue;
  onChange: (key: string, value: any) => void;
  onReset: () => void;
  onSearch: (value: string) => void;
  searchValue: string;
  loading?: boolean;
  activeFiltersCount?: number;
  projectCode?: string;
  // Filtre spatial (optionnel)
  spatialFilterEnabled?: boolean;
  onSpatialFilterToggle?: (enabled: boolean) => void;
}

// ------------------------------
// Helpers
// ------------------------------

function normalizeEndpoint(endpoint?: string): string | null {
  if (!endpoint) return null;
  // Allow absolute URLs (rare)
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  // Avoid double prefixing (endpoint should be like "/data/..." not "/api/data/...")
  const clean = endpoint.startsWith("/api") ? endpoint.slice(4) : endpoint;
  return clean.startsWith("/") ? clean : `/${clean}`;
}

function inferOptionId(item: any, filterKey?: string): string {
  const key = String(filterKey || "").toLowerCase();

  // IMPORTANT: les objets "prefecture" et "commune" contiennent aussi id_region.
  // Si on prend id_region en premier, toutes les options auront le même value (ex: GN005).
  // => on priorise l'id attendu selon la clé du filtre.
  const preferred = key.includes("prefecture")
    ? [item?.id_prefecture, item?.prefecture_id]
    : key.includes("commune")
    ? [item?.id_commune, item?.commune_id]
    : key.includes("region")
    ? [item?.id_region, item?.region_id]
    : [];

  const candidates = [
    ...preferred,
    // ordre générique (éviter id_region avant id_prefecture/id_commune)
    item?.id_prefecture,
    item?.prefecture_id,
    item?.id_commune,
    item?.commune_id,
    item?.id_region,
    item?.region_id,
    item?.id,
    item?.uuid,
    item?.code,
    item?.value,
  ];

  const found = candidates.find((v) => v !== null && v !== undefined && String(v).trim() !== "");
  return found !== undefined ? String(found) : "";
}

function inferOptionLabel(item: any, filterKey?: string): string {
  const key = (filterKey || "").toLowerCase();

  const prefer = key.includes("prefecture")
    ? [item?.nom_prefecture, item?.prefecture_nom]
    : key.includes("commune")
    ? [item?.nom_commune, item?.commune_nom]
    : key.includes("region")
    ? [item?.nom_region, item?.region_nom]
    : [];

  const candidates = [
    ...prefer,
    item?.nom_prefecture,
    item?.nom_commune,
    item?.nom_region,
    item?.nom,
    item?.name,
    item?.libelle,
    item?.label,
    item?.titre,
    item?.ref_name,
  ];

  const found = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
  const label = found ? String(found) : inferOptionId(item, filterKey);
  return decodeLikelyMojibake(label);
}

// ------------------------------
// Hook - load dynamic options
// ------------------------------

function useFilterOptions(params: {
  enabled: boolean;
  endpoint?: string;
  filterKey?: string;
  cascadeFrom?: string;
  cascadeValue?: string;
  projectCode?: string;
}) {
  const { enabled, endpoint, filterKey, cascadeFrom, cascadeValue, projectCode } = params;
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const normalized = normalizeEndpoint(endpoint);
    if (!enabled || !normalized) {
      setOptions([]);
      setLoading(false);
      return;
    }

    // Cascade defined but no parent value -> empty options (and no call)
    if (cascadeFrom && !cascadeValue) {
      setOptions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchOptions = async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        const cascadeParam =
          cascadeFrom === "region_id"
            ? "region"
            : cascadeFrom === "prefecture_id"
            ? "prefecture"
            : cascadeFrom || "";
        if (cascadeParam && cascadeValue) qs.set(cascadeParam, cascadeValue);

        const base = API_BASE.replace(/\/$/, "");
        const url = normalized.startsWith("http")
          ? `${normalized}${qs.toString() ? `?${qs.toString()}` : ""}`
          : `${base}${normalized}${qs.toString() ? `?${qs.toString()}` : ""}`;

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        // Le backend peut ignorer X-Project-Code pour le référentiel. On le passe quand même si dispo.
        if (projectCode) headers["X-Project-Code"] = projectCode;

        const res = await fetch(url, {
          headers,
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) {
          setOptions([]);
          return;
        }

        const data = await res.json();

        // Support: GeoJSON FeatureCollection | DRF paginated | array
        let items: any[] = [];
        if (data?.type === "FeatureCollection" && Array.isArray(data?.features)) {
          items = data.features.map((f: any) => f?.properties ?? {});
        } else if (Array.isArray(data?.results)) {
          items = data.results;
        } else if (Array.isArray(data)) {
          items = data;
        }

        // Map -> de-duplicate by value (avoid duplicate keys / confusing selects)
        const mapped = items
          .map((item) => ({
            value: inferOptionId(item, filterKey),
            label: inferOptionLabel(item, filterKey),
          }))
          .filter((o) => o.value);

        const byValue = new Map<string, Option>();
        for (const opt of mapped) {
          if (!byValue.has(opt.value)) {
            byValue.set(opt.value, opt);
          }
        }

        const formatted = Array.from(byValue.values()).sort((a, b) =>
          a.label.localeCompare(b.label, "fr", { sensitivity: "base" })
        );

        setOptions(formatted);
      } catch (e) {
        // Ignore abort
        if ((e as any)?.name === "AbortError") return;
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();

    return () => controller.abort();
  }, [enabled, endpoint, filterKey, cascadeFrom, cascadeValue, projectCode]);

  return { options, loading };
}

// ------------------------------
// Filter components
// ------------------------------

interface SelectFilterProps {
  config: FilterConfig;
  value: any;
  onChange: (value: any) => void;
  cascadeValue?: string;
  disabled?: boolean;
  projectCode?: string;
}

function SelectFilter({
  config,
  value,
  onChange,
  cascadeValue,
  disabled,
  projectCode,
}: SelectFilterProps) {
  const enabled = Boolean(config.endpoint) && !config.options;

  const { options: dynamicOptions, loading } = useFilterOptions({
    enabled,
    endpoint: config.endpoint,
    filterKey: config.key,
    cascadeFrom: config.cascadeFrom,
    cascadeValue,
    projectCode,
  });

  const options = (config.options ?? dynamicOptions).map((opt) => ({
    ...opt,
    label: decodeLikelyMojibake(opt.label),
  }));

  const isDisabled =
    Boolean(disabled) ||
    loading ||
    (Boolean(config.cascadeFrom) && !cascadeValue) ||
    options.length === 0;

  return (
    <div className="relative min-w-[160px]">
      <label className="block text-xs font-medium text-gray-600 mb-1">{config.label}</label>
      <div className="relative">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={isDisabled}
          className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
        >
          <option value="">{config.placeholder || "Tous"}</option>
          {options.map((opt, idx) => (
            <option key={`${opt.value}-${idx}`} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        {loading && (
          <RefreshCw className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />
        )}
      </div>
    </div>
  );
}

interface MultiSelectFilterProps {
  config: FilterConfig;
  value: string[];
  onChange: (value: string[]) => void;
}

function MultiSelectFilter({ config, value = [], onChange }: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const options = (config.options || []).map((opt) => ({
    ...opt,
    label: decodeLikelyMojibake(opt.label),
  }));

  const handleToggle = (optValue: string) => {
    if (value.includes(optValue)) onChange(value.filter((v) => v !== optValue));
    else onChange([...value, optValue]);
  };

  return (
    <div className="relative min-w-[160px]">
      <label className="block text-xs font-medium text-gray-600 mb-1">{config.label}</label>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-left focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        aria-expanded={isOpen}
      >
        <span className={value.length === 0 ? "text-gray-400" : "text-gray-700"}>
          {value.length === 0
            ? config.placeholder || "Sélectionner..."
            : value.length === 1
              ? options.find((o) => o.value === value[0])?.label || value[0]
              : `${value.length} sélectionnés`}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.map((opt) => (
              <label
                key={`${opt.value}-${opt.label}`}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={value.includes(opt.value)}
                  onChange={() => handleToggle(opt.value)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface DateRangeFilterProps {
  config: FilterConfig;
  value: { start?: string; end?: string };
  onChange: (value: { start?: string; end?: string }) => void;
}

function DateRangeFilter({ config, value = {}, onChange }: DateRangeFilterProps) {
  return (
    <div className="min-w-[280px]">
      <label className="block text-xs font-medium text-gray-600 mb-1">{config.label}</label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={value.start || ""}
            onChange={(e) => onChange({ ...value, start: e.target.value || undefined })}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <span className="text-gray-400">→</span>
        <div className="relative flex-1">
          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={value.end || ""}
            onChange={(e) => onChange({ ...value, end: e.target.value || undefined })}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}

// ------------------------------
// Main component
// ------------------------------

export default function DataFilters({
  globalFilters = [],
  tableFilters = [],
  values,
  onChange,
  onReset,
  onSearch,
  searchValue,
  loading = false,
  activeFiltersCount,
  projectCode,
  spatialFilterEnabled = false,
  onSpatialFilterToggle,
}: DataFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Valeurs pour la cascade géographique
  const regionValue = values.region_id;
  const prefectureValue = values.prefecture_id;

  // ------------------------------------------------------------
  // Dépendances (cascade) : si la région change => reset préfecture/commune
  // et si la préfecture change => reset commune
  // ------------------------------------------------------------
  const prevRegionRef = useRef<string>(String(regionValue ?? ""));
  const prevPrefRef = useRef<string>(String(prefectureValue ?? ""));

  useEffect(() => {
    const current = String(regionValue ?? "");
    if (prevRegionRef.current !== current) {
      onChange("prefecture_id", "");
      onChange("commune_id", "");
      prevRegionRef.current = current;
      // Reset aussi le ref préfecture pour éviter un double reset inutile
      prevPrefRef.current = "";
    }
  }, [regionValue, onChange]);

  useEffect(() => {
    const current = String(prefectureValue ?? "");
    if (prevPrefRef.current !== current) {
      onChange("commune_id", "");
      prevPrefRef.current = current;
    }
  }, [prefectureValue, onChange]);

  // Compteur de filtres actifs (fallback si prop non fournie)
  const computedActiveCount = useMemo(() => {
    let count = 0;
    Object.entries(values).forEach(([_, v]) => {
      if (v === null || v === undefined || v === "") return;
      if (Array.isArray(v) && v.length === 0) return;
      if (typeof v === "object" && !Array.isArray(v)) {
        // DateRange etc.
        if (Object.values(v).some((vv) => vv)) count++;
        return;
      }
      count++;
    });
    if (searchValue) count++;
    return count;
  }, [values, searchValue]);

  const activeCount = activeFiltersCount ?? computedActiveCount;

  const renderFilter = useCallback(
    (config: FilterConfig, cascadeValue?: string) => {
      const value = values[config.key];

      switch (config.type) {
        case "select":
        case "cascade":
          return (
            <SelectFilter
              key={config.key}
              config={config}
              value={value}
              onChange={(val) => onChange(config.key, val)}
              cascadeValue={cascadeValue}
              disabled={Boolean(config.cascadeFrom) ? !cascadeValue : false}
              projectCode={projectCode}
            />
          );

        case "multiselect":
          return (
            <MultiSelectFilter
              key={config.key}
              config={config}
              value={value || []}
              onChange={(val) => onChange(config.key, val)}
            />
          );

        case "daterange":
          return (
            <DateRangeFilter
              key={config.key}
              config={config}
              value={value || {}}
              onChange={(val) => onChange(config.key, val)}
            />
          );

        case "text":
          return (
            <div key={config.key} className="min-w-[160px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">{config.label}</label>
              <input
                type="text"
                value={value || ""}
                onChange={(e) => onChange(config.key, e.target.value || null)}
                placeholder={config.placeholder}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          );

        case "number":
          return (
            <div key={config.key} className="min-w-[120px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">{config.label}</label>
              <input
                type="number"
                value={value ?? ""}
                onChange={(e) =>
                  onChange(config.key, e.target.value ? Number(e.target.value) : null)
                }
                placeholder={config.placeholder}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          );

        default:
          return null;
      }
    },
    [values, onChange, projectCode]
  );

  const getFilterLabel = useCallback(
    (key: string, val: any): string => {
      const cfg = [...globalFilters, ...tableFilters].find((f) => f.key === key);
      if (!cfg) return String(val);

      if (Array.isArray(val)) {
        return val
          .map((v) => cfg.options?.find((o) => o.value === v)?.label || v)
          .join(", ");
      }

      if (typeof val === "object" && val && (val.start || val.end)) {
        const start = val.start ? new Date(val.start).toLocaleDateString("fr-FR") : "";
        const end = val.end ? new Date(val.end).toLocaleDateString("fr-FR") : "";
        return `${start} → ${end}`.trim();
      }

      return cfg.options?.find((o) => o.value === val)?.label || String(val);
    },
    [globalFilters, tableFilters]
  );

  const geoFilters = globalFilters.slice(0, 3); // convention: [region, prefecture, commune]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4">
      {/* Barre de recherche principale */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex flex-wrap items-end gap-4">
          {/* Recherche textuelle */}
          <div className="flex-1 min-w-[200px] max-w-md">
            <label className="block text-xs font-medium text-gray-600 mb-1">Recherche</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par ID, nom, organisation..."
                value={searchValue}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                aria-label="Rechercher"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => onSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label="Effacer la recherche"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Filtres géographiques en cascade */}
          <div className="flex flex-wrap items-end gap-3">
            {geoFilters.map((filter) => {
              let cascadeVal: string | undefined;
              if (filter.cascadeFrom === "region_id") cascadeVal = regionValue;
              if (filter.cascadeFrom === "prefecture_id") cascadeVal = prefectureValue;
              return renderFilter(filter, cascadeVal);
            })}
          </div>

          {/* Boutons */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showAdvanced || activeCount > 0
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtres
              {activeCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-emerald-600 text-white text-xs rounded-full">
                  {activeCount}
                </span>
              )}
            </button>

            {onSpatialFilterToggle && (
              <button
                type="button"
                onClick={() => onSpatialFilterToggle(!spatialFilterEnabled)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  spatialFilterEnabled
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                title="Limiter aux entités visibles sur la carte"
              >
                <MapPin className="w-4 h-4" />
                Zone carte
              </button>
            )}

            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowAdvanced(false);
                  onReset();
                }}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                <RefreshCw className="w-4 h-4" />
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Panneau filtres avancés */}
      {showAdvanced && (
        <div className="p-4 bg-gray-50/50 border-t border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {/* Autres filtres globaux (hors géographie) */}
            {globalFilters.slice(3).map((filter) => (
              <div key={filter.key}>{renderFilter(filter)}</div>
            ))}

            {/* Filtres spécifiques à la table */}
            {tableFilters.map((filter) => (
              <div key={filter.key}>{renderFilter(filter)}</div>
            ))}
          </div>
        </div>
      )}

      {/* Tags des filtres actifs */}
      {activeCount > 0 && (
        <div className="px-4 py-2 flex flex-wrap items-center gap-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">Filtres actifs :</span>
          {Object.entries(values).map(([key, val]) => {
            if (val === null || val === undefined || val === "") return null;
            if (Array.isArray(val) && val.length === 0) return null;
            if (typeof val === "object" && !Array.isArray(val) && !val.start && !val.end) return null;

            const cfg = [...globalFilters, ...tableFilters].find((f) => f.key === key);
            if (!cfg) return null;
            const displayValue = getFilterLabel(key, val);

            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full ring-1 ring-inset ring-emerald-200"
              >
                <span className="font-medium">{cfg.label}:</span>
                <span className="max-w-[150px] truncate">{displayValue}</span>
                <button
                  type="button"
                  onClick={() => onChange(key, null)}
                  className="ml-1 hover:text-emerald-900"
                  aria-label={`Retirer filtre ${cfg.label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Petit indicateur loading (optionnel) */}
      {loading && (
        <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
          Chargement des données…
        </div>
      )}
    </div>
  );
}
