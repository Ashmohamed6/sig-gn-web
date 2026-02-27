"use client";

import { Check } from "lucide-react";
import type { DatasetDefinition } from "../config/datasetDefinitions";

interface StepDatasetSelectProps {
  datasets: DatasetDefinition[];
  selectedCode: string;
  regionId: string;
  onSelectDataset: (code: string) => void;
  onRegionChange: (value: string) => void;
  onNext: () => void;
}

export default function StepDatasetSelect({
  datasets,
  selectedCode,
  regionId,
  onSelectDataset,
  onRegionChange,
  onNext,
}: StepDatasetSelectProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Choisir le dataset cible</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {datasets.map((ds) => {
            const isSelected = ds.datasetCode === selectedCode;
            return (
              <button
                key={ds.datasetCode}
                type="button"
                onClick={() => onSelectDataset(ds.datasetCode)}
                className={`relative text-left rounded-lg border-2 p-3 transition-all ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}
                <p className={`text-sm font-medium ${isSelected ? "text-emerald-800" : "text-slate-800"}`}>
                  {ds.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{ds.description}</p>
                <p className="text-[10px] font-mono text-slate-400 mt-1">{ds.datasetCode}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-sm">
        <label className="block text-sm font-medium text-slate-700 mb-1">Region cible (optionnel)</label>
        <input
          value={regionId}
          onChange={(e) => onRegionChange(e.target.value.trim().toUpperCase())}
          placeholder="Ex: GN005"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
        />
        <p className="text-xs text-slate-500 mt-1">Pour un manager, la region du compte est imposee cote backend.</p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          disabled={!selectedCode}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
