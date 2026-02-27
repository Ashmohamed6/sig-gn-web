"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminApi } from "../../hooks/useAdminApi";
import type {
  AdminUser,
  CreateUserPayload,
  PagedResult,
  UpdateUserPayload,
  ApiUserRole,
} from "./types";

// ⚠️ Django REST Framework est configuré avec des URLs *avec slash final*.
// Sans slash, Django renvoie souvent une redirection 301/302.
// Dans un navigateur, une redirection 301/302 peut convertir un POST/PUT en GET,
// ce qui fait que la création / mise à jour ne s’exécute pas.
const USERS_ENDPOINT = "/admin/users";
const USER_DETAIL_ENDPOINT = (id: string | number) => `/admin/users/${encodeURIComponent(id)}`;
const USER_RESET_PWD_ENDPOINT = (id: string | number) =>
  `/admin/users/${encodeURIComponent(id)}/reset-password`;

export interface UsersQuery {
  page: number;
  pageSize: number;
  search: string;
  status: "all" | "active" | "inactive";
  role: ApiUserRole | "all"; // ✅ role filtrage = backend EN
  project?: string | "";
  region?: string | "";
}

export interface ResetPasswordResponse {
  detail?: string;
  temporary_password?: string;
}

interface RawUserProject {
  project_id?: string;
  id?: string;
  code_fonc?: string;
  code?: string;
  libelle_public?: string;
  label?: string;
}

interface RawUserRegion {
  id_region?: string;
  nom?: string;
}

interface RawAdminUser {
  id?: string | number;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  is_active?: boolean;
  is_superuser?: boolean;
  role?: string;
  role_display?: string;
  region?: string;
  region_data?: RawUserRegion | null;
  projects?: RawUserProject[];
  default_project?: string;
  project_count?: number;
  last_login?: string | null;
  date_joined?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

function getErrorMessage(errorValue: unknown, fallback: string): string {
  if (errorValue instanceof Error && errorValue.message.trim()) {
    return errorValue.message;
  }
  return fallback;
}

/** Petit guard pour éviter de caster n'importe quoi */
function isApiUserRole(v: unknown): v is ApiUserRole {
  return v === "reader" || v === "editor" || v === "manager" || v === "project_manager" || v === "admin";
}

function normalizeUser(raw: RawAdminUser): AdminUser {
  const roleRaw = raw?.role ?? "reader";
  const role: ApiUserRole = isApiUserRole(roleRaw) ? roleRaw : "reader";

  const projectsRaw = raw?.projects ?? [];
  const projects = Array.isArray(projectsRaw)
    ? projectsRaw.map((p) => ({
        project_id: p?.project_id ?? p?.id ?? "",
        code_fonc: p?.code_fonc ?? p?.code ?? "",
        libelle_public: p?.libelle_public ?? p?.label,
      }))
    : [];

  const regionData = raw?.region_data;
  const normalizedRegionData =
    regionData && regionData.id_region && regionData.nom
      ? {
          id_region: String(regionData.id_region),
          nom: String(regionData.nom),
        }
      : undefined;

  return {
    id: raw?.id ?? Math.random(),
    first_name: raw?.first_name ?? "",
    last_name: raw?.last_name ?? "",
    username: raw?.username ?? "",
    email: raw?.email ?? "",
    is_active: Boolean(raw?.is_active ?? true),
    is_superuser: Boolean(raw?.is_superuser ?? false),

    // ✅ AdminUser.role = ApiUserRole (EN)
    role: role,
    role_display: raw?.role_display ?? "",

    region: raw?.region ?? undefined,
    region_data: normalizedRegionData,

    projects: projects,
    default_project: raw?.default_project ?? undefined,
    project_count: raw?.project_count ?? projects.length,

    last_login: raw?.last_login ?? null,
    date_joined: raw?.date_joined ?? null,
    created_at: raw?.created_at ?? undefined,
    updated_at: raw?.updated_at ?? undefined,
  };
}

export function useAdminUsers(initialProjectCode?: string) {
  const { apiFetch } = useAdminApi();
  const request = apiFetch as <T = unknown>(endpoint: string, init?: RequestInit) => Promise<T>;

  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [query, setQuery] = useState<UsersQuery>({
    page: 1,
    pageSize: 25,
    search: "",
    status: "all",
    role: "all",
    project: initialProjectCode || "",
    region: "",
  });

  useEffect(() => {
    const nextProject = String(initialProjectCode || "").trim();
    setQuery((prev) => {
      const currentProject = String(prev.project || "").trim();
      if (currentProject === nextProject) return prev;
      return {
        ...prev,
        page: 1,
        project: nextProject,
      };
    });
  }, [initialProjectCode]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(Math.max(1, query.page)));
    p.set("page_size", String(Math.max(1, query.pageSize)));
    if (query.search) p.set("search", query.search);

    if (query.status && query.status !== "all") {
      p.set("is_active", query.status === "active" ? "true" : "false");
    }

    // ✅ Backend attend EN
    if (query.role && query.role !== "all") p.set("role", query.role);

    if (query.project) p.set("project", query.project);
    if (query.region) p.set("region", query.region);
    return p;
  }, [query]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWarning(null);

