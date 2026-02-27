"use client";

import React from "react";
import type { ApiUserRole } from "../types";

const ROLE_LABEL: Record<ApiUserRole, string> = {
  reader: "Lecteur",
  editor: "Superviseur",
  manager: "Chef d'équipe (N1)",
  project_manager: "Chef projet (N2)",
  admin: "Admin global",
};

const ROLE_BADGE: Record<ApiUserRole, string> = {
  reader: "bg-slate-100 text-slate-700 ring-slate-600/20",
  editor: "bg-blue-100 text-blue-800 ring-blue-600/20",
  manager: "bg-amber-100 text-amber-800 ring-amber-600/20",
  project_manager: "bg-indigo-100 text-indigo-800 ring-indigo-600/20",
  admin: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
};

export function RoleBadge({ role }: { role: ApiUserRole }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${ROLE_BADGE[role]}`}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

export function ProjectsBadges({
  projects,
}: {
  projects: { code_fonc: string; libelle_public?: string }[];
}) {
  if (!projects?.length) return <span className="text-sm text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {projects.map((p, idx) => (
        <span
          key={`${p.code_fonc}-${idx}`}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset bg-gray-100 text-gray-800 ring-gray-600/20"
          title={p.libelle_public || p.code_fonc}
        >
          {p.code_fonc}
        </span>
      ))}
    </div>
  );
}
