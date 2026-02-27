"use client";

import { useEffect, useMemo } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import L, { LatLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";

type JsonRecord = Record<string, unknown>;

interface SubmissionGeometryMapProps {
  records: JsonRecord[];
  focusedRecordIndex?: number | null;
}

type GeoGeometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "LineString"; coordinates: [number, number][] }
  | { type: "Polygon"; coordinates: [number, number][][] }
  | { type: "MultiPoint"; coordinates: [number, number][] }
  | { type: "MultiLineString"; coordinates: [number, number][][] }
  | { type: "MultiPolygon"; coordinates: [number, number][][][] };

interface GeoFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: GeoGeometry;
}

interface FeatureCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toNumber(value: unknown): number | null {
  if (isFiniteNumber(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toLngLatPair(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const first = toNumber(value[0]);
  const second = toNumber(value[1]);
  if (first === null || second === null) return null;

  // Kobo _geolocation est souvent [lat, lon, alt, acc].
  const isLatLon = Math.abs(first) <= 90 && Math.abs(second) <= 180;
  if (isLatLon) return [second, first];

  // Fallback [lon, lat].
  if (Math.abs(first) <= 180 && Math.abs(second) <= 90) return [first, second];
  return null;
}

function toLngLatFromGpsPointText(value: unknown): [number, number] | null {
  if (typeof value !== "string") return null;
  const tokens = value.trim().replace(/[;,]/g, " ").split(/\s+/).slice(0, 2);
  if (tokens.length < 2) return null;
  return toLngLatPair(tokens);
}

function parseLooseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text || (!text.startsWith("{") && !text.startsWith("["))) return value;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function normalizePair(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const x = toNumber(value[0]);
  const y = toNumber(value[1]);
  if (x === null || y === null) return null;
  return [x, y];
}

function normalizePairList(value: unknown): [number, number][] | null {
  if (!Array.isArray(value)) return null;
  const rows: [number, number][] = [];
  for (const item of value) {
    const pair = normalizePair(item);
    if (!pair) return null;
    rows.push(pair);
  }
  return rows;
}

function normalizePolygonRings(value: unknown): [number, number][][] | null {
  if (!Array.isArray(value)) return null;
  const rings: [number, number][][] = [];
  for (const ring of value) {
    const parsedRing = normalizePairList(ring);
    if (!parsedRing) return null;
    rings.push(parsedRing);
  }
  return rings;
}

function normalizeMultiPolygonRings(value: unknown): [number, number][][][] | null {
  if (!Array.isArray(value)) return null;
  const polygons: [number, number][][][] = [];
  for (const polygon of value) {
    const parsedPolygon = normalizePolygonRings(polygon);
    if (!parsedPolygon) return null;
    polygons.push(parsedPolygon);
  }
  return polygons;
}

function trimOuterParens(value: string): string | null {
  const text = value.trim();
  if (!text.startsWith("(") || !text.endsWith(")")) return null;
  return text.slice(1, -1).trim();
}

function splitTopLevelByComma(value: string): string[] {
  const text = value.trim();
  if (!text) return [];
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts.filter(Boolean);
}

function parseWktPair(value: string): [number, number] | null {
  const cleaned = value.trim().replace(/[()]/g, " ");
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  const x = Number(parts[0]);
  const y = Number(parts[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [x, y];
}

function parseWktPairList(value: string): [number, number][] | null {
  const parts = splitTopLevelByComma(value);
  if (parts.length === 0) return null;
  const coords: [number, number][] = [];
  for (const part of parts) {
    const pair = parseWktPair(part);
    if (!pair) return null;
    coords.push(pair);
  }
  return coords;
}

function parseWktGeometry(value: string): GeoGeometry | null {
  const normalized = value.trim().replace(/^SRID=\d+;/i, "");
  if (!normalized) return null;
  const matched = normalized.match(/^([A-Za-z]+)\s*(.*)$/);
  if (!matched) return null;

  const geometryType = matched[1].toUpperCase();
  const bodyRaw = matched[2]?.trim() || "";
  if (!bodyRaw || /^EMPTY$/i.test(bodyRaw)) return null;

  if (geometryType === "POINT") {
    const pointBody = trimOuterParens(bodyRaw) || bodyRaw;
    const point = parseWktPair(pointBody);
    return point ? { type: "Point", coordinates: point } : null;
  }

  if (geometryType === "LINESTRING") {
    const lineBody = trimOuterParens(bodyRaw);
    if (!lineBody) return null;
    const line = parseWktPairList(lineBody);
    return line ? { type: "LineString", coordinates: line } : null;
  }

  if (geometryType === "POLYGON") {
    const polygonBody = trimOuterParens(bodyRaw);
    if (!polygonBody) return null;
    const ringTexts = splitTopLevelByComma(polygonBody);
    const rings: [number, number][][] = [];
    for (const ringText of ringTexts) {
      const ringBody = trimOuterParens(ringText);
      if (!ringBody) return null;
      const ring = parseWktPairList(ringBody);
      if (!ring) return null;
      rings.push(ring);
    }
    return rings.length > 0 ? { type: "Polygon", coordinates: rings } : null;
  }

  if (geometryType === "MULTIPOINT") {
    const multiBody = trimOuterParens(bodyRaw);
    if (!multiBody) return null;
    const pointTexts = splitTopLevelByComma(multiBody);
    const points: [number, number][] = [];
    for (const pointText of pointTexts) {
      const pointBody = trimOuterParens(pointText) || pointText;
      const point = parseWktPair(pointBody);
      if (!point) return null;
      points.push(point);
    }
    return points.length > 0 ? { type: "MultiPoint", coordinates: points } : null;
  }

  if (geometryType === "MULTILINESTRING") {
    const multiBody = trimOuterParens(bodyRaw);
    if (!multiBody) return null;
    const lineTexts = splitTopLevelByComma(multiBody);
    const lines: [number, number][][] = [];
    for (const lineText of lineTexts) {
      const lineBody = trimOuterParens(lineText);
      if (!lineBody) return null;
      const line = parseWktPairList(lineBody);
      if (!line) return null;
      lines.push(line);
    }
    return lines.length > 0 ? { type: "MultiLineString", coordinates: lines } : null;
  }

  if (geometryType === "MULTIPOLYGON") {
    const multiBody = trimOuterParens(bodyRaw);
    if (!multiBody) return null;
    const polygonTexts = splitTopLevelByComma(multiBody);
    const polygons: [number, number][][][] = [];
    for (const polygonText of polygonTexts) {
      const polygonBody = trimOuterParens(polygonText);
      if (!polygonBody) return null;
      const ringTexts = splitTopLevelByComma(polygonBody);
      const rings: [number, number][][] = [];
      for (const ringText of ringTexts) {
        const ringBody = trimOuterParens(ringText);
        if (!ringBody) return null;
        const ring = parseWktPairList(ringBody);
        if (!ring) return null;
        rings.push(ring);
      }
      polygons.push(rings);
    }
    return polygons.length > 0 ? { type: "MultiPolygon", coordinates: polygons } : null;
  }

  return null;
}

function normalizeGeoJSONGeometry(value: unknown): GeoGeometry | null {
  const parsedValue = parseLooseJson(value);
  if (!parsedValue || typeof parsedValue !== "object") return null;
  const obj = parsedValue as {
    type?: unknown;
    geometry?: unknown;
    geometries?: unknown;
    coordinates?: unknown;
    features?: unknown;
  };

  if (obj.type === "Feature") {
    return normalizeGeoJSONGeometry(obj.geometry);
  }

  if (obj.type === "FeatureCollection" && Array.isArray(obj.features)) {
    for (const feature of obj.features) {
      const geom = normalizeGeoJSONGeometry(feature);
      if (geom) return geom;
    }
    return null;
  }

  if (obj.type === "GeometryCollection" && Array.isArray(obj.geometries)) {
    for (const geometry of obj.geometries) {
      const geom = normalizeGeoJSONGeometry(geometry);
      if (geom) return geom;
    }
    return null;
  }

  if (typeof obj.type !== "string" || obj.coordinates === undefined) return null;
  const geoType = obj.type.toLowerCase();

  switch (geoType) {
    case "point": {
      const point = normalizePair(obj.coordinates);
      return point ? { type: "Point", coordinates: point } : null;
    }
    case "linestring": {
      const line = normalizePairList(obj.coordinates);
      return line ? { type: "LineString", coordinates: line } : null;
    }
    case "polygon": {
      const polygon = normalizePolygonRings(obj.coordinates);
      return polygon ? { type: "Polygon", coordinates: polygon } : null;
    }
    case "multipoint": {
      const points = normalizePairList(obj.coordinates);
      return points ? { type: "MultiPoint", coordinates: points } : null;
    }
    case "multilinestring": {
      const lines = normalizePolygonRings(obj.coordinates);
      return lines ? { type: "MultiLineString", coordinates: lines } : null;
    }
    case "multipolygon": {
      const polygons = normalizeMultiPolygonRings(obj.coordinates);
      return polygons ? { type: "MultiPolygon", coordinates: polygons } : null;
    }
    default:
      return null;
  }
}

function geometryFromCandidate(value: unknown): GeoGeometry | null {
  const byGeoJson = normalizeGeoJSONGeometry(value);
  if (byGeoJson) return byGeoJson;
  if (typeof value === "string") return parseWktGeometry(value);
  return null;
}

function extractPointFromRecord(record: JsonRecord): [number, number] | null {
  const byGeo = toLngLatPair(record._geolocation);
  if (byGeo) return byGeo;

  const lat =
    toNumber(record.latitude) ??
    toNumber(record.lat) ??
    toNumber(record.y) ??
    toNumber(record.gps_latitude) ??
    toNumber(record._gps_point_latitude);
  const lon =
    toNumber(record.longitude) ??
    toNumber(record.lon) ??
    toNumber(record.lng) ??
    toNumber(record.x) ??
    toNumber(record.gps_longitude) ??
    toNumber(record._gps_point_longitude);

  if (lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    return [lon, lat];
  }

  for (const key of Object.keys(record)) {
    if (!key.toLowerCase().includes("gps_point")) continue;
    const parsed = toLngLatFromGpsPointText(record[key]);
    if (parsed) return parsed;
  }

  return null;
}

function firstGeometryFromRecord(record: JsonRecord): GeoGeometry | null {
  const candidates: unknown[] = [
    record.geometry,
    record.geom,
    record.geojson,
    record.wkt,
    record.geom_wkt,
    record.the_geom,
    record.geo_shape,
    record.shape,
    record.polygon,
    record.line,
  ];

  for (const candidate of candidates) {
    const geom = geometryFromCandidate(candidate);
    if (geom) return geom;
  }

  for (const [key, value] of Object.entries(record)) {
    const lowered = key.toLowerCase();
    if (
      !lowered.includes("geom")
      && !lowered.includes("geojson")
      && !lowered.includes("wkt")
      && !lowered.includes("polygon")
      && !lowered.includes("shape")
    ) {
      continue;
    }
    const geom = geometryFromCandidate(value);
    if (geom) return geom;
  }

  const point = extractPointFromRecord(record);
  if (point) {
    return {
      type: "Point",
      coordinates: point,
    };
  }

  return null;
}

function buildFeatures(records: JsonRecord[]): GeoFeature[] {
  return records
    .map((record, index) => {
      const geometry = firstGeometryFromRecord(record);
      if (!geometry) return null;
      const recordRef =
        String(record._id ?? record.id ?? record._uuid ?? record.uuid ?? `row-${index + 1}`);
      return {
        type: "Feature",
        geometry,
        properties: {
          record_ref: recordRef,
          __index: index + 1,
          __index0: index,
        },
      } as GeoFeature;
    })
    .filter((row): row is GeoFeature => row !== null);
}

function FitToFeatures({
  data,
  focusedRecordIndex,
}: {
  data: FeatureCollection;
  focusedRecordIndex?: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!data.features.length) return;

    if (typeof focusedRecordIndex === "number" && focusedRecordIndex >= 0) {
      const focusedFeature = data.features.find((feature) => {
        const raw = (feature.properties as { __index0?: unknown }).__index0;
        return Number(raw) === focusedRecordIndex;
      });
      if (focusedFeature) {
        const singleLayer = L.geoJSON(focusedFeature as unknown as GeoJSON.GeoJsonObject);
        const singleBounds: LatLngBounds = singleLayer.getBounds();
        if (singleBounds.isValid()) {
          map.fitBounds(singleBounds.pad(0.6), { animate: true, maxZoom: 16 });
          return;
        }
      }
    }

    const layer = L.geoJSON(data as unknown as GeoJSON.GeoJsonObject);
    const bounds: LatLngBounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.2), { animate: false });
    }
  }, [data, focusedRecordIndex, map]);

  return null;
}

