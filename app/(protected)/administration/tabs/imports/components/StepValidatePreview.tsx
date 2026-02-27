"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, Plus, RefreshCw } from "lucide-react";
import type { ImportValidationReport } from "../hooks/useImportApi";
import type { DuplicateStrategy } from "../types/importTypes";
import ColumnMappingTable from "./ColumnMappingTable";

interface StepValidatePreviewProps {
  report: ImportValidationReport | null;
  previewRows: Array<Record<string, string>>;
  isExecuting: boolean;
  onExecute: (strategy?: DuplicateStrategy) => Promise<void>;
  onBack: () => void;
}

function formatNumber(value: number): string {
  return value.toLocaleString("fr-FR");
}

function ClassifiedRowsTable({
  rows,
  identifierField,
}: {
  rows: Array<Record<string, string>>;
  identifierField?: string | null;
}) {
  if (rows.length === 0) return null;
  const headers = Object.keys(rows[0]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className={`px-2 py-2 text-left font-semibold whitespace-nowrap ${
                  header === identifierField ? "text-blue-700" : "text-slate-600"
                }`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={`row-${index}`}>
              {headers.map((header) => (
                <td
                  key={`${index}-${header}`}
                  className="px-2 py-1.5 text-slate-700 whitespace-nowrap max-w-[220px] truncate"
                >
                  {row[header]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StepValidatePreview({
  report,
  previewRows,
  isExecuting,
  onExecute,
  onBack,
}: StepValidatePreviewProps) {
  if (!report) {
    return (
      <div className="text-center py-8 text-sm text-slate-500">
        Aucun rapport de validation. Retournez a l&apos;etape precedente.
      </div>
    );
  }

  const previewHeaders = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];

  const newCount = report.stats.new_count ?? 0;
  const existingCount = report.stats.existing_count ?? 0;
  const duplicateCount = report.stats.duplicate_count ?? 0;
  const newRows = report.new_rows ?? [];
  const existingRows = report.existing_rows ?? [];
  const duplicateRows = report.duplicate_rows ?? [];

  return (
    <div className="space-y-4">
      {/* Validation status header */}
      <div className={`rounded-lg border px-4 py-3 flex items-center gap-2 ${
        report.valid
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50"
      }`}>
        {report.valid ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
        )}
        <div>
          <p className={`text-sm font-semibold ${report.valid ? "text-emerald-800" : "text-red-800"}`}>
            {report.valid ? "Validation reussie" : "Validation bloquante"}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            Dataset: <span className="font-medium">{report.dataset.label}</span> ({report.dataset.stage_table})
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-lg border border-slate-200 p-3 text-center">
          <p className="text-xs text-slate-500">Lignes</p>
          <p className="text-lg font-bold text-slate-800">{formatNumber(report.stats.rows_total)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-3 text-center">
          <p className="text-xs text-slate-500">Colonnes reconnues</p>
          <p className="text-lg font-bold text-slate-800">
            {formatNumber(report.stats.columns_recognized)}/{formatNumber(report.stats.columns_total)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-3 text-center">
          <p className="text-xs text-slate-500">Doublons</p>
          <p className="text-lg font-bold text-slate-800">{formatNumber(report.stats.duplicate_identifier_count)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-3 text-center">
          <p className="text-xs text-slate-500">Deja en base</p>
          <p className="text-lg font-bold text-slate-800">{formatNumber(report.stats.potential_existing_count)}</p>
        </div>
      </div>

      {/* Errors and warnings */}
      {report.errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-700 mb-1">Erreurs bloquantes</p>
          <ul className="space-y-1 text-sm text-red-700 list-disc pl-5">
            {report.errors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {report.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-800 mb-1">Avertissements</p>
          <ul className="space-y-1 text-sm text-amber-800 list-disc pl-5">
            {report.warnings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Section: Nouvelles lignes */}
      {newCount > 0 && (
        <details className="rounded-lg border border-emerald-200 bg-white overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 bg-emerald-50 border-b border-emerald-200 select-none flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <Plus className="h-4 w-4" />
              Nouvelles lignes ({formatNumber(newCount)})
            </span>
          </summary>
          <div className="p-0">
            {newRows.length > 0 && (
              <ClassifiedRowsTable rows={newRows} identifierField={report.identifier_field} />
            )}
            {newRows.length < newCount && (
              <p className="px-4 py-2 text-xs text-slate-500">
                Affichage limite a {newRows.length} sur {formatNumber(newCount)} lignes.
              </p>
            )}
            <div className="px-4 py-3 border-t border-emerald-100 bg-emerald-50/50">
              <button
                type="button"
                onClick={() => void onExecute("skip")}
                disabled={!report.valid || isExecuting}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isExecuting && <Loader2 className="h-4 w-4 animate-spin" />}
                Importer dans stage
              </button>
            </div>
          </div>
        </details>
      )}

      {/* Section: Deja en base */}
      {existingCount > 0 && (
        <details className="rounded-lg border border-blue-200 bg-white overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 bg-blue-50 border-b border-blue-200 select-none flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-blue-800">
              <RefreshCw className="h-4 w-4" />
              Deja en base ({formatNumber(existingCount)})
            </span>
          </summary>
          <div className="p-0">
            {existingRows.length > 0 && (
              <ClassifiedRowsTable rows={existingRows} identifierField={report.identifier_field} />
            )}
            {existingRows.length < existingCount && (
              <p className="px-4 py-2 text-xs text-slate-500">
                Affichage limite a {existingRows.length} sur {formatNumber(existingCount)} lignes.
              </p>
            )}
            <div className="px-4 py-3 border-t border-blue-100 bg-blue-50/50">
              <button
                type="button"
                onClick={() => void onExecute("update_only")}
                disabled={!report.valid || isExecuting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isExecuting && <Loader2 className="h-4 w-4 animate-spin" />}
                Mettre a jour
              </button>
            </div>
          </div>
        </details>
      )}

      {/* Section: Doublons dans le fichier */}
      {duplicateCount > 0 && (
        <details className="rounded-lg border border-amber-200 bg-white overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 bg-amber-50 border-b border-amber-200 select-none flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Doublons dans le fichier ({formatNumber(duplicateCount)})
            </span>
          </summary>
          <div className="p-0">
            {duplicateRows.length > 0 && (
              <ClassifiedRowsTable rows={duplicateRows} identifierField={report.identifier_field} />
            )}
            {duplicateRows.length < duplicateCount && (
              <p className="px-4 py-2 text-xs text-slate-500">
                Affichage limite a {duplicateRows.length} sur {formatNumber(duplicateCount)} lignes.
              </p>
            )}
            <div className="px-4 py-3 border-t border-amber-100 bg-amber-50/50">
              <p className="text-xs text-amber-700">
                Ces lignes sont des doublons dans le fichier et seront ignorees a l&apos;import.
              </p>
            </div>
          </div>
        </details>
      )}

      {/* Column mapping */}
      {report.column_mapping && report.column_mapping.length > 0 && (
        <ColumnMappingTable mapping={report.column_mapping} />
      )}

      {/* Data preview */}
      {previewRows.length > 0 && (
        <details className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border-b border-slate-200 select-none">
            Apercu des donnees ({previewRows.length} lignes)
          </summary>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {previewHeaders.map((header) => (
                    <th key={header} className="px-2 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((row, index) => (
                  <tr key={`preview-${index}`}>
                    {previewHeaders.map((header) => (
                      <td key={`${index}-${header}`} className="px-2 py-1.5 text-slate-700 whitespace-nowrap max-w-[220px] truncate">
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Retour
        </button>
        <button
          type="button"
          onClick={() => void onExecute("update")}
          disabled={!report.valid || isExecuting}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isExecuting && <Loader2 className="h-4 w-4 animate-spin" />}
          Tout importer
        </button>
      </div>
    </div>
  );
}
