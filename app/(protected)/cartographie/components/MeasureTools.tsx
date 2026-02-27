// app/(protected)/cartographie/components/MeasureTools.tsx

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Ruler, Square, X, Trash2, RotateCcw } from "lucide-react";
import L from "leaflet";

// ============================================================
// TYPES
// ============================================================

interface MeasureToolsProps {
  map: L.Map | null;
}

type MeasureMode = "distance" | "area" | null;

interface Measurement {
  id: string;
  mode: "distance" | "area";
  points: L.LatLng[];
  value: number;
  unit: string;
  layer: L.Layer;
}

// ============================================================
// COMPONENT
// ============================================================

export default function MeasureTools({ map }: MeasureToolsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<MeasureMode>(null);
  const [currentPoints, setCurrentPoints] = useState<L.LatLng[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentValue, setCurrentValue] = useState<string>("");

  const currentLayerRef = useRef<L.LayerGroup | null>(null);
  const measurementsLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialiser les layers
  useEffect(() => {
    if (!map) return;

    measurementsLayerRef.current = L.layerGroup().addTo(map);
    currentLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      if (measurementsLayerRef.current) {
        map.removeLayer(measurementsLayerRef.current);
      }
      if (currentLayerRef.current) {
        map.removeLayer(currentLayerRef.current);
      }
    };
  }, [map]);

  // Gérer les clics sur la carte
  useEffect(() => {
    if (!map || !mode) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      const newPoints = [...currentPoints, e.latlng];
      setCurrentPoints(newPoints);
      drawCurrentMeasurement(newPoints, false);
    };

    const handleDoubleClick = (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      // Correction: Utiliser e.originalEvent pour accéder à l'événement DOM natif
      if (e.originalEvent) {
        e.originalEvent.preventDefault();
      }
      
      if (currentPoints.length >= 2) {
        finishMeasurement();
      }
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (currentPoints.length === 0) return;
      const tempPoints = [...currentPoints, e.latlng];
      drawCurrentMeasurement(tempPoints, true);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelMeasurement();
      } else if (e.key === "Enter" && currentPoints.length >= 2) {
        finishMeasurement();
      }
    };

    map.on("click", handleClick);
    map.on("dblclick", handleDoubleClick);
    map.on("mousemove", handleMouseMove);
    document.addEventListener("keydown", handleKeyDown);

    map.getContainer().style.cursor = "crosshair";
    map.doubleClickZoom.disable();

    return () => {
      map.off("click", handleClick);
      map.off("dblclick", handleDoubleClick);
      map.off("mousemove", handleMouseMove);
      document.removeEventListener("keydown", handleKeyDown);
      map.getContainer().style.cursor = "";
      map.doubleClickZoom.enable();
    };
  }, [map, mode, currentPoints]);

  // Dessiner la mesure en cours
  const drawCurrentMeasurement = useCallback((points: L.LatLng[], isTemp: boolean) => {
    if (!currentLayerRef.current || !mode) return;

    currentLayerRef.current.clearLayers();

    if (points.length === 0) {
      setCurrentValue("");
      return;
    }

    // Style
    const style = {
      color: mode === "distance" ? "#3b82f6" : "#8b5cf6",
      weight: 3,
      opacity: isTemp ? 0.6 : 1,
      dashArray: isTemp ? "5,5" : undefined,
    };

    // Points
    points.forEach((point, index) => {
      const marker = L.circleMarker(point, {
        radius: 5,
        fillColor: style.color,
        fillOpacity: 1,
        color: "white",
        weight: 2,
      });
      currentLayerRef.current!.addLayer(marker);

      // Numéro du point
      if (!isTemp) {
        const label = L.divIcon({
          className: "measure-label",
          html: `<div style="
            background: ${style.color};
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: bold;
            white-space: nowrap;
          ">${index + 1}</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, -5],
        });
        L.marker(point, { icon: label }).addTo(currentLayerRef.current!);
      }
    });

    // Ligne ou polygone
    if (points.length >= 2) {
      if (mode === "distance") {
        const polyline = L.polyline(points, style);
        currentLayerRef.current.addLayer(polyline);

        // Calculer la distance
        const distance = calculateDistance(points);
        setCurrentValue(formatDistance(distance));
      } else {
        // Fermer le polygone pour l'affichage
        const polygonPoints = [...points, points[0]];
        const polygon = L.polygon(polygonPoints, {
          ...style,
          fillColor: style.color,
          fillOpacity: 0.2,
        });
        currentLayerRef.current.addLayer(polygon);

        // Calculer la surface
        const area = calculateArea(points);
        setCurrentValue(formatArea(area));
      }
    } else {
      setCurrentValue("Cliquez pour ajouter des points");
    }
  }, [mode]);

  // Terminer la mesure
  const finishMeasurement = useCallback(() => {
    if (!mode || currentPoints.length < 2 || !measurementsLayerRef.current) return;

    const id = `measure_${Date.now()}`;
    let value: number;
    let unit: string;
    let layer: L.Layer;

    const style = {
      color: mode === "distance" ? "#3b82f6" : "#8b5cf6",
      weight: 3,
      opacity: 0.8,
    };

    if (mode === "distance") {
      value = calculateDistance(currentPoints);
      unit = value >= 1000 ? "km" : "m";
      layer = L.polyline(currentPoints, style);
    } else {
      value = calculateArea(currentPoints);
      unit = value >= 10000 ? "ha" : "m²";
      layer = L.polygon(currentPoints, {
        ...style,
        fillColor: style.color,
        fillOpacity: 0.2,
      });
    }

    // Ajouter un label avec la mesure
    const center = mode === "distance" 
      ? currentPoints[Math.floor(currentPoints.length / 2)]
      : L.polygon(currentPoints).getBounds().getCenter();

    const labelValue = mode === "distance" ? formatDistance(value) : formatArea(value);
    const labelIcon = L.divIcon({
      className: "measure-result-label",
      html: `<div style="
        background: white;
        border: 2px solid ${style.color};
        color: ${style.color};
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        white-space: nowrap;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      ">${labelValue}</div>`,
      iconSize: [80, 30],
      iconAnchor: [40, 15],
    });

    const labelMarker = L.marker(center, { icon: labelIcon });
    const layerGroup = L.layerGroup([layer, labelMarker]);
    measurementsLayerRef.current.addLayer(layerGroup);

    // Sauvegarder la mesure
    const measurement: Measurement = {
      id,
      mode,
      points: [...currentPoints],
      value,
      unit,
      layer: layerGroup,
    };

    setMeasurements((prev) => [...prev, measurement]);

    // Reset
    currentLayerRef.current?.clearLayers();
    setCurrentPoints([]);
    setCurrentValue("");
  }, [mode, currentPoints]);

  // Annuler la mesure en cours
  const cancelMeasurement = useCallback(() => {
    currentLayerRef.current?.clearLayers();
    setCurrentPoints([]);
    setCurrentValue("");
    setMode(null);
  }, []);

  // Supprimer une mesure
  const deleteMeasurement = useCallback((id: string) => {
    setMeasurements((prev) => {
      const measurement = prev.find((m) => m.id === id);
      if (measurement && measurementsLayerRef.current) {
        measurementsLayerRef.current.removeLayer(measurement.layer);
      }
      return prev.filter((m) => m.id !== id);
    });
  }, []);

  // Effacer toutes les mesures
  const clearAllMeasurements = useCallback(() => {
    measurementsLayerRef.current?.clearLayers();
    currentLayerRef.current?.clearLayers();
    setMeasurements([]);
    setCurrentPoints([]);
    setCurrentValue("");
    setMode(null);
  }, []);

  // Activer un mode
  const activateMode = useCallback((newMode: MeasureMode) => {
    if (mode === newMode) {
      setMode(null);
      currentLayerRef.current?.clearLayers();
      setCurrentPoints([]);
      setCurrentValue("");
    } else {
      setMode(newMode);
      currentLayerRef.current?.clearLayers();
      setCurrentPoints([]);
      setCurrentValue("");
    }
  }, [mode]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all border border-slate-200"
        title="Outils de mesure"
      >
        <Ruler className="h-5 w-5 text-slate-600" />
      </button>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden w-64">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">Mesures</span>
        </div>
        <button
          onClick={() => {
            setIsOpen(false);
            cancelMeasurement();
          }}
          className="p-1 hover:bg-slate-200 rounded transition-colors"
        >
          <X className="h-4 w-4 text-slate-500" />
        </button>
      </div>

      {/* Tools */}
      <div className="p-3 space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => activateMode("distance")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
              mode === "distance"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-200 hover:border-slate-300 text-slate-600"
            }`}
          >
            <Ruler className="h-4 w-4" />
            <span className="text-sm">Distance</span>
          </button>
          <button
            onClick={() => activateMode("area")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
              mode === "area"
                ? "border-purple-500 bg-purple-50 text-purple-700"
                : "border-slate-200 hover:border-slate-300 text-slate-600"
            }`}
          >
            <Square className="h-4 w-4" />
            <span className="text-sm">Surface</span>
          </button>
        </div>

        {/* Current measurement */}
        {mode && (
          <div className={`p-3 rounded-lg ${mode === "distance" ? "bg-blue-50" : "bg-purple-50"}`}>
            <p className="text-xs text-slate-500 mb-1">
              {mode === "distance" ? "Distance" : "Surface"} en cours
            </p>
            <p className={`text-lg font-bold ${mode === "distance" ? "text-blue-700" : "text-purple-700"}`}>
              {currentValue || "—"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {currentPoints.length} point(s) • Double-clic ou Entrée pour terminer
            </p>
          </div>
        )}

        {/* Measurements list */}
        {measurements.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase">
                Mesures ({measurements.length})
              </span>
              <button
                onClick={clearAllMeasurements}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Tout effacer
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {measurements.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    {m.mode === "distance" ? (
                      <Ruler className="h-3 w-3 text-blue-500" />
                    ) : (
                      <Square className="h-3 w-3 text-purple-500" />
                    )}
                    <span className={m.mode === "distance" ? "text-blue-700" : "text-purple-700"}>
                      {m.mode === "distance" ? formatDistance(m.value) : formatArea(m.value)}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteMeasurement(m.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!mode && measurements.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-2">
            Sélectionnez un outil pour commencer à mesurer
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================

function calculateDistance(points: L.LatLng[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += points[i].distanceTo(points[i + 1]);
  }
  return total;
}

function calculateArea(points: L.LatLng[]): number {
  if (points.length < 3) return 0;

  // Formule de Shoelace pour calculer l'aire
  const R = 6371000; // Rayon de la Terre en mètres
  let area = 0;

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const xi = points[i].lng * Math.PI / 180;
    const yi = points[i].lat * Math.PI / 180;
    const xj = points[j].lng * Math.PI / 180;
    const yj = points[j].lat * Math.PI / 180;

    area += (xj - xi) * (2 + Math.sin(yi) + Math.sin(yj));
  }

  area = Math.abs(area * R * R / 2);
  return area;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${meters.toFixed(1)} m`;
}

function formatArea(sqMeters: number): string {
  if (sqMeters >= 10000) {
    return `${(sqMeters / 10000).toFixed(2)} ha`;
  }
  return `${sqMeters.toFixed(1)} m²`;
}