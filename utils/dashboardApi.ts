// utils/dashboardApi.ts

import { getCurrentProject, type RefProject } from "./authClient";

const API_BASE = "/api/proxy";

// Types projet stocké
export type StoredProject = RefProject;

export function getStoredProject(): StoredProject | null {
  return getCurrentProject();
}

// Utilitaire num - convertit une valeur en nombre (0 si null/undefined/NaN)
export function num(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// Classe erreur API
export class ApiError extends Error {
  status: number;
  statusText: string;
  body: string;

  constructor(status: number, statusText: string, body: string, path: string) {
    super(`Erreur API ${status} sur ${path}: ${body || statusText}`);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

// Appel GET generique avec cookies HTTP-only (via proxy) et X-Project-Code
export async function apiGet<T = unknown>(path: string): Promise<T> {
  const project = getCurrentProject();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (project?.code_fonc) {
    headers["X-Project-Code"] = project.code_fonc;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers,
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, res.statusText, text, path);
  }

  const text = await res.text();
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

// Types AGRIECO (keys match page.tsx expectations)
export interface AgriecoDashboardRaw {
  menages: {
    global: {
      total_menages?: number;
      nb_menages_prat_agroeco?: number;
      total_seances_sensib?: number;
    };
    by_region?: Array<{
      region_nom: string;
      total_menages: number;
    }>;
  };
  organisations: {
    global: {
      total_organisations?: number;
      total_emplois_verts?: number;
    };
    by_region?: Array<{
      region_nom: string;
      total_organisations: number;
    }>;
  };
  comites: {
    global: {
      total_comites?: number;
      total_conflits_regles?: number;
    };
  };
  parcelles: {
    global: {
      total_parcelles?: number;
      total_surface_decl_ha?: number;
      rendement_moyen?: number;
    };
    by_filiere?: Array<{
      filiere_label: string;
      rendement_moyen_kg_ha?: number;
      rendement_moyen?: number;
      surface_decl_ha?: number;
    }>;
  };
  zones: {
    global: {
      surface_restauree_ha?: number;
      surface_regeneree_ha?: number;
      surface_plantations_ha?: number;
      nb_plants?: number;
    };
    by_region?: Array<{
      region_nom: string;
      surface_restauree_ha: number;
      surface_regeneree_ha: number;
    }>;
  };
  sources: {
    global: {
      nb_sources_protegees?: number;
    };
  };
  stations: {
    global: {
      nb_stations?: number;
      nb_stations_actives?: number;
    };
  };
  intrants: {
    global: {
      total_quantite?: number;
    };
  };
  ouvrages: {
    global: {
      nb_ouvrages?: number;
    };
  };
  couloirs: {
    global: {
      nb_couloirs?: number;
    };
  };
  mesures: {
    global: {
      nb_mesures?: number;
      somme_pluie_mm?: number;
      moyenne_pluie_mm?: number;
    };
  };
  pratiques: {
    global: {
      nb_parcelles?: number;
      nb_pratiques?: number;
      total_pratiques?: number;
      surface_totale_ha?: number;
      rendement_moyen_calc?: number;
    };
  };
  marches: {
    global: {
      nb_marches_total?: number;
      nb_marches_actifs?: number;
    };
  };
}

// Types FIERE (keys match page.tsx expectations)
export interface FiereDashboardRaw {
  suivi: {
    global: {
      nb_sortants?: number;
      nb_sortants_pvh?: number;
      taux_insertion_pct?: number;
    };
    by_filiere?: Array<{
      filiere_label: string;
      filiere_principale_label?: string;
      nb_sortants: number;
      nb_sortants_inseres?: number;
      nb_inseres?: number;
    }>;
    by_sexe?: Array<{
      sexe_label: string;
      nb_sortants: number;
    }>;
    by_periode_suivi?: Array<{
      periode_suivi_label: string;
      nb_sortants: number;
      taux_insertion_pct: number;
    }>;
    by_type_insertion?: Array<{
      type_insertion_label: string;
      nb_sortants_inseres: number;
    }>;
  };
  emplois: {
    global: {
      nb_emplois_totaux?: number;
      nb_emplois_femmes?: number;
    };
    by_domaine?: Array<{
      domaine_label: string;
      nb_emplois: number;
    }>;
  };
  insertions: {
    global: {
      nb_insertions?: number;
      insertion_3m?: number;
      insertion_6m?: number;
      insertion_12m?: number;
      taux_insertion_3m?: number;
      taux_insertion_6m?: number;
      taux_insertion_12m?: number;
    };
    by_type_insertion?: Array<{
      type_insertion_label?: string;
      type_label?: string;
      nb_insertions: number;
    }>;
  };
  entreprises: {
    global: {
      nb_entreprises?: number;
      total_mpme_formalisees?: number;
      total_mpme_appuyees_fiere?: number;
    };
    by_taille?: Array<{
      taille_label?: string;
      nb_entreprises: number;
    }>;
  };
  formations: {
    global: {
      nb_formations?: number;
      nb_participants?: number;
    };
    by_categorie?: Array<{
      categorie_label?: string;
      nb_participants?: number;
      nb_participants_total?: number;
      nb_part_cat?: number;
      nb_formations?: number;
    }>;
  };
  acteurs: {
    global: {
      total_acteurs?: number;
      nb_acteurs?: number;
      nb_partenariats_actifs?: number;
      nb_stages_courts?: number;
    };
  };
}

// Fetch AGRIECO aggregates
export async function fetchAgriecoAggregates(): Promise<AgriecoDashboardRaw> {
  const results = await Promise.all([
    apiGet<Record<string, unknown>>("/data/agr-menages/stats/").catch(() => ({})),
    apiGet<Record<string, unknown>>("/data/agr-organisations/stats/").catch(() => ({})),
    apiGet<Record<string, unknown>>("/data/agr-comites/stats/").catch(() => ({})),
    apiGet<Record<string, unknown>>("/data/cep-parcelles/stats/").catch(() => ({})),
    apiGet<Record<string, unknown>>("/data/zone-degradee/stats/").catch(() => ({})),
    apiGet<Record<string, unknown>>("/data/tete-source/stats/").catch(() => ({})),
    apiGet<Record<string, unknown>>("/data/meteo/stations/stats/").catch(() => ({})),
    apiGet<Record<string, unknown>>("/data/intrants-distribution/stats/").catch(() => ({})),
    apiGet<Record<string, unknown>>("/data/ouvrages/stats/").catch(() => ({})),
    apiGet<Record<string, unknown>>("/data/couloirs/stats/").catch(() => ({})),
    apiGet<Record<string, unknown>>("/data/meteo/mesures/stats/").catch(() => ({})),
    apiGet<Record<string, unknown>>("/data/pratiques-agro-parcelle/stats/").catch(() => ({})),
    apiGet<Record<string, unknown>>("/data/marches/stats/").catch(() => ({})),
  ]);

  const [
    menagesRaw,
    organisationsRaw,
    comitesRaw,
    parcellesRaw,
    zonesRaw,
    sourcesRaw,
    stationsRaw,
    intrantsRaw,
    ouvragesRaw,
    couloirsRaw,
    mesuresRaw,
    pratiquesRaw,
    marchesRaw,
  ] = results;

  type WithGlobal = { global?: Record<string, unknown> };
  type WithByRegion = { by_region?: Array<Record<string, unknown>> };
  type WithByFiliere = { by_filiere?: Array<Record<string, unknown>> };
  type PracticesGlobal = {
    nb_pratiques?: unknown;
    total_pratiques?: unknown;
    nb_parcelles?: unknown;
  };

  const practicesGlobalRaw = ((pratiquesRaw as WithGlobal).global || pratiquesRaw || {}) as PracticesGlobal;
  const normalizedPractices = {
    ...practicesGlobalRaw,
    nb_pratiques: num(
      practicesGlobalRaw.nb_pratiques
      ?? practicesGlobalRaw.total_pratiques
      ?? practicesGlobalRaw.nb_parcelles
    ),
    total_pratiques: num(
      practicesGlobalRaw.total_pratiques
      ?? practicesGlobalRaw.nb_pratiques
      ?? practicesGlobalRaw.nb_parcelles
    ),
  };

  return {
    menages: {
      global: (menagesRaw as WithGlobal).global || menagesRaw || {},
      by_region: (menagesRaw as WithByRegion).by_region,
    },
    organisations: {
      global: (organisationsRaw as WithGlobal).global || organisationsRaw || {},
      by_region: (organisationsRaw as WithByRegion).by_region,
    },
    comites: {
      global: (comitesRaw as WithGlobal).global || comitesRaw || {},
    },
    parcelles: {
      global: (parcellesRaw as WithGlobal).global || parcellesRaw || {},
      by_filiere: (parcellesRaw as WithByFiliere).by_filiere,
    },
    zones: {
      global: (zonesRaw as WithGlobal).global || zonesRaw || {},
      by_region: (zonesRaw as WithByRegion).by_region,
    },
    sources: {
      global: (sourcesRaw as WithGlobal).global || sourcesRaw || {},
    },
    stations: {
      global: (stationsRaw as WithGlobal).global || stationsRaw || {},
    },
    intrants: {
      global: (intrantsRaw as WithGlobal).global || intrantsRaw || {},
    },
    ouvrages: {
      global: (ouvragesRaw as WithGlobal).global || ouvragesRaw || {},
    },
    couloirs: {
      global: (couloirsRaw as WithGlobal).global || couloirsRaw || {},
    },
    mesures: {
      global: (mesuresRaw as WithGlobal).global || mesuresRaw || {},
    },
    pratiques: {
      global: normalizedPractices,
    },
    marches: {
      global: (marchesRaw as WithGlobal).global || marchesRaw || {},
    },
  } as AgriecoDashboardRaw;
}

// Fetch FIERE aggregates
export async function fetchFiereAggregates(): Promise<FiereDashboardRaw> {
  const results = await Promise.all([
    apiGet<Record<string, unknown>>("/data/fiere-suivi-sortants/stats/").catch(() => ({})),
    apiGet<Record<string, unknown>>("/data/ent-emplois-dom/stats/").catch(() => ({})),
    apiGet<Record<string, unknown>>("/data/ent-insertions-dom/stats/").catch(() => ({})),
    apiGet<Record<string, unknown>>("/data/entreprises/stats/").catch(() => ({})),
    apiGet<Record<string, unknown>>("/data/formations-eco-cat/stats/").catch(() => ({})),
    apiGet<Record<string, unknown>>("/data/acteurs-participation/stats/").catch(() => ({})),
  ]);

  const [
    suiviRaw,
    emploisRaw,
    insertionsRaw,
    entreprisesRaw,
    formationsRaw,
    acteursRaw,
  ] = results;

  type WithGlobal = { global?: Record<string, unknown> };
  type WithByPeriode = { by_periode_suivi?: Array<Record<string, unknown>> };
  type WithByType = { by_type_insertion?: Array<Record<string, unknown>> };
  type WithByDomaine = { by_domaine?: Array<Record<string, unknown>> };
  type WithByTypeIns = {
    by_type?: Array<Record<string, unknown>>;
    by_type_insertion?: Array<Record<string, unknown>>;
  };
  type WithByFiliere = {
    by_filiere?: Array<Record<string, unknown>>;
    by_filiere_formation?: Array<Record<string, unknown>>;
  };
  type WithBySexe = { by_sexe?: Array<Record<string, unknown>> };
  type WithByTaille = { by_taille?: Array<Record<string, unknown>> };
  type WithByCategorie = {
    by_categorie?: Array<Record<string, unknown>>;
    by_categorie_participant?: Array<Record<string, unknown>>;
  };

  const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  const hasValue = (value: unknown): boolean => value !== null && value !== undefined && String(value).trim() !== "";

  const rawInsertionsGlobal = (insertionsRaw as WithGlobal).global || insertionsRaw || {};
  const totalInsertions = num(
    (rawInsertionsGlobal as Record<string, unknown>).nb_insertions
    ?? (rawInsertionsGlobal as Record<string, unknown>).total_insertions
  );
  const insertion3m = num(
    (rawInsertionsGlobal as Record<string, unknown>).insertion_3m
    ?? (rawInsertionsGlobal as Record<string, unknown>).nb_insertions_3m
  );
  const insertion6m = num(
    (rawInsertionsGlobal as Record<string, unknown>).insertion_6m
    ?? (rawInsertionsGlobal as Record<string, unknown>).nb_insertions_6m
  );
  const insertion12m = num(
    (rawInsertionsGlobal as Record<string, unknown>).insertion_12m
    ?? (rawInsertionsGlobal as Record<string, unknown>).nb_insertions_12m
  );
  const taux3mRaw = (rawInsertionsGlobal as Record<string, unknown>).taux_insertion_3m
    ?? (rawInsertionsGlobal as Record<string, unknown>).taux_3m;
  const taux6mRaw = (rawInsertionsGlobal as Record<string, unknown>).taux_insertion_6m
    ?? (rawInsertionsGlobal as Record<string, unknown>).taux_6m;
  const taux12mRaw = (rawInsertionsGlobal as Record<string, unknown>).taux_insertion_12m
    ?? (rawInsertionsGlobal as Record<string, unknown>).taux_12m;

  const normalizedInsertionsGlobal = {
    ...rawInsertionsGlobal,
    insertion_3m: insertion3m,
    insertion_6m: insertion6m,
    insertion_12m: insertion12m,
    taux_insertion_3m: hasValue(taux3mRaw) ? num(taux3mRaw) : (totalInsertions > 0 ? (100 * insertion3m) / totalInsertions : 0),
    taux_insertion_6m: hasValue(taux6mRaw) ? num(taux6mRaw) : (totalInsertions > 0 ? (100 * insertion6m) / totalInsertions : 0),
    taux_insertion_12m: hasValue(taux12mRaw) ? num(taux12mRaw) : (totalInsertions > 0 ? (100 * insertion12m) / totalInsertions : 0),
    taux_3m: hasValue(taux3mRaw) ? num(taux3mRaw) : (totalInsertions > 0 ? (100 * insertion3m) / totalInsertions : 0),
    taux_6m: hasValue(taux6mRaw) ? num(taux6mRaw) : (totalInsertions > 0 ? (100 * insertion6m) / totalInsertions : 0),
    taux_12m: hasValue(taux12mRaw) ? num(taux12mRaw) : (totalInsertions > 0 ? (100 * insertion12m) / totalInsertions : 0),
  };

  const rawActeursGlobal = (acteursRaw as WithGlobal).global || acteursRaw || {};
  const normalizedActeursGlobal = {
    ...rawActeursGlobal,
    total_acteurs: num(
      (rawActeursGlobal as Record<string, unknown>).total_acteurs
      ?? (rawActeursGlobal as Record<string, unknown>).nb_acteurs
      ?? (rawActeursGlobal as Record<string, unknown>).distinct_acteurs
    ),
    nb_acteurs: num(
      (rawActeursGlobal as Record<string, unknown>).nb_acteurs
      ?? (rawActeursGlobal as Record<string, unknown>).total_acteurs
      ?? (rawActeursGlobal as Record<string, unknown>).distinct_acteurs
    ),
    nb_partenariats_actifs: num(
      (rawActeursGlobal as Record<string, unknown>).nb_partenariats_actifs
      ?? (rawActeursGlobal as Record<string, unknown>).nb_conventions_cfpa_actives
      ?? (rawActeursGlobal as Record<string, unknown>).total_participations
    ),
    nb_stages_courts: num((rawActeursGlobal as Record<string, unknown>).nb_stages_courts),
  };

  const rawFormationsGlobal = (formationsRaw as WithGlobal).global || formationsRaw || {};
  const normalizedFormationsGlobal = {
    ...rawFormationsGlobal,
    nb_participants: num(
      (rawFormationsGlobal as Record<string, unknown>).nb_participants
      ?? (rawFormationsGlobal as Record<string, unknown>).participants_total
      ?? (rawFormationsGlobal as Record<string, unknown>).total_participants
    ),
    total_participants: num(
      (rawFormationsGlobal as Record<string, unknown>).total_participants
      ?? (rawFormationsGlobal as Record<string, unknown>).participants_total
      ?? (rawFormationsGlobal as Record<string, unknown>).nb_participants
    ),
  };

  const rawSuiviByFiliere = (suiviRaw as WithByFiliere).by_filiere
    || (suiviRaw as WithByFiliere).by_filiere_formation
    || [];
  const normalizedSuiviByFiliere = rawSuiviByFiliere.map((row) => {
    const rec = asRecord(row);
    const nbSortants = num(rec.nb_sortants);
    const nbInseres = num(rec.nb_inseres ?? rec.nb_sortants_inseres);
    return {
      ...rec,
      filiere_label: String(
        rec.filiere_label
        ?? rec.filiere_principale_label
        ?? rec.filiere_principale
        ?? rec.filiere
        ?? ""
      ),
      nb_sortants: nbSortants,
      nb_sortants_inseres: nbInseres,
      nb_inseres: nbInseres,
    };
  });

  const rawSuiviBySexe = (suiviRaw as WithBySexe).by_sexe || [];
  const normalizedSuiviBySexe = rawSuiviBySexe.map((row) => {
    const rec = asRecord(row);
    return {
      ...rec,
      sexe_label: String(rec.sexe_label ?? rec.sexe ?? ""),
      nb_sortants: num(rec.nb_sortants),
    };
  });

  const rawInsertionsByType = (insertionsRaw as WithByTypeIns).by_type_insertion
    || (insertionsRaw as WithByTypeIns).by_type
    || [];
  const normalizedInsertionsByType = rawInsertionsByType.map((row) => {
    const rec = asRecord(row);
    return {
      ...rec,
      type_insertion_label: String(
        rec.type_insertion_label
        ?? rec.type_label
        ?? rec.type_insertion
        ?? ""
      ),
      nb_insertions: num(rec.nb_insertions ?? rec.nb_ins_dom),
    };
  });

  const rawEntreprisesByTaille = (entreprisesRaw as WithByTaille).by_taille || [];
  const normalizedEntreprisesByTaille = rawEntreprisesByTaille.map((row) => {
    const rec = asRecord(row);
    return {
      ...rec,
      taille_label: String(rec.taille_label ?? rec.taille_entreprise ?? rec.taille ?? ""),
      nb_entreprises: num(rec.nb_entreprises),
    };
  });

  const rawFormationsByCategorie = (formationsRaw as WithByCategorie).by_categorie
    || (formationsRaw as WithByCategorie).by_categorie_participant
    || [];
  const normalizedFormationsByCategorie = rawFormationsByCategorie.map((row) => {
    const rec = asRecord(row);
    return {
      ...rec,
      categorie_label: String(rec.categorie_label ?? rec.categorie ?? ""),
      nb_formations: num(rec.nb_formations),
      nb_participants: num(rec.nb_participants ?? rec.nb_part_cat),
      nb_part_cat: num(rec.nb_part_cat ?? rec.nb_participants),
    };
  });

  return {
    suivi: {
      global: (suiviRaw as WithGlobal).global || suiviRaw || {},
      by_filiere: normalizedSuiviByFiliere,
      by_sexe: normalizedSuiviBySexe,
      by_periode_suivi: (suiviRaw as WithByPeriode).by_periode_suivi,
      by_type_insertion: (suiviRaw as WithByType).by_type_insertion,
    },
    emplois: {
      global: (emploisRaw as WithGlobal).global || emploisRaw || {},
      by_domaine: (emploisRaw as WithByDomaine).by_domaine,
    },
    insertions: {
      global: normalizedInsertionsGlobal,
      by_type_insertion: normalizedInsertionsByType,
    },
    entreprises: {
      global: (entreprisesRaw as WithGlobal).global || entreprisesRaw || {},
      by_taille: normalizedEntreprisesByTaille,
    },
    formations: {
      global: normalizedFormationsGlobal,
      by_categorie: normalizedFormationsByCategorie,
    },
    acteurs: {
      global: normalizedActeursGlobal,
    },
  } as FiereDashboardRaw;
}
