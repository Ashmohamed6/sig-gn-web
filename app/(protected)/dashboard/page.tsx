// app/(protected)/dashboard/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Award,
  Briefcase,
  BriefcaseBusiness,
  Building,
  Building2,
  CheckCircle,
  CloudRain,
  Droplets,
  FolderSync,
  GraduationCap,
  Handshake,
  Heart,
  Home,
  Leaf,
  Loader2,
  LogOut,
  Map,
  Shield,
  Sprout,
  Store,
  Thermometer,
  Timer,
  TreePine,
  TrendingUp,
  UserCheck,
  Users,
  Wheat,
  Zap,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";

import {
  getCurrentProject,
  logout,
  getUser,
  clearCurrentProject,
  selectProject,
  type RefProject,
} from "@/utils/authClient";
import { num, fetchAgriecoAggregates, fetchFiereAggregates } from "@/utils/dashboardApi";
import ExportDashboard from "./components/ExportDashboard";

/* -------------------- Données fictives intégrées (demo) -------------------- */
/**
 * ✅ Demande: valeurs NON vides directement dans page.tsx.
 * Pour revenir aux vraies API plus tard, passe USE_INLINE_MOCK à false
 * et réactive le bloc apiGet.
 */
const USE_INLINE_MOCK = false;

function buildMockAgrieco() {
  const regions = ["Kindia", "Mamou", "Faranah", "Kankan", "N'Zérékoré", "Conakry"];

  return {
    menages: {
      global: {
        total_menages: 12840,
        nb_menages_prat_agroeco: 6940,
        total_seances_sensib: 412,
        nb_menages_foyers_ameliores: 1985,
        nb_ruches: 3720,
      },
      by_region: [
        { region_nom: regions[0], total_menages: 2600, nb_menages_prat_agroeco: 1500 },
        { region_nom: regions[1], total_menages: 2100, nb_menages_prat_agroeco: 1200 },
        { region_nom: regions[2], total_menages: 1800, nb_menages_prat_agroeco: 980 },
        { region_nom: regions[3], total_menages: 2400, nb_menages_prat_agroeco: 1320 },
        { region_nom: regions[4], total_menages: 1700, nb_menages_prat_agroeco: 860 },
        { region_nom: regions[5], total_menages: 2240, nb_menages_prat_agroeco: 1080 },
      ],
      by_type_foyer: [
        { label: "Traditionnel", total_menages: 8580 },
        { label: "Amélioré", total_menages: 3420 },
        { label: "Gaz", total_menages: 840 },
      ],
    },

    organisations: {
      global: {
        total_organisations: 462,
        nb_op: 318,
        total_emplois_verts: 1240,
        nb_groupements_eleveurs: 96,
        total_bovins: 18450,
        total_ovins: 22680,
        total_caprins: 19320,
        nb_producteurs_semenciers: 214,
        nb_banques_semences: 57,
        nb_officines_vet: 19,
      },
      by_type_org: [
        { type_org_label: "Coopérative", nb_org: 168 },
        { type_org_label: "Association", nb_org: 142 },
        { type_org_label: "GIE", nb_org: 78 },
        { type_org_label: "Union", nb_org: 74 },
      ],
    },

    comites: {
      global: {
        total_comites: 231,
        nb_comites_feux: 88,
        total_conflits_regles: 146,
        nb_techniciens_formes: 312,
      },
      by_type_comite: [
        { type_comite_label: "Comité Feux", nb_comites: 88 },
        { type_comite_label: "Comité Eau", nb_comites: 64 },
        { type_comite_label: "Comité Gestion terroir", nb_comites: 42 },
        { type_comite_label: "Comité de veille", nb_comites: 37 },
      ],
    },

    parcelles: {
      global: {
        total_parcelles: 980,
        total_surface_decl_ha: 4620.5,
        rendement_moyen: 1825.4,
      },
      by_filiere: [
        { filiere_label: "Riz", rendement_moyen: 2400, total_surface_decl_ha: 1280.3, nb_parcelles: 240 },
        { filiere_label: "Maïs", rendement_moyen: 1650, total_surface_decl_ha: 1560.7, nb_parcelles: 310 },
        { filiere_label: "Soja", rendement_moyen: 1420, total_surface_decl_ha: 980.2, nb_parcelles: 220 },
        { filiere_label: "Maraîchage", rendement_moyen: 3100, total_surface_decl_ha: 799.3, nb_parcelles: 210 },
      ],
      by_campagne: [
        { campagne: "2022", rendement_moyen: 1550, total_surface_decl_ha: 980 },
        { campagne: "2023", rendement_moyen: 1720, total_surface_decl_ha: 1210 },
        { campagne: "2024", rendement_moyen: 1850, total_surface_decl_ha: 1425 },
        { campagne: "2025", rendement_moyen: 1910, total_surface_decl_ha: 1005.5 },
      ],
    },

    zones: {
      global: {
        surface_restauree_ha: 12650.2,
        surface_regeneree_ha: 8450.7,
        surface_plantations_ha: 3920.4,
        nb_plants: 2145000,
      },
      by_region: [
        { region_nom: regions[0], surface_restauree_ha: 2400, surface_regeneree_ha: 1580 },
        { region_nom: regions[1], surface_restauree_ha: 1850, surface_regeneree_ha: 1120 },
        { region_nom: regions[2], surface_restauree_ha: 1680, surface_regeneree_ha: 980 },
        { region_nom: regions[3], surface_restauree_ha: 2600, surface_regeneree_ha: 1820 },
        { region_nom: regions[4], surface_restauree_ha: 1420, surface_regeneree_ha: 860 },
        { region_nom: regions[5], surface_restauree_ha: 2700, surface_regeneree_ha: 2090 },
      ],
      by_type_degradation: [
        { type_degradation_label: "Érosion", surface_degradee_ha: 6200 },
        { type_degradation_label: "Déboisement", surface_degradee_ha: 4880 },
        { type_degradation_label: "Feux de brousse", surface_degradee_ha: 3150 },
        { type_degradation_label: "Surpâturage", surface_degradee_ha: 2870 },
      ],
    },

    sources: { global: { nb_protegees: 312, taux_acces_eau_potable_pct: 64.8 } },

    stations: { global: { nb_stations: 34, nb_actives: 28, nb_inactives: 6 } },

    mesures: {
      by_region: [
        { region_nom: regions[0], somme_pluie_mm: 1260 },
        { region_nom: regions[1], somme_pluie_mm: 1480 },
        { region_nom: regions[2], somme_pluie_mm: 1325 },
        { region_nom: regions[3], somme_pluie_mm: 1160 },
        { region_nom: regions[4], somme_pluie_mm: 1685 },
        { region_nom: regions[5], somme_pluie_mm: 1410 },
      ],
      by_mois: [
        { mois_label: "Jan", pluie_mm: 12 },
        { mois_label: "Fév", pluie_mm: 28 },
        { mois_label: "Mar", pluie_mm: 62 },
        { mois_label: "Avr", pluie_mm: 118 },
        { mois_label: "Mai", pluie_mm: 186 },
        { mois_label: "Juin", pluie_mm: 255 },
        { mois_label: "Juil", pluie_mm: 312 },
        { mois_label: "Août", pluie_mm: 286 },
        { mois_label: "Sep", pluie_mm: 198 },
        { mois_label: "Oct", pluie_mm: 96 },
        { mois_label: "Nov", pluie_mm: 34 },
        { mois_label: "Déc", pluie_mm: 15 },
      ],
    },

    ouvrages: { global: { nb_ouvrages: 784 } },

    couloirs: { global: { total_couloirs: 41, longueur_totale_km: 512.7 } },

    intrants: {
      global: {
        quantite_totale_brute: 182.5,
        nb_comptoirs: 93,
        nb_comptoirs_conformes: 71,
      },
      by_type_intrant: [
        { type_intrant_label: "Semences", quantite_totale: 54.2 },
        { type_intrant_label: "Engrais", quantite_totale: 98.6 },
        { type_intrant_label: "Produits phytos", quantite_totale: 29.7 },
      ],
    },

    pratiques: { global: { nb_parcelles_suivies: 648 } },

    marches: {
      global: { nb_marches_total: 127 },
      by_frequence_marche: [
        { frequence_marche: "Quotidien", nb_marches: 22 },
        { frequence_marche: "Hebdomadaire", nb_marches: 81 },
        { frequence_marche: "Bimensuel", nb_marches: 16 },
        { frequence_marche: "Mensuel", nb_marches: 8 },
      ],
    },
  };
}

