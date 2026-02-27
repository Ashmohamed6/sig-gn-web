"use client";

import { Check, Database, FileUp, Play, Search } from "lucide-react";
import type { WizardStep } from "../types/importTypes";

interface StepIndicatorProps {
  currentStep: WizardStep;
  onStepClick?: (step: WizardStep) => void;
}

const STEPS: { step: WizardStep; label: string; icon: typeof Database }[] = [
  { step: 1, label: "Dataset", icon: Database },
  { step: 2, label: "Fichier CSV", icon: FileUp },
  { step: 3, label: "Validation", icon: Search },
  { step: 4, label: "Import", icon: Play },
];

export default function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <nav className="flex items-center gap-1 sm:gap-2">
      {STEPS.map(({ step, label, icon: Icon }, index) => {
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;
        const isClickable = onStepClick && step < currentStep;

        return (
          <div key={step} className="flex items-center gap-1 sm:gap-2">
            {index > 0 && (
              <div
                className={`hidden sm:block h-px w-6 lg:w-10 ${
                  step <= currentStep ? "bg-emerald-400" : "bg-slate-200"
                }`}
              />
            )}
            <button
              type="button"
              onClick={isClickable ? () => onStepClick(step) : undefined}
              disabled={!isClickable}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-emerald-600 text-white shadow-sm"
                  : isCompleted
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                    : "bg-slate-100 text-slate-400 cursor-default"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0">
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
