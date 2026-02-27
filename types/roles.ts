// sig-gn-frontend/types/roles.ts

export type UserRole = "lecteur" | "editeur" | "chef_projet" | "admin";

export type AdminTabId = "qa" | "imports" | "referentiels" | "users" | "tools";

export interface AdminTabConfig {
  id: AdminTabId;
  label: string;
  description: string;
  minRole: UserRole;
}

export const ADMIN_ALLOWED_ROLES: UserRole[] = ["chef_projet", "admin"];

export const ADMIN_TABS: AdminTabConfig[] = [
  {
    id: "qa",
    label: "QA",
    description: "Qualité des données (anomalies, validation)",
    minRole: "chef_projet",
  },
  {
    id: "imports",
    label: "Imports",
    description: "Journal ETL (lots, statuts, logs)",
    minRole: "chef_projet",
  },
  {
    id: "referentiels",
    label: "Référentiels",
    description: "ref.* (lecture Éditeur+, édition Admin)",
    minRole: "chef_projet",
  },
  {
    id: "users",
    label: "Utilisateurs",
    description: "Comptes, rôles, affectations projets",
    minRole: "chef_projet",
  },
  {
    id: "tools",
    label: "Tools",
    description: "Diagnostics rapides et liens d'exploitation",
    minRole: "chef_projet",
  },
];

const ROLE_ORDER: UserRole[] = ["lecteur", "editeur", "chef_projet", "admin"];

export function normalizeUserRole(raw: string | undefined | null): UserRole {
  const role = String(raw || "").toLowerCase().trim();
  if (!role) return "lecteur";

  if (role.includes("admin") || role.includes("administrateur")) return "admin";
  if (role.includes("chef") || role.includes("manager")) return "chef_projet";
  if (role.includes("editeur") || role.includes("éditeur") || role.includes("editor")) return "editeur";
  if (role.includes("lecteur") || role.includes("reader")) return "lecteur";
  return "lecteur";
}

export function hasRole(userRole: string | undefined | null, minRole: UserRole): boolean {
  const user = normalizeUserRole(userRole);
  const userIndex = ROLE_ORDER.indexOf(user);
  const minIndex = ROLE_ORDER.indexOf(minRole);
  return userIndex >= minIndex;
}

export function canAccessAdministration(userRole: string | undefined | null): boolean {
  return ADMIN_ALLOWED_ROLES.includes(normalizeUserRole(userRole));
}
