"use client";

import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  UserX,
  UserCheck,
  KeyRound,
  Eye,
  Trash2,
  Download,
} from "lucide-react";
import type { AdminUser } from "../types";
import { ProjectsBadges, RoleBadge } from "./RoleBadges";
import DeleteConfirmModal from "./DeleteConfirmModal";

export interface UsersTableProps {
  users: AdminUser[];
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onToggleActive: (user: AdminUser) => void | Promise<void>;
  onResetPassword?: (user: AdminUser) => void | Promise<void>;
  onDelete?: (user: AdminUser) => void | Promise<void>;
  onView?: (user: AdminUser) => void;
  onRowOpen?: (user: AdminUser) => void;
  onExportCSV?: () => void;
}

export default function UsersTable({
  users,
  loading,
  error,
  page,
  pageSize,
  total,
  onPageChange,
  onToggleActive,
  onResetPassword,
  onDelete,
  onView,
  onRowOpen,
  onExportCSV,
}: UsersTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const empty = !loading && users.length === 0;

  const handleOpen = (user: AdminUser) => {
    if (onView) {
      onView(user);
    } else if (onRowOpen) {
      onRowOpen(user);
    }
  };

  const handleExportCSV = () => {
    if (onExportCSV) {
      onExportCSV();
      return;
    }

    // Export par defaut
    const headers = [
      "ID",
      "Nom",
      "Email",
      "R\u00f4le",
      "R\u00e9gion",
      "Projets",
      "Statut",
      "Derni\u00e8re connexion",
    ];
    const rows = users.map(u => [
      u.id,
      `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || u.email,
      u.email,
      u.role_display || u.role,
      u.region_data?.nom || '',
      (u.projects || []).map(p => p.code_fonc).join('; '),
      u.is_active ? 'Actif' : 'Inactif',
      u.last_login ? new Date(u.last_login).toLocaleString('fr-FR') : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header avec bouton Export */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {total === 0 ? (
            "Aucun r\u00e9sultat"
          ) : (
            <>
              <span className="font-medium tabular-nums">{start}</span>{" "}
              {"\u00e0"}{" "}
              <span className="font-medium tabular-nums">{end}</span> sur{" "}
              <span className="font-medium tabular-nums">
                {total.toLocaleString("fr-FR")}
              </span>
            </>
          )}
        </div>

        <button
          onClick={handleExportCSV}
          disabled={users.length === 0}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-4 h-4" />
          Exporter CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[200px]">
                Nom
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[220px]">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[150px]">
                {"R\u00f4le"}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[120px]">
                {"R\u00e9gion"}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[180px]">
                Projets
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[110px]">
                Statut
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[150px]">
                {"Derni\u00e8re connexion"}
              </th>
              <th className="px-2 py-3 w-[64px] text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-sm text-gray-500"
                >
                  Chargement des utilisateurs...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="px-4 py-10">
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
                    {error}
                  </div>
                </td>
              </tr>
            ) : empty ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-sm text-gray-500"
                >
                  Aucun utilisateur
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  onOpen={() => handleOpen(u)}
                  onToggleActive={() => onToggleActive(u)}
                  onResetPassword={onResetPassword ? () => onResetPassword(u) : undefined}
                  onDelete={onDelete ? () => onDelete(u) : undefined}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/50 flex items-center justify-center">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title={"Page pr\u00e9c\u00e9dente"}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-sm text-gray-600 px-2">
            <span className="font-medium tabular-nums">{page}</span> /{" "}
            <span className="tabular-nums">{totalPages}</span>
          </div>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Page suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function UserRow({
  user,
  onOpen,
  onToggleActive,
  onResetPassword,
  onDelete,
}: {
  user: AdminUser;
  onOpen: () => void;
  onToggleActive: () => void;
  onResetPassword?: () => void;
  onDelete?: () => void;
}) {
  const name = useMemo(() => {
    const full = [user.first_name, user.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    return full || user.username || user.email;
  }, [user.first_name, user.last_name, user.username, user.email]);

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <button onClick={onOpen} className="text-left w-full">
          <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
          <p className="text-xs text-gray-500 truncate">ID: {user.id}</p>
        </button>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-gray-800 truncate">{user.email}</p>
      </td>
      <td className="px-4 py-3">
        {user.role ? <RoleBadge role={user.role} /> : <span className="text-sm text-gray-400">{"\u2014"}</span>}
      </td>
      <td className="px-4 py-3">
        {user.region_data ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 ring-1 ring-inset ring-purple-600/20">
            {user.region_data.nom}
          </span>
        ) : (
          <span className="text-sm text-gray-400">{"\u2014"}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <ProjectsBadges projects={user.projects || []} />
      </td>
      <td className="px-4 py-3">
        {user.is_active ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset bg-emerald-100 text-emerald-800 ring-emerald-600/20">
            Actif
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset bg-red-100 text-red-800 ring-red-600/20">
            Inactif
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-gray-700 tabular-nums">
          {user.last_login
            ? new Date(user.last_login).toLocaleString("fr-FR")
            : "\u2014"}
        </p>
      </td>
      <td className="px-2 py-3 text-right">
        <RowMenu
          onOpen={onOpen}
          onToggleActive={onToggleActive}
          onResetPassword={onResetPassword}
          onDelete={onDelete}
          isActive={user.is_active}
          userName={name}
        />
      </td>
    </tr>
  );
}

function RowMenu({
  onOpen,
  onToggleActive,
  onResetPassword = () => {},
  onDelete,
  isActive,
  userName,
}: {
  onOpen: () => void;
  onToggleActive: () => void;
  onResetPassword?: () => void;
  onDelete?: () => void;
  isActive: boolean;
  userName: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState<{ top: number; left: number } | null>(null);

  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const closeMenu = React.useCallback(() => {
    setOpen(false);
    setMenuPosition(null);
  }, []);

  const openMenu = React.useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const actionCount = onDelete ? 4 : 3;
    const itemHeight = 40;
    const menuPadding = 8;
    const menuWidth = 224;
    const viewportPadding = 8;
    const offset = 6;
    const menuHeight = actionCount * itemHeight + menuPadding;

    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldOpenUp = spaceBelow < menuHeight + viewportPadding;

    const top = shouldOpenUp
      ? Math.max(viewportPadding, rect.top - menuHeight - offset)
      : Math.min(window.innerHeight - menuHeight - viewportPadding, rect.bottom + offset);

    const left = Math.min(
      window.innerWidth - menuWidth - viewportPadding,
      Math.max(viewportPadding, rect.right - menuWidth)
    );

    setMenuPosition({ top, left });
    setOpen(true);
  }, [onDelete]);

  const handleToggleMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (open) {
      closeMenu();
      return;
    }
    openMenu();
  };

  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }
      closeMenu();
    };

    const handleViewportChange = () => {
      closeMenu();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, closeMenu]);

  const handleDeleteClick = () => {
    closeMenu();
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete();
    }
    setShowDeleteModal(false);
  };

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={handleToggleMenu}
          className="p-2 rounded-lg hover:bg-gray-200"
          title="Actions"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <MoreHorizontal className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {open && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <>
              <div className="fixed inset-0 z-40" onClick={closeMenu} />
              <div
                ref={menuRef}
                className="fixed z-50 w-56 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                style={{ top: menuPosition.top, left: menuPosition.left }}
                role="menu"
                aria-label="Actions utilisateur"
              >
                <button
                  onClick={() => {
                    onOpen();
                    closeMenu();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  role="menuitem"
                >
                  <Eye className="w-4 h-4" />
                  Voir / editer
                </button>

                <button
                  onClick={() => {
                    onResetPassword();
                    closeMenu();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  role="menuitem"
                >
                  <KeyRound className="w-4 h-4" />
                  Reinitialiser mot de passe
                </button>

                <button
                  onClick={() => {
                    onToggleActive();
                    closeMenu();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  role="menuitem"
                >
                  {isActive ? (
                    <UserX className="w-4 h-4 text-red-600" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                  )}
                  {isActive ? "Desactiver" : "Activer"}
                </button>

                {onDelete && (
                  <>
                    <div className="border-t border-gray-200" />
                    <button
                      onClick={handleDeleteClick}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-700 hover:bg-red-50"
                      role="menuitem"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer definitivement
                    </button>
                  </>
                )}
              </div>
            </>,
            document.body
          )
        : null}

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        userName={userName}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
  );
}
