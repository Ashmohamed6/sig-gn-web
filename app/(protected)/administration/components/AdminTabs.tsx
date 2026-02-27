"use client";

import React from "react";
import {
  ShieldCheck,
  FolderSync,
  Database,
  Users,
  Wrench,
} from "lucide-react";
import { ADMIN_TABS, type AdminTabId, type UserRole, hasRole } from "../config/adminConfig";

const TAB_ICONS: Record<AdminTabId, React.ElementType> = {
  qa: ShieldCheck,
  imports: FolderSync,
  referentiels: Database,
  users: Users,
  tools: Wrench,
};

interface AdminTabsProps {
  userRole: UserRole;
  activeTab: AdminTabId;
  onChange: (id: AdminTabId) => void;
}

export default function AdminTabs({ userRole, activeTab, onChange }: AdminTabsProps) {
  const visibleTabs = ADMIN_TABS.filter((t) => hasRole(userRole, t.minRole));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <p className="text-sm font-semibold text-slate-800">Administration</p>
        <p className="text-xs text-slate-500">Qualite, imports, referentiels, utilisateurs, tools</p>
      </div>

      <div className="px-2 py-2 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {visibleTabs.map((tab) => {
            const Icon = TAB_ICONS[tab.id];
            const isActive = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors " +
                  (isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-100")
                }
                title={tab.description}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

