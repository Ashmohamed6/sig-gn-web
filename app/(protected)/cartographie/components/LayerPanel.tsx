// app/(protected)/cartographie/components/LayerPanel.tsx

"use client";

import React, { useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  GraduationCap,
  Leaf,
  Layers,
  Map,
  TreePine,
} from "lucide-react";

import type { LayerConfig, LayerGroup } from "../config/layersConfig";
import { getIconSvg } from "../config/layerStyles";
import type { GroupState, LayerState, BasemapId } from "../hooks/useMapLayers";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

type Props = {
  isOpen: boolean;
  onClose: () => void;

  layers: LayerConfig[];
  groups: LayerGroup[];

  layerStates: Record<string, LayerState>;
  groupStates: Record<string, GroupState>;
  totalVisibleFeatures: number;

  // Basemap
  basemapId: BasemapId;
  basemapCollapsed: boolean;
  onToggleBasemapCollapsed: () => void;
  onBasemapChange: (id: BasemapId) => void;

  // Neutral bg
  neutralBg: "gray" | "white";
  onChangeNeutralBg: (bg: "gray" | "white") => void;

  // Admin labels (séparés)
  showRegionLabels: boolean;
  showPrefectureLabels: boolean;
  showCommuneLabels: boolean;
  onChangeRegionLabels: (v: boolean) => void;
  onChangePrefectureLabels: (v: boolean) => void;
  onChangeCommuneLabels: (v: boolean) => void;

  // Actions
  onToggleLayer: (layerId: string) => void;
  onToggleGroupCollapsed: (groupId: string) => void;
  onShowGroup: (groupId: string) => void;
  onHideGroup: (groupId: string) => void;
};

type BasemapOption = { id: BasemapId; label: string; hint?: string };

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function getGroupIcon(groupId: string) {
  if (groupId === "admin") return <Map className="h-4 w-4 text-blue-700" />;
  if (groupId === "environnement") return <TreePine className="h-4 w-4 text-green-700" />;
  if (groupId === "infrastructure") return <Building2 className="h-4 w-4 text-amber-700" />;
  if (groupId === "collecte_agrieco") return <Leaf className="h-4 w-4 text-emerald-700" />;
  if (groupId === "collecte_fiere") return <GraduationCap className="h-4 w-4 text-indigo-700" />;
  return <Layers className="h-4 w-4 text-slate-600" />;
}

function getLegendPreview(layer: LayerConfig) {
  const style = (layer as any).style;
  if (!style) return null;

  const geomType = layer.geometryType;

  // Point -> mini marqueur fidèle à la carte (forme + icône SVG)
  if (geomType === "Point") {
    const color = style.iconColor || style.color || "#64748B";
    const shape: string = style.markerShape || "circle";
    const iconName = style.icon || "MapPin";
    const svgHtml = getIconSvg(iconName, color)
      .replace(/width="16"/g, 'width="12"')
      .replace(/height="16"/g, 'height="12"');

    let borderRadius: string;
    let containerTransform = "";
    let innerTransform = "";

    switch (shape) {
      case "square":
        borderRadius = "4px";
        break;
      case "diamond":
        borderRadius = "4px";
        containerTransform = "rotate(45deg)";
        innerTransform = "rotate(-45deg)";
        break;
      default:
        borderRadius = "50%";
        break;
    }

    return (
      <span
        className="inline-flex items-center justify-center shrink-0"
        style={{
          width: 20,
          height: 20,
          background: "white",
          border: `2px solid ${color}`,
          borderRadius,
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transform: containerTransform || undefined,
        }}
      >
        <span
          className="inline-flex items-center justify-center"
          style={{ transform: innerTransform || undefined }}
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      </span>
    );
  }

  // LineString / MultiLineString -> trait horizontal
  if (geomType === "LineString" || geomType === "MultiLineString") {
    const stroke = style.color ?? "#64748B";
    const weight = style.weight ?? 3;
    const dash = style.dashArray ? String(style.dashArray) : "";
    return (
      <span
        className="inline-block w-6"
        style={{
          borderTopWidth: `${weight}px`,
          borderTopStyle: dash ? "dashed" : "solid",
          borderTopColor: stroke,
        }}
      />
    );
  }

  // Polygon / MultiPolygon -> rectangle coloré avec bordure
  if (geomType === "Polygon" || geomType === "MultiPolygon") {
    const fill = style.fillColor ?? "#9CA3AF";
    const fillOpacity = style.fillOpacity ?? 0.2;
    const stroke = style.color ?? "#64748B";
    const weight = style.weight ?? 2;
    return (
      <span
        className="inline-block h-3 w-6 rounded-sm"
        style={{
          background: fill,
          opacity: fillOpacity,
          border: `${weight}px solid ${stroke}`,
        }}
      />
    );
  }

  return null;
}

