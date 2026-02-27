"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Save, KeyRound, UserCheck, UserX } from "lucide-react";
import type { AdminUser, UpdateUserPayload, ApiUserRole, UserProject } from "../types";

const ROLE_LABEL: Record<ApiUserRole, string> = {
  reader: "Lecteur",
  editor: "Superviseur (Editeur / Analyste)",
  manager: "Chef d'equipe (Admin N1)",
  project_manager: "Chef projet (Admin N2)",
  admin: "Admin global",
};

interface UserSheetProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  projects: UserProject[];
  regions: Array<{ id: string; nom: string }>;
  onSave: (userId: string | number, payload: UpdateUserPayload) => Promise<void>;
  onToggleActive: (userId: string | number, isActive: boolean) => Promise<void>;
  onResetPassword: (userId: string | number) => Promise<void>;
}

function getErrorMessage(errorValue: unknown, fallback: string): string {
  if (errorValue instanceof Error && errorValue.message.trim()) {
    return errorValue.message;
  }
  return fallback;
}

export default function UserSheet({
  isOpen,
  onClose,
  user,
  projects,
  regions,
  onSave,
  onToggleActive,
  onResetPassword,
}: UserSheetProps) {
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [role, setRole] = useState<ApiUserRole>("reader");
  const [regionId, setRegionId] = useState<string>("");
  const [projectIds, setProjectIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    setRole(user.role || "reader");
    setRegionId(user.region || "");
    setProjectIds((user.projects || []).map((p) => p.project_id));
    setError(null);
  }, [user]);

  const fullName = useMemo(() => {
    const full = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
    return full || user?.username || user?.email || "Utilisateur";
  }, [user]);

  if (!isOpen || !user) return null;

  const toggleProject = (projectId: string) => {
    setProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((x) => x !== projectId) : [...prev, projectId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const payload: UpdateUserPayload = {
        role,
        region_id: regionId || undefined,
        project_ids: projectIds.length > 0 ? projectIds : undefined,
      };
      await onSave(user.id, payload);
      onClose();
    } catch (errorValue: unknown) {
      setError(getErrorMessage(errorValue, "Erreur lors de l'enregistrement"));
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    setResetting(true);
    setError(null);

    try {
      await onResetPassword(user.id);
    } catch (errorValue: unknown) {
      setError(getErrorMessage(errorValue, "Erreur lors du reset mot de passe"));
    } finally {
      setResetting(false);
    }
  };

  const handleToggleActive = async () => {
    setError(null);
    try {
      await onToggleActive(user.id, !user.is_active);
      onClose();
    } catch (errorValue: unknown) {
      setError(getErrorMessage(errorValue, "Erreur lors du changement de statut"));
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-600 to-teal-600">
          <div className="flex items-start justify-between">
            <div className="text-white">
              <p className="text-sm opacity-80">Utilisateur</p>
              <h2 className="text-xl font-semibold mt-1">{fullName}</h2>
              <p className="text-xs opacity-80 mt-1">{user.email}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button
              onClick={handleResetPassword}
              disabled={resetting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm transition-colors disabled:opacity-60"
            >
              <KeyRound className="w-4 h-4" />
              {resetting ? "En cours..." : "Reset mot de passe"}
            </button>

            <button
              onClick={handleToggleActive}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm transition-colors"
            >
              {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              {user.is_active ? "Desactiver" : "Activer"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50">
            <div>
              <p className="text-sm font-semibold text-gray-900">Statut</p>
              <p className="text-xs text-gray-500">Compte actif / inactif</p>
            </div>
            <span
              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${
                user.is_active
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                  : "bg-gray-100 text-gray-700 ring-gray-600/20"
              }`}
            >
              {user.is_active ? "Actif" : "Inactif"}
            </span>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Role</h3>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as ApiUserRole)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            >
              {(Object.keys(ROLE_LABEL) as ApiUserRole[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Region</h3>
            <select
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            >
              <option value="">Aucune</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Projets</h3>
            <p className="text-xs text-gray-500 mb-3">Affectations FIERE / AGRIECO</p>
            <div className="flex flex-wrap gap-2">
              {projects.map((p) => {
                const checked = projectIds.includes(p.project_id);
                return (
                  <button
                    key={p.project_id}
                    type="button"
                    onClick={() => toggleProject(p.project_id)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      checked
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {p.code_fonc}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 bg-white">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Informations</h3>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Derniere connexion</span>
                <span className="text-gray-800">
                  {user.last_login ? new Date(user.last_login).toLocaleString("fr-FR") : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cree le</span>
                <span className="text-gray-800">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "-"}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Fermer
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </>
  );
}
