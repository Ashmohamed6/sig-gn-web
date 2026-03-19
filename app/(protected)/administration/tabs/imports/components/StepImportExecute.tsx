"use client";

import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import type { ImportExecutionResult, ImportPublishResult } from "../hooks/useImportApi";

interface StepImportExecuteProps {
  executionResult: ImportExecutionResult | null;
  publishResult: ImportPublishResult | null;
  isPublishing: boolean;
  onPublish: () => Promise<void>;
  onReset: () => void;
}

export default function StepImportExecute({
  executionResult,
  publishResult,
  isPublishing,
  onPublish,
  onReset,
}: StepImportExecuteProps) {
  if (!executionResult) {
    return (
      <div className="text-center py-8 text-sm text-slate-500">
        Aucun resultat d&apos;import disponible.
      </div>
    );
  }

  const isSuccess = executionResult.status === "success";
  const isPartial = executionResult.status === "partial_success";
  const rowsOk = executionResult.result?.rows_ok ?? 0;
  const rowsSkipped = executionResult.result?.rows_skipped ?? 0;
  const rowsError = executionResult.result?.rows_error ?? 0;
  const rowsTotal = executionResult.result?.rows_total ?? 0;

  return (
    <div className="space-y-4">
      {/* Import result header */}
      <div className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50"
          : isPartial
            ? "border-amber-200 bg-amber-50"
            : "border-red-200 bg-red-50"
      }`}>
        {isSuccess ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
        ) : (
          <AlertCircle className={`h-5 w-5 mt-0.5 shrink-0 ${isPartial ? "text-amber-600" : "text-red-600"}`} />
        )}
        <div>
          <p className={`text-sm font-semibold ${
            isSuccess ? "text-emerald-800" : isPartial ? "text-amber-800" : "text-red-800"
          }`}>
            {executionResult.detail}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            UUID: <span className="font-mono">{executionResult.import_uuid}</span>
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-lg border border-slate-200 p-3 text-center">
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-lg font-bold text-slate-800">{rowsTotal.toLocaleString("fr-FR")}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-center">
          <p className="text-xs text-emerald-700">Importees</p>
          <p className="text-lg font-bold text-emerald-700">{rowsOk.toLocaleString("fr-FR")}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-center">
          <p className="text-xs text-amber-700">Ignorees</p>
          <p className="text-lg font-bold text-amber-700">{rowsSkipped.toLocaleString("fr-FR")}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 text-center">
          <p className="text-xs text-red-700">Erreurs</p>
          <p className="text-lg font-bold text-red-700">{rowsError.toLocaleString("fr-FR")}</p>
        </div>
      </div>

      {/* Row errors */}
      {executionResult.result?.errors && executionResult.result.errors.length > 0 && (
        <details className="rounded-lg border border-red-200 bg-white overflow-hidden">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-red-700 bg-red-50 border-b border-red-200 select-none">
            Erreurs par ligne ({executionResult.result.errors.length})
          </summary>
          <div className="p-3 max-h-48 overflow-auto space-y-1">
            {executionResult.result.errors.map((err) => (
              <p key={err.row_number} className="text-xs text-red-700">
                <span className="font-mono font-semibold">Ligne {err.row_number}</span>: {err.message}
              </p>
            ))}
          </div>
        </details>
      )}

      {/* Publish to core */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 space-y-3">
        <div>
          <p className="text-sm font-semibold text-indigo-950">ETL stage vers core</p>
          <p className="text-xs text-indigo-800 mt-0.5">
            Lance la publication vers <span className="font-mono">core.*</span> (alimente dashboard + cartographie).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onPublish()}
          disabled={isPublishing || rowsOk === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPublishing && <Loader2 className="h-4 w-4 animate-spin" />}
          Publier vers core
        </button>

        {publishResult?.run_id && (
          <div className="rounded-lg border border-indigo-200 bg-white p-3 mt-2">
            <p className="text-sm font-medium text-indigo-900">{publishResult.detail}</p>
            <p className="text-xs text-indigo-700 mt-1">
              Run: <span className="font-mono">{publishResult.run_id}</span> | stage:{" "}
              <span className="font-mono">{publishResult.stage_count}</span>
            </p>
            <ul className="mt-2 list-disc list-inside text-xs text-indigo-800">
              {publishResult.core_tables.map((table) => (
                <li key={table.table}>
                  {table.table}: <span className="font-mono">{table.affected_rows}</span> ligne(s)
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Reset */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Nouvel import
        </button>
      </div>
    </div>
  );
}
