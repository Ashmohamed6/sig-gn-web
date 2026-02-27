"use client";

import { useCallback, useEffect, useState } from "react";
import type { DatasetColumnsResponse } from "../types/importTypes";
import { useImportApi } from "./useImportApi";

interface UseDatasetColumnsReturn {
  columns: DatasetColumnsResponse | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useDatasetColumns(datasetCode: string | null): UseDatasetColumnsReturn {
  const { fetchDatasetColumns } = useImportApi();
  const [columns, setColumns] = useState<DatasetColumnsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!datasetCode) {
      setColumns(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDatasetColumns(datasetCode);
      setColumns(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur chargement colonnes.");
      setColumns(null);
    } finally {
      setLoading(false);
    }
  }, [datasetCode, fetchDatasetColumns]);

  useEffect(() => {
    void load();
  }, [load]);

  return { columns, loading, error, reload: load };
}
