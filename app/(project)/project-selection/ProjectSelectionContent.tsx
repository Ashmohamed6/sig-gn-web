"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  getUser,
  selectProject,
  getCurrentProject,
  clearCurrentProject,
  logout,
  type RefProject,
  type User,
} from "@/utils/authClient";

function isAdmin(u?: User | null) {
  return !!u?.is_superuser || (u?.role || "").toLowerCase() === "admin";
}

function pickDefaultProject(user: any, projects: RefProject[]): RefProject {
  const code =
    (typeof user?.default_project === "string" ? user.default_project : null) ||
    user?.default_project_code ||
    user?.default_project?.code_fonc ||
    null;

  if (code) {
    const found = projects.find((p) => (p.code_fonc || "").toUpperCase() === String(code).toUpperCase());
    if (found) return found;
  }
  return projects[0];
}

const PROJECT_UI: Record<
  string,
  {
    title: string;
    subtitle: string;
    accent: "emerald" | "sky" | "amber" | "violet";
    icon: string;
  }
> = {
  AGRIECO: {
    title: "Accompagnement agro-économique",
    subtitle: "Agriculture durable, agropastoralisme & résilience",
    accent: "emerald",
    icon: "🌿",
  },
  FIERE: {
    title: "Formation & insertion",
    subtitle: "Employabilité des jeunes & appui aux MPME",
    accent: "sky",
    icon: "🎓",
  },
};

function accentClasses(accent: string) {
  // classes Tailwind sûres (pas dynamiques)
  switch (accent) {
    case "emerald":
      return {
        ring: "ring-emerald-300/40 border-emerald-400/40",
        badgeBg: "bg-emerald-500/15",
        badgeText: "text-emerald-200",
        bgActive: "bg-emerald-500/10",
        btn: "bg-emerald-600 hover:bg-emerald-700",
      };
    case "sky":
      return {
        ring: "ring-sky-300/40 border-sky-400/40",
        badgeBg: "bg-sky-500/15",
        badgeText: "text-sky-200",
        bgActive: "bg-sky-500/10",
        btn: "bg-sky-600 hover:bg-sky-700",
      };
    case "amber":
      return {
        ring: "ring-amber-300/40 border-amber-400/40",
        badgeBg: "bg-amber-500/15",
        badgeText: "text-amber-200",
        bgActive: "bg-amber-500/10",
        btn: "bg-amber-600 hover:bg-amber-700",
      };
    default:
      return {
        ring: "ring-violet-300/40 border-violet-400/40",
        badgeBg: "bg-violet-500/15",
        badgeText: "text-violet-200",
        bgActive: "bg-violet-500/10",
        btn: "bg-violet-600 hover:bg-violet-700",
      };
  }
}

