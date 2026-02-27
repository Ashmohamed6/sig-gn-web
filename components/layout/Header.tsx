"use client";

import { useState, useRef, useEffect } from "react";
import { useActiveProject } from "@/contexts/ProjectContext";
import { useUser } from "@/hooks/useUser";
import { 
  Bell, 
  Search, 
  Menu,
  LogOut,
  User as UserIcon
} from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const { project } = useActiveProject();
  const { data: user } = useUser();
  const profileRef = useRef<HTMLDivElement>(null);

  const canSwitchProjects = (user?.projects?.length || 0) > 1;

  // Fermer le menu profil en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileOpen]);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0 header-shadow">
      <div className="flex items-center justify-between">
        {/* Gauche : Logo + Projet + Recherche */}
        <div className="flex items-center gap-6">
          {/* Logo et menu toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-teal-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">🗺️</span>
            </div>
          </div>

          {/* Titre projet */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">
              Dispositif SIG | Projet:
            </span>
            <span className="text-sm font-bold text-green-600">
              {project.code_fonc}
            </span>
          </div>

          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-md text-sm focus:outline-none search-input transition-all"
            />
          </div>
        </div>

        {/* Droite : Notifications + Profil */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button 
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full notification-badge"></span>
          </button>

          {/* Profil utilisateur */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
            >
              <div className="w-8 h-8 user-badge rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white text-xs font-medium">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {user?.first_name} {user?.last_name}
              </span>
            </button>

            {/* Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 dropdown-menu">
                <div className="p-3 border-b border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Connecté en tant que</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {user?.role === "admin" ? "Administrateur" : user?.role}
                  </p>
                </div>

                {canSwitchProjects && (
                  <Link
                    href="/projects-selection"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setProfileOpen(false)}
                  >
                    <UserIcon className="w-4 h-4" />
                    Changer de projet
                  </Link>
                )}

                <Link
                  href="/logout"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-200 transition-colors"
                  onClick={() => setProfileOpen(false)}
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}