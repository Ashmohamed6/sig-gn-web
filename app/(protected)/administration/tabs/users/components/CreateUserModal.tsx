"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Loader2, UserPlus } from "lucide-react";
import type { CreateUserPayload, ApiUserRole as UserRole, UserProject } from "../types";

const ROLE_LABEL: Record<UserRole, string> = {
  reader: "Lecteur",
  editor: "Superviseur (Editeur / Analyste)",
  manager: "Chef d'equipe (Admin N1)",
  project_manager: "Chef projet (Admin N2)",
  admin: "Admin global",
};

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: UserProject[];
  regions: Array<{ id: string; nom: string }>;
  onCreate: (payload: CreateUserPayload) => Promise<void>;
}

interface ApiLikeError {
  response?: {
    data?: {
      detail?: string;
    };
  };
}

function getErrorMessage(errorValue: unknown, fallback: string): string {
  if (errorValue instanceof Error && errorValue.message.trim()) {
    return errorValue.message;
  }

  const apiError = errorValue as ApiLikeError;
  if (typeof apiError?.response?.data?.detail === "string" && apiError.response.data.detail.trim()) {
    return apiError.response.data.detail;
  }

  return fallback;
}

function sanitizeUsernameSegment(input: string): string {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/[-._]{2,}/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "");
}

function buildAutoUsername(email: string, firstName: string, lastName: string): string {
  const emailLocal = sanitizeUsernameSegment(String(email || "").split("@")[0] || "");
  const first = sanitizeUsernameSegment(firstName);
  const last = sanitizeUsernameSegment(lastName);

  let base = "";
  if (emailLocal) {
    base = emailLocal;
  } else if (first || last) {
    base = [first, last].filter(Boolean).join(".");
  } else {
    base = "utilisateur";
  }

  if (base.length < 3) {
    const suffix = Date.now().toString(36).slice(-4);
    base = `${base || "user"}-${suffix}`;
  }

  return base.slice(0, 150);
}

export default function CreateUserModal({
  isOpen,
  onClose,
  projects,
  regions,
  onCreate,
}: CreateUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [role, setRole] = useState<UserRole>("reader");
  const [regionId, setRegionId] = useState<string>("");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [usernameTouched, setUsernameTouched] = useState(false);

  const fullName = useMemo(
    () => [firstName, lastName].filter(Boolean).join(" ").trim(),
    [firstName, lastName]
  );

  useEffect(() => {
    if (usernameTouched) return;
    const generated = buildAutoUsername(email, firstName, lastName);
    setUsername(generated);
  }, [email, firstName, lastName, usernameTouched]);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setUsername("");
    setPassword("");
    setPasswordConfirm("");
    setRole("reader");
    setRegionId("");
    setProjectIds([]);
    setIsActive(true);
    setUsernameTouched(false);
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleProject = (projectId: string) => {
    setProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((x) => x !== projectId) : [...prev, projectId]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!email.trim()) throw new Error("Email obligatoire");
      if (!username.trim()) throw new Error("Username obligatoire");
      if (!password) throw new Error("Mot de passe obligatoire");
      if (password !== passwordConfirm) throw new Error("Les mots de passe ne correspondent pas");
      if (password.length < 8) throw new Error("Mot de passe trop court (min 8 caracteres)");

      const payload: CreateUserPayload = {
        username: username.trim(),
        email: email.trim(),
        password,
        password_confirm: passwordConfirm,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role,
        is_active: isActive,
        region_id: regionId || undefined,
        project_ids: projectIds.length > 0 ? projectIds : undefined,
      };

      await onCreate(payload);
      onClose();
    } catch (errorValue: unknown) {
      setError(getErrorMessage(errorValue, "Erreur lors de la creation"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 my-8">
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm opacity-80">Utilisateurs</p>
                <h2 className="text-xl font-semibold mt-1">Creer un utilisateur</h2>
                {fullName && <p className="text-xs opacity-80 mt-1">{fullName}</p>}
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prenom</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  placeholder="Ex: Mohamed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  placeholder="Ex: SAKA"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  placeholder="user@sig-gn.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                  <span className="text-xs text-gray-500 ml-1">(auto-genere)</span>
                </label>
                <input
                  value={username}
                  onChange={(e) => {
                    const value = e.target.value;
                    setUsername(value);
                    setUsernameTouched(value.trim().length > 0);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  placeholder="username"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  placeholder="Min 8 caracteres"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmation *</label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  placeholder="Confirmer le mot de passe"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                >
                  {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
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
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Compte actif
                </label>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Projets ({projects.length} disponibles)</p>
                  <p className="text-xs text-gray-500">Affectations FIERE / AGRIECO</p>
                </div>
              </div>

              {projects.length === 0 ? (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                  Aucun projet disponible.
                </div>
              ) : (
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
                        title={p.libelle_public || p.code_fonc}
                      >
                        {p.code_fonc}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between rounded-b-2xl">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {loading ? "Creation..." : "Creer"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
