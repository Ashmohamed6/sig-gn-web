// sig-gn-frontend/app/(protected)/administration/config/adminConfig.ts

export type { UserRole, AdminTabId, AdminTabConfig } from "@/types/roles";
export { ADMIN_ALLOWED_ROLES, ADMIN_TABS, hasRole, canAccessAdministration, normalizeUserRole } from "@/types/roles";
