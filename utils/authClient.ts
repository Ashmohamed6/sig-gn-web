// utils/authClient.ts

/**
 * Client auth cote front via routes Next (/api/auth/*).
 * - Tokens JWT stockes uniquement en cookies HTTP-only (serveur)
 * - User courant via /api/auth/me/
 * - Projet courant via localStorage (currentProject)
 */

const AUTH_BASE = "/api/auth";
const PROJECT_STORAGE_KEY = "currentProject";
const PROJECT_CHANGE_EVENT = "sig:current-project-changed";

/* ---------- Types ---------- */

type AuthRouteResponse = {
  success?: boolean;
  message?: string;
};

export interface RefProject {
  project_id: string;
  code_fonc: string;
  libelle_public: string;
  actif?: boolean;
}

export interface User {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email: string;
  role?: string;
  is_superuser?: boolean;
  projects?: RefProject[];
  default_project?: unknown;
  default_project_code?: string | null;
}

/* ---------- Helpers ---------- */

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function safeUpper(s: unknown): string {
  return String(s ?? "").trim().toUpperCase();
}

function emitProjectChanged(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(PROJECT_CHANGE_EVENT));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function guessProjectCodeFromString(s: string): string | null {
  const up = safeUpper(s);
  if (up.includes("FIERE")) return "FIERE";
  if (up.includes("AGRIECO")) return "AGRIECO";
  return null;
}

function normalizeProjectObject(p: unknown): RefProject | null {
  const obj = asRecord(p);
  if (!obj) return null;

  if (obj.project_id && obj.code_fonc) {
    return {
      project_id: String(obj.project_id),
      code_fonc: safeUpper(obj.code_fonc),
      libelle_public: String(obj.libelle_public ?? obj.code_fonc ?? ""),
    };
  }

  const code =
    safeUpper(obj.code_fonc) ||
    safeUpper(obj.code) ||
    safeUpper(obj.code_kobo) ||
    guessProjectCodeFromString(String(p)) ||
    "";

  if (!code) return null;

  const pid = String(obj.project_id ?? obj.id ?? obj.pk ?? code);
  const label = String(obj.libelle_public ?? obj.libelle ?? obj.name ?? obj.titre ?? code);

  return {
    project_id: pid,
    code_fonc: code,
    libelle_public: label,
  };
}

function normalizeUserProjects(user: unknown): RefProject[] {
  const obj = asRecord(user);
  if (!obj) return [];

  const projects = obj.projects;
  if (Array.isArray(projects) && projects.length) {
    return projects
      .map(normalizeProjectObject)
      .filter((project): project is RefProject => Boolean(project));
  }

  const defaultProject = obj.default_project;
  const dpObj = normalizeProjectObject(defaultProject);
  if (dpObj) return [dpObj];

  const codeFromField = safeUpper(obj.default_project_code);
  if (codeFromField) {
    return [
      {
        project_id: codeFromField,
        code_fonc: codeFromField,
        libelle_public: codeFromField,
      },
    ];
  }

  if (typeof defaultProject === "string") {
    const code = guessProjectCodeFromString(defaultProject);
    if (code) {
      return [
        {
          project_id: code,
          code_fonc: code,
          libelle_public: defaultProject,
        },
      ];
    }
  }

  return [];
}

async function readJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/* ---------- Compat API (cookies-only, no localStorage token) ---------- */

export function getAccessToken(): string | null {
  return null;
}

export function getRefreshToken(): string | null {
  return null;
}

/* ---------- User ---------- */

export async function getUser(): Promise<User | null> {
  try {
    const res = await fetch(`${AUTH_BASE}/me`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    const user = await readJsonSafe(res);
    const userObj = asRecord(user);
    if (!userObj) {
      return null;
    }

    return {
      ...userObj,
      projects: normalizeUserProjects(userObj),
    } as User;
  } catch {
    return null;
  }
}

export const getCurrentUser = getUser;

/* ---------- Login / Logout ---------- */

export async function login(email: string, password: string): Promise<User | null> {
  clearCurrentProject();

  const res = await fetch(`${AUTH_BASE}/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-SIG-Intent": "1",
    },
    body: JSON.stringify({
      username: email.trim(),
      password,
    }),
  });

  const data = (await readJsonSafe(res)) as AuthRouteResponse | null;

  if (!res.ok) {
    throw new Error(
      data?.message || "Identifiants invalides. Verifiez votre email et votre mot de passe."
    );
  }

  return getUser();
}

export function logout(): void {
  if (isBrowser()) {
    fetch(`${AUTH_BASE}/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "X-SIG-Intent": "1",
      },
    }).catch(() => {
      // no-op
    });
  }

  clearCurrentProject();
}

/* ---------- Project management ---------- */

export function selectProject(project: RefProject): void {
  if (!isBrowser()) return;
  if (!project?.code_fonc) return;

  const projectData: RefProject = {
    project_id: project.project_id ?? project.code_fonc,
    code_fonc: safeUpper(project.code_fonc),
    libelle_public: project.libelle_public ?? project.code_fonc,
  };

  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projectData));
  emitProjectChanged();
}

export function getCurrentProject(): RefProject | null {
  if (!isBrowser()) return null;

  const raw = localStorage.getItem(PROJECT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as RefProject;
    if (!parsed?.code_fonc) {
      localStorage.removeItem(PROJECT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(PROJECT_STORAGE_KEY);
    return null;
  }
}

export function hasCurrentProject(): boolean {
  return getCurrentProject() !== null;
}

export function clearCurrentProject(): void {
  if (isBrowser()) {
    localStorage.removeItem(PROJECT_STORAGE_KEY);
    emitProjectChanged();
  }
}
