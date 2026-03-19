"use client";

import { useCallback } from "react";
import { useAdminApi } from "../../../hooks/useAdminApi";
import type { ColumnMappingEntry, DatasetColumnsResponse } from "../types/importTypes";

export interface ImportValidationReport {
  valid: boolean;
  dataset: {
    code: string;
    label: string;
    stage_table: string;
    project_code: string;
    region_id?: string | null;
  };
  stats: {
    rows_total: number;
    columns_total: number;
    columns_recognized: number;
    columns_unknown: number;
    duplicate_identifier_count: number;
    potential_existing_count: number;
    invalid_geom_rows: number;
    new_count: number;
    existing_count: number;
    duplicate_count: number;
    missing_identifier_count?: number;
    auto_generated_identifier_count?: number;
  };
  columns: {
    expected: string[];
    recognized: string[];
    unknown: string[];
  };
  column_mapping?: ColumnMappingEntry[];
  identifier_field?: string | null;
  new_rows?: Array<Record<string, string>>;
  existing_rows?: Array<Record<string, string>>;
  duplicate_rows?: Array<Record<string, string>>;
  warnings: string[];
  errors: string[];
  preview: Array<Record<string, string>>;
}

export interface ImportExecutionResult {
  detail: string;
  import_uuid: string;
  status: "success" | "partial_success" | "failed" | "failed_validation" | "failed_runtime";
  validation: ImportValidationReport;
  result?: {
    stage_table: string;
    rows_total: number;
    rows_ok: number;
    rows_skipped?: number;
    rows_error: number;
    errors: Array<{ row_number: number; message: string }>;
  };
}

export interface ImportPublishResult {
  detail: string;
  run_id: string;
  dataset_code: string;
  project_code: string;
  region_id: string | null;
  stage_count: number;
  core_tables: Array<{
    table: string;
    affected_rows: number;
  }>;
}

export interface ImportLogEntry {
  import_uuid: string;
  project_id: string | null;
  project_code: string | null;
  project_label: string | null;
  dataset_code: string;
  rows_total: number | null;
  rows_ok: number | null;
  rows_error: number | null;
  status: string | null;
  started_at: string;
  ended_at: string | null;
  region_id: string | null;
  actor_username: string | null;
  message: string | null;
}

export interface PaginatedImportLogs {
  count: number;
  next: string | null;
  previous: string | null;
  results: ImportLogEntry[];
}

export interface ImportDatasetEntry {
  dataset_code: string;
  label: string;
  stage_table: string;
}

export interface ImportDatasetsResponse {
  project_code: string;
  count: number;
  datasets: ImportDatasetEntry[];
}

export interface RefreshViewsResult {
  detail: string;
  run_id: string;
  status: "success" | "partial_success" | "failed";
  refreshed_count: number;
  failed_count: number;
  refreshed: string[];
  failed: Array<{ view: string; error: string }>;
}

interface ValidateOrExecuteInput {
  file: File;
  datasetCode: string;
  regionId?: string | null;
  projectCode?: string | null;
  onDuplicate?: string;
}

interface PublishInput {
  datasetCode: string;
  regionId?: string | null;
  projectCode?: string | null;
}

export function useImportApi() {
  const { apiFetch } = useAdminApi();

  const validateImport = useCallback(
    async (input: ValidateOrExecuteInput): Promise<ImportValidationReport> => {
      const body = new FormData();
      body.append("file", input.file);
      body.append("dataset_code", input.datasetCode);
      if (input.regionId) body.append("region_id", input.regionId);
      if (input.projectCode) body.append("project_code", input.projectCode);

      return apiFetch<ImportValidationReport>("/import/validate/", {
        method: "POST",
        body,
      });
    },
    [apiFetch]
  );

  const executeImport = useCallback(
    async (input: ValidateOrExecuteInput): Promise<ImportExecutionResult> => {
      const body = new FormData();
      body.append("file", input.file);
      body.append("dataset_code", input.datasetCode);
      if (input.regionId) body.append("region_id", input.regionId);
      if (input.projectCode) body.append("project_code", input.projectCode);
      if (input.onDuplicate) body.append("on_duplicate", input.onDuplicate);

      return apiFetch<ImportExecutionResult>("/import/execute/", {
        method: "POST",
        body,
      });
    },
    [apiFetch]
  );

  const publishToCore = useCallback(
    async (input: PublishInput): Promise<ImportPublishResult> => {
      return apiFetch<ImportPublishResult>("/import/publish/", {
        method: "POST",
        body: JSON.stringify({
          dataset_code: input.datasetCode,
          region_id: input.regionId || undefined,
          project_code: input.projectCode || undefined,
        }),
      });
    },
    [apiFetch]
  );

  const fetchImportLogs = useCallback(
    async (params: {
      page?: number;
      pageSize?: number;
      datasetCode?: string;
      status?: string;
      regionId?: string;
      dateFrom?: string;
      dateTo?: string;
    }): Promise<PaginatedImportLogs> => {
      const query = new URLSearchParams();
      query.set("page", String(params.page || 1));
      query.set("page_size", String(params.pageSize || 10));
      if (params.datasetCode) query.set("dataset_code", params.datasetCode);
      if (params.status) query.set("status", params.status);
      if (params.regionId) query.set("region_id", params.regionId);
      if (params.dateFrom) query.set("date_from", params.dateFrom);
      if (params.dateTo) query.set("date_to", params.dateTo);

      return apiFetch<PaginatedImportLogs>(`/import/log/?${query.toString()}`, {
        method: "GET",
      });
    },
    [apiFetch]
  );

  const fetchDatasetColumns = useCallback(
    async (datasetCode: string): Promise<DatasetColumnsResponse> => {
      return apiFetch<DatasetColumnsResponse>(`/import/columns/${datasetCode}/`, {
        method: "GET",
      });
    },
    [apiFetch]
  );

  const fetchDatasets = useCallback(async (): Promise<ImportDatasetsResponse> => {
    return apiFetch<ImportDatasetsResponse>("/import/datasets/", {
      method: "GET",
    });
  }, [apiFetch]);

  const refreshViews = useCallback(async (): Promise<RefreshViewsResult> => {
    return apiFetch<RefreshViewsResult>("/import/refresh-views/", {
      method: "POST",
      body: JSON.stringify({}),
    });
  }, [apiFetch]);

  return {
    validateImport,
    executeImport,
    publishToCore,
    fetchImportLogs,
    fetchDatasetColumns,
    fetchDatasets,
    refreshViews,
  };
}
