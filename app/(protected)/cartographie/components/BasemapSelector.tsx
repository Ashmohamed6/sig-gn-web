// app/(protected)/cartographie/components/BasemapSelector.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Layers, ChevronDown, Check } from "lucide-react";
import type { BasemapId } from "../hooks/useMapLayers";

/**
 * NOTE:
 * - La sélection des fonds de carte est gérée dans le panneau "Couches" via "Fonds de carte" (LayerPanel).
 * - Ce composant est conservé pour usage optionnel (ex: toolbar), mais il suit les mêmes IDs:
 *   "none" | "plan" | "osm" | "sat"
 */

interface BasemapSelectorProps {
  activeBasemap: BasemapId;
  onBasemapChange: (basemapId: BasemapId) => void;
}

type BasemapOption = {
  id: BasemapId;
  name: string;
  hint?: string;
};

const BASEMAP_OPTIONS: BasemapOption[] = [
  { id: "none", name: "Aucun (fond neutre)" },
  { id: "plan", name: "Plan (administratif)" },
  { id: "osm", name: "OpenStreetMap" },
  { id: "sat", name: "Satellite", hint: "Si le satellite ne charge pas (timeout), bascule automatique sur OSM." },
];

export default function BasemapSelector({ activeBasemap, onBasemapChange }: BasemapSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeConfig = useMemo(() => {
    return BASEMAP_OPTIONS.find((b) => b.id === activeBasemap) || BASEMAP_OPTIONS[0];
  }, [activeBasemap]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all border border-slate-200"
      >
        <Layers className="h-4 w-4 text-slate-600" />
        <span className="text-sm font-medium text-slate-700">{activeConfig.name}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          <div className="absolute top-full left-0 mt-2 z-20 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden min-w-[240px]">
            <div className="p-2">
              <p className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">Fond de carte</p>
            </div>

            <div className="p-2 pt-0 space-y-1">
              {BASEMAP_OPTIONS.map((basemap) => (
                <button
                  key={basemap.id}
                  type="button"
                  onClick={() => {
                    onBasemapChange(basemap.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 px-3 py-2 rounded-lg transition-all ${
                    basemap.id === activeBasemap ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-md border border-slate-200 overflow-hidden flex-shrink-0"
                    style={{
                      backgroundImage: getBasemapPreview(basemap.id),
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />

                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{basemap.name}</div>
                    {basemap.hint && <div className="text-xs text-slate-500">{basemap.hint}</div>}
                  </div>

                  {basemap.id === activeBasemap && <Check className="mt-1 h-4 w-4 text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function BasemapSelectorCompact({ activeBasemap, onBasemapChange }: BasemapSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all border border-slate-200"
        title="Changer le fond de carte"
      >
        <Layers className="h-5 w-5 text-slate-600" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full left-0 mb-2 z-20 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-2 grid grid-cols-2 gap-2">
              {BASEMAP_OPTIONS.map((basemap) => (
                <button
                  key={basemap.id}
                  type="button"
                  onClick={() => {
                    onBasemapChange(basemap.id);
                    setIsOpen(false);
                  }}
                  className={`relative w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    basemap.id === activeBasemap ? "border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200 hover:border-slate-300"
                  }`}
                  title={basemap.name}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: getBasemapPreview(basemap.id),
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5">
                    <span className="text-[10px] text-white font-medium truncate block">{basemap.name}</span>
                  </div>
                  {basemap.id === activeBasemap && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function getBasemapPreview(basemapId: BasemapId): string {
  const previews: Record<BasemapId, string> = {
    none: "linear-gradient(135deg, #e5e7eb 0%, #f8fafc 100%)",
    plan: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
    osm: "linear-gradient(135deg, #e8f0e3 0%, #c5d8be 50%, #a8c099 100%)",
    sat: "linear-gradient(135deg, #132e13 0%, #2d4a2d 50%, #0f2f24 100%)",
  };
  return previews[basemapId] || previews.osm;
}
