"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  MapPin,
  Eye,
  Pencil,
  Printer,
  Download,
  FileText,
  CheckCircle,
  Users,
  Trash2,
  Loader2,
  ArrowUpDown,
  Database,
} from "lucide-react";
import { ColumnConfig, ActionConfig, UserRole } from "../config/tablesConfig";

interface DataTableProps {
  columns: ColumnConfig[];
  data: Record<string, any>[];
  actions?: ActionConfig[];
  loading?: boolean;
  totalCount?: number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onSort?: (key: string, direction: "asc" | "desc") => void;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onRowClick?: (row: Record<string, any>) => void;
  onAction?: (actionId: string, rows: Record<string, any>[]) => void;
  selectedRows?: string[];
  onSelectionChange?: (ids: string[]) => void;
  idField?: string;
  userRole?: UserRole;
  emptyMessage?: string;
}

interface OpenRowMenu {
  rowKey: string;
  row: Record<string, any>;
  top: number;
  left: number;
}

const ROW_ACTION_MENU_WIDTH = 192;
const ROW_ACTION_ITEM_HEIGHT = 36;
const ROW_ACTION_MENU_PADDING = 8;
const ROW_ACTION_MENU_OFFSET = 6;
const VIEWPORT_PADDING = 8;

// Icônes d'action
const ACTION_ICONS: Record<string, React.ElementType> = {
  view_map: MapPin,
  view_detail: Eye,
  edit: Pencil,
  print: Printer,
  export: Download,
  export_pdf: FileText,
  delete: Trash2,
  validate: CheckCircle,
  view_participants: Users,
};

// Couleurs des badges
const BADGE_COLORS: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  green: "bg-green-100 text-green-800 ring-green-600/20",
  blue: "bg-blue-100 text-blue-800 ring-blue-600/20",
  cyan: "bg-cyan-100 text-cyan-800 ring-cyan-600/20",
  teal: "bg-teal-100 text-teal-800 ring-teal-600/20",
  amber: "bg-amber-100 text-amber-800 ring-amber-600/20",
  yellow: "bg-yellow-100 text-yellow-800 ring-yellow-600/20",
  orange: "bg-orange-100 text-orange-800 ring-orange-600/20",
  red: "bg-red-100 text-red-800 ring-red-600/20",
  purple: "bg-purple-100 text-purple-800 ring-purple-600/20",
  gray: "bg-gray-100 text-gray-800 ring-gray-600/20",
};

// Vérifier le rôle
const hasRole = (userRole: UserRole | undefined, minRole: UserRole | undefined): boolean => {
  if (!minRole) return true;
  const roleOrder: UserRole[] = ["lecteur", "editeur", "chef_projet", "admin"];
  const userIndex = roleOrder.indexOf(userRole || "lecteur");
  const minIndex = roleOrder.indexOf(minRole);
  return userIndex >= minIndex;
};

