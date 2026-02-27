// sig-gn-frontend/app/(protected)/administration/tabs/users/types.ts
// Types BACKEND (EN) + mapping vers UI (FR)
// + UserRole (FR) pour compat avec les Tabs d'administration

import type { UserRole as UiUserRole } from "@/types/roles";

/** ✅ Rôle UI (FR) — utilisé par Administration (tabs, hasRole, etc.) */
export type UserRole = UiUserRole;

/** ✅ Rôle BACKEND (EN) — exactement ce que l’API Django renvoie / attend */
export type ApiUserRole = "reader" | "editor" | "manager" | "project_manager" | "admin";

/** EN -> FR */
export const API_TO_UI_ROLE: Record<ApiUserRole, UserRole> = {
  reader: "lecteur",
  editor: "editeur",
  manager: "chef_projet",
  project_manager: "chef_projet",
  admin: "admin",
};

/** FR -> EN */
export const UI_TO_API_ROLE: Record<UserRole, ApiUserRole> = {
  lecteur: "reader",
  editeur: "editor",
  chef_projet: "project_manager",
  admin: "admin",
};

export function apiRoleToUiRole(role: ApiUserRole | undefined | null): UserRole {
  if (!role) return "lecteur";
  return API_TO_UI_ROLE[role] ?? "lecteur";
}

export function uiRoleToApiRole(role: UserRole | undefined | null): ApiUserRole {
  if (!role) return "reader";
  return UI_TO_API_ROLE[role] ?? "reader";
}

/* =========================================================
   DTOs BACKEND (EN)
========================================================= */

export interface UserRegion {
  id_region: string; // ex: "GN005"
  nom: string;
}

export interface UserProject {
  project_id: string; // UUID du projet
  code_fonc: string; // "AGRIECO" ou "FIERE"
  libelle_public?: string;
}

export interface AdminUser {
  id: string | number;
  first_name?: string;
  last_name?: string;
  username?: string;
  email: string;
  is_active: boolean;
  is_superuser?: boolean;

  // ✅ backend EN
  role: ApiUserRole;
  role_display?: string;

  region?: string;
  region_data?: UserRegion;

  projects: UserProject[];
  default_project?: string;

  created_at?: string;
  updated_at?: string;
  last_login?: string | null;
  date_joined?: string | null;

  project_count?: number;
}

export interface PagedResult<T> {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;

  // ✅ backend EN
  role: ApiUserRole;

  is_active?: boolean;
  is_superuser?: boolean;
  region_id?: string;
  project_ids?: string[];
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  password?: string;
  password_confirm?: string;
  first_name?: string;
  last_name?: string;

  // ✅ backend EN
  role?: ApiUserRole;

  is_active?: boolean;
  is_superuser?: boolean;
  region_id?: string;
  project_ids?: string[];
}
