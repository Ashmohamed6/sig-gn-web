"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Save, RefreshCw, KeyRound } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/useUser";
import type { User } from "@/utils/authClient";

type ProfileFormState = {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
};

type PasswordFormState = {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
};

function normalizeEndpoint(endpoint: string): string {
  if (!endpoint) return "/";
  return endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
}

const PRIORITY_ERROR_KEYS = [
  "detail",
  "message",
  "error",
  "current_password",
  "new_password",
  "new_password_confirm",
  "non_field_errors",
] as const;

function extractErrorString(value: unknown): string | null {
  if (typeof value === "string") {
    const cleaned = value.trim();
    if (!cleaned) return null;
    if (cleaned.startsWith("<!DOCTYPE") || cleaned.startsWith("<html")) {
      return null;
    }
    return cleaned;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const nested = extractErrorString(entry);
      if (nested) return nested;
    }
    return null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  for (const key of PRIORITY_ERROR_KEYS) {
    const nested = extractErrorString(record[key]);
    if (nested) return nested;
  }

  for (const [key, entry] of Object.entries(record)) {
    if (PRIORITY_ERROR_KEYS.includes(key as (typeof PRIORITY_ERROR_KEYS)[number])) {
      continue;
    }
    const nested = extractErrorString(entry);
    if (nested) return nested;
  }

  return null;
}

function buildApiErrorMessage(payload: unknown, status: number): string {
  const extracted = extractErrorString(payload);
  if (extracted) return extracted;
  return `Erreur ${status}`;
}

async function proxyJson<T = unknown>(endpoint: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers || {});
  const isFormDataBody = typeof FormData !== "undefined" && init.body instanceof FormData;

  if (!isFormDataBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.set("X-SIG-Intent", "1");
  }

  const response = await fetch(`/api/proxy${normalizeEndpoint(endpoint)}`, {
    ...init,
    headers,
    credentials: "include",
  });

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(buildApiErrorMessage(payload, response.status));
  }

  return payload as T;
}

function buildProfileForm(user: User): ProfileFormState {
  return {
    username: user.username || "",
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    email: user.email || "",
  };
}

