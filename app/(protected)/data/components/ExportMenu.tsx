"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileJson,
  ChevronDown,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";

export type ExportFormat = "csv" | "xlsx" | "pdf" | "geojson";

type Variant = "default" | "header";

interface ExportOption {
  format: ExportFormat;
  label: string;
  icon: React.ElementType;
  colorClass: string;
  description: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    format: "csv",
    label: "CSV",
    icon: FileText,
    colorClass: "text-green-600",
    description: "Format texte separe par des points-virgules",
  },
  {
    format: "xlsx",
    label: "Excel",
    icon: FileSpreadsheet,
    colorClass: "text-emerald-600",
    description: "Classeur Microsoft Excel",
  },
  {
    format: "pdf",
    label: "PDF",
    icon: FileText,
    colorClass: "text-red-600",
    description: "Document portable formate",
  },
  {
    format: "geojson",
    label: "GeoJSON",
    icon: FileJson,
    colorClass: "text-blue-600",
    description: "Format geospatial standard",
  },
];

interface ExportMenuProps {
  onExport: (format: ExportFormat) => Promise<void>;
  disabled?: boolean;
  selectedCount?: number;
  totalCount?: number;
  hasGeometry?: boolean;
  className?: string;
  variant?: Variant;
}

function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const MENU_WIDTH = 288;
const VIEWPORT_PADDING = 8;
const MENU_OFFSET = 8;

export function ExportMenu({
  onExport,
  disabled = false,
  selectedCount = 0,
  totalCount = 0,
  hasGeometry = false,
  className = "",
  variant = "default",
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [success, setSuccess] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const availableOptions = EXPORT_OPTIONS.filter(
    (opt) => opt.format !== "geojson" || hasGeometry
  );

  const updateMenuPosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const menuWidth = menuRef.current?.offsetWidth || MENU_WIDTH;
    const menuHeight = menuRef.current?.offsetHeight || 320;

    const left = Math.min(
      window.innerWidth - menuWidth - VIEWPORT_PADDING,
      Math.max(VIEWPORT_PADDING, rect.right - menuWidth)
    );

    const downTop = rect.bottom + MENU_OFFSET;
    const upTop = rect.top - menuHeight - MENU_OFFSET;
    const canOpenDown = downTop + menuHeight <= window.innerHeight - VIEWPORT_PADDING;

    const preferredTop = canOpenDown ? downTop : upTop;
    const clampedTop = Math.min(
      window.innerHeight - menuHeight - VIEWPORT_PADDING,
      Math.max(VIEWPORT_PADDING, preferredTop)
    );

    setMenuPosition({ top: clampedTop, left });
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();

    const handleViewportChange = () => updateMenuPosition();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen) return;
    const raf = window.requestAnimationFrame(() => updateMenuPosition());
    return () => window.cancelAnimationFrame(raf);
  }, [isOpen, availableOptions.length, error, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInMenu = !!menuRef.current?.contains(target);
      const clickedInTrigger = !!triggerRef.current?.contains(target);
      if (!clickedInMenu && !clickedInTrigger) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 1500);
    return () => clearTimeout(t);
  }, [success]);

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);
    setError(null);
    try {
      await onExport(format);
      setSuccess(format);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'export");
    } finally {
      setExporting(null);
    }
  };

  const exportLabel =
    selectedCount > 0
      ? `Exporter ${selectedCount} ligne(s) selectionnee(s)`
      : `Exporter ${totalCount} ligne(s) (filtre)`;

  const isButtonDisabled = disabled || totalCount === 0;

  const buttonBase =
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition";

  const buttonStyle =
    variant === "header"
      ? clsx(
          "bg-white/20 hover:bg-white/30 text-white",
          isButtonDisabled && "opacity-50 cursor-not-allowed hover:bg-white/20"
        )
      : clsx(
          "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm",
          isButtonDisabled && "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
        );

  const menuContainerStyle = "bg-white rounded-xl shadow-lg border border-gray-200";

  const menuContent = (
    <div
      ref={menuRef}
      className={clsx(
        "fixed w-72 py-2 z-[300] max-h-[min(28rem,calc(100vh-1rem))] overflow-auto animate-in fade-in slide-in-from-top-2 duration-150",
        menuContainerStyle
      )}
      style={{
        top: menuPosition ? `${menuPosition.top}px` : undefined,
        left: menuPosition ? `${menuPosition.left}px` : undefined,
      }}
    >
      <div className="px-4 py-2 border-b border-gray-100">
        <p className="text-xs text-gray-500">{exportLabel}</p>
        {selectedCount === 0 && (
          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Seules les colonnes visibles seront exportees
          </p>
        )}
      </div>

      <div className="py-1">
        {availableOptions.map((option) => {
          const Icon = option.icon;
          const isExporting = exporting === option.format;
          const isSuccess = success === option.format;

          return (
            <button
              key={option.format}
              type="button"
              onClick={() => handleExport(option.format)}
              disabled={isExporting}
              className={clsx(
                "w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors",
                isExporting && "opacity-50 cursor-wait"
              )}
            >
              <div className={clsx("p-1.5 rounded-lg bg-gray-100", option.colorClass)}>
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSuccess ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{option.label}</p>
                <p className="text-xs text-gray-500 truncate">{option.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="px-4 py-2 border-t border-gray-100">
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div ref={triggerRef} className={clsx("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        disabled={isButtonDisabled}
        className={clsx(buttonBase, buttonStyle)}
      >
        {success ? (
          <Check className={clsx("w-4 h-4", variant === "header" ? "text-white" : "text-green-600")} />
        ) : exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>Exporter</span>
        <ChevronDown className={clsx("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && isClient && menuPosition && createPortal(menuContent, document.body)}
    </div>
  );
}

export default ExportMenu;