export default function SubmissionGeometryMap({ records, focusedRecordIndex = null }: SubmissionGeometryMapProps) {
  const features = useMemo(() => buildFeatures(records), [records]);

  if (!features.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
        Aucune geometrie detectee dans les enregistrements.
      </div>
    );
  }

  const featureCollection: FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Geometries detectees: {features.length}</p>
      <div className="h-72 w-full overflow-hidden rounded-lg border border-slate-200">
        <MapContainer center={[9.5, -10.7]} zoom={7} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <GeoJSON
            data={featureCollection as unknown as GeoJSON.GeoJsonObject}
            pointToLayer={(feature, latlng) => {
              const raw = (feature?.properties as { __index0?: unknown } | undefined)?.__index0;
              const isFocused = Number(raw) === focusedRecordIndex;
              return L.circleMarker(latlng, {
                radius: isFocused ? 7 : 5,
                color: isFocused ? "#b45309" : "#0f766e",
                weight: isFocused ? 2 : 1.5,
                fillColor: isFocused ? "#f59e0b" : "#14b8a6",
                fillOpacity: 0.85,
              });
            }}
            style={(feature) => {
              const raw = (feature?.properties as { __index0?: unknown } | undefined)?.__index0;
              const isFocused = Number(raw) === focusedRecordIndex;
              return {
                color: isFocused ? "#b45309" : "#0f766e",
                weight: isFocused ? 3 : 2,
                fillColor: isFocused ? "#f59e0b" : "#14b8a6",
                fillOpacity: isFocused ? 0.3 : 0.2,
              };
            }}
          />
          <FitToFeatures data={featureCollection} focusedRecordIndex={focusedRecordIndex} />
        </MapContainer>
      </div>
    </div>
  );
}
