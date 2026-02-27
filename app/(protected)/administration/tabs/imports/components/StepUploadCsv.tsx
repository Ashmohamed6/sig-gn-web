"use client";

import { FileUp, Loader2, X } from "lucide-react";
import type { DatasetColumnsResponse } from "../types/importTypes";

interface StepUploadCsvProps {
  file: File | null;
  previewRows: Array<Record<string, string>>;
  datasetColumns: DatasetColumnsResponse | null;
  columnsLoading: boolean;
  isValidating: boolean;
  onFileChange: (file: File | null) => Promise<void>;
  onValidate: () => Promise<void>;
  onBack: () => void;
}

export default function StepUploadCsv({
  file,
  previewRows,
  datasetColumns,
  columnsLoading,
  isValidating,
  onFileChange,
  onValidate,
  onBack,
}: StepUploadCsvProps) {
  const previewHeaders = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];

  const expectedColumnNames = new Set(datasetColumns?.columns.map((c) => c.name) || []);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Charger le fichier CSV</h3>
        <p className="text-xs text-slate-500">Format attendu : UTF-8, separateur point-virgule (;)</p>
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-600 hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
        <FileUp className="h-5 w-5" />
        <span>{file ? "Remplacer le fichier" : "Choisir un fichier CSV"}</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          disabled={isValidating}
          onChange={(event) => {
            const nextFile = event.target.files?.[0] || null;
            void onFileChange(nextFile);
            event.currentTarget.value = "";
          }}
        />
      </label>

      {file && (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
              onClick={() => void onFileChange(null)}
            >
              <X className="h-3.5 w-3.5" />
              Retirer
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">{(file.size / 1024).toFixed(1)} Ko</p>
        </div>
      )}

      {columnsLoading && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Chargement du schema de la table cible...
        </div>
      )}

      {datasetColumns && !columnsLoading && (
        <details className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border-b border-slate-200 select-none">
            Schema attendu : {datasetColumns.columns.length} colonnes ({datasetColumns.stage_table})
          </summary>
          <div className="p-3 flex flex-wrap gap-1.5 max-h-48 overflow-auto">
            {datasetColumns.columns.map((col) => {
              const catColors: Record<string, string> = {
                system: "bg-slate-100 text-slate-600",
                kobo_meta: "bg-violet-50 text-violet-700",
                data: "bg-amber-50 text-amber-700",
              };
              return (
                <span
                  key={col.name}
                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono ${catColors[col.category] || "bg-slate-100 text-slate-600"}`}
                  title={`${col.data_type} | ${col.is_nullable ? "nullable" : "NOT NULL"} | ${col.category}`}
                >
                  {col.name}
                </span>
              );
            })}
          </div>
        </details>
      )}

      {previewRows.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
            Apercu local ({previewRows.length} lignes)
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {previewHeaders.map((header) => {
                    const isKnown = expectedColumnNames.has(header);
                    return (
                      <th
                        key={header}
                        className={`px-2 py-2 text-left font-semibold whitespace-nowrap ${
                          isKnown ? "text-emerald-700" : "text-red-500"
                        }`}
                        title={isKnown ? "Colonne reconnue" : "Colonne inconnue"}
                      >
                        {header}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((row, index) => (
                  <tr key={`preview-${index}`}>
                    {previewHeaders.map((header) => (
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
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Retour
        </button>
        <button
          type="button"
          onClick={() => void onValidate()}
          disabled={!file || isValidating}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isValidating && <Loader2 className="h-4 w-4 animate-spin" />}
          Verifier et continuer
        </button>
      </div>
    </div>
  );
}
