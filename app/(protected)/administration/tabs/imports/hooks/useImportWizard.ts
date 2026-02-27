"use client";

import { useCallback, useState } from "react";
import type { DuplicateStrategy, WizardStep } from "../types/importTypes";
import type {
  ImportExecutionResult,
  ImportPublishResult,
  ImportValidationReport,
} from "./useImportApi";
import { useImportApi } from "./useImportApi";

const MAX_PREVIEW_ROWS = 10;

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ";" && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

async function buildLocalPreview(file: File): Promise<Array<Record<string, string>>> {
  const text = await file.text();
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: Array<Record<string, string>> = [];

  for (const line of lines.slice(1, MAX_PREVIEW_ROWS + 1)) {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header || `col_${idx + 1}`] = values[idx] || "";
    });
    rows.push(row);
  }
  return rows;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export interface WizardState {
  step: WizardStep;
  datasetCode: string;
  regionId: string;
  file: File | null;
  previewRows: Array<Record<string, string>>;
  validationReport: ImportValidationReport | null;
  executionResult: ImportExecutionResult | null;
  publishResult: ImportPublishResult | null;
  localError: string | null;
  isValidating: boolean;
  isExecuting: boolean;
  isPublishing: boolean;
  onDuplicate: DuplicateStrategy;
}

export interface WizardActions {
  setDatasetCode: (code: string) => void;
  setRegionId: (id: string) => void;
  setFile: (file: File | null) => Promise<void>;
  setOnDuplicate: (strategy: DuplicateStrategy) => void;
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: WizardStep) => void;
  validate: () => Promise<void>;
  execute: (strategy?: DuplicateStrategy) => Promise<void>;
  publish: () => Promise<void>;
  reset: () => void;
  clearError: () => void;
}

export function useImportWizard(projectCode: string) {
  const { validateImport, executeImport, publishToCore } = useImportApi();

  const [step, setStep] = useState<WizardStep>(1);
  const [datasetCode, setDatasetCodeRaw] = useState("");
  const [regionId, setRegionId] = useState("");
  const [file, setFileRaw] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<Array<Record<string, string>>>([]);
  const [validationReport, setValidationReport] = useState<ImportValidationReport | null>(null);
  const [executionResult, setExecutionResult] = useState<ImportExecutionResult | null>(null);
  const [publishResult, setPublishResult] = useState<ImportPublishResult | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [onDuplicate, setOnDuplicate] = useState<DuplicateStrategy>("update");

  const setDatasetCode = useCallback((code: string) => {
    setDatasetCodeRaw(code);
    setValidationReport(null);
    setExecutionResult(null);
    setPublishResult(null);
    setLocalError(null);
  }, []);

  const setFile = useCallback(async (nextFile: File | null) => {
    setFileRaw(nextFile);
    setValidationReport(null);
    setExecutionResult(null);
    setPublishResult(null);
    setLocalError(null);

    if (!nextFile) {
      setPreviewRows([]);
      return;
    }
    try {
      const preview = await buildLocalPreview(nextFile);
      setPreviewRows(preview);
    } catch {
      setPreviewRows([]);
      setLocalError("Impossible de lire l'apercu du CSV local.");
    }
  }, []);

  const goNext = useCallback(() => {
    setStep((prev) => (prev < 4 ? ((prev + 1) as WizardStep) : prev));
  }, []);

  const goBack = useCallback(() => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as WizardStep) : prev));
  }, []);

  const goToStep = useCallback((target: WizardStep) => {
    setStep(target);
  }, []);

  const validate = useCallback(async () => {
    if (!file) {
      setLocalError("Selectionnez un fichier CSV.");
      return;
    }
    if (!datasetCode) {
      setLocalError("Selectionnez un dataset.");
      return;
    }

    setIsValidating(true);
    setLocalError(null);
    setExecutionResult(null);
    setPublishResult(null);

    try {
      const report = await validateImport({
        file,
        datasetCode,
        regionId: regionId || undefined,
        projectCode: projectCode || undefined,
      });
      setValidationReport(report);
      if (report.preview?.length) setPreviewRows(report.preview);
      setStep(3);
    } catch (error: unknown) {
      setValidationReport(null);
      setLocalError(getErrorMessage(error, "Validation impossible."));
    } finally {
      setIsValidating(false);
    }
  }, [file, datasetCode, regionId, projectCode, validateImport]);

  const execute = useCallback(async (strategy?: DuplicateStrategy) => {
    if (!file || !datasetCode) return;
    if (!validationReport?.valid) {
      setLocalError("Lancez d'abord une validation sans erreur bloquante.");
      return;
    }

    const effectiveStrategy = strategy || onDuplicate;
    setIsExecuting(true);
    setLocalError(null);
    setPublishResult(null);

    try {
      const result = await executeImport({
        file,
        datasetCode,
        regionId: regionId || undefined,
        projectCode: projectCode || undefined,
        onDuplicate: effectiveStrategy,
      });
      setExecutionResult(result);
      setValidationReport(result.validation);
      setStep(4);
    } catch (error: unknown) {
      setLocalError(getErrorMessage(error, "Echec pendant l'import."));
    } finally {
      setIsExecuting(false);
    }
  }, [file, datasetCode, validationReport, executeImport, regionId, projectCode, onDuplicate]);

  const publish = useCallback(async () => {
    if (!datasetCode) return;
    setIsPublishing(true);
    setLocalError(null);

    try {
      const result = await publishToCore({
        datasetCode,
        regionId: regionId || undefined,
        projectCode: projectCode || undefined,
      });
      setPublishResult(result);
    } catch (error: unknown) {
      setPublishResult(null);
      setLocalError(getErrorMessage(error, "Echec pendant l'ETL stage vers core."));
    } finally {
      setIsPublishing(false);
    }
  }, [publishToCore, projectCode, regionId, datasetCode]);

  const reset = useCallback(() => {
    setStep(1);
    setDatasetCodeRaw("");
    setRegionId("");
    setFileRaw(null);
    setPreviewRows([]);
    setValidationReport(null);
    setExecutionResult(null);
    setPublishResult(null);
    setLocalError(null);
    setOnDuplicate("update");
  }, []);

  const clearError = useCallback(() => setLocalError(null), []);

  const state: WizardState = {
    step,
    datasetCode,
    regionId,
    file,
    previewRows,
    validationReport,
    executionResult,
    publishResult,
    localError,
    isValidating,
    isExecuting,
    isPublishing,
    onDuplicate,
  };

  const actions: WizardActions = {
    setDatasetCode,
    setRegionId,
    setFile,
    setOnDuplicate,
    goNext,
    goBack,
    goToStep,
    validate,
    execute,
    publish,
    reset,
    clearError,
  };

  return { state, actions };
}
