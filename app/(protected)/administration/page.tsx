"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Loader2,
  AlertCircle,
  Home,
  FolderSync,
  LogOut,
} from "lucide-react";

import {
  getCurrentProject,
  getUser,
  logout,
  type RefProject,
} from "@/utils/authClient";

import AdminTabs from "./components/AdminTabs";
import {
  type AdminTabId,
  type UserRole,
  canAccessAdministration,
  normalizeUserRole,
} from "./config/adminConfig";

import QaTab from "./tabs/qa/QaTab";
import ImportsTab from "./tabs/imports/ImportsTab";
import ReferentielsTab from "./tabs/referentiels/ReferentielsTab";
import UsersTab from "./tabs/users/UsersTab";
import ToolsTab from "./tabs/tools/ToolsTab";

interface UserInfo {
  first_name?: string;
  last_name?: string;
  username?: string;
  role?: UserRole;
  raw_role?: string;
}

interface RawUserInfo {
  first_name?: string;
  last_name?: string;
  username?: string;
  role?: string;
  user_role?: string;
  userRole?: string;
}

function getErrorMessage(errorValue: unknown, fallback: string): string {
  if (errorValue instanceof Error && errorValue.message.trim()) {
    return errorValue.message;
  }
  return fallback;
}



export default function AdministrationPage() {
  const router = useRouter();

  const [project, setProject] = useState<RefProject | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AdminTabId>("qa");

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError(null);

        const currentProject = getCurrentProject();
        if (!currentProject) {
          router.push("/project-selection");
          return;
        }
        setProject(currentProject);

        const userData = (await getUser()) as RawUserInfo | null;
        if (!userData) {
          router.push("/login");
          return;
        }

        // On tente de récupérer le rôle depuis la réponse API.
        // Adapte ce mapping selon ton backend (ex: userData.role, userData.user_role, userData.profile.role...)
        const rawRole = String(userData.role || userData.user_role || userData.userRole || "")
          .trim()
          .toLowerCase();
        const role: UserRole = normalizeUserRole(rawRole);

        setUser({
          first_name: userData.first_name,
          last_name: userData.last_name,
          username: userData.username,
          role,
          raw_role: rawRole,
        });
      } catch (errorValue: unknown) {
        setError(getErrorMessage(errorValue, "Erreur de chargement"));
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  const userName = useMemo(() => {
    const full = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
    return full || user?.username || "Utilisateur";
  }, [user]);

  const userRole: UserRole = normalizeUserRole(user?.role);

  const canAccess = useMemo(() => {
    return canAccessAdministration(userRole);
  }, [userRole]);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/login");
  }, [router]);

  const handleChangeProject = useCallback(() => {
    router.push("/project-selection?change=true");
  }, [router]);

  const handleGoToDashboard = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Chargement de l&apos;administration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={handleGoToDashboard}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
          <p className="text-amber-800 font-semibold">Accès restreint</p>
          <p className="text-amber-700 mt-2">
            Le module Administration est accessible aux rôles Chef d&apos;équipe (N1), Chef projet (N2) et Admin global.
          </p>
          <p className="text-amber-700 mt-2">
            Rôle actuel : <span className="font-mono font-semibold">{userRole}</span>
          </p>
          <button
            onClick={handleGoToDashboard}
            className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Bandeau module (mêmes codes couleurs que cartographie) */}
      <header className="flex-shrink-0 bg-gradient-to-r from-[#CE1126] via-[#FFCD00] to-[#009639] shadow-lg rounded-xl overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white drop-shadow">Administration</h1>
              <p className="text-xs text-white/85">{project?.libelle_public || project?.code_fonc}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGoToDashboard}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition text-sm text-white"
              title="Tableau de bord"
            >
              <Home className="h-4 w-4" />
              <span className="hidden md:inline">Dashboard</span>
            </button>

            <button
              onClick={handleChangeProject}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition text-sm text-white"
              title="Changer de projet"
            >
              <FolderSync className="h-4 w-4" />
              <span className="hidden md:inline">Projet</span>
            </button>

            <div className="text-right hidden sm:block px-2">
              <p className="text-sm font-medium text-white">{userName}</p>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition"
              title="Déconnexion"
            >
              <LogOut className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="mt-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="px-4 pt-4">
          <AdminTabs activeTab={activeTab} onChange={setActiveTab} userRole={userRole} />
        </div>

        {/* Body */}
        <div className="px-4 pb-4 pt-3">
          {activeTab === "qa" && <QaTab userRole={userRole} />}
          {activeTab === "imports" && <ImportsTab userRole={userRole} />}
          {activeTab === "referentiels" && <ReferentielsTab userRole={userRole} rawRole={user?.raw_role} />}
          {activeTab === "users" && <UsersTab userRole={userRole} activeProjectCode={project?.code_fonc} />}
          {activeTab === "tools" && <ToolsTab userRole={userRole} activeProjectCode={project?.code_fonc} />}
        </div>
      </main>
    </div>
  );
}
