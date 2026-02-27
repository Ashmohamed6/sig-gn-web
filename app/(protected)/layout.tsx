"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { logout, type RefProject } from "@/utils/authClient";
import {
  Database,
  FolderSync,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Search,
  Settings,
  Shield,
} from "lucide-react";

type Props = {
  children: React.ReactNode;
};

const PROJECT_STORAGE_KEY = "currentProject";
const PROJECT_CHANGE_EVENT = "sig:current-project-changed";

let cachedProjectRaw: string | null | undefined;
let cachedProjectSnapshot: RefProject | null = null;

function getStoredProject(): RefProject | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(PROJECT_STORAGE_KEY);
  if (raw === cachedProjectRaw) {
    return cachedProjectSnapshot;
  }

  cachedProjectRaw = raw;

  if (!raw) {
    cachedProjectSnapshot = null;
    return cachedProjectSnapshot;
  }

  try {
    cachedProjectSnapshot = JSON.parse(raw) as RefProject;
  } catch {
    cachedProjectSnapshot = null;
  }

  return cachedProjectSnapshot;
}

function getServerProjectSnapshot(): RefProject | null {
  return null;
}

function subscribeProjectStore(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === PROJECT_STORAGE_KEY) onStoreChange();
  };

  // Evenement custom emis apres ecriture locale dans le meme onglet.
  const onProjectChange = () => onStoreChange();

  window.addEventListener("storage", onStorage);
  window.addEventListener(PROJECT_CHANGE_EVENT, onProjectChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PROJECT_CHANGE_EVENT, onProjectChange);
  };
}

function mapProjectTheme(project: RefProject | null) {
  if (!project) {
    return {
      label: "Espace SIG",
      code: "",
      accent: "#16a34a",
    };
  }

  const code = (project.code_fonc || "").toUpperCase();

  if (code.includes("AGRIECO")) {
    return {
      label: "Accompagnement agro-économique",
      code: "AGRIECO",
      accent: "#16a34a",
    };
  }

  if (code.includes("FIERE")) {
    return {
      label: "Formation & insertion rurale",
      code: "FIERE",
      accent: "#1d4ed8",
    };
  }

  return {
    label: project.libelle_public || "Projet de développement",
    code: project.code_fonc,
    accent: "#0f766e",
  };
}

type DisplayUser = {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
};

function getDisplayName(user: DisplayUser | null | undefined): string {
  if (!user) return "";

  const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  if (full) return full;

  if (user?.username && typeof user.username === "string") {
    const parts = (user.username as string).split(/[_\s]+/);
    if (parts.length >= 2) {
      return parts
        .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join(" ");
    }
    return user.username;
  }

  return user.email || "Utilisateur";
}