// ------------------------------------------------------------
// Basemap group
// ------------------------------------------------------------

function BasemapGroupCard(props: {
  collapsed: boolean;
  onToggleCollapsed: () => void;

  basemapId: BasemapId;
  onBasemapChange: (id: BasemapId) => void;

  neutralBg: "gray" | "white";
  onChangeNeutralBg: (bg: "gray" | "white") => void;

  showRegionLabels: boolean;
  showPrefectureLabels: boolean;
  showCommuneLabels: boolean;
  onChangeRegionLabels: (v: boolean) => void;
  onChangePrefectureLabels: (v: boolean) => void;
  onChangeCommuneLabels: (v: boolean) => void;
}) {
  const basemaps: BasemapOption[] = useMemo(
    () => [
      { id: "none", label: "Aucun (fond neutre)" },
      { id: "plan", label: "Plan (administratif)" },
      { id: "osm", label: "OpenStreetMap" },
      {
        id: "sat",
        label: "Satellite",
        hint: "Si le satellite ne charge pas (timeout), bascule automatique sur OpenStreetMap.",
      },
    ],
    []
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          type="button"
          className="flex items-center gap-2 text-left"
          onClick={props.onToggleCollapsed}
        >
          {props.collapsed ? (
            <ChevronRight className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
          <Map className="h-4 w-4 text-slate-700" />
          <span className="font-medium text-slate-800">Fonds de carte</span>
          <span className="ml-1 text-xs text-slate-400">optionnel</span>
        </button>
      </div>

      {!props.collapsed && (
        <div className="px-3 pb-3">
          <div className="space-y-2">
            {basemaps.map((b) => (
              <label
                key={b.id}
                className="flex items-start gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="basemap"
                  checked={props.basemapId === b.id}
                  onChange={() => props.onBasemapChange(b.id)}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm text-slate-800">{b.label}</div>
                  {b.hint && (
                    <div className="text-xs text-slate-500">{b.hint}</div>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div className="mt-3 border-t border-slate-100 pt-3">
            <div className="text-xs font-medium text-slate-700">
              Couleur du fond neutre
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => props.onChangeNeutralBg("gray")}
                className={`rounded-md border px-3 py-1 text-sm ${
                  props.neutralBg === "gray"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                Gris
              </button>
              <button
                type="button"
                onClick={() => props.onChangeNeutralBg("white")}
                className={`rounded-md border px-3 py-1 text-sm ${
                  props.neutralBg === "white"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                Blanc
              </button>
            </div>
          </div>

          <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
            <div className="text-xs font-medium text-slate-700">
              Afficher les noms
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={props.showRegionLabels}
                onChange={(e) => props.onChangeRegionLabels(e.target.checked)}
              />
              Régions
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={props.showPrefectureLabels}
                onChange={(e) =>
                  props.onChangePrefectureLabels(e.target.checked)
                }
              />
              Préfectures
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={props.showCommuneLabels}
                onChange={(e) => props.onChangeCommuneLabels(e.target.checked)}
              />
              Communes
            </label>

            <div className="text-xs text-slate-500">
              Les tailles et le gras sont adaptés automatiquement selon le niveau
              (Régions &gt; Préfectures &gt; Communes).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Main component
// ------------------------------------------------------------

export default function LayerPanel({
  isOpen,
  onClose,
  layers,
  groups,
  layerStates,
  groupStates,
  totalVisibleFeatures,

  basemapId,
  basemapCollapsed,
  onToggleBasemapCollapsed,
  onBasemapChange,

  neutralBg,
  onChangeNeutralBg,

  showRegionLabels,
  showPrefectureLabels,
  showCommuneLabels,
  onChangeRegionLabels,
  onChangePrefectureLabels,
  onChangeCommuneLabels,

  onToggleLayer,
  onToggleGroupCollapsed,
  onShowGroup,
  onHideGroup,
}: Props) {
  if (!isOpen) return null;

  const [search, setSearch] = useState("");

  const visibleCount = useMemo(() => {
    return Object.values(layerStates).filter((s) => s.visible).length;
  }, [layerStates]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;

    return groups
      .map((g) => {
        const layerIds = g.layers.filter((id) => {
          const l = layers.find((x) => x.id === id);
          if (!l) return false;
          return (l.name || "").toLowerCase().includes(q);
        });
        return { ...g, layers: layerIds };
      })
      .filter((g) => g.layers.length > 0);
  }, [search, groups, layers]);

  return (
    <div className="absolute left-0 top-0 z-10 h-full w-[360px] max-w-[92vw] bg-emerald-700/95 backdrop-blur-md shadow-xl flex flex-col">
      {/* header */}
      <div className="p-3 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded-md p-2 text-white/80 hover:bg-white/10"
          aria-label="Fermer"
        >
          ✕
        </button>
        <div className="text-white font-semibold text-lg">Couches</div>
        <div className="mt-1 text-xs text-emerald-50/90">
          {visibleCount} couches actives &nbsp; • &nbsp; {totalVisibleFeatures} objets
        </div>

        <div className="mt-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une couche..."
            className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 outline-none ring-1 ring-white/15 focus:ring-white/30"
          />
        </div>
      </div>

      {/* content */}
      <div className="flex-1 overflow-auto px-3 pb-3 space-y-3">
        <BasemapGroupCard
          collapsed={basemapCollapsed}
          onToggleCollapsed={onToggleBasemapCollapsed}
          basemapId={basemapId}
          onBasemapChange={onBasemapChange}
          neutralBg={neutralBg}
          onChangeNeutralBg={onChangeNeutralBg}
          showRegionLabels={showRegionLabels}
          showPrefectureLabels={showPrefectureLabels}
          showCommuneLabels={showCommuneLabels}
          onChangeRegionLabels={onChangeRegionLabels}
          onChangePrefectureLabels={onChangePrefectureLabels}
          onChangeCommuneLabels={onChangeCommuneLabels}
        />

        {filteredGroups.map((group) => {
          const state = groupStates[group.id];
          const collapsed = state?.collapsed ?? false;

          const groupLayers = group.layers
            .map((id) => layers.find((l) => l.id === id))
            .filter(Boolean) as LayerConfig[];

          const fullyVisible =
            group.layers.length > 0 &&
            group.layers.every((id) => layerStates[id]?.visible);
          const partiallyVisible = group.layers.some(
            (id) => layerStates[id]?.visible
          );

          return (
            <div key={group.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between px-3 py-2">
                <button
                  type="button"
                  className="flex items-center gap-2 text-left"
                  onClick={() => onToggleGroupCollapsed(group.id)}
                >
                  {collapsed ? (
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  )}
                  {getGroupIcon(group.id)}
                  <span className="font-medium text-slate-800">{group.name}</span>
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-50 px-2 text-xs text-emerald-700">
                    {group.layers.length}
                  </span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-slate-100"
                    title={fullyVisible ? "Tout masquer" : "Tout afficher"}
                    onClick={() => (fullyVisible ? onHideGroup(group.id) : onShowGroup(group.id))}
                  >
                    {partiallyVisible || fullyVisible ? (
                      <Eye className="h-4 w-4 text-slate-700" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              {!collapsed && (
                <div className="px-3 pb-3">
                  <div className="space-y-2">
                    {groupLayers.map((layer) => {
                      const st = layerStates[layer.id];
                      const checked = !!st?.visible;
                      const count = st?.featureCount ?? 0;
                      const legend = getLegendPreview(layer);

                      return (
                        <label
                          key={layer.id}
                          className={`flex items-center justify-between gap-3 rounded-lg px-2 py-2 cursor-pointer ${
                            checked ? "bg-emerald-50" : "bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onToggleLayer(layer.id)}
                            />
                            {legend && <span className="shrink-0">{legend}</span>}
                            <span className="text-sm text-slate-800 truncate">{layer.name}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${checked ? "text-slate-700" : "text-slate-400"}`}>
                              {count > 0 ? `${checked ? count : 0}/${count}` : "--"}
                            </span>
                            {st?.loading && <span className="text-xs text-amber-600">...</span>}
                            {st?.error && <span className="text-xs text-red-600">!</span>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
