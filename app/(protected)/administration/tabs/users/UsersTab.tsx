"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, UserPlus, AlertCircle } from "lucide-react";
import { useAdminUsers } from "./useAdminUsers";
import { useAdminApi } from "../../hooks/useAdminApi";
import type { AdminUser, ApiUserRole, UserRole, UserProject } from "./types";
import UsersTable from "./components/UsersTable";
import UserSheet from "./components/UserSheet";
import CreateUserModal from "./components/CreateUserModal";

interface UsersTabProps {
  userRole: UserRole;
  activeProjectCode?: string;
}

interface MeProjectDto {
  project_id?: string;
  id?: string;
  code_fonc?: string;
  code?: string;
  libelle_public?: string;
  label?: string;
}

interface MeResponse {
  projects?: MeProjectDto[];
}

interface RegionFeatureProperties {
  id_region?: string;
  code_region?: string;
  nom?: string;
  nom_region?: string;
}

interface RegionFeature {
  properties?: RegionFeatureProperties;
}

interface RegionsGeoResponse {
  features?: RegionFeature[];
}

export default function UsersTab({ userRole, activeProjectCode }: UsersTabProps) {
  const {
    users,
    total,
    loading,
    error,
    page,
    pageSize,
    setPage,
    setPageSize,
    search,
    setSearch,
    status,
    setStatus,
    role,
    setRole,
    region,
    setRegion,
    refresh,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
  } = useAdminUsers(activeProjectCode);
  const { apiFetch } = useAdminApi();

  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [regions, setRegions] = useState<Array<{ id: string; nom: string }>>([]);
  const [lookupsLoading, setLookupsLoading] = useState(false);
  const [lookupsError, setLookupsError] = useState<string | null>(null);

  const _userRole = userRole;
  void _userRole;

  const isStatusFilter = (value: string): value is "all" | "active" | "inactive" =>
    value === "all" || value === "active" || value === "inactive";

  const isRoleFilter = (value: string): value is ApiUserRole | "all" =>
    value === "all" ||
    value === "reader" ||
    value === "editor" ||
    value === "manager" ||
    value === "project_manager" ||
    value === "admin";

  const getErrorMessage = (errorValue: unknown): string =>
    errorValue instanceof Error ? errorValue.message : "Erreur inconnue";

  const fallbackProjects: UserProject[] = useMemo(
    () => [
      {
        project_id: "cb1bf865-9b63-4022-a099-6ea48aaf283d",
        code_fonc: "AGRIECO",
        libelle_public: "Accompagnement agro-économique",
      },
      {
        project_id: "597169dd-aeee-47b7-b7d2-44031681d329",
        code_fonc: "FIERE",
        libelle_public: "Formation & insertion",
      },
    ],
    []
  );

  const fallbackRegions = useMemo(
    () => [
      { id: "GN001", nom: "Boké" },
      { id: "GN002", nom: "Conakry" },
      { id: "GN003", nom: "Faranah" },
      { id: "GN004", nom: "Kankan" },
      { id: "GN005", nom: "Kindia" },
      { id: "GN006", nom: "Labé" },
      { id: "GN007", nom: "Mamou" },
      { id: "GN008", nom: "Nzérékoré" },
    ],
    []
  );

  const loadLookups = useCallback(async () => {
    setLookupsLoading(true);
    setLookupsError(null);

    try {
      const me = await apiFetch<MeResponse>(
        "/accounts/me",
        { method: "GET" },
        { includeProjectHeader: false }
      );
      const meProjects = Array.isArray(me?.projects) ? me.projects : [];
      const parsedProjects: UserProject[] = meProjects
        .map((p) => ({
          project_id: String(p?.project_id ?? p?.id ?? "").trim(),
          code_fonc: String(p?.code_fonc ?? p?.code ?? "").trim(),
          libelle_public: String(p?.libelle_public ?? p?.label ?? "").trim() || undefined,
        }))
        .filter((p: UserProject) => p.project_id.length > 0 && p.code_fonc.length > 0);
      setProjects(parsedProjects);

      const regionsGeo = await apiFetch<RegionsGeoResponse>("/data/carto/admin-region", {
        method: "GET",
      });
      const parsedRegions = (Array.isArray(regionsGeo?.features) ? regionsGeo.features : [])
        .map((feature) => {
          const props = feature?.properties || {};
          const id = String(props.id_region ?? props.code_region ?? "").trim();
          const nom = String(props.nom ?? props.nom_region ?? "").trim();
          return id && nom ? { id, nom } : null;
        })
        .filter((row: { id: string; nom: string } | null): row is { id: string; nom: string } => Boolean(row))
        .sort((a: { nom: string }, b: { nom: string }) => a.nom.localeCompare(b.nom, "fr"));
      setRegions(parsedRegions);
    } catch (errorValue: unknown) {
      setLookupsError(getErrorMessage(errorValue));
      setProjects([]);
      setRegions([]);
    } finally {
      setLookupsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  const effectiveProjects = projects.length > 0 ? projects : fallbackProjects;
  const effectiveRegions = regions.length > 0 ? regions : fallbackRegions;

  const apiNotReady =
    error?.includes("404") || error?.toLowerCase().includes("not found");

  const handleDelete = async (u: AdminUser) => {
    try {
      await deleteUser(u.id);
      refresh();
    } catch (errorValue: unknown) {
      alert(`Erreur lors de la suppression : ${getErrorMessage(errorValue)}`);
    }
  };

  const handleResetPassword = async (u: AdminUser) => {
    try {
      const result = await resetPassword(u.id);
      const tmp = result?.temporary_password;
      if (tmp) {
        alert(
          `Mot de passe temporaire pour ${u.email || u.username}:\n\n${tmp}\n\nCommunique-le de maniere securisee et demande un changement immediat.`
        );
        return;
      }

      alert(result?.detail || "Mot de passe reinitialise.");
    } catch (errorValue: unknown) {
      alert(`Erreur lors de la reinitialisation : ${getErrorMessage(errorValue)}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Utilisateurs & roles
          </h2>
          <p className="text-sm text-slate-500">
            Administration des comptes (Admin global, Chef projet N2, Chef d&apos;équipe N1)
          </p>
          {activeProjectCode && (
            <p className="text-xs text-emerald-600 mt-1">
              Filtre par projet actif
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refresh();
              void loadLookups();
            }}
            disabled={loading || lookupsLoading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-sm text-slate-700"
            title="Rafraichir"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading || lookupsLoading ? "animate-spin" : ""}`}
            />
            Rafraichir
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
          >
            <UserPlus className="h-4 w-4" />
            Nouveau
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Recherche
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Nom, email, username..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Statut
            </label>
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                const nextStatus = e.target.value;
                if (isStatusFilter(nextStatus)) setStatus(nextStatus);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            >
              <option value="all">Tous</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => {
                setPage(1);
                const nextRole = e.target.value;
                if (isRoleFilter(nextRole)) setRole(nextRole);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            >
              <option value="all">Tous</option>
              <option value="reader">Lecteur</option>
              <option value="editor">Superviseur (Éditeur/Analyste)</option>
              <option value="manager">Chef d&apos;équipe (Admin N1)</option>
              <option value="project_manager">Chef projet (Admin N2)</option>
              <option value="admin">Admin global</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Region
            </label>
            <select
              value={region || "all"}
              onChange={(e) => {
                setPage(1);
                const next = e.target.value;
                setRegion(next === "all" ? "" : next);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            >
              <option value="all">Toutes</option>
              {effectiveRegions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Lignes
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.target.value));
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {apiNotReady && (
          <div className="px-4 pb-4">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-medium">API utilisateurs non disponible</p>
                <p className="text-xs mt-1">
                  Le frontend attend des endpoints{" "}
                  <code className="px-1 py-0.5 bg-white/70 rounded">
                    /admin/users
                  </code>
                  . Si le backend n&apos;est pas encore prêt, cette page
                  affichera une erreur 404.
                </p>
              </div>
            </div>
          </div>
        )}

        {!apiNotReady && lookupsError && (
          <div className="px-4 pb-4">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-medium">Lookups dynamiques indisponibles</p>
                <p className="text-xs mt-1">
                  Chargement projets/régions impossible: {lookupsError}. Les valeurs de secours sont utilisées.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {error && !apiNotReady && (
          <div className="p-4 bg-red-50 border-b border-red-100 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <div>
              <p className="font-medium">Erreur de chargement</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          </div>
        )}

        <UsersTable
          users={users}
          total={total}
          page={page}
          pageSize={pageSize}
          loading={loading}
          error={error}
          onPageChange={setPage}
          onView={(u) => setSelected(u)}
          onToggleActive={async (u) => {
            await updateUser(u.id, { is_active: !u.is_active });
            refresh();
          }}
          onResetPassword={handleResetPassword}
          onDelete={handleDelete}
        />
      </div>

      {/* Fiche utilisateur (sheet) */}
      <UserSheet
        isOpen={!!selected}
        user={selected}
        onClose={() => setSelected(null)}
        projects={effectiveProjects}
        regions={effectiveRegions}
        onSave={async (userId, payload) => {
          await updateUser(userId, payload);
          refresh();
          setSelected(null);
        }}
        onToggleActive={async () => {
          if (!selected) return;
          await updateUser(selected.id, { is_active: !selected.is_active });
          refresh();
          setSelected(null);
        }}
        onResetPassword={async (userId) => {
          const current = selected && String(selected.id) === String(userId) ? selected : null;
          if (!current) return;
          await handleResetPassword(current);
        }}
      />

      {/* Modal creation */}
      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        projects={effectiveProjects}
        regions={effectiveRegions}
        onCreate={async (payload) => {
          await createUser(payload);
          refresh();
          setIsCreateOpen(false);
        }}
      />
    </div>
  );
}