export default function ProjectSelectionContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const change = sp.get("change") === "true";

  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: getUser,
    staleTime: 30_000,
  });

  const user = me.data as User | null;
  const projects: RefProject[] = useMemo(() => user?.projects ?? [], [user]);

  // Reset du projet si change=true
  useEffect(() => {
    if (change) clearCurrentProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [change]);

  // Init selectedCode depuis localStorage
  useEffect(() => {
    const current = getCurrentProject();
    setSelectedCode(current?.code_fonc ?? null);
  }, []);

  // 🔒 Garde central : seuls les admins restent ici
  useEffect(() => {
    if (me.isLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!projects.length) {
      router.replace("/no-project");
      return;
    }

    // Non-admin => auto-select puis dashboard
    if (!isAdmin(user)) {
      const p = pickDefaultProject(user, projects);
      selectProject(p);
      router.replace("/dashboard");
      return;
    }
  }, [me.isLoading, user, projects, router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => {
      const code = (p.code_fonc || "").toLowerCase();
      const label = (p.libelle_public || "").toLowerCase();
      const meta = PROJECT_UI[(p.code_fonc || "").toUpperCase()];
      const title = (meta?.title || "").toLowerCase();
      return code.includes(q) || label.includes(q) || title.includes(q);
    });
  }, [projects, search]);

  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.username ||
    user?.email ||
    "Utilisateur";

  const handleChoose = (p: RefProject) => {
    selectProject(p);
    setSelectedCode(p.code_fonc);
  };

  const handleContinue = () => {
    // si rien choisi, choisir le 1er
    if (!getCurrentProject() && projects.length) {
      selectProject(projects[0]);
      setSelectedCode(projects[0].code_fonc);
    }
    router.push("/dashboard");
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (me.isLoading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#050B1A] text-white/80">
        Chargement…
      </div>
    );
  }

  // Non-admin: le guard redirige, écran neutre
  if (!isAdmin(user)) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#050B1A] text-white/80">
        Redirection…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050B1A] text-white">
      {/* Bandeau Guinée */}
      <div
        className="border-b border-white/10"
        style={{
          background:
            "linear-gradient(90deg, rgba(206,17,38,0.95), rgba(252,209,22,0.9), rgba(0,148,96,0.9))",
        }}
      >
        <div className="mx-auto max-w-6xl px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Left */}
            <div className="flex items-center gap-3">
              {/* ✅ Armoirie depuis public */}
              <img
                src="/armoirie-446x500.png"
                alt="Armoirie"
                width={44}
                height={44}
                style={{ height: "auto" }}
                className="rounded-2xl bg-white/15 p-1 object-contain"
              />

              <div>
                <div className="text-xs uppercase tracking-wide text-black/70">
                  Dispositif SIG
                </div>
                <div className="text-2xl font-extrabold text-white drop-shadow">
                  Sélection du projet
                </div>
                <div className="text-sm text-white/90">
                  Connecté : <span className="font-semibold">{fullName}</span>
                </div>
              </div>
            </div>

            {/* Buttons centered nicely (vertical middle) */}
            <div className="flex items-center justify-center gap-2 sm:justify-end">
              <button
                onClick={handleContinue}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm"
              >
                Continuer
              </button>
              <button
                onClick={handleLogout}
                className="rounded-xl border border-white/25 bg-black/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black/30"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-white/80 text-sm">
            Choisis le projet à activer (stocké dans{" "}
            <span className="font-semibold text-white">localStorage.currentProject</span>).
          </div>

          {/* ✅ barre centrée propre */}
          <div className="flex items-center justify-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un projet…"
              className="w-full sm:w-96 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/20"
            />
            <button
              onClick={() => {
                clearCurrentProject();
                setSelectedCode(null);
              }}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white hover:bg-white/10"
              title="Effacer le projet actif"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filtered.map((p) => {
            const code = (p.code_fonc || "").toUpperCase();
            const meta = PROJECT_UI[code] ?? {
              title: p.libelle_public || "Projet",
              subtitle: "—",
              accent: "violet" as const,
              icon: "📌",
            };
            const a = accentClasses(meta.accent);

            const active = (selectedCode || "").toUpperCase() === code;

            return (
              <button
                key={p.project_id}
                onClick={() => handleChoose(p)}
                className={[
                  "text-left rounded-2xl border p-6 transition-all",
                  "bg-white/5 hover:bg-white/10 border-white/10",
                  active ? `ring-2 ${a.ring} ${a.bgActive}` : "",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-2xl">{meta.icon}</div>

                    {/* ✅ Titre = expression, pas AGRIECO/FIERE */}
                    <div className="mt-2 text-xl font-extrabold text-white">
                      {meta.title}
                    </div>

                    <div className="mt-1 text-sm text-white/75">
                      {meta.subtitle}
                    </div>

                    {/* ✅ code interne en petit (ok pour debug) */}
                    <div className="mt-3 text-xs text-white/55">
                      Code interne :{" "}
                      <span className="font-semibold text-white/80">{code}</span>
                    </div>
                  </div>

                  {/* Badge */}
                  {active ? (
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold border",
                        a.badgeBg,
                        a.badgeText,
                        "border-white/10",
                      ].join(" ")}
                    >
                      Sélectionné
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 border border-white/10">
                      Choisir
                    </span>
                  )}
                </div>

                <div className="mt-4 text-xs text-white/50">
                  Cliquez pour activer ce projet, puis "Continuer".
                </div>
              </button>
            );
          })}
        </div>

        {!filtered.length ? (
          <div className="mt-10 text-center text-white/60 text-sm">
            Aucun projet ne correspond à votre recherche.
          </div>
        ) : null}
      </div>
    </div>
  );
}