function buildMockFiere() {
  const filieres = ["Agro-business", "BTP", "Numérique", "Textile", "Services"];
  return {
    suivi: {
      global: {
        nb_sortants: 3840,
        nb_sortants_femmes: 1710,
        nb_sortants_pvh: 240,
        nb_sortants_inseres: 2190,
        taux_achevement_pct: 92.4,
      },
      by_filiere: [
        { filiere_label: filieres[0], nb_sortants: 980, nb_inseres: 610 },
        { filiere_label: filieres[1], nb_sortants: 760, nb_inseres: 430 },
        { filiere_label: filieres[2], nb_sortants: 840, nb_inseres: 560 },
        { filiere_label: filieres[3], nb_sortants: 620, nb_inseres: 300 },
        { filiere_label: filieres[4], nb_sortants: 640, nb_inseres: 290 },
      ],
      by_sexe: [
        { sexe_label: "Hommes", nb_sortants: 2130 },
        { sexe_label: "Femmes", nb_sortants: 1710 },
      ],
    },

    emplois: {
      global: {
        nb_emplois_totaux: 2860,
        nb_emplois_femmes: 1180,
        nb_emplois_crees: 1640,
        nb_emplois_maintenus: 1220,
      },
      by_domaine: [
        { domaine_label: "Agri & transformation", nb_emplois: 720 },
        { domaine_label: "Construction / BTP", nb_emplois: 540 },
        { domaine_label: "Tech & digital", nb_emplois: 610 },
        { domaine_label: "Commerce", nb_emplois: 430 },
        { domaine_label: "Services", nb_emplois: 560 },
      ],
    },

    insertions: {
      global: {
        nb_insertions: 2190,
        taux_insertion_3m: 38.5,
        taux_insertion_6m: 51.2,
        taux_insertion_12m: 62.8,
      },
      by_type_insertion: [
        { type_insertion_label: "Emploi salarié", nb_insertions: 980 },
        { type_insertion_label: "Auto-emploi", nb_insertions: 740 },
        { type_insertion_label: "Stage", nb_insertions: 320 },
        { type_insertion_label: "Apprentissage", nb_insertions: 150 },
      ],
    },

    entreprises: {
      global: {
        nb_entreprises: 1260,
        total_mpme_appuyees_fiere: 890,
        total_mpme_formalisees: 540,
      },
      by_taille: [
        { taille_label: "Micro", nb_entreprises: 740 },
        { taille_label: "Petite", nb_entreprises: 410 },
        { taille_label: "Moyenne", nb_entreprises: 110 },
      ],
    },

    formations: {
      global: { nb_formations: 162, nb_participants: 6240 },
      by_categorie: [
        { categorie_label: "Techniques métier", nb_formations: 68, nb_participants: 2480 },
        { categorie_label: "Entrepreneuriat", nb_formations: 44, nb_participants: 1810 },
        { categorie_label: "Soft skills", nb_formations: 30, nb_participants: 1260 },
        { categorie_label: "Inclusion & genre", nb_formations: 20, nb_participants: 690 },
      ],
    },

    acteurs: { global: { total_acteurs: 312, nb_partenariats_actifs: 74, nb_stages_courts: 410 } },
  };
}

const MOCK_DATA = {
  AGRIECO: buildMockAgrieco(),
  FIERE: buildMockFiere(),
} as const;


/* -------------------- Config -------------------- */

// Couleurs Guinée + palette charts
const COLORS = {
  red: "#CE1126",
  yellow: "#FCD116",
  green: "#009460",
  darkGreen: "#006B3F",
  blue: "#3B82F6",
  purple: "#8B5CF6",
  orange: "#F59E0B",
  cyan: "#06B6D4",
  pink: "#EC4899",
};

const CHART_COLORS = [
  COLORS.green,
  COLORS.yellow,
  COLORS.red,
  COLORS.blue,
  COLORS.purple,
  COLORS.orange,
  COLORS.cyan,
  COLORS.pink,
];

type ProjectType = "AGRIECO" | "FIERE" | "INCONNU";

interface UserInfo {
  id?: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  role?: string;
  is_superuser?: boolean;
  projects?: RefProject[];

  // fallback keys possibles
  user_projects?: RefProject[];
  allowed_projects?: RefProject[];
  ref_projects?: RefProject[];
  default_project?: any;
  default_project_code?: string;
}

// Helpers format
const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));
const fmtDec = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n);
const fmtPct = (n: number) => `${fmtDec(n)}%`;

// Pick number from possible keys (mismatch-proof)
const pickNum = (...vals: any[]) => {
  for (const v of vals) {
    if (v !== null && v !== undefined && v !== "") return num(v);
  }
  return 0;
};

const isAdmin = (u?: UserInfo | null) =>
  !!u?.is_superuser || (u?.role || "").toLowerCase() === "admin";

function extractProjects(u?: UserInfo | null): RefProject[] {
  if (!u) return [];
  return (
    u.projects ||
    (u as any).user_projects ||
    (u as any).allowed_projects ||
    (u as any).ref_projects ||
    []
  );
}

function pickDefaultProject(user: any, projects: RefProject[]): RefProject | null {
  if (!projects?.length) return null;
  const code =
    (typeof user?.default_project === "string" ? user.default_project : null) ||
    user?.default_project_code ||
    user?.default_project?.code_fonc ||
    null;
  if (code) {
    const found = projects.find(
      (p) => String(p.code_fonc || "").toUpperCase() === String(code).toUpperCase()
    );
    if (found) return found;
  }
  return projects[0];
}

/* -------------------- UI Components -------------------- */

