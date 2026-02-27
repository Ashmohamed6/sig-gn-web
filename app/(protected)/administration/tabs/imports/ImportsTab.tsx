"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { getCurrentProject } from "@/utils/authClient";
import type { UserRole } from "../../config/adminConfig";
import {
  type DatasetDefinition,
  getDatasetDefinitionByCode,
  getDatasetsForProject,
  normalizeProjectCode,
} from "./config/datasetDefinitions";
import { useImportWizard } from "./hooks/useImportWizard";
import { useImportApi } from "./hooks/useImportApi";
import { useDatasetColumns } from "./hooks/useDatasetColumns";
import type { ImportLogEntry } from "./hooks/useImportApi";
import StepIndicator from "./components/StepIndicator";
import StepDatasetSelect from "./components/StepDatasetSelect";
import StepUploadCsv from "./components/StepUploadCsv";
import StepValidatePreview from "./components/StepValidatePreview";
import StepImportExecute from "./components/StepImportExecute";
import ImportHistory from "./components/ImportHistory";

interface ImportsTabProps {
  userRole: UserRole;
}

function asErrorMessage(errorValue: unknown): string {
  if (errorValue instanceof Error && errorValue.message.trim()) {
    return errorValue.message;
  }
  return "Erreur inconnue";
}

