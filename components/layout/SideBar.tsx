"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useActiveProject } from "@/contexts/ProjectContext";
import { useUser } from "@/hooks/useUser";
import { logout } from "@/utils/authClient";

import {
  LayoutDashboard,
  Map,
  Database,
  Settings,
  TrendingUp,
  User,
  ChevronRight,
  ChevronDown,
  LogOut,
  Shield,
  FolderSync,
} from "lucide-react";

type MenuItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  children?: MenuItem[];
  adminOnly?: boolean;
};

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { project } = useActiveProject();
  const { data: user } = useUser();

  const userRoleRaw = String(user?.role || "reader").toLowerCase();
  const isAdmin = userRoleRaw.includes("admin");
  const canAccessAdministration =
    isAdmin || userRoleRaw.includes("manager") || userRoleRaw.includes("chef");

  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const toggleMenu = (menuId: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId]
    );
  };

  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [
      {
        id: "dashboard",
        label: "Tableau de bord",
        icon: LayoutDashboard,
        path: "/dashboard",
      },
      {
        id: "carto",
        label: "Cartographie",
        icon: Map,
        path: "/cartographie",
      },
      {
        id: "data",
        label: "Données",
        icon: Database,
        path: "/data",
      },
    ];

    // Outils pour editor/manager/admin
    if (["editor", "manager", "project_manager", "admin", "chef_projet"].includes(userRoleRaw)) {
      items.push({
        id: "workflow",
        label: "Workflow",
        icon: FolderSync,
        path: "/workflow",
      });

      items.push({
        id: "tools",
        label: "Outils",
        icon: Settings,
        path: "/tools",
      });
    }

    items.push({
      id: "analyses",
      label: "Analyses",
      icon: TrendingUp,
      path: "/analyses",
    });

    // Administration (N1/N2/Admin)
    if (canAccessAdministration) {
      items.push({
        id: "admin",
        label: "Administration",
        icon: Shield,
        path: "/administration",
      });

      // Changement de projet (admin uniquement)
      items.push({
        id: "project-selection",
        label: "Changer de projet",
        icon: FolderSync,
        path: "/project-selection?change=true",
        adminOnly: true,
      });
    }

    return items;
  }, [userRoleRaw, canAccessAdministration]);

  const onLogout = () => {
    logout();
    router.push("/login");
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    if (item.adminOnly && !isAdmin) return null;

    const isActive = item.path
      ? pathname === item.path || pathname.startsWith(item.path + "/")
      : false;

    const hasChildren = !!(item.children && item.children.length > 0);
    const isExpanded = expandedMenus.includes(item.id);

    const baseClass =
      "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all";
    const activeClass = "bg-green-100 text-green-700";
    const idleClass = "text-gray-700 hover:bg-gray-100";

    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleMenu(item.id)}
            className={`${baseClass} ${isActive || isExpanded ? activeClass : idleClass}`}
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children?.map((child) => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={item.id}>
        <Link
          href={item.path || "#"}
          className={`${baseClass} ${level > 0 ? "pl-12" : ""} ${
            isActive ? activeClass : idleClass
          }`}
        >
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
        </Link>
      </div>
    );
  };

  return (
    <aside
      className={`${
        isOpen ? "w-[290px]" : "w-0"
      } bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden flex flex-col`}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0 bg-gradient-to-br from-green-600 to-green-700">
        <div className="flex items-center justify-center mb-4">
          <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center shadow-lg p-2">
            <Image
              src="/armoirie-446x500.png"
              alt="Armoirie"
              width={56}
              height={56}
              priority
            />
          </div>
        </div>

        <h2 className="text-center text-lg font-bold text-white mb-1">
          ESPACE SIG
        </h2>
        <p className="text-center text-xs text-white/90">
          Système d&apos;Information
          <br />
          Géographique
        </p>
      </div>

      {/* Projet en cours */}
      <div className="p-4 border-b border-gray-200">
        <div className="rounded-xl bg-green-50 border border-green-100 p-3">
          <p className="text-[11px] font-semibold text-green-800 uppercase">
            Projet en cours
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {project?.libelle_public || "-"}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Code interne :{" "}
            <span className="font-semibold">{project?.code_fonc || "-"}</span>
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
        {menuItems.map((item) => renderMenuItem(item))}
      </nav>

      {/* Deconnexion */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Déconnexion</span>
        </button>
      </div>

      {/* Footer utilisateur */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center shadow-sm">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {isAdmin ? "Admin" : user?.first_name || "Utilisateur"}
            </p>
            <p className="text-xs text-gray-500 capitalize truncate">
              {isAdmin ? "Administrateur" : userRoleRaw}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