function StatCard({
  title,
  value,
  icon,
  color = "green",
  suffix,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: "green" | "yellow" | "red" | "blue" | "purple" | "orange" | "pink";
  suffix?: string;
  subtitle?: string;
}) {
  const colorStyles: Record<string, string> = {
    green:
      "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-300",
    yellow:
      "from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-300",
    red: "from-red-500/20 to-red-600/10 border-red-500/30 text-red-300",
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-300",
    purple:
      "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-300",
    orange:
      "from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-300",
    pink: "from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-300",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${colorStyles[color]} p-4 transition-all hover:scale-[1.01]`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-slate-300/80">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-white">{value}</p>
            {suffix ? (
              <span className="text-xs text-slate-300">{suffix}</span>
            ) : null}
          </div>
          {subtitle ? (
            <p className="mt-1 text-[11px] text-slate-400">{subtitle}</p>
          ) : null}
        </div>
        <div className="shrink-0 rounded-lg bg-slate-950/40 p-2 text-white/90">
          {icon}
        </div>
      </div>
    </div>
  );
}

// Carte KPI speciale pour les taux (avec jauge visuelle)
function GaugeCard({
  title,
  value,
  icon,
  color = "green",
  subtitle,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: "green" | "yellow" | "red" | "blue" | "purple" | "orange";
  subtitle?: string;
}) {
  const colorStyles: Record<string, string> = {
    green: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
    yellow: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
    red: "from-red-500/20 to-red-600/10 border-red-500/30",
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
    orange: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
  };

  const barColors: Record<string, string> = {
    green: "bg-emerald-500",
    yellow: "bg-amber-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${colorStyles[color]} p-4 transition-all hover:scale-[1.01]`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-slate-300/80">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-white">{fmtPct(value)}</p>
          </div>
          {subtitle ? (
            <p className="mt-1 text-[11px] text-slate-400">{subtitle}</p>
          ) : null}

          <div className="mt-3 h-2 w-full rounded-full bg-slate-800/60">
            <div
              className={`h-2 rounded-full ${barColors[color]} transition-all`}
              style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
          </div>
        </div>

        <div className="shrink-0 rounded-lg bg-slate-950/40 p-2 text-white/90">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
  color = "green",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  color?: "green" | "yellow" | "red" | "blue" | "purple" | "orange";
}) {
  const colorMap: Record<string, string> = {
    green: "from-emerald-500 to-emerald-600",
    yellow: "from-amber-500 to-amber-600",
    red: "from-red-500 to-red-600",
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg bg-gradient-to-br ${colorMap[color]} p-2`}>
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ChartCard({
  title,
  children,
  hint,
}: {
  title: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium text-slate-200">{title}</h3>
        {hint ? (
          <span className="text-[11px] text-slate-500">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function ChartEmpty({ label }: { label?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950/30">
      <div className="text-center px-4">
        <AlertCircle className="h-6 w-6 text-slate-500 mx-auto mb-2" />
        <p className="text-sm text-slate-300">Données en attente</p>
        <p className="text-xs text-slate-500 mt-1">
          {label || "Aucun résultat pour le moment."}
        </p>
      </div>
    </div>
  );
}

/* -------------------- Page -------------------- */

export default function DashboardPage() {
  const router = useRouter();

  const [project, setProject] = useState<RefProject | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [projectType, setProjectType] = useState<ProjectType>("INCONNU");
  const [canChangeProject, setCanChangeProject] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<Record<string, any>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // 1) User (ProtectedLayout handles auth redirect via useUser())
        const userData = (await getUser()) as UserInfo | null;

        if (!userData) {
          // Ne pas rediriger ici — le ProtectedLayout s'en charge.
          // On attend simplement que l'auth se stabilise.
          return;
        }

        const userProjects = extractProjects(userData);
        setUser(userData);

        // ✅ seul admin peut changer de projet
        setCanChangeProject(isAdmin(userData) && userProjects.length > 1);

        // 2) Current project
        let currentProject = getCurrentProject();

        // 2.a) si pas de projet -> auto-pick si 1 projet (user simple)
        if (!currentProject) {
          const p = pickDefaultProject(userData, userProjects);
          if (p) {
            selectProject(p);
            currentProject = p;
          } else {
            // pas de projet accessible -> écran propre (pas redirect 404)
            setError("Aucun projet n’est associé à ce compte.");
            return;
          }
        }

        // 2.b) vérifier appartenance du projet
        const isValid =
          userProjects.length === 0
            ? true
            : userProjects.some(
                (p) =>
                  p.project_id === currentProject!.project_id ||
                  p.code_fonc === currentProject!.code_fonc
              );

        if (!isValid) {
          clearCurrentProject();

          // non-admin => pick default puis continue
          if (!isAdmin(userData)) {
            const p = pickDefaultProject(userData, userProjects);
            if (p) {
              selectProject(p);
              currentProject = p;
            } else {
              setError("Aucun projet valide pour ce compte.");
              return;
            }
          } else {
            router.push("/project-selection?change=true");
            return;
          }
        }

        setProject(currentProject);

        const code = (currentProject.code_fonc || "").toUpperCase();
        const pType: ProjectType =
          code.includes("AGRIECO")
            ? "AGRIECO"
            : code.includes("FIERE")
            ? "FIERE"
            : "INCONNU";
        setProjectType(pType);
        // 3) Données: mock intégré ou appel API réel
        if (USE_INLINE_MOCK) {
          if (pType === "AGRIECO") {
            if (!cancelled) setData(MOCK_DATA.AGRIECO);
          } else if (pType === "FIERE") {
            if (!cancelled) setData(MOCK_DATA.FIERE);
          } else {
            if (!cancelled) setData({});
          }
        } else {
          // Appel API réel
          if (pType === "AGRIECO") {
            const apiData = await fetchAgriecoAggregates();
            if (!cancelled) setData(apiData);
          } else if (pType === "FIERE") {
            const apiData = await fetchFiereAggregates();
            if (!cancelled) setData(apiData);
          } else {
            if (!cancelled) setData({});
          }
        }


      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Erreur de chargement");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleChangeProject = () => {
    if (!canChangeProject) return;
    router.push("/project-selection?change=true");
  };

  /* -------------------- KPI & Chart datasets -------------------- */

  // Global KPIs AGRIECO (mismatch-proof)
  const g = useMemo(() => {
    const stationsGlobal = data.stations?.global || {};
    const marchesGlobal = data.marches?.global || {};
    const couloirsGlobal = data.couloirs?.global || {};
    const intrantsGlobal = data.intrants?.global || {};
    const pratiquesGlobal = data.pratiques?.global || {};
    const sourcesGlobal = data.sources?.global || {};
    const menagesGlobal = data.menages?.global || {};
    const orgGlobal = data.organisations?.global || {};
    const comitesGlobal = data.comites?.global || {};
    const parcellesGlobal = data.parcelles?.global || {};
    const zonesGlobal = data.zones?.global || {};

    const nbStations = pickNum(stationsGlobal.nb_stations, stationsGlobal.nbStations);
    const nbStationsActives = pickNum(
      stationsGlobal.nb_actives,
      stationsGlobal.nb_stations_actives
    );
    const nbStationsInactives = pickNum(
      stationsGlobal.nb_inactives,
      stationsGlobal.nb_stations_inactives,
      Math.max(0, nbStations - nbStationsActives)
    );

    const accesEauPct = pickNum(
      sourcesGlobal.taux_acces_eau_potable_pct,
      sourcesGlobal.acces_eau_potable_pct,
      menagesGlobal.taux_acces_eau_potable_pct
    );

    return {
      // Ménages & sensibilisation
      totalMenages: pickNum(menagesGlobal.total_menages, menagesGlobal.nb_menages),
      menagesAgroeco: pickNum(menagesGlobal.nb_menages_prat_agroeco, menagesGlobal.menages_agroeco),
      seancesSensib: pickNum(menagesGlobal.total_seances_sensib, menagesGlobal.nb_seances_sensib),
      foyersAmeliores: pickNum(menagesGlobal.nb_menages_foyers_ameliores, menagesGlobal.foyers_ameliores),
      ruches: pickNum(menagesGlobal.nb_ruches, menagesGlobal.ruches),

      // Organisations & élevage
      totalOrgs: pickNum(orgGlobal.total_organisations, orgGlobal.nb_organisations),
      opIdentifiees: pickNum(orgGlobal.nb_op, orgGlobal.op_identifiees),
      emploisVerts: pickNum(orgGlobal.total_emplois_verts, orgGlobal.emplois_verts),
      groupementsEleveurs: pickNum(orgGlobal.nb_groupements_eleveurs, orgGlobal.groupements_eleveurs),

      bovins: pickNum(orgGlobal.total_bovins, orgGlobal.bovins),
      ovins: pickNum(orgGlobal.total_ovins, orgGlobal.ovins),
      caprins: pickNum(orgGlobal.total_caprins, orgGlobal.caprins),

      producteursSemenciers: pickNum(orgGlobal.nb_producteurs_semenciers, orgGlobal.producteurs_semenciers),
      banquesSemences: pickNum(orgGlobal.nb_banques_semences, orgGlobal.banques_semences),
      officinesVet: pickNum(orgGlobal.nb_officines_vet, orgGlobal.officines_vet),

      // Comités & gouvernance
      totalComites: pickNum(comitesGlobal.total_comites, comitesGlobal.nb_comites),
      comitesFeux: pickNum(comitesGlobal.nb_comites_feux, comitesGlobal.comites_feux),
      conflitsRegles: pickNum(comitesGlobal.total_conflits_regles, comitesGlobal.conflits_regles),
      techniciensFormes: pickNum(comitesGlobal.nb_techniciens_formes, comitesGlobal.techniciens_formes),

      // CEP / parcelles
      totalParcelles: pickNum(parcellesGlobal.total_parcelles, parcellesGlobal.nb_parcelles, parcellesGlobal.total_cep),
      surfaceTotale: pickNum(parcellesGlobal.total_surface_decl_ha, parcellesGlobal.surface_totale_ha),
      rendementMoyen: pickNum(parcellesGlobal.rendement_moyen, parcellesGlobal.rendement),
      nbPratiques: pickNum(pratiquesGlobal.nb_pratiques, pratiquesGlobal.total_pratiques, 0),

      // Zones dégradées / restauration
      surfaceRestauree: pickNum(zonesGlobal.surface_restauree_ha, zonesGlobal.ha_restaures),
      surfaceRegeneree: pickNum(zonesGlobal.surface_regeneree_ha, zonesGlobal.ha_regeneres),
      plantationsHa: pickNum(zonesGlobal.surface_plantations_ha, zonesGlobal.plantations_ha),
      plantsProduits: pickNum(zonesGlobal.nb_plants, zonesGlobal.plants_produits),

      // Sources / eau
      sourcesProtegees: pickNum(sourcesGlobal.nb_protegees, sourcesGlobal.nb_sources_protegees),
      accesEauPct,

      // Météo
      nbStations,
      nbStationsActives,
      nbStationsInactives,

      // Ouvrages
      nbOuvrages: pickNum(data.ouvrages?.global?.nb_ouvrages, data.ouvrages?.global?.total_ouvrages),

      // Couloirs
      nbCouloirs: pickNum(couloirsGlobal.total_couloirs, couloirsGlobal.nb_couloirs),
      kmCouloirs: pickNum(couloirsGlobal.longueur_totale_km, couloirsGlobal.km_total),

      // Intrants / marchés
      quantiteIntrants: pickNum(
        intrantsGlobal.quantite_totale_brute,
        intrantsGlobal.total_quantite,
        intrantsGlobal.quantite_totale
      ),
      comptoirsTotal: pickNum(intrantsGlobal.nb_comptoirs, intrantsGlobal.total_comptoirs),
      comptoirsConformes: pickNum(intrantsGlobal.nb_comptoirs_conformes, intrantsGlobal.comptoirs_conformes),
      nbMarches: pickNum(marchesGlobal.nb_marches_total, marchesGlobal.total_marches),
    };
  }, [data]);

  // Global KPIs FIERE
  const gFiere = useMemo(() => {
    const suiviGlobal = data.suivi?.global || {};
    const emploisGlobal = data.emplois?.global || {};
    const insertionsGlobal = data.insertions?.global || {};
    const entreprisesGlobal = data.entreprises?.global || {};
    const formationsGlobal = data.formations?.global || {};
    const acteursGlobal = data.acteurs?.global || {};

    return {
      nbSortants: pickNum(suiviGlobal.nb_sortants, suiviGlobal.total_sortants),
      nbSortantsFemmes: pickNum(suiviGlobal.nb_sortants_femmes, suiviGlobal.nb_femmes),
      nbSortantsPvh: pickNum(suiviGlobal.nb_sortants_pvh, suiviGlobal.nb_pvh),
      nbSortantsInseres: pickNum(suiviGlobal.nb_sortants_inseres, suiviGlobal.nb_inseres),
      tauxAchevement: pickNum(suiviGlobal.taux_achevement_pct, suiviGlobal.taux_achevement),

      tauxInsertion3m: pickNum(insertionsGlobal.taux_insertion_3m, insertionsGlobal.taux_3m),
      tauxInsertion6m: pickNum(insertionsGlobal.taux_insertion_6m, insertionsGlobal.taux_6m),
      tauxInsertion12m: pickNum(insertionsGlobal.taux_insertion_12m, insertionsGlobal.taux_12m),
      nbInsertions: pickNum(insertionsGlobal.nb_insertions, insertionsGlobal.total_insertions),

      nbEmploisTotal: pickNum(emploisGlobal.nb_emplois_totaux, emploisGlobal.total_emplois),
      nbEmploisFemmes: pickNum(emploisGlobal.nb_emplois_femmes, emploisGlobal.emplois_femmes),
      nbEmploisCrees: pickNum(emploisGlobal.nb_emplois_crees, emploisGlobal.emplois_crees),
      nbEmploisMaintenus: pickNum(
        emploisGlobal.nb_emplois_maintenus,
        emploisGlobal.emplois_maintenus
      ),

      nbEntreprises: pickNum(entreprisesGlobal.nb_entreprises, entreprisesGlobal.total_entreprises),
      mpmeAppuyees: pickNum(
        entreprisesGlobal.total_mpme_appuyees_fiere,
        entreprisesGlobal.mpme_appuyees
      ),
      mpmeFormalisees: pickNum(
        entreprisesGlobal.total_mpme_formalisees,
        entreprisesGlobal.mpme_formalisees
      ),

      nbFormations: pickNum(formationsGlobal.nb_formations, formationsGlobal.total_formations),
      nbParticipants: pickNum(
        formationsGlobal.nb_participants,
        formationsGlobal.total_participants
      ),

      nbActeurs: pickNum(acteursGlobal.total_acteurs, acteursGlobal.nb_acteurs),
      nbPartenariats: pickNum(
        acteursGlobal.nb_partenariats_actifs,
        acteursGlobal.partenariats_actifs
      ),
      nbStages: pickNum(acteursGlobal.nb_stages_courts, acteursGlobal.stages_moins_3m),
    };
  }, [data]);

  // Chart datasets AGRIECO (safe defaults)
  const chartData = useMemo(() => {
    // Zones
    const zonesByRegion = (data.zones?.by_region || []).map((r: any) => ({
      region_nom: r.region_nom || r.region || "Non renseigné",
      surface_restauree_ha: num(r.surface_restauree_ha),
      surface_regeneree_ha: num(r.surface_regeneree_ha),
    }));

    const zonesByType = (data.zones?.by_type_degradation || []).map((r: any) => ({
      label: r.type_degradation_label || r.type_degradation || "Non renseigné",
      value: num(r.surface_degradee_ha),
    }));

    // Parcelles / CEP
    const parcellesByFiliere = (data.parcelles?.by_filiere || []).map((r: any) => ({
      label: r.filiere_label || r.filiere || "Non renseigné",
      rendement_moyen: num(r.rendement_moyen),
      total_surface_decl_ha: num(r.total_surface_decl_ha),
      nb_parcelles: num(r.nb_parcelles || r.total_parcelles),
    }));

    const parcellesByCampagne = (data.parcelles?.by_campagne || []).map((r: any) => ({
      campagne: r.campagne || r.annee || "N/A",
      rendement_moyen: num(r.rendement_moyen),
      total_surface_decl_ha: num(r.total_surface_decl_ha),
    }));

    // Menages
    const menagesByRegion = (data.menages?.by_region || []).map((r: any) => ({
      region_nom: r.region_nom || r.region || "Non renseigné",
      total_menages: num(r.total_menages || r.nb_menages),
      menages_agroeco: num(r.nb_menages_prat_agroeco || r.menages_agroeco),
    }));

    const menagesByFoyer = (data.menages?.by_type_foyer || []).map((r: any) => ({
      label: r.label || r.type_foyer_principal || "Non renseigné",
      value: num(r.total_menages || r.nb_menages),
    }));

    // Stations donut
    const stationsGlobal = data.stations?.global || {};
    const nbStations = pickNum(stationsGlobal.nb_stations, stationsGlobal.nbStations);
    const nbActives = pickNum(stationsGlobal.nb_actives, stationsGlobal.nb_stations_actives);
    const nbInactives = pickNum(
      stationsGlobal.nb_inactives,
      stationsGlobal.nb_stations_inactives,
      Math.max(0, nbStations - nbActives)
    );

    const stationsDonut = [
      { label: "Actives", value: nbActives },
      { label: "Inactives", value: nbInactives },
    ];

    // Pluie
    const pluieByRegion = (data.mesures?.by_region || []).map((r: any) => ({
      region_nom: r.region_nom || r.region || "Non renseigné",
      somme_pluie_mm: num(r.somme_pluie_mm || r.pluie_mm),
    }));

    const pluieByMois = (data.mesures?.by_mois || data.mesures?.by_month || []).map((r: any) => ({
      mois: r.mois_label || r.mois || r.month || "N/A",
      pluie_mm: num(r.pluie_mm || r.somme_pluie_mm),
    }));

    // Marchés
    const marchesByFrequence = (data.marches?.by_frequence_marche || []).map((r: any) => ({
      label: r.frequence_marche || "Non renseigné",
      value: num(r.nb_marches || r.total_marches),
    }));

    // Intrants par type (si dispo)
    const intrantsByType = (data.intrants?.by_type_intrant || []).map((r: any) => ({
      label: r.type_intrant_label || r.type_intrant || "Non renseigné",
      quantite: num(r.quantite_totale || r.quantite),
    }));

    // Bétail donut
    const betailDonut = [
      { label: "Bovins", value: num(data.organisations?.global?.total_bovins) },
      { label: "Ovins", value: num(data.organisations?.global?.total_ovins) },
      { label: "Caprins", value: num(data.organisations?.global?.total_caprins) },
    ];

    // Organisations par type (si dispo)
    const orgByType = (data.organisations?.by_type_org || []).map((r: any) => ({
      label: r.type_org_label || r.type_org || "Non renseigné",
      nb: num(r.nb_org || r.total_org || r.nb),
    }));

    // Comités par type (si dispo)
    const comitesByType = (data.comites?.by_type_comite || []).map((r: any) => ({
      label: r.type_comite_label || r.type_comite || "Non renseigné",
      nb: num(r.nb_comites || r.total_comites),
    }));

    return {
      zonesByRegion,
      zonesByType,
      parcellesByFiliere,
      parcellesByCampagne,
      menagesByRegion,
      menagesByFoyer,
      stationsDonut,
      pluieByRegion,
      pluieByMois,
      marchesByFrequence,
      intrantsByType,
      betailDonut,
      orgByType,
      comitesByType,
    };
  }, [data]);

  // Chart datasets FIERE
  const chartFiere = useMemo(() => {
    const sortantsByFiliere = (data.suivi?.by_filiere || []).map((r: any) => ({
      label: r.filiere_label || r.filiere || "Non renseigné",
      nb_sortants: num(r.nb_sortants),
      nb_inseres: num(r.nb_inseres),
    }));

    const sortantsBySexe = (data.suivi?.by_sexe || []).map((r: any) => ({
      label: r.sexe_label || r.sexe || "Non renseigné",
      value: num(r.nb_sortants),
    }));

    const insertionsByType = (data.insertions?.by_type_insertion || []).map((r: any) => ({
      label: r.type_insertion_label || r.type_insertion || "Non renseigné",
      value: num(r.nb_insertions),
    }));

    const emploisByDomaine = (data.emplois?.by_domaine || []).map((r: any) => ({
      label: r.domaine_label || r.domaine || "Non renseigné",
      value: num(r.nb_emplois),
    }));

    const entreprisesByTaille = (data.entreprises?.by_taille || []).map((r: any) => ({
      label: r.taille_label || r.taille || "Non renseigné",
      value: num(r.nb_entreprises),
    }));

    const formationsByCategorie = (data.formations?.by_categorie || []).map((r: any) => ({
      label: r.categorie_label || r.categorie || "Non renseigné",
      nb_formations: num(r.nb_formations),
      nb_participants: num(r.nb_participants),
    }));

    const tauxParPeriode = [
      { periode: "3 mois", taux: gFiere.tauxInsertion3m },
      { periode: "6 mois", taux: gFiere.tauxInsertion6m },
      { periode: "12 mois", taux: gFiere.tauxInsertion12m },
    ];

    return {
      sortantsByFiliere,
      sortantsBySexe,
      insertionsByType,
      emploisByDomaine,
      entreprisesByTaille,
      formationsByCategorie,
      tauxParPeriode,
    };
  }, [data, gFiere]);

  const userName = useMemo(() => {
    const full = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
    return full || user?.username || "Utilisateur";
  }, [user]);

  const headerTitle =
    projectType === "FIERE" ? "SIG FIERE" : projectType === "AGRIECO" ? "SIG AGRIECO" : "SIG";

  /* -------------------- Render states -------------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-6 max-w-md w-full">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-4" />
          <p className="text-red-200 text-center">{error}</p>

          <div className="mt-5 flex justify-center gap-2">
            <button
              onClick={handleLogout}
              className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-white text-sm font-semibold"
            >
              Se déconnecter
            </button>

            {canChangeProject ? (
              <button
                onClick={handleChangeProject}
                className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 text-white text-sm font-semibold border border-white/10"
              >
                Changer de projet
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  /* -------------------- Main UI -------------------- */

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#009460] via-[#FCD116] to-[#CE1126] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white drop-shadow">{headerTitle}</h1>
            <p className="text-xs text-white/80">
              {project?.libelle_public || "Dispositif SIG"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ExportDashboard
              data={{
                agrieco: projectType === "AGRIECO" ? data : undefined,
                fiere: projectType === "FIERE" ? data : undefined
              }}
              projectName={project?.code_fonc}
            />

            {canChangeProject && (
              <button
                onClick={handleChangeProject}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition text-sm text-white"
                title="Changer de projet"
              >
                <FolderSync className="h-4 w-4" />
                <span>Changer</span>
              </button>
            )}

            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{userName}</p>
              <p className="text-xs text-white/70">{project?.code_fonc}</p>
            </div>

            {canChangeProject && (
              <button
                onClick={handleChangeProject}
                className="sm:hidden p-2 rounded-lg bg-white/20 hover:bg-white/30 transition"
                title="Changer de projet"
              >
                <FolderSync className="h-5 w-5 text-white" />
              </button>
            )}

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

      <main id="dashboard-content" className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* ================================================================ */}
        {/* ====================== SECTIONS FIERE ========================= */}
        {/* ================================================================ */}

        {projectType === "FIERE" ? (
          <>
            {/* FIERE 1 */}
            <Section
              title="Formation et Sortants"
              icon={<GraduationCap className="h-5 w-5 text-white" />}
              color="blue"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <StatCard
                  title="Jeunes formés"
                  value={fmt(gFiere.nbSortants)}
                  icon={<Users className="h-5 w-5" />}
                  color="blue"
                  subtitle="Total sortants"
                />
                <StatCard
                  title="Part femmes"
                  value={
                    gFiere.nbSortants > 0
                      ? fmtPct((gFiere.nbSortantsFemmes / gFiere.nbSortants) * 100)
                      : "--"
                  }
                  icon={<Heart className="h-5 w-5" />}
                  color="pink"
                  subtitle={`${fmt(gFiere.nbSortantsFemmes)} femmes`}
                />
                <StatCard
                  title="PVH formés"
                  value={fmt(gFiere.nbSortantsPvh)}
                  icon={<Shield className="h-5 w-5" />}
                  color="purple"
                  subtitle="Personnes vulnérables"
                />
                <GaugeCard
                  title="Taux d'achèvement"
                  value={gFiere.tauxAchevement}
                  icon={<CheckCircle className="h-5 w-5" />}
                  color="green"
                  subtitle="Formations terminées"
                />
                <StatCard
                  title="Formations"
                  value={fmt(gFiere.nbFormations)}
                  icon={<Award className="h-5 w-5" />}
                  color="yellow"
                />
                <StatCard
                  title="Participants"
                  value={fmt(gFiere.nbParticipants)}
                  icon={<UserCheck className="h-5 w-5" />}
                  color="green"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <ChartCard title="Sortants par filière" hint="Barres">
                  <div className="h-64">
                    {chartFiere.sortantsByFiliere.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartFiere.sortantsByFiliere}
                          margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis
                            dataKey="label"
                            angle={-25}
                            textAnchor="end"
                            tick={{ fontSize: 10, fill: "#94a3b8" }}
                          />
                          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              border: "1px solid #334155",
                              borderRadius: 8,
                            }}
                          />
                          <Legend />
                          <Bar dataKey="nb_sortants" name="Sortants" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="nb_inseres" name="Insérés" fill={COLORS.green} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Alimenté par /data/fiere-suivi-sortants/stats (by_filiere)." />
                    )}
                  </div>
                </ChartCard>

                <ChartCard title="Répartition par sexe" hint="Donut">
                  <div className="h-64">
                    {chartFiere.sortantsBySexe.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartFiere.sortantsBySexe}
                            dataKey="value"
                            nameKey="label"
                            innerRadius={55}
                            outerRadius={95}
                            paddingAngle={3}
                          >
                            {chartFiere.sortantsBySexe.map((_: any, idx: number) => (
                              <Cell key={idx} fill={idx === 0 ? COLORS.blue : COLORS.pink} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              border: "1px solid #334155",
                              borderRadius: 8,
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Alimenté par /data/fiere-suivi-sortants/stats (by_sexe)." />
                    )}
                  </div>
                </ChartCard>
              </div>
            </Section>

            {/* FIERE 2 */}
            <Section
              title="Insertion Professionnelle"
              icon={<Briefcase className="h-5 w-5 text-white" />}
              color="green"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                <GaugeCard title="Insertion à 3 mois" value={gFiere.tauxInsertion3m} icon={<Timer className="h-5 w-5" />} color="yellow" />
                <GaugeCard title="Insertion à 6 mois" value={gFiere.tauxInsertion6m} icon={<Timer className="h-5 w-5" />} color="orange" />
                <GaugeCard title="Insertion à 12 mois" value={gFiere.tauxInsertion12m} icon={<Timer className="h-5 w-5" />} color="green" />
                <StatCard title="Sortants insérés" value={fmt(gFiere.nbSortantsInseres)} icon={<CheckCircle className="h-5 w-5" />} color="green" />
                <StatCard title="Stages < 3 mois" value={fmt(gFiere.nbStages)} icon={<Timer className="h-5 w-5" />} color="blue" subtitle="Placements courts" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <ChartCard title="Taux d'insertion par période" hint="Barres">
                  <div className="h-64">
                    {chartFiere.tauxParPeriode.some((p) => p.taux > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartFiere.tauxParPeriode} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="periode" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
                            formatter={(value) => [`${fmtDec(typeof value === 'number' ? value : 0)}%`, "Taux"]}
                          />
                          <Bar dataKey="taux" name="Taux d'insertion" fill={COLORS.green} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Alimenté par /data/ent-insertions-dom/stats (taux par période)." />
                    )}
                  </div>
                </ChartCard>

                <ChartCard title="Répartition par type d'insertion" hint="Donut">
                  <div className="h-64">
                    {chartFiere.insertionsByType.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartFiere.insertionsByType} dataKey="value" nameKey="label" innerRadius={55} outerRadius={95} paddingAngle={3}>
                            {chartFiere.insertionsByType.map((_: any, idx: number) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Alimenté par /data/ent-insertions-dom/stats (by_type_insertion)." />
                    )}
                  </div>
                </ChartCard>
              </div>
            </Section>

            {/* FIERE 3 */}
            <Section title="Entreprises et Emplois" icon={<Building className="h-5 w-5 text-white" />} color="purple">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <StatCard title="MPME appuyées" value={fmt(gFiere.mpmeAppuyees)} icon={<Handshake className="h-5 w-5" />} color="blue" subtitle="Par FIERE" />
                <StatCard title="MPME formalisées" value={fmt(gFiere.mpmeFormalisees)} icon={<CheckCircle className="h-5 w-5" />} color="green" subtitle="Créées/immatriculées" />
                <StatCard title="Emplois créés" value={fmt(gFiere.nbEmploisCrees)} icon={<TrendingUp className="h-5 w-5" />} color="green" />
                <StatCard title="Emplois maintenus" value={fmt(gFiere.nbEmploisMaintenus)} icon={<Shield className="h-5 w-5" />} color="yellow" />
                <StatCard
                  title="Part femmes (emplois)"
                  value={gFiere.nbEmploisTotal > 0 ? fmtPct((gFiere.nbEmploisFemmes / gFiere.nbEmploisTotal) * 100) : "--"}
                  icon={<Heart className="h-5 w-5" />}
                  color="pink"
                  subtitle={`${fmt(gFiere.nbEmploisFemmes)} emplois`}
                />
                <StatCard title="Entreprises (total)" value={fmt(gFiere.nbEntreprises)} icon={<Building2 className="h-5 w-5" />} color="purple" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <ChartCard title="Emplois par domaine" hint="Barres">
                  <div className="h-64">
                    {chartFiere.emploisByDomaine.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartFiere.emploisByDomaine} layout="vertical" margin={{ top: 10, right: 20, left: 80, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <YAxis dataKey="label" type="category" tick={{ fontSize: 10, fill: "#94a3b8" }} width={75} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                          <Bar dataKey="value" name="Emplois" fill={COLORS.purple} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Alimenté par /data/ent-emplois-dom/stats (by_domaine)." />
                    )}
                  </div>
                </ChartCard>

                <ChartCard title="Entreprises par taille" hint="Donut">
                  <div className="h-64">
                    {chartFiere.entreprisesByTaille.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartFiere.entreprisesByTaille} dataKey="value" nameKey="label" innerRadius={55} outerRadius={95} paddingAngle={3}>
                            {chartFiere.entreprisesByTaille.map((_: any, idx: number) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Alimenté par /data/entreprises/stats (by_taille)." />
                    )}
                  </div>
                </ChartCard>
              </div>
            </Section>
          </>
        ) : null}

        {/* ================================================================ */}
        {/* ===================== SECTIONS AGRIECO ======================== */}
        {/* ================================================================ */}

        {projectType === "AGRIECO" ? (
          <>
            {/* AGRIECO 1 */}
            <Section title="Restauration et Biodiversité" icon={<TreePine className="h-5 w-5 text-white" />} color="green">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <StatCard title="Ha restaurés" value={fmt(g.surfaceRestauree)} suffix="ha" icon={<Sprout className="h-5 w-5" />} color="green" />
                <StatCard title="Ha régénérés" value={fmt(g.surfaceRegeneree)} suffix="ha" icon={<Leaf className="h-5 w-5" />} color="green" />
                <StatCard title="Plantations" value={fmt(g.plantationsHa)} suffix="ha" icon={<TreePine className="h-5 w-5" />} color="yellow" subtitle="Zones type PLANTATION" />
                <StatCard title="Plants produits" value={fmt(g.plantsProduits)} icon={<Wheat className="h-5 w-5" />} color="yellow" />
                <StatCard title="Ouvrages antiérosifs" value={fmt(g.nbOuvrages)} icon={<Shield className="h-5 w-5" />} color="orange" />
                <StatCard title="Emplois verts" value={fmt(g.emploisVerts)} icon={<BriefcaseBusiness className="h-5 w-5" />} color="green" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <ChartCard title="Surfaces restaurées / régénérées par région" hint="Barres empilées">
                  <div className="h-64">
                    {chartData.zonesByRegion.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.zonesByRegion} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="region_nom" angle={-25} textAnchor="end" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                          <Legend />
                          <Bar dataKey="surface_restauree_ha" name="Restaurée (ha)" stackId="a" fill={COLORS.green} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="surface_regeneree_ha" name="Régénérée (ha)" stackId="a" fill={COLORS.yellow} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Alimenté par /data/zone-degradee/stats (by_region)." />
                    )}
                  </div>
                </ChartCard>

                <ChartCard title="Répartition des zones dégradées par type" hint="Donut">
                  <div className="h-64">
                    {chartData.zonesByType.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData.zonesByType} dataKey="value" nameKey="label" innerRadius={55} outerRadius={95} paddingAngle={3}>
                            {chartData.zonesByType.map((_: any, idx: number) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Alimenté par /data/zone-degradee/stats (by_type_degradation)." />
                    )}
                  </div>
                </ChartCard>
              </div>
            </Section>

            {/* AGRIECO 2 */}
            <Section title="Ressources en eau et Climat" icon={<Droplets className="h-5 w-5 text-white" />} color="blue">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <StatCard title="Stations météo" value={fmt(g.nbStations)} icon={<Thermometer className="h-5 w-5" />} color="blue" />
                <StatCard title="Stations actives" value={fmt(g.nbStationsActives)} icon={<Zap className="h-5 w-5" />} color="green" />
                <StatCard title="Stations inactives" value={fmt(g.nbStationsInactives)} icon={<AlertCircle className="h-5 w-5" />} color="red" />
                <StatCard title="Têtes de sources protégées" value={fmt(g.sourcesProtegees)} icon={<Droplets className="h-5 w-5" />} color="blue" />
                <GaugeCard title="Accès eau potable" value={g.accesEauPct} icon={<Home className="h-5 w-5" />} color="purple" subtitle="Taux estimé (%)" />
                <StatCard title="Couloirs (km)" value={fmtDec(g.kmCouloirs)} suffix="km" icon={<Map className="h-5 w-5" />} color="orange" subtitle="Longueur totale" />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <ChartCard title="Statut des stations" hint="Donut">
                  <div className="h-64">
                    {chartData.stationsDonut.some((x) => x.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData.stationsDonut} dataKey="value" nameKey="label" innerRadius={55} outerRadius={95} paddingAngle={3}>
                            <Cell fill={COLORS.green} />
                            <Cell fill={COLORS.red} />
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Alimenté par /data/meteo/stations/stats (global nb_actives/nb_inactives)." />
                    )}
                  </div>
                </ChartCard>

                <ChartCard title="Cumul de pluie par région" hint="Barres">
                  <div className="h-64">
                    {chartData.pluieByRegion.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.pluieByRegion} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="region_nom" angle={-25} textAnchor="end" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                          <Bar dataKey="somme_pluie_mm" name="Pluie (mm)" fill={COLORS.cyan} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Alimenté par /data/meteo/mesures/stats (by_region)." />
                    )}
                  </div>
                </ChartCard>

                <ChartCard title="Pluie mensuelle" hint="Area">
                  <div className="h-64">
                    {chartData.pluieByMois.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData.pluieByMois} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="mois" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                          <Area type="monotone" dataKey="pluie_mm" name="Pluie (mm)" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.25} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Optionnel: expose /data/meteo/mesures/stats (by_mois/by_month)." />
                    )}
                  </div>
                </ChartCard>
              </div>
            </Section>

            {/* AGRIECO 3 */}
            <Section title="Production végétale (CEP)" icon={<Wheat className="h-5 w-5 text-white" />} color="yellow">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <StatCard title="CEP / Parcelles" value={fmt(g.totalParcelles)} icon={<Map className="h-5 w-5" />} color="yellow" subtitle="Sites/CEP opérationnels" />
                <StatCard title="Surface emblavée" value={fmtDec(g.surfaceTotale)} suffix="ha" icon={<Wheat className="h-5 w-5" />} color="green" />
                <StatCard title="Rendement moyen" value={fmtDec(g.rendementMoyen)} suffix="kg/ha" icon={<TrendingUp className="h-5 w-5" />} color="orange" />
                <StatCard title="Parcelles suivies (pratiques)" value={fmt(g.nbPratiques)} icon={<Leaf className="h-5 w-5" />} color="green" subtitle="Pratiques agroécologiques" />
                <StatCard title="Intrants distribués" value={fmtDec(g.quantiteIntrants)} suffix="T" icon={<Store className="h-5 w-5" />} color="purple" />
                <StatCard title="Marchés / points de vente" value={fmt(g.nbMarches)} icon={<Store className="h-5 w-5" />} color="blue" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <ChartCard title="Rendement moyen par filière" hint="Barres">
                  <div className="h-64">
                    {chartData.parcellesByFiliere.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.parcellesByFiliere} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="label" angle={-25} textAnchor="end" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                          <Bar dataKey="rendement_moyen" name="Rendement (kg/ha)" fill={COLORS.orange} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Alimenté par /data/cep-parcelles/stats (by_filiere)." />
                    )}
                  </div>
                </ChartCard>

                <ChartCard title="Surfaces par filière" hint="Donut">
                  <div className="h-64">
                    {chartData.parcellesByFiliere.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData.parcellesByFiliere.map((x: any) => ({ label: x.label, value: x.total_surface_decl_ha }))}
                            dataKey="value"
                            nameKey="label"
                            innerRadius={55}
                            outerRadius={95}
                            paddingAngle={3}
                          >
                            {chartData.parcellesByFiliere.map((_: any, idx: number) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Alimenté par /data/cep-parcelles/stats (by_filiere)." />
                    )}
                  </div>
                </ChartCard>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <ChartCard title="Rendement par campagne" hint="Ligne">
                  <div className="h-64">
                    {chartData.parcellesByCampagne.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData.parcellesByCampagne} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="campagne" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                          <Line type="monotone" dataKey="rendement_moyen" name="Rendement" stroke={COLORS.yellow} strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Optionnel: /data/cep-parcelles/stats (by_campagne)." />
                    )}
                  </div>
                </ChartCard>

                <ChartCard title="Surface par campagne" hint="Area">
                  <div className="h-64">
                    {chartData.parcellesByCampagne.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData.parcellesByCampagne} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="campagne" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                          <Area type="monotone" dataKey="total_surface_decl_ha" name="Surface (ha)" stroke={COLORS.green} fill={COLORS.green} fillOpacity={0.25} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Optionnel: /data/cep-parcelles/stats (by_campagne)." />
                    )}
                  </div>
                </ChartCard>
              </div>
            </Section>

            {/* AGRIECO 4 */}
            <Section title="Élevage et Pastoralisme" icon={<Map className="h-5 w-5 text-white" />} color="orange">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <StatCard title="Couloirs transhumance" value={fmt(g.nbCouloirs)} icon={<Map className="h-5 w-5" />} color="orange" subtitle="Nb couloirs" />
                <StatCard title="Longueur couloirs" value={fmtDec(g.kmCouloirs)} suffix="km" icon={<Map className="h-5 w-5" />} color="orange" subtitle="Km totaux" />
                <StatCard title="Groupements éleveurs" value={fmt(g.groupementsEleveurs)} icon={<Users className="h-5 w-5" />} color="blue" />
                <StatCard title="Conflits gérés" value={fmt(g.conflitsRegles)} icon={<Shield className="h-5 w-5" />} color="red" subtitle="Résolution/gestion" />
                <StatCard title="Officines vétérinaires" value={fmt(g.officinesVet)} icon={<Building2 className="h-5 w-5" />} color="purple" />
                <StatCard title="Effectif bétail total" value={fmt(g.bovins + g.ovins + g.caprins)} icon={<Users className="h-5 w-5" />} color="yellow" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <ChartCard title="Répartition du cheptel" hint="Donut">
                  <div className="h-64">
                    {chartData.betailDonut.some((x) => x.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData.betailDonut} dataKey="value" nameKey="label" innerRadius={55} outerRadius={95} paddingAngle={3}>
                            {chartData.betailDonut.map((_: any, idx: number) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Alimenté par /data/agr-organisations/stats (global total_bovins/ovins/caprins)." />
                    )}
                  </div>
                </ChartCard>

                <ChartCard title="Comités (par type)" hint="Barres">
                  <div className="h-64">
                    {chartData.comitesByType.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.comitesByType} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="label" angle={-25} textAnchor="end" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                          <Bar dataKey="nb" name="Comités" fill={COLORS.orange} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Optionnel: /data/agr-comites/stats (by_type_comite)." />
                    )}
                  </div>
                </ChartCard>
              </div>
            </Section>

            {/* AGRIECO 5 */}
            <Section title="Intrants et Marchés" icon={<Store className="h-5 w-5 text-white" />} color="purple">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <StatCard title="Comptoirs intrants" value={fmt(g.comptoirsTotal)} icon={<Store className="h-5 w-5" />} color="purple" />
                <StatCard title="Comptoirs conformes" value={fmt(g.comptoirsConformes)} icon={<CheckCircle className="h-5 w-5" />} color="green" subtitle="Contrôles OK" />
                <GaugeCard
                  title="Taux conformité"
                  value={g.comptoirsTotal > 0 ? (g.comptoirsConformes / g.comptoirsTotal) * 100 : 0}
                  icon={<Shield className="h-5 w-5" />}
                  color="yellow"
                  subtitle="(conformes / total)"
                />
                <StatCard title="Quantité distribuée" value={fmtDec(g.quantiteIntrants)} suffix="T" icon={<Store className="h-5 w-5" />} color="orange" />
                <StatCard title="Banques de semences" value={fmt(g.banquesSemences)} icon={<Home className="h-5 w-5" />} color="blue" />
                <StatCard title="Producteurs semenciers" value={fmt(g.producteursSemenciers)} icon={<Users className="h-5 w-5" />} color="green" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <ChartCard title="Marchés par fréquence" hint="Donut">
                  <div className="h-64">
                    {chartData.marchesByFrequence.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData.marchesByFrequence} dataKey="value" nameKey="label" innerRadius={55} outerRadius={95} paddingAngle={3}>
                            {chartData.marchesByFrequence.map((_: any, idx: number) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Alimenté par /data/marches/stats (by_frequence_marche)." />
                    )}
                  </div>
                </ChartCard>

                <ChartCard title="Intrants par type" hint="Barres">
                  <div className="h-64">
                    {chartData.intrantsByType.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.intrantsByType} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="label" angle={-25} textAnchor="end" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                          <Bar dataKey="quantite" name="Quantité" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Optionnel: /data/intrants-distribution/stats (by_type_intrant)." />
                    )}
                  </div>
                </ChartCard>
              </div>
            </Section>

            {/* AGRIECO 6 */}
            <Section title="Ménages et Sensibilisation" icon={<Home className="h-5 w-5 text-white" />} color="red">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <StatCard title="Ménages suivis" value={fmt(g.totalMenages)} icon={<Home className="h-5 w-5" />} color="red" />
                <StatCard title="Ménages agroécologie" value={fmt(g.menagesAgroeco)} icon={<Leaf className="h-5 w-5" />} color="green" />
                <StatCard title="Séances sensibilisation" value={fmt(g.seancesSensib)} icon={<Users className="h-5 w-5" />} color="yellow" />
                <StatCard title="Foyers améliorés" value={fmt(g.foyersAmeliores)} icon={<Home className="h-5 w-5" />} color="orange" />
                <StatCard title="Ruches installées" value={fmt(g.ruches)} icon={<Wheat className="h-5 w-5" />} color="purple" />
                <GaugeCard
                  title="Taux adoption agroécologie"
                  value={g.totalMenages > 0 ? (g.menagesAgroeco / g.totalMenages) * 100 : 0}
                  icon={<Leaf className="h-5 w-5" />}
                  color="green"
                  subtitle="(agroéco / ménages)"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <ChartCard title="Ménages par région" hint="Barres">
                  <div className="h-64">
                    {chartData.menagesByRegion.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.menagesByRegion} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="region_nom" angle={-25} textAnchor="end" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                          <Legend />
                          <Bar dataKey="total_menages" name="Ménages" fill={COLORS.red} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="menages_agroeco" name="Agroécologie" fill={COLORS.green} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Alimenté par /data/agr-menages/stats (by_region)." />
                    )}
                  </div>
                </ChartCard>

                <ChartCard title="Type de foyer principal" hint="Donut">
                  <div className="h-64">
                    {chartData.menagesByFoyer.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData.menagesByFoyer} dataKey="value" nameKey="label" innerRadius={55} outerRadius={95} paddingAngle={3}>
                            {chartData.menagesByFoyer.map((_: any, idx: number) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Optionnel: /data/agr-menages/stats (by_type_foyer)." />
                    )}
                  </div>
                </ChartCard>
              </div>
            </Section>

            {/* AGRIECO 7 */}
            <Section title="Gouvernance et Organisations" icon={<Shield className="h-5 w-5 text-white" />} color="blue">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <StatCard title="Comités actifs" value={fmt(g.totalComites)} icon={<Shield className="h-5 w-5" />} color="blue" />
                <StatCard title="Comités feux" value={fmt(g.comitesFeux)} icon={<CloudRain className="h-5 w-5" />} color="orange" subtitle="Prévention feux" />
                <StatCard title="OP identifiées" value={fmt(g.opIdentifiees)} icon={<Users className="h-5 w-5" />} color="green" />
                <StatCard title="Organisations (total)" value={fmt(g.totalOrgs)} icon={<Building2 className="h-5 w-5" />} color="purple" />
                <StatCard title="Techniciens formés" value={fmt(g.techniciensFormes)} icon={<UserCheck className="h-5 w-5" />} color="yellow" />
                <StatCard title="Conflits résolus" value={fmt(g.conflitsRegles)} icon={<CheckCircle className="h-5 w-5" />} color="green" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <ChartCard title="Organisations par type" hint="Barres">
                  <div className="h-64">
                    {chartData.orgByType.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.orgByType} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="label" angle={-25} textAnchor="end" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                          <Bar dataKey="nb" name="Organisations" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmpty label="Optionnel: /data/agr-organisations/stats (by_type_org)." />
                    )}
                  </div>
                </ChartCard>

                <ChartCard title="Indicateurs clés (rappel)" hint="Placeholder">
                  <div className="h-64">
                    <ChartEmpty label="Ici on peut ajouter un graphique “Top régions” ou “série temporelle” dès qu’on a des vues marts (ex: by_mois)." />
                  </div>
                </ChartCard>
              </div>
            </Section>
          </>
        ) : null}

        {/* Footer note */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">
            Tableau de bord {projectType} | {projectType === "AGRIECO" ? "42 indicateurs" : "12 indicateurs"} | Graphiques
            "placeholder" tant que la base est vide.
          </p>
          <p className="text-[10px] text-slate-600 mt-1">
            Les statistiques proviennent des vues matérialisées du schéma marts.
          </p>
        </div>
      </main>
    </div>
  );
}