export default function ImportsTab({ userRole }: ImportsTabProps) {
  const currentProject = useMemo(() => getCurrentProject(), []);
  const projectCode = currentProject?.code_fonc || "";

  const fallbackDatasets = useMemo(() => getDatasetsForProject(projectCode), [projectCode]);

  const { state, actions } = useImportWizard(projectCode);
  const { fetchImportLogs, fetchDatasets } = useImportApi();

  const [apiDatasets, setApiDatasets] = useState<DatasetDefinition[]>([]);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [datasetsError, setDatasetsError] = useState<string | null>(null);

  const { columns: datasetColumns, loading: columnsLoading } = useDatasetColumns(
    state.datasetCode || null
  );

  const loadDatasets = useCallback(async () => {
    if (!projectCode) {
      setApiDatasets([]);
      setDatasetsError(null);
      return;
    }

    setDatasetsLoading(true);
    setDatasetsError(null);

    try {
      const response = await fetchDatasets();
      const normalizedProject = normalizeProjectCode(projectCode);

      const mapped = (Array.isArray(response?.datasets) ? response.datasets : [])
        .map((item) => {
          const code = String(item?.dataset_code || "").trim();
          const stageTable = String(item?.stage_table || "").trim();
          const staticDef = getDatasetDefinitionByCode(code);

          if (!code) return null;

          return {
            datasetCode: code,
            label: String(item?.label || staticDef?.label || code).trim(),
            description:
              staticDef?.description ||
              (stageTable ? `Table stage: ${stageTable}` : "Dataset import CSV"),
            projects: normalizedProject
              ? [normalizedProject]
              : staticDef?.projects || [],
            stageTable: stageTable || undefined,
          } as DatasetDefinition;
        })
        .filter((row): row is DatasetDefinition => Boolean(row));

      const uniqueByCode = new Map<string, DatasetDefinition>();
      for (const ds of mapped) {
        uniqueByCode.set(ds.datasetCode.toLowerCase(), ds);
      }

      const sorted = Array.from(uniqueByCode.values()).sort((a, b) =>
        a.label.localeCompare(b.label, "fr")
      );

      setApiDatasets(sorted);
    } catch (errorValue: unknown) {
      setApiDatasets([]);
      setDatasetsError(asErrorMessage(errorValue));
    } finally {
      setDatasetsLoading(false);
    }
  }, [fetchDatasets, projectCode]);

  useEffect(() => {
    void loadDatasets();
  }, [loadDatasets]);

  const datasets = useMemo(
    () => (apiDatasets.length > 0 ? apiDatasets : fallbackDatasets),
    [apiDatasets, fallbackDatasets]
  );

  // History state
  const [historyStatusFilter, setHistoryStatusFilter] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(10);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyRows, setHistoryRows] = useState<ImportLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await fetchImportLogs({
        page: historyPage,
        pageSize: historyPageSize,
        status: historyStatusFilter || undefined,
        datasetCode: state.datasetCode || undefined,
        regionId: state.regionId || undefined,
      });
      setHistoryRows(response.results);
      setHistoryTotal(response.count);
    } catch {
      // Silent fail for history widget.
    } finally {
      setHistoryLoading(false);
    }
  }, [fetchImportLogs, historyPage, historyPageSize, historyStatusFilter, state.datasetCode, state.regionId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (state.executionResult) {
      void loadHistory();
    }
  }, [state.executionResult, loadHistory]);

  useEffect(() => {
    if (datasets.length === 0) return;

    const alreadySelected = datasets.some((ds) => ds.datasetCode === state.datasetCode);
    if (!alreadySelected) {
      actions.setDatasetCode(datasets[0].datasetCode);
    }
  }, [datasets, state.datasetCode, actions]);

  const roleLabel = String(userRole || "").trim();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Import CSV vers stage</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Projet: <span className="font-semibold">{projectCode || "-"}</span> | Role: {" "}
              <span className="font-mono font-semibold">{roleLabel || "-"}</span>
            </p>
          </div>
          <StepIndicator
            currentStep={state.step}
            onStepClick={(step) => {
              if (step < state.step) actions.goToStep(step);
            }}
          />
        </div>

        {datasetsError && fallbackDatasets.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Chargement dynamique des datasets indisponible</p>
              <p className="text-xs mt-0.5">
                API `/import/datasets/` en erreur: {datasetsError}. Le fallback local est utilise.
              </p>
            </div>
          </div>
        )}

        {datasetsLoading && datasets.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Chargement des datasets...
          </div>
        ) : datasets.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Aucun dataset d&apos;import configure pour le projet selectionne.
          </div>
        ) : (
          <div className="min-h-[200px]">
            {state.localError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{state.localError}</span>
                <button
                  type="button"
                  onClick={actions.clearError}
                  className="ml-auto text-red-500 hover:text-red-700 text-xs underline"
                >
                  Fermer
                </button>
              </div>
            )}

            {state.step === 1 && (
              <StepDatasetSelect
                datasets={datasets}
                selectedCode={state.datasetCode}
                regionId={state.regionId}
                onSelectDataset={actions.setDatasetCode}
                onRegionChange={actions.setRegionId}
                onNext={actions.goNext}
              />
            )}

            {state.step === 2 && (
              <StepUploadCsv
                file={state.file}
                previewRows={state.previewRows}
                datasetColumns={datasetColumns}
                columnsLoading={columnsLoading}
                isValidating={state.isValidating}
                onFileChange={actions.setFile}
                onValidate={actions.validate}
                onBack={actions.goBack}
              />
            )}

            {state.step === 3 && (
              <StepValidatePreview
                report={state.validationReport}
                previewRows={state.previewRows}
                isExecuting={state.isExecuting}
                onExecute={actions.execute}
                onBack={actions.goBack}
              />
            )}

            {state.step === 4 && (
              <StepImportExecute
                executionResult={state.executionResult}
                publishResult={state.publishResult}
                isPublishing={state.isPublishing}
                onPublish={actions.publish}
                onReset={actions.reset}
              />
            )}
          </div>
        )}
      </div>

      <ImportHistory
        logs={historyRows}
        loading={historyLoading}
        page={historyPage}
        pageSize={historyPageSize}
        total={historyTotal}
        statusFilter={historyStatusFilter}
        onStatusFilterChange={(value) => {
          setHistoryStatusFilter(value);
          setHistoryPage(1);
        }}
        onPageChange={setHistoryPage}
        onRefresh={() => void loadHistory()}
      />
    </div>
  );
}
