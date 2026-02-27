"use client";

import React from "react";
import { useUser } from "@/hooks/useUser";

export default function ProfilePage() {
  const { data: user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <p className="text-sm text-slate-500">Chargement du profil…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <p className="text-sm text-slate-500">
          Profil non disponible. Veuillez vous reconnecter.
        </p>
      </div>
    );
  }

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
          Mon profil
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Informations de votre compte sur le dispositif SIG.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="h-12 w-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-lg font-semibold">
            {(fullName || user.username || "U")
              .split(" ")
              .map((p: string) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {fullName || user.username || user.email}
            </p>
            <p className="text-xs text-slate-500">
              Rôle : {user.role || "Utilisateur"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400 uppercase mb-1">
              Nom d’utilisateur
            </p>
            <p className="text-slate-800">{user.username}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase mb-1">
              Adresse e-mail
            </p>
            <p className="text-slate-800">{user.email}</p>
          </div>
        </div>

        {/* plus tard : zone pour changer mot de passe, préférences, etc. */}
      </div>
    </div>
  );
}
