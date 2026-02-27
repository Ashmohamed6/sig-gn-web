// app/(protected)/cartographie/hooks/useGeoJSON.ts

/**
 * Hook pour charger et cacher les données GeoJSON depuis l'API
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getCurrentProject } from "@/utils/authClient";

interface GeoJSONData {
  type: "FeatureCollection";
  features: any[];
}

interface UseGeoJSONResult {
  data: GeoJSONData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Cache global pour éviter de recharger les mêmes données
const geoJSONCache = new Map<string, GeoJSONData>();

/**
 * Hook pour charger des données GeoJSON depuis un endpoint
 */
export function useGeoJSON(
  endpoint: string,
  enabled: boolean = true
): UseGeoJSONResult {
  const [data, setData] = useState<GeoJSONData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !endpoint) return;

    // Vérifier le cache
    const cacheKey = getCacheKey(endpoint);
    if (geoJSONCache.has(cacheKey)) {
      setData(geoJSONCache.get(cacheKey)!);
      return;
    }

    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const project = getCurrentProject();
      const baseUrl = "/api/proxy";

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // IMPORTANT :
      // - couches de référence (limites admin, infrastructures, etc.) => pas besoin de X-Project-Code
      // - couches projet (données collectées) => X-Project-Code obligatoire
      const isRefLayer =
        endpoint.includes("admin-region") ||
        endpoint.includes("admin-prefecture") ||
        endpoint.includes("admin-commune") ||
        endpoint.includes("aire-protegee") ||
        endpoint.includes("zone-humide") ||
        endpoint.includes("zone-sableuse") ||
        endpoint.includes("hydrographie") ||
        endpoint.includes("occupation-sol") ||
        endpoint.includes("reseau-routier") ||
        endpoint.includes("equipement") ||
        endpoint.includes("localite") ||
        endpoint.includes("agglomeration") ||
        endpoint.includes("habitation-dispersee");

      if (!isRefLayer && project?.code_fonc) {
        headers["X-Project-Code"] = project.code_fonc;
      }

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "GET",
        headers,
        credentials: "include",
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const geojson = await response.json();

      // Valider la structure GeoJSON
      if (!isValidGeoJSON(geojson)) {
        throw new Error("Format GeoJSON invalide");
      }

      // Mettre en cache
      geoJSONCache.set(cacheKey, geojson);

      setData(geojson);
    } catch (err: any) {
      if (err.name === "AbortError") {
        // Requête annulée, ignorer
        return;
      }
      setError(err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [endpoint, enabled]);

  useEffect(() => {
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const refetch = useCallback(() => {
    // Vider le cache pour cet endpoint
    const cacheKey = getCacheKey(endpoint);
    geoJSONCache.delete(cacheKey);
    fetchData();
  }, [endpoint, fetchData]);

  return { data, loading, error, refetch };
}

/**
 * Hook pour charger plusieurs couches GeoJSON en parallèle
 */
export function useMultipleGeoJSON(
  endpoints: { id: string; endpoint: string; enabled: boolean }[]
): Record<string, UseGeoJSONResult> {
  const [results, setResults] = useState<Record<string, UseGeoJSONResult>>({});

  useEffect(() => {
    const loadAll = async () => {
      const newResults: Record<string, UseGeoJSONResult> = {};

      await Promise.all(
        endpoints.map(async ({ id, endpoint, enabled }) => {
          if (!enabled) {
            newResults[id] = {
              data: null,
              loading: false,
              error: null,
              refetch: () => {},
            };
            return;
          }

          // Vérifier le cache
          const cacheKey = getCacheKey(endpoint);
          if (geoJSONCache.has(cacheKey)) {
            newResults[id] = {
              data: geoJSONCache.get(cacheKey)!,
              loading: false,
              error: null,
              refetch: () => {},
            };
            return;
          }

          try {
            const project = getCurrentProject();
            const baseUrl = "/api/proxy";

            const headers: HeadersInit = {
              "Content-Type": "application/json",
            };

            if (project?.code_fonc) {
              headers["X-Project-Code"] = project.code_fonc;
            }

            const response = await fetch(`${baseUrl}${endpoint}`, {
              method: "GET",
              headers,
              credentials: "include",
            });

            if (!response.ok) {
              throw new Error(`Erreur ${response.status}`);
            }

            const geojson = await response.json();

            if (isValidGeoJSON(geojson)) {
              geoJSONCache.set(cacheKey, geojson);
              newResults[id] = {
                data: geojson,
                loading: false,
                error: null,
                refetch: () => {},
              };
            } else {
              throw new Error("Format invalide");
            }
          } catch (err: any) {
            newResults[id] = {
              data: null,
              loading: false,
              error: err.message,
              refetch: () => {},
            };
          }
        })
      );

      setResults(newResults);
    };

    loadAll();
  }, [JSON.stringify(endpoints)]);

  return results;
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Génère une clé de cache unique
 */
function getCacheKey(endpoint: string): string {
  const project = getCurrentProject();
  return `${project?.code_fonc || "default"}_${endpoint}`;
}

/**
 * Valide qu'un objet est un GeoJSON valide
 */
function isValidGeoJSON(obj: any): obj is GeoJSONData {
  return (
    obj &&
    typeof obj === "object" &&
    obj.type === "FeatureCollection" &&
    Array.isArray(obj.features)
  );
}

/**
 * Vide le cache GeoJSON (utile lors du changement de projet)
 */
export function clearGeoJSONCache(): void {
  geoJSONCache.clear();
}

/**
 * Vide le cache pour un endpoint spécifique
 */
export function invalidateGeoJSONCache(endpoint: string): void {
  const cacheKey = getCacheKey(endpoint);
  geoJSONCache.delete(cacheKey);
}

/**
 * Précharge plusieurs couches GeoJSON
 */
export async function preloadGeoJSONLayers(endpoints: string[]): Promise<void> {
  const project = getCurrentProject();
  const baseUrl = "/api/proxy";

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (project?.code_fonc) {
    headers["X-Project-Code"] = project.code_fonc;
  }

  await Promise.all(
    endpoints.map(async (endpoint) => {
      const cacheKey = getCacheKey(endpoint);
      if (geoJSONCache.has(cacheKey)) return;

      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: "GET",
          headers,
          credentials: "include",
        });

        if (response.ok) {
          const geojson = await response.json();
          if (isValidGeoJSON(geojson)) {
            geoJSONCache.set(cacheKey, geojson);
          }
        }
      } catch {
        // Ignorer les erreurs de préchargement
      }
    })
  );
}