// Formater une valeur selon le type de colonne
const formatValue = (value: any, column: ColumnConfig): React.ReactNode => {
  if (value === null || value === undefined) {
    return <span className="text-gray-400">—</span>;
  }

  switch (column.type) {
    case "number": {
      const num = typeof value === "number" ? value : parseFloat(value);
      if (isNaN(num)) return String(value);
      const formatted = num.toLocaleString("fr-FR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      return (
        <span className="tabular-nums">
          {column.prefix}
          {formatted}
          {column.suffix}
        </span>
      );
    }

    case "currency": {
      const curr = typeof value === "number" ? value : parseFloat(value);
      if (isNaN(curr)) return String(value);
      return <span className="font-semibold text-emerald-700 tabular-nums">{curr.toLocaleString("fr-FR")} GNF</span>;
    }

    case "percent": {
      const pct = typeof value === "number" ? value : parseFloat(value);
      if (isNaN(pct)) return String(value);
      const pctColor = pct > 30 ? "text-red-600 font-semibold" : pct > 15 ? "text-amber-600" : "text-gray-700";
      return <span className={`tabular-nums ${pctColor}`}>{pct.toFixed(1)}%</span>;
    }

    case "date": {
      if (!value) return "—";
      try {
        const date = new Date(value);
        return <span className="tabular-nums">{date.toLocaleDateString("fr-FR")}</span>;
      } catch {
        return String(value);
      }
    }

    case "boolean":
      return value ? (
        <span className="inline-flex items-center gap-1 text-green-600">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          Oui
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-gray-400">
          <span className="w-2 h-2 bg-gray-300 rounded-full" />
          Non
        </span>
      );

    case "badge": {
      const badgeColor = column.badgeColors?.[value] || "gray";
      return (
        <span
          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${
            BADGE_COLORS[badgeColor] || BADGE_COLORS.gray
          }`}
        >
          {String(value)}
        </span>
      );
    }

    case "link":
      if (!value) return "—";
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Voir
        </a>
      );

    default:
      return String(value);
  }
};

export default function DataTable({
  columns,
  data,
  actions = [],
  loading = false,
  totalCount = 0,
  pageSize = 25,
  currentPage = 1,
  onPageChange,
  onPageSizeChange,
  onSort,
  sortKey,
  sortDirection,
  onRowClick,
  onAction,
  selectedRows = [],
  onSelectionChange,
  idField = "id",
  userRole = "lecteur",
  emptyMessage = "Aucune donnée disponible",
}: DataTableProps) {
  const [openRowMenu, setOpenRowMenu] = useState<OpenRowMenu | null>(null);

  // Colonnes visibles (filtrer par rôle)
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => col.visible !== false && hasRole(userRole, col.minRole));
  }, [columns, userRole]);

  // Actions filtrées par rôle
  const availableActions = useMemo(() => {
    return actions.filter((action) => hasRole(userRole, action.minRole));
  }, [actions, userRole]);
  const rowActions = useMemo(
    () => availableActions.filter((a) => a.type === "row" || a.type === "both"),
    [availableActions]
  );

  const closeRowMenu = useCallback(() => {
    setOpenRowMenu(null);
  }, []);

  useEffect(() => {
    if (!openRowMenu) return;

    const handleViewportChange = () => {
      setOpenRowMenu(null);
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [openRowMenu]);

  const openRowMenuAt = useCallback(
    (
      event: React.MouseEvent<HTMLButtonElement>,
      rowKey: string,
      row: Record<string, any>
    ) => {
      event.stopPropagation();

      if (openRowMenu?.rowKey === rowKey) {
        setOpenRowMenu(null);
        return;
      }

      const buttonRect = event.currentTarget.getBoundingClientRect();
      const menuHeight =
        rowActions.length * ROW_ACTION_ITEM_HEIGHT + ROW_ACTION_MENU_PADDING;

      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const shouldOpenUp = spaceBelow < menuHeight + VIEWPORT_PADDING;

      const top = shouldOpenUp
        ? Math.max(VIEWPORT_PADDING, buttonRect.top - menuHeight - ROW_ACTION_MENU_OFFSET)
        : Math.min(
            window.innerHeight - menuHeight - VIEWPORT_PADDING,
            buttonRect.bottom + ROW_ACTION_MENU_OFFSET
          );

      const left = Math.min(
        window.innerWidth - ROW_ACTION_MENU_WIDTH - VIEWPORT_PADDING,
        Math.max(VIEWPORT_PADDING, buttonRect.right - ROW_ACTION_MENU_WIDTH)
      );

      setOpenRowMenu({
        rowKey,
        row,
        top,
        left,
      });
    },
    [openRowMenu?.rowKey, rowActions.length]
  );

  // Gestion de la sélection
  const isAllSelected = data.length > 0 && selectedRows.length === data.length;
  const isSomeSelected = selectedRows.length > 0 && selectedRows.length < data.length;

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    if (isAllSelected) {
      onSelectionChange([]);
      return;
    }
    const ids = data.map((row, idx) => {
      const raw = row?.[idField];
      return raw === null || raw === undefined ? String(idx) : String(raw);
    });
    onSelectionChange(ids);
  }, [data, idField, isAllSelected, onSelectionChange]);

  const handleSelectRow = useCallback(
    (id: string) => {
      if (!onSelectionChange) return;
      if (selectedRows.includes(id)) {
        onSelectionChange(selectedRows.filter((r) => r !== id));
      } else {
        onSelectionChange([...selectedRows, id]);
      }
    },
    [selectedRows, onSelectionChange]
  );

  // Gestion du tri
  const handleSort = useCallback(
    (key: string) => {
      if (!onSort) return;
      const newDirection = sortKey === key && sortDirection === "asc" ? "desc" : "asc";
      onSort(key, newDirection);
    },
    [onSort, sortKey, sortDirection]
  );

  // Pagination
  const totalPages = Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize)));
  const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const getPageNumbers = () => {
    const delta = 2;
    const pages: (number | string)[] = [];

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }

    return pages;
  };

  // Rendu header colonne
  const renderColumnHeader = (column: ColumnConfig) => {
    const isSorted = sortKey === column.key;

    return (
      <th
        key={column.key}
        className={`
          px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider
          bg-gray-50 border-b border-gray-200
          ${column.sticky ? "sticky left-0 z-10" : ""}
          ${column.sortable ? "cursor-pointer hover:bg-gray-100 select-none" : ""}
          ${column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : ""}
        `}
        style={{ width: column.width, minWidth: column.minWidth || "80px" }}
        onClick={() => column.sortable && handleSort(column.key)}
      >
        <div className="flex items-center gap-1">
          <span>{column.label}</span>
          {column.sortable && (
            <span className="ml-1">
              {isSorted ? (
                sortDirection === "asc" ? (
                  <ChevronUp className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-emerald-600" />
                )
              ) : (
                <ArrowUpDown className="w-4 h-4 text-gray-400" />
              )}
            </span>
          )}
        </div>
      </th>
    );
  };

  // Rendu ligne
  const renderRow = (row: Record<string, any>, index: number) => {
    const rowIdRaw = row?.[idField];
    const rowId = rowIdRaw === null || rowIdRaw === undefined ? String(index) : String(rowIdRaw);
    const rowDomKey = `${rowId}__${index}`;
    const isSelected = selectedRows.includes(rowId);

    return (
      <tr
        key={rowDomKey}
        onClick={() => onRowClick?.(row)}
        className={`
          border-b border-gray-100 transition-colors
          ${onRowClick ? "cursor-pointer" : ""}
          ${isSelected ? "bg-emerald-50" : index % 2 === 0 ? "bg-white" : "bg-gray-50/30"}
          hover:bg-gray-100/70
        `}
      >
        {/* Checkbox de sélection */}
        {onSelectionChange && (
          <td className="px-4 py-3 w-12" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleSelectRow(rowId)}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
          </td>
        )}

        {/* Cellules */}
        {visibleColumns.map((column) => (
          <td
            key={column.key}
            className={`
              px-4 py-3 text-sm text-gray-700 whitespace-nowrap
              ${column.sticky ? "sticky left-0 z-10 bg-inherit" : ""}
              ${column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : ""}
            `}
            style={{ width: column.width, minWidth: column.minWidth }}
          >
            {formatValue(row?.[column.key], column)}
          </td>
        ))}

        {/* Actions */}
        {rowActions.length > 0 && (
          <td
            className="px-2 py-3 w-12 text-center sticky right-0 bg-inherit"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => openRowMenuAt(e, rowDomKey, row)}
              className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              aria-expanded={openRowMenu?.rowKey === rowDomKey}
              aria-haspopup="menu"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-500" />
            </button>
          </td>
        )}
      </tr>
    );
  };

  return (
    <div className="flex flex-col h-full min-w-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Container du tableau avec scroll */}
      <div className="flex-1 min-w-0 overflow-auto">
        <table className="w-full min-w-max">
          <thead className="sticky top-0 z-10">
            <tr>
              {/* Checkbox de sélection globale */}
              {onSelectionChange && (
                <th className="px-4 py-3 w-12 bg-gray-50 border-b border-gray-200">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}

              {visibleColumns.map(renderColumnHeader)}

              {rowActions.length > 0 && (
                <th className="px-2 py-3 w-12 bg-gray-50 border-b border-gray-200 sticky right-0">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (onSelectionChange ? 1 : 0) + (rowActions.length > 0 ? 1 : 0)}
                  className="text-center py-16"
                >
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
                  <p className="text-gray-500">Chargement des données...</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (onSelectionChange ? 1 : 0) + (rowActions.length > 0 ? 1 : 0)}
                  className="text-center py-16"
                >
                  <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">{emptyMessage}</p>
                  <p className="text-gray-400 text-sm mt-1">Essayez de modifier vos filtres</p>
                </td>
              </tr>
            ) : (
              data.map(renderRow)
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-gray-600">
          {totalCount > 0 ? (
            <>
              <span className="font-medium tabular-nums">{startItem}</span> à{" "}
              <span className="font-medium tabular-nums">{endItem}</span> sur{" "}
              <span className="font-medium tabular-nums">{totalCount.toLocaleString("fr-FR")}</span> résultats
            </>
          ) : (
            "Aucun résultat"
          )}
        </div>

        {totalPages > 1 && onPageChange && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Première page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Page précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 mx-2">
              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => onPageChange(page as number)}
                    className={`
                      min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors
                      ${currentPage === page ? "bg-emerald-600 text-white" : "hover:bg-gray-200 text-gray-700"}
                    `}
                  >
                    {page}
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Page suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Dernière page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Lignes par page :</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {openRowMenu && typeof document !== "undefined"
        ? createPortal(
            <>
              <div className="fixed inset-0 z-40" onClick={closeRowMenu} />
              <div
                className="fixed z-50 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                style={{
                  top: openRowMenu.top,
                  left: openRowMenu.left,
                }}
                role="menu"
                aria-label="Actions de ligne"
              >
                {rowActions.map((action) => {
                  const Icon = ACTION_ICONS[action.id] || Eye;
                  return (
                    <button
                      key={action.id}
                      onClick={() => {
                        onAction?.(action.id, [openRowMenu.row]);
                        closeRowMenu();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      <Icon className="w-4 h-4" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </>,
            document.body
          )
        : null}
    </div>
  );
}