    try {
      const url = `${USERS_ENDPOINT}?${params.toString()}`;

      const res = await request<PagedResult<RawAdminUser> | RawAdminUser[]>(url);

      if (Array.isArray(res)) {
        const normalized = res.map(normalizeUser);
        setItems(normalized);
        setTotal(normalized.length);
      } else {
        const normalized = (res?.results ?? []).map(normalizeUser);
        setItems(normalized);
        setTotal(Number(res?.count ?? normalized.length));
      }
    } catch (errorValue: unknown) {
      const msg = getErrorMessage(errorValue, "Erreur de chargement");
      setError(msg);

      if (String(msg).includes("404")) {
        setWarning("Endpoint users non disponible côté backend.");
      }

      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [request, params]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = useCallback(
    async (payload: CreateUserPayload) => {
      await request(USERS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await fetchUsers();
    },
    [request, fetchUsers]
  );

  const updateUser = useCallback(
    async (id: string | number, payload: UpdateUserPayload) => {
      if (!id) {
        throw new Error("ID utilisateur manquant");
      }

      await request(USER_DETAIL_ENDPOINT(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await fetchUsers();
    },
    [request, fetchUsers]
  );

  const deleteUser = useCallback(
    async (id: string | number) => {
      if (!id) {
        throw new Error("ID utilisateur manquant");
      }

      await request(USER_DETAIL_ENDPOINT(id), {
        method: "DELETE",
      });

      await fetchUsers();
    },
    [request, fetchUsers]
  );

  const resetPassword = useCallback(
    async (id: string | number) => {
      const response = await request<ResetPasswordResponse>(USER_RESET_PWD_ENDPOINT(id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      return response;
    },
    [request]
  );

  const { page, pageSize, search, status, role, region } = query;

  const setPage = useCallback((p: number) => setQuery((q) => ({ ...q, page: p })), []);

  const setPageSize = useCallback((ps: number) => setQuery((q) => ({ ...q, pageSize: ps })), []);

  const setSearch = useCallback((s: string) => setQuery((q) => ({ ...q, search: s })), []);

  const setStatus = useCallback((s: UsersQuery["status"]) => setQuery((q) => ({ ...q, status: s })), []);

  const setRole = useCallback((r: UsersQuery["role"]) => setQuery((q) => ({ ...q, role: r })), []);

  const setRegion = useCallback((r: UsersQuery["region"]) => setQuery((q) => ({ ...q, region: r || "" })), []);

  return {
    users: items,
    items,
    total,
    loading,
    error,
    warning,

    query,
    setQuery,
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

    refresh: fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
  };
}