export default function ProtectedLayout({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading } = useUser();

  const currentProject = useSyncExternalStore(
    subscribeProjectStore,
    getStoredProject,
    getServerProjectSnapshot
  );
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  // Ferme le menu utilisateur si clic hors du bloc.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const theme = mapProjectTheme(currentProject);
  const displayName = getDisplayName(user);

  const normalizeRole = (raw: string | undefined | null) => {
    const r = (raw || "").toLowerCase();
    if (!r) return "lecteur";
    if (r.includes("admin") || r.includes("administrateur")) return "admin";
    if (r.includes("chef") || r.includes("manager")) return "chef_projet";
    if (r.includes("editeur") || r.includes("éditeur") || r.includes("editor")) return "editeur";
    if (r.includes("lecteur") || r.includes("reader")) return "lecteur";
    return r;
  };

  const userRole = normalizeRole(user?.role);

  const roleRank: Record<string, number> = {
    lecteur: 0,
    editeur: 1,
    chef_projet: 2,
    admin: 3,
  };

  const hasMinRole = (currentRole: string, minRole: string) => {
    const current = roleRank[normalizeRole(currentRole)] ?? 0;
    const required = roleRank[normalizeRole(minRole)] ?? 0;
    return current >= required;
  };

  const isAdmin = userRole === "admin";

  const navItems: Array<{
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    adminOnly?: boolean;
    minRole?: string;
  }> = [
    {
      label: "Tableau de bord",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Cartographie",
      href: "/cartographie",
      icon: Map,
    },
    {
      label: "Données",
      href: "/data",
      icon: Database,
    },
    {
      label: "Workflow",
      href: "/workflow",
      icon: FolderSync,
      minRole: "editeur",
    },
    {
      label: "Outils",
      href: "/tools",
      icon: Settings,
    },
    {
      label: "Administration",
      href: "/administration",
      icon: Shield,
      minRole: "chef_projet",
    },
  ];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleGoToProfile = () => {
    setIsUserMenuOpen(false);
    router.push("/profile");
  };

  return (
      <div className="min-h-screen flex bg-slate-50">
      {/* SIDEBAR */}
      <aside className="hidden md:flex md:flex-col w-72 bg-gradient-to-b from-emerald-700 via-emerald-800 to-emerald-900 text-white">
        {/* Logo + titre */}
        <div className="flex flex-col items-center pt-6 pb-4 px-4 border-b border-white/10">
          <div className="mb-3">
            <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center">
              <Image
                src="/armoirie-446x500.png"
                alt="Logo"
                width={56}
                height={56}
                className="w-14 h-14 object-contain"
              />
            </div>
          </div>
          <h2 className="text-sm font-semibold tracking-wide">ESPACE SIG</h2>
          <p className="text-[11px] text-emerald-100 mt-1 text-center">
            Système d&apos;information géographique
          </p>
        </div>

        {/* Infos projet */}
        <div className="px-4 pt-4 pb-2 border-b border-white/10">
          <p className="text-[11px] uppercase tracking-wide text-emerald-200 mb-1">Projet en cours</p>
          <div className="bg-white/10 rounded-xl px-3 py-2">
            <p className="text-xs font-medium leading-snug">{theme.label}</p>
            {theme.code && (
              <p className="text-[11px] text-emerald-100 mt-0.5">
                Code interne : <span className="font-mono">{theme.code}</span>
              </p>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            // Regles de visibilite.
            if (item.minRole && !hasMinRole(userRole, item.minRole)) return null;
            if (item.adminOnly && !isAdmin) return null;

            const isActive = item.href !== "#" && pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                  isActive
                    ? "bg-white text-emerald-800 shadow-sm"
                    : "text-emerald-100 hover:bg-white/5 hover:text-white",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    isActive ? "bg-emerald-50 text-emerald-700" : "bg-white/10",
                  ].join(" ")}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bloc utilisateur + logout */}
        <div className="mt-auto px-4 py-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-emerald-100 hover:text-white mb-3 cursor-pointer"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
              <LogOut className="h-3.5 w-3.5" />
            </span>
            <span>Déconnexion</span>
          </button>

          {user && (
            <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold">
                {displayName
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium leading-tight">{displayName}</span>
                <span className="text-[11px] text-emerald-100">
                  {isAdmin ? "Administrateur" : "Utilisateur projet"}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* TOPBAR */}
        <header className="h-16 md:h-20 bg-white border-b border-slate-200 flex items-center px-4 md:px-6 gap-4 justify-between">
          <div className="flex items-center gap-3">
            {/* bouton menu mobile (plus tard si besoin) */}
            <div className="md:hidden">
              <button
                className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center"
                aria-label="Menu"
              >
                <Menu className="h-4 w-4 text-slate-700" />
              </button>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Dispositif SIG</p>
              <p className="text-sm md:text-base font-semibold text-slate-900 flex items-center gap-2">
                <span>Espace projet</span>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: `${theme.accent}1a`,
                    color: theme.accent,
                  }}
                >
                  {theme.label}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* recherche */}
            <div className="hidden sm:flex items-center">
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-xs">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="pl-8 pr-3 py-2 text-xs md:text-sm rounded-full border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-transparent min-w-[180px] md:min-w-[260px]"
                />
              </div>
            </div>

            {/* user menu */}
            {user && (
              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-medium text-slate-900">{displayName}</span>
                    <span className="text-[11px] text-slate-400">
                      {isAdmin ? "Administrateur" : "Espace projet"}
                    </span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-semibold">
                    {displayName
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-lg text-xs py-1 z-20">
                    <button
                      type="button"
                      onClick={handleGoToProfile}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer"
                    >
                      Mon profil
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-red-600 cursor-pointer"
                    >
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 min-w-0 px-4 md:px-6 py-5 md:py-8 bg-slate-50 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
