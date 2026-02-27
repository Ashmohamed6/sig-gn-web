// app/(protected)/cartographie/components/MapToolbar.tsx

"use client";

import React, { useState, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Home,
  Maximize,
  Minimize,
  Locate,
  Ruler,
  Printer,
  RotateCcw,
  MousePointer2,
  Crosshair,
  Loader2,
} from "lucide-react";
import L from "leaflet";
import { MAP_CONFIG } from "../config/layersConfig";

// ============================================================
// TYPES
// ============================================================

interface MapToolbarProps {
  map: L.Map | null;
  onPrintClick?: () => void;
  onResetLayers?: () => void;
}

type ToolMode = "select" | "measure" | null;

// ============================================================
// COMPONENT
// ============================================================

export default function MapToolbar({
  map,
  onPrintClick,
  onResetLayers,
}: MapToolbarProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [activeMode, setActiveMode] = useState<ToolMode>("select");

  // ============================================================
  // ACTIONS
  // ============================================================

  const handleZoomIn = useCallback(() => {
    if (!map) return;
    map.zoomIn();
  }, [map]);

  const handleZoomOut = useCallback(() => {
    if (!map) return;
    map.zoomOut();
  }, [map]);

  const handleResetView = useCallback(() => {
    if (!map) return;
    map.setView(
      [MAP_CONFIG.center.lat, MAP_CONFIG.center.lng],
      MAP_CONFIG.defaultZoom
    );
  }, [map]);

  const handleFullscreen = useCallback(() => {
    const mapContainer = document.querySelector(".map-wrapper");
    if (!mapContainer) return;

    if (!isFullscreen) {
      if (mapContainer.requestFullscreen) {
        mapContainer.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const handleLocate = useCallback(() => {
    if (!map || isLocating) return;

    setIsLocating(true);

    map.locate({
      setView: true,
      maxZoom: 14,
      enableHighAccuracy: true,
    });

    map.once("locationfound", (e) => {
      setIsLocating(false);

      // Ajouter un marqueur temporaire
      const marker = L.circleMarker(e.latlng, {
        radius: 10,
        fillColor: "#3b82f6",
        fillOpacity: 0.8,
        color: "#1e40af",
        weight: 2,
      }).addTo(map);

      // Ajouter un cercle de précision
      const accuracy = e.accuracy;
      const circle = L.circle(e.latlng, {
        radius: accuracy,
        fillColor: "#3b82f6",
        fillOpacity: 0.1,
        color: "#3b82f6",
        weight: 1,
      }).addTo(map);

      // Supprimer après 10 secondes
      setTimeout(() => {
        map.removeLayer(marker);
        map.removeLayer(circle);
      }, 10000);
    });

    map.once("locationerror", () => {
      setIsLocating(false);
      alert("Impossible de vous localiser. Vérifiez les permissions.");
    });
  }, [map, isLocating]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex flex-col gap-2">
      {/* Groupe Navigation */}
      <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
        <ToolButton
          icon={<ZoomIn className="h-4 w-4" />}
          title="Zoom avant"
          onClick={handleZoomIn}
        />
        <ToolButton
          icon={<ZoomOut className="h-4 w-4" />}
          title="Zoom arrière"
          onClick={handleZoomOut}
        />
        <ToolButton
          icon={<Home className="h-4 w-4" />}
          title="Vue initiale"
          onClick={handleResetView}
        />
      </div>

      {/* Groupe Outils */}
      <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
        <ToolButton
          icon={<MousePointer2 className="h-4 w-4" />}
          title="Mode sélection"
          onClick={() => setActiveMode("select")}
          active={activeMode === "select"}
        />
        <ToolButton
          icon={
            isLocating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Locate className="h-4 w-4" />
            )
          }
          title="Me localiser"
          onClick={handleLocate}
          disabled={isLocating}
        />
        <ToolButton
          icon={isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          title={isFullscreen ? "Quitter plein écran" : "Plein écran"}
          onClick={handleFullscreen}
        />
      </div>

      {/* Groupe Actions */}
      <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
        <ToolButton
          icon={<Printer className="h-4 w-4" />}
          title="Imprimer / Exporter"
          onClick={onPrintClick}
        />
        <ToolButton
          icon={<RotateCcw className="h-4 w-4" />}
          title="Réinitialiser les couches"
          onClick={onResetLayers}
        />
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

interface ToolButtonProps {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}

function ToolButton({ icon, title, onClick, active, disabled }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        w-9 h-9 flex items-center justify-center transition-all
        border-b border-slate-100 last:border-b-0
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50 cursor-pointer"}
        ${active ? "bg-emerald-50 text-emerald-600" : "text-slate-600"}
      `}
    >
      {icon}
    </button>
  );
}

// ============================================================
// HORIZONTAL VERSION (pour le header)
// ============================================================

export function MapToolbarHorizontal({
  map,
  onPrintClick,
  onResetLayers,
}: MapToolbarProps) {
  const [isLocating, setIsLocating] = useState(false);

  const handleZoomIn = () => map?.zoomIn();
  const handleZoomOut = () => map?.zoomOut();
  const handleResetView = () => {
    map?.setView(
      [MAP_CONFIG.center.lat, MAP_CONFIG.center.lng],
      MAP_CONFIG.defaultZoom
    );
  };

  const handleLocate = () => {
    if (!map || isLocating) return;
    setIsLocating(true);

    map.locate({ setView: true, maxZoom: 14 });

    map.once("locationfound", () => setIsLocating(false));
    map.once("locationerror", () => {
      setIsLocating(false);
      alert("Impossible de vous localiser.");
    });
  };

  return (
    <div className="flex items-center gap-1 bg-white rounded-lg shadow-md border border-slate-200 p-1">
      <ToolButtonH icon={<ZoomIn className="h-4 w-4" />} title="Zoom +" onClick={handleZoomIn} />
      <ToolButtonH icon={<ZoomOut className="h-4 w-4" />} title="Zoom -" onClick={handleZoomOut} />
      <div className="w-px h-5 bg-slate-200" />
      <ToolButtonH icon={<Home className="h-4 w-4" />} title="Vue initiale" onClick={handleResetView} />
      <ToolButtonH
        icon={isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Locate className="h-4 w-4" />}
        title="Me localiser"
        onClick={handleLocate}
        disabled={isLocating}
      />
      <div className="w-px h-5 bg-slate-200" />
      <ToolButtonH icon={<Printer className="h-4 w-4" />} title="Imprimer" onClick={onPrintClick} />
    </div>
  );
}

function ToolButtonH({
  icon,
  title,
  onClick,
  active,
  disabled,
}: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        w-8 h-8 flex items-center justify-center rounded-md transition-all
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-100 cursor-pointer"}
        ${active ? "bg-emerald-50 text-emerald-600" : "text-slate-600"}
      `}
    >
      {icon}
    </button>
  );
}