function roleLabel(rawRole: string | undefined): string {
  const role = String(rawRole || "").trim().toLowerCase();
  if (!role) return "Utilisateur";
  if (role === "reader") return "Lecteur";
  if (role === "editor") return "Editeur";
  if (role === "manager") return "Chef d'equipe (Admin N1)";
  if (role === "project_manager") return "Chef de projet (Admin N2)";
  if (role === "admin") return "Administrateur global";
  return role;
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useUser();

  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
  });
  const [initialProfile, setInitialProfile] = useState<ProfileFormState>({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
  });
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    current_password: "",
    new_password: "",
    new_password_confirm: "",
  });

  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    const form = buildProfileForm(user);
    setProfileForm(form);
    setInitialProfile(form);
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <p className="text-sm text-slate-500">Chargement du profil...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <p className="text-sm text-slate-500">Profil non disponible. Veuillez vous reconnecter.</p>
      </div>
    );
  }

  const fullName = [profileForm.first_name, profileForm.last_name].filter(Boolean).join(" ").trim();
  const projects = user.projects || [];
  const initials = (fullName || profileForm.username || "U")
    .split(" ")
    .map((p: string) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isProfileDirty =
    profileForm.username !== initialProfile.username ||
    profileForm.first_name !== initialProfile.first_name ||
    profileForm.last_name !== initialProfile.last_name ||
    profileForm.email !== initialProfile.email;

  const setProfileField = (field: keyof ProfileFormState, value: string) => {
    setProfileForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const setPasswordField = (field: keyof PasswordFormState, value: string) => {
    setPasswordForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const syncUserInCache = (nextUser: User) => {
    queryClient.setQueryData(["currentUser"], nextUser);
    queryClient.invalidateQueries({ queryKey: ["currentUser"] });
  };

  const handleProfileReset = () => {
    setProfileError(null);
    setProfileSuccess(null);
    setProfileForm(initialProfile);
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    const payload: ProfileFormState = {
      username: profileForm.username.trim(),
      first_name: profileForm.first_name.trim(),
      last_name: profileForm.last_name.trim(),
      email: profileForm.email.trim(),
    };

    if (!payload.username) {
      setProfileError("Le nom d'utilisateur est obligatoire.");
      return;
    }
    if (!payload.email) {
      setProfileError("L'adresse e-mail est obligatoire.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const updatedUser = await proxyJson<User>("/accounts/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      const normalized = buildProfileForm(updatedUser);
      setProfileForm(normalized);
      setInitialProfile(normalized);
      setProfileSuccess("Profil mis a jour avec succes.");
      syncUserInCache(updatedUser);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur lors de la mise a jour du profil.";
      setProfileError(message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!passwordForm.current_password) {
      setPasswordError("Le mot de passe actuel est obligatoire.");
      return;
    }
    if (!passwordForm.new_password) {
      setPasswordError("Le nouveau mot de passe est obligatoire.");
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordError("Le nouveau mot de passe doit contenir au moins 8 caracteres.");
      return;
    }
    if (passwordForm.new_password !== passwordForm.new_password_confirm) {
      setPasswordError("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }

    setIsSavingPassword(true);
    try {
      await proxyJson<{ detail?: string }>("/accounts/me/password", {
        method: "POST",
        body: JSON.stringify(passwordForm),
      });

      setPasswordForm({
        current_password: "",
        new_password: "",
        new_password_confirm: "",
      });
      setPasswordSuccess("Mot de passe modifie avec succes.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur lors du changement de mot de passe.";
      setPasswordError(message);
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Mon profil</h1>
        <p className="text-sm text-slate-600 mt-1">
          Consultez et mettez a jour les informations de votre compte.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6 space-y-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="h-12 w-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-lg font-semibold">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{fullName || profileForm.username || profileForm.email}</p>
            <p className="text-xs text-slate-500">Role : {roleLabel(user.role)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Role</p>
            <p className="text-sm text-slate-800">{roleLabel(user.role)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Projets assignes</p>
            <div className="flex flex-wrap gap-2">
              {projects.length > 0 ? (
                projects.map((project) => (
                  <span
                    key={project.project_id}
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >
                    {project.code_fonc || project.libelle_public}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">Aucun projet associe.</span>
              )}
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        <form className="space-y-4" onSubmit={handleProfileSubmit}>
          <h2 className="text-base font-semibold text-slate-900">Informations personnelles</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom d'utilisateur *</label>
              <input
                value={profileForm.username}
                onChange={(e) => setProfileField("username", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                placeholder="Votre nom d'utilisateur"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Adresse e-mail *</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileField("email", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                placeholder="vous@exemple.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prenom</label>
              <input
                value={profileForm.first_name}
                onChange={(e) => setProfileField("first_name", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                placeholder="Prenom"
                autoComplete="given-name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
              <input
                value={profileForm.last_name}
                onChange={(e) => setProfileField("last_name", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                placeholder="Nom"
                autoComplete="family-name"
              />
            </div>
          </div>

          {profileError && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{profileError}</div>
          )}

          {profileSuccess && (
            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-700">
              {profileSuccess}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={isSavingProfile || !isProfileDirty}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSavingProfile ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={handleProfileReset}
              disabled={isSavingProfile || !isProfileDirty}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className="w-4 h-4" />
              Annuler les changements
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6">
        <form className="space-y-4" onSubmit={handlePasswordSubmit}>
          <h2 className="text-base font-semibold text-slate-900">Securite du compte</h2>
          <p className="text-sm text-slate-600">
            Modifiez votre mot de passe. Le nouveau mot de passe doit contenir au moins 8 caracteres.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe actuel *</label>
              <input
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordField("current_password", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                autoComplete="current-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nouveau mot de passe *</label>
              <input
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordField("new_password", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirmation *</label>
              <input
                type="password"
                value={passwordForm.new_password_confirm}
                onChange={(e) => setPasswordField("new_password_confirm", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                autoComplete="new-password"
              />
            </div>
          </div>

          {passwordError && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{passwordError}</div>
          )}

          {passwordSuccess && (
            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-700">
              {passwordSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={isSavingPassword}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-60"
          >
            {isSavingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {isSavingPassword ? "Mise a jour..." : "Changer le mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}
