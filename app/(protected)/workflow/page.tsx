"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AlertCircle, CheckCircle2, Loader2, PlusCircle, RefreshCw, Send, Upload, XCircle } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { getCurrentProject, type RefProject } from "@/utils/authClient";
import { useAdminApi } from "../administration/hooks/useAdminApi";

type WorkflowRole = "reader" | "editor" | "manager" | "project_manager" | "admin";
type StatusFilter = "all" | "draft" | "submitted" | "validated" | "rejected" | "published";
type SourceType = "manual" | "kobo" | "csv" | "other";
type ActionType = "submit" | "validate" | "reject" | "publish";

interface WorkflowSubmission {
  submission_id: string;
  region_id: string;
  region_name?: string | null;
  dataset_code: string;
  title: string;
  source_type: string;
  source_type_display?: string;
  payload: unknown;
  status: string;
  status_display?: string;
  version: number;
  rejection_reason?: string | null;
  created_by: number | string | null;
  created_by_username?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface WorkflowHistory {
  action_id: number;
  action: string;
  action_display?: string;
  from_status?: string | null;
  to_status?: string;
  actor_username?: string | null;
  comment?: string | null;
  created_at?: string;
}

interface RegionOption {
  id: string;
  label: string;
}

interface KoboFormOption {
  dataset_code: string;
  asset_uid: string;
  label?: string;
}

type JsonRecord = Record<string, unknown>;

type RejectIssue = {
  record_ref: string;
  field: string;
  message: string;
  severity: "error" | "warning";
};

const PAGE_SIZE = 10;
const RECORDS_PAGE_SIZE = 20;

const RECORD_IDENTIFIER_KEYS = ["_id", "id", "_uuid", "uuid", "instanceID"];

const RECORD_FIELD_LABELS: Record<string, string> = {
  "_submission_time": "Date soumission",
  "_submitted_by": "Enqueteur",
  "_validation_status": "Statut Kobo",
  "_status": "Statut",
  "project_code": "Code projet",
  "region": "Region",
  "prefecture": "Prefecture",
  "commune": "Commune",
  "localite": "Localite",
  "gps_point": "Point GPS",
  "_gps_point_latitude": "Latitude GPS",
  "_gps_point_longitude": "Longitude GPS",
  "_gps_point_altitude": "Altitude GPS",
  "_gps_point_precision": "Precision GPS",
  "username": "Nom utilisateur",
  "start": "Debut",
  "end": "Fin",
  "today": "Date",
  "nom": "Nom",
  "prenom": "Prenom",
  "telephone": "Telephone",
  "contact_email": "Email",
  "district": "District",
  "village": "Village",
  "id_cep": "ID CEP",
  "campagne": "Campagne",
  "surface_ha": "Surface (ha)",
  "rendement_calc": "Rendement calcule",
  "rendement_saisi": "Rendement saisi",
  "production_totale": "Production totale",
  "id_menage": "ID menage",
  "nom_chef_menage": "Chef de menage",
  "type_menage": "Type menage",
  "nb_personnes": "Nombre de personnes",
  "id_org": "ID organisation",
  "nom_org": "Nom organisation",
  "type_org": "Type organisation",
  "id_ent": "ID entreprise",
  "raison_sociale": "Raison sociale",
  "nom_commercial": "Nom commercial",
  "id_formation": "ID formation",
  "intitule_formation": "Intitule formation",
  "id_sortant": "ID sortant",
  "nom_sortant": "Nom sortant",
  "code_station": "Code station",
  "nom_station": "Nom station",
  "date_obs": "Date observation",
  "pluie_mm": "Pluie (mm)",
  "code_ouvrage": "Code ouvrage",
  "id_couloir": "ID couloir",
  "nom_couloir": "Nom couloir",
  "id_ts": "ID tete de source",
  "id_zone": "ID zone",
};

const DATASET_FIELD_LABELS: Record<string, Record<string, string>> = {
  "cep-parcelles": {
    "filiere": "Filiere",
    "filiere_autres": "Autre filiere",
    "menages_ben": "Menages beneficiaires",
    "nb_paysans_relais": "Nombre de paysans relais",
    "culture_princ": "Culture principale",
    "cultures_assoc": "Cultures associees",
    "pratiques_agroeco": "Pratiques agroecologiques",
    "pratiques_autres": "Autres pratiques",
    "contraintes": "Contraintes",
    "observations": "Observations",
  },
  "agr-menages": {
    "themes_sensibilisation": "Themes de sensibilisation",
    "nb_seances_total": "Nombre de seances",
    "source_information": "Source d'information",
    "producteur_informe_intrants": "Producteur informe sur intrants",
    "menage_prat_agroeco": "Menage pratique agroecologie",
    "pratiques_agro_menage": "Pratiques agro menage",
    "utilise_foyer_ameliore": "Utilise foyer ameliore",
    "type_foyer_principal": "Type de foyer principal",
    "pratiques_nutritionnelles": "Pratiques nutritionnelles",
    "obs_menage": "Observations menage",
  },
  "agr-organisations": {
    "activites_principales": "Activites principales",
    "filieres_principales": "Filieres principales",
    "pratiques_agro_adoptees": "Pratiques adoptees",
    "nb_planteurs_accompagnes": "Planteurs accompagnes",
    "nb_producteurs_semenciers": "Producteurs semenciers",
    "nb_banques_semences": "Banques de semences",
    "nb_emplois_verts": "Emplois verts",
    "desc_emplois_verts": "Description emplois verts",
    "obs_org": "Observations organisation",
  },
  "agr-comites": {
    "type_comite": "Type de comite",
    "nom_comite": "Nom du comite",
    "themes_comite": "Themes du comite",
    "statut_comite": "Statut du comite",
    "zone_couverture": "Zone de couverture",
    "nb_reunions_12m": "Reunions (12 mois)",
    "nb_sensib_12m": "Sensibilisations (12 mois)",
    "suit_conflits": "Suit les conflits",
    "nb_conflits_12m": "Conflits (12 mois)",
    "nb_conflits_regles": "Conflits regles",
    "obs_comite": "Observations comite",
  },
  "agr-pratiques-rendements": {
    "culture_principale": "Culture principale",
    "pratiques_appliquees": "Pratiques appliquees",
    "pratiques_agro": "Pratiques agro",
    "rendement_observe": "Rendement observe",
    "effet_rendement": "Effet sur rendement",
    "effet_sols": "Effet sur sols",
    "obs_pratiques": "Observations pratiques",
  },
  "agr-intrants-comptoirs": {
    "enreg_type": "Type d'enregistrement",
    "filiere_intrant": "Filiere intrant",
    "type_intrant": "Type d'intrant",
    "campagne_intrant": "Campagne intrant",
    "quantite": "Quantite",
    "unite_intrant": "Unite",
    "menages_ben_intr": "Menages beneficiaires intrant",
    "source_intrant": "Source intrant",
    "intrant_conforme": "Intrant conforme",
    "nom_comptoir": "Nom comptoir",
    "obs_intrant": "Observations intrant",
  },
  "agr-ouvrages": {
    "ouv_present": "Ouvrage present",
    "ouv_types": "Types d'ouvrage",
    "longueur_anti_m": "Longueur anti-erosive (m)",
    "etat_anti": "Etat anti-erosif",
    "surface_couv_ha": "Surface couverte (ha)",
    "etat_couv": "Etat couverture",
    "obs_ouvr": "Observations ouvrage",
  },
  "agr-couloirs": {
    "trace_couloir": "Trace couloir",
    "couloir_present": "Couloir present",
    "type_couloir": "Type couloir",
    "longueur_km": "Longueur (km)",
    "largeur_m": "Largeur (m)",
    "especes_troupeaux": "Especes troupeaux",
    "saison_usage": "Saison d'usage",
    "statut_couloir": "Statut couloir",
    "obs_couloir": "Observations couloir",
  },
  "agr-stations-pluie": {
    "station_presente": "Station presente",
    "type_station": "Type station",
    "proprietaire": "Proprietaire",
    "statut_station": "Statut station",
    "frequence_mesure": "Frequence mesure",
    "type_releve": "Type releve",
    "etat_equipements": "Etat equipements",
    "obs_station": "Observations station",
    "saisie_pluie": "Saisie pluie",
    "t_min": "Temperature min",
    "t_max": "Temperature max",
  },
  "agr-tetes-sources": {
    "source_presente": "Source presente",
    "type_source": "Type de source",
    "usage_principal": "Usage principal",
    "pop_desservie": "Population desservie",
    "protection_exist": "Protection existante",
    "type_protection": "Type de protection",
    "etat_fonctionnel": "Etat fonctionnel",
    "entretien_regulier": "Entretien regulier",
    "resp_entretien": "Responsable entretien",
    "obs_ts": "Observations tete de source",
  },
  "agr-zones-degradees": {
    "zone_geom": "Geometrie zone",
    "zone_degrad_pres": "Zone degradee presente",
    "type_degradation": "Type degradation",
    "severite": "Severite",
    "surface_degrad_ha": "Surface degradee (ha)",
    "restauration_real": "Restauration realisee",
    "type_intervention": "Type intervention",
    "surface_restaur_ha": "Surface restauree (ha)",
    "taux_survie_pct": "Taux de survie (%)",
    "etat_restaur": "Etat restauration",
    "obs_restaur": "Observations restauration",
  },
  "fiere-entreprises": {
    "statut_juridique": "Statut juridique",
    "annee_creation": "Annee creation",
    "forme_propriete": "Forme de propriete",
    "secteur_principal": "Secteur principal",
    "secteurs_secondaires": "Secteurs secondaires",
    "activite_detaillee": "Activite detaillee",
    "taille_entreprise": "Taille entreprise",
    "effectif_total": "Effectif total",
    "ca_approx": "CA approximatif",
    "marche_principal": "Marche principal",
    "enregistre_formel": "Enregistre formel",
    "mpme_appuyee_fiere": "MPME appuyee FIERE",
    "type_appui": "Type d'appui",
    "obs_entreprise": "Observations entreprise",
  },
  "fiere-formations": {
    "formation_liee_ent": "Formation liee entreprise",
    "org_beneficiaire": "Organisation beneficiaire",
    "organisme_formateur": "Organisme formateur",
    "type_formation": "Type formation",
    "modalite_formation": "Modalite formation",
    "date_debut": "Date debut",
    "date_fin": "Date fin",
    "duree_jours": "Duree (jours)",
    "domaine_formation": "Domaine formation",
    "participants_total": "Participants total",
    "participants_femmes": "Participants femmes",
    "participants_jeunes": "Participants jeunes",
  },
  "fiere-suivi-sortants": {
    "centre_formation": "Centre formation",
    "date_fin_formation": "Date fin formation",
    "sexe": "Sexe",
    "age": "Age",
    "pvh": "PVH",
    "niveau_etude": "Niveau etude",
    "obs_generales": "Observations generales",
  },
  "fiere-emploi-insertion": {
    "annee_ref": "Annee de reference",
    "periode_ref": "Periode de reference",
    "emplois_total": "Emplois total",
    "emplois_femmes": "Emplois femmes",
    "emplois_jeunes": "Emplois jeunes",
    "insert_total": "Insertions total",
    "insert_femmes": "Insertions femmes",
    "insert_jeunes": "Insertions jeunes",
    "obs_emploi_ins": "Observations emploi/insertion",
  },
  "fiere-participation": {
    "type_acteur": "Type acteur",
    "est_entreprise_fiere": "Entreprise FIERE",
    "nom_acteur": "Nom acteur",
    "date_derniere_part": "Date derniere participation",
    "type_participation": "Type participation",
    "statut_convention": "Statut convention",
    "intitule_dispositif": "Intitule dispositif",
    "objet_participation": "Objet participation",
    "nb_part_12m": "Participations (12 mois)",
    "frequence_particip": "Frequence participation",
    "niveau_implication": "Niveau implication",
    "satisfaction_globale": "Satisfaction globale",
    "resultats_obtenus": "Resultats obtenus",
    "obs_participation": "Observations participation",
  },
};

const CSV_FILE_DATASET_HINTS: Array<{ fragments: string[]; datasetCode: string; datasetLabel: string }> = [
  { fragments: ["parcelles", "cep"], datasetCode: "cep-parcelles", datasetLabel: "Parcelles CEP" },
  { fragments: ["menages", "sensibilisation"], datasetCode: "agr-menages", datasetLabel: "Menages sensibilisation" },
  { fragments: ["organisations", "producteurs"], datasetCode: "agr-organisations", datasetLabel: "Organisations producteurs" },
  { fragments: ["comites", "gouvernance"], datasetCode: "agr-comites", datasetLabel: "Comites gouvernance locale" },
  { fragments: ["pratiques", "rendements"], datasetCode: "agr-pratiques-rendements", datasetLabel: "Pratiques agroecologiques et rendements" },
  { fragments: ["intrants", "comptoirs"], datasetCode: "agr-intrants-comptoirs", datasetLabel: "Intrants agricoles et comptoirs" },
  { fragments: ["ouvrages", "anti", "erosifs"], datasetCode: "agr-ouvrages", datasetLabel: "Ouvrages antierosifs" },
  { fragments: ["couloirs", "transhumance"], datasetCode: "agr-couloirs", datasetLabel: "Couloirs de transhumance" },
  { fragments: ["stations", "pluviometriques"], datasetCode: "agr-stations-pluie", datasetLabel: "Stations pluviometriques" },
  { fragments: ["tetes", "sources"], datasetCode: "agr-tetes-sources", datasetLabel: "Tetes de sources" },
  { fragments: ["zones", "degradees"], datasetCode: "agr-zones-degradees", datasetLabel: "Zones degradees" },
  { fragments: ["entreprises", "unites", "economiques"], datasetCode: "fiere-entreprises", datasetLabel: "Entreprises (unites economiques)" },
  { fragments: ["formations", "renforcement"], datasetCode: "fiere-formations", datasetLabel: "Formations (renforcement capacites)" },
  { fragments: ["suivi", "sortants"], datasetCode: "fiere-suivi-sortants", datasetLabel: "Suivi des sortants" },
  { fragments: ["emploi", "insertion"], datasetCode: "fiere-emploi-insertion", datasetLabel: "Emploi et insertion professionnelle" },
  { fragments: ["participation", "dispositifs"], datasetCode: "fiere-participation", datasetLabel: "Participation aux dispositifs d'appui" },
];

const DATASET_CODE_ALIASES: Record<string, string> = {
  "menages-sensibilisation": "agr-menages",
  "organisations-producteurs": "agr-organisations",
  "comites-gouvernance-locale": "agr-comites",
  "pratiques-agroecologiques-rendements": "agr-pratiques-rendements",
  "intrants-agricoles-comptoirs": "agr-intrants-comptoirs",
  "ouvrages-antierosifs": "agr-ouvrages",
  "couloirs-transhumance": "agr-couloirs",
  "stations-pluviometriques": "agr-stations-pluie",
  "tetes-sources-protections": "agr-tetes-sources",
  "zones-degradees-restauration": "agr-zones-degradees",
  "entreprises-unites-economiques": "fiere-entreprises",
  "formations-renforcement-capacites": "fiere-formations",
  "suivi-sortants-formation": "fiere-suivi-sortants",
  "emploi-insertion-professionnelle": "fiere-emploi-insertion",
  "acteurs-participation": "fiere-participation",
};

const TOKEN_LABELS: Record<string, string> = {
  "id": "ID",
  "nb": "Nombre",
  "nom": "Nom",
  "code": "Code",
  "type": "Type",
  "types": "Types",
  "autre": "Autre",
  "autres": "Autres",
  "obs": "Observations",
  "date": "Date",
  "dates": "Dates",
  "annee": "Annee",
  "annees": "Annees",
  "campagne": "Campagne",
  "periode": "Periode",
  "projet": "Projet",
  "project": "Projet",
  "code_kobo": "Code Kobo",
  "region": "Region",
  "prefecture": "Prefecture",
  "commune": "Commune",
  "localite": "Localite",
  "zone": "Zone",
  "zones": "Zones",
  "gps": "GPS",
  "point": "Point",
  "latitude": "Latitude",
  "longitude": "Longitude",
  "altitude": "Altitude",
  "precision": "Precision",
  "validation": "Validation",
  "status": "Statut",
  "submitted": "Soumis",
  "submission": "Soumission",
  "time": "Heure",
  "start": "Debut",
  "end": "Fin",
  "username": "Utilisateur",
  "deviceid": "Appareil",
  "filiere": "Filiere",
  "filieres": "Filieres",
  "formation": "Formation",
  "formations": "Formations",
  "sortant": "Sortant",
  "sortants": "Sortants",
  "emploi": "Emploi",
  "emplois": "Emplois",
  "insertion": "Insertion",
  "insert": "Insertion",
  "entreprise": "Entreprise",
  "entreprises": "Entreprises",
  "organisation": "Organisation",
  "organisations": "Organisations",
  "producteur": "Producteur",
  "producteurs": "Producteurs",
  "menage": "Menage",
  "menages": "Menages",
  "comite": "Comite",
  "comites": "Comites",
  "conflit": "Conflit",
  "conflits": "Conflits",
  "regles": "Regles",
  "techniciens": "Techniciens",
  "surface": "Surface",
  "longueur": "Longueur",
  "largeur": "Largeur",
  "ha": "ha",
  "km": "km",
  "m": "m",
  "mm": "mm",
  "pct": "%",
  "taux": "Taux",
  "pluie": "Pluie",
  "station": "Station",
  "stations": "Stations",
  "source": "Source",
  "sources": "Sources",
  "couloir": "Couloir",
  "couloirs": "Couloirs",
  "ouvrage": "Ouvrage",
  "ouvrages": "Ouvrages",
  "intrant": "Intrant",
  "intrants": "Intrants",
  "comptoir": "Comptoir",
  "pratique": "Pratique",
  "pratiques": "Pratiques",
  "agro": "Agro",
  "agroeco": "Agroecologie",
  "agroecologiques": "Agroecologiques",
  "rendement": "Rendement",
  "rendements": "Rendements",
  "production": "Production",
  "totale": "Totale",
  "total": "Total",
  "femmes": "Femmes",
  "jeunes": "Jeunes",
  "pvh": "PVH",
  "u5": "U5",
  "telephone": "Telephone",
  "email": "Email",
  "photo": "Photo",
  "url": "URL",
  "present": "Present",
  "presente": "Presente",
  "presentes": "Presentes",
  "etat": "Etat",
  "suivi": "Suivi",
  "resultats": "Resultats",
  "contraintes": "Contraintes",
  "domaine": "Domaine",
  "modalite": "Modalite",
  "sexe": "Sexe",
  "age": "Age",
  "niveau": "Niveau",
  "etude": "Etude",
  "bovins": "Bovins",
  "ovins": "Ovins",
  "caprins": "Caprins",
  "eau": "Eau",
  "potable": "Potable",
  "nutrition": "Nutrition",
  "gouvernance": "Gouvernance",
  "foncier": "Foncier",
  "environ": "Environnement",
  "agricole": "Agricole",
  "elevage": "Elevage",
  "serv": "Service",
  "tech": "Technique",
};

const CHOICE_VALUE_LABELS: Record<string, string> = {
  "FEUX": "Feux",
  "AGROECO": "Agroecologie",
  "INTRANTS": "Intrants",
  "CONFLITS_AGR_ELEV": "Conflits agriculture-elevage",
  "RNR": "Ressources naturelles",
  "EAU_POTABLE": "Eau potable",
  "NUTRITION": "Nutrition",
  "GOUVERNANCE": "Gouvernance",
  "TC_AUTRE": "Autre type de conflit",
  "AGR_ELEV": "Agriculture-Elevage",
  "FONCIER": "Foncier",
  "EAU_PASTO": "Eau pastorale",
  "CULTURE": "Culture",
  "CLOTURE": "Cloture",
  "INFRASTRUCT": "Infrastructure",
  "INSECURITE": "Insecurite",
  "BOVINS": "Bovins",
  "OVINS": "Ovins",
  "CAPRINS": "Caprins",
  "COMPOST": "Compost",
  "COUVERTURE_SOL": "Couverture du sol",
  "AGROFORESTERIE": "Agroforesterie",
  "ASSOC_ROTATION": "Association/Rotation",
  "BIOPESTICIDES": "Biopesticides",
  "GEST_EAU": "Gestion de l'eau",
  "PA_AUTRE": "Autre pratique",
  "PT_EAU": "Point d'eau",
  "PARC_VACC": "Parc vaccination",
  "AIRE_REPOS": "Aire de repos",
  "MARCHE_BEST": "Marche a betail",
  "MACONNERIE": "Maconnerie",
  "GABION": "Gabion",
  "VEGETAL": "Vegetal",
  "PLANTATION": "Plantation",
  "REGEN_ASSISTEE": "Regeneration assistee",
  "TERRASSES": "Terrasses",
  "ANACARDE": "Anacarde",
  "EUCALYPT": "Eucalypt",
  "MANGUIER": "Manguier",
  "PROJET": "Projet",
  "SERV_TECH": "Service technique",
  "ONG": "ONG",
  "RADIO": "Radio",
  "COMMUNAUT": "Communaute",
};

const SubmissionGeometryMap = dynamic(
  () => import("./components/SubmissionGeometryMap"),
  {
    ssr: false,
    loading: () => <p className="text-xs text-slate-500">Chargement de la carte...</p>,
  }
);

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Tous statuts" },
  { value: "draft", label: "Brouillon" },
  { value: "submitted", label: "Soumis" },
  { value: "validated", label: "Valide" },
  { value: "rejected", label: "Rejete" },
  { value: "published", label: "Publie" },
];

const sourceOptions: Array<{ value: SourceType; label: string }> = [
  { value: "manual", label: "Manuel" },
  { value: "kobo", label: "Kobo" },
  { value: "csv", label: "CSV (QGIS)" },
  { value: "other", label: "Autre" },
];

function normalizeRole(rawRole: string | undefined | null, isSuperuser?: boolean): WorkflowRole {
  if (isSuperuser) return "admin";
  const role = String(rawRole || "").toLowerCase().trim();
  if (!role) return "reader";
  if (role.includes("admin")) return "admin";
  if (role.includes("project_manager") || role.includes("chef_projet")) return "project_manager";
  if (role.includes("manager") || role.includes("chef")) return "manager";
  if (role.includes("editor") || role.includes("editeur") || role.includes("analyste")) return "editor";
  return "reader";
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR");
}

function statusClass(status: string): string {
  const map: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 ring-slate-300",
    submitted: "bg-blue-100 text-blue-700 ring-blue-300",
    validated: "bg-emerald-100 text-emerald-700 ring-emerald-300",
    rejected: "bg-rose-100 text-rose-700 ring-rose-300",
    published: "bg-violet-100 text-violet-700 ring-violet-300",
  };
  return map[status] || map.draft;
}

function parsePayload(raw: string): { ok: true; value: unknown } | { ok: false; message: string } {
  const text = raw.trim();
  if (!text) return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, message: "JSON invalide." };
  }
}

function countDelimiterOnLine(line: string, delimiter: string): number {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) count += 1;
  }
  return count;
}

function detectCsvDelimiter(text: string): string {
  const candidates = [";", ",", "\t", "|"];
  const sampleLines = text
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (sampleLines.length === 0) return ";";

  let bestDelimiter = ";";
  let bestScore = -1;

  for (const delimiter of candidates) {
    let score = 0;
    for (const line of sampleLines) {
      score += countDelimiterOnLine(line, delimiter);
    }
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

function parseDelimitedRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      row.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      const hasData = row.some((value) => value.trim() !== "");
      if (hasData) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += ch;
  }

  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function trimBom(value: string): string {
  return value.replace(/^\uFEFF/, "");
}

function parseCsvRecords(text: string): {
  ok: true;
  headers: string[];
  records: JsonRecord[];
  delimiter: string;
} | {
  ok: false;
  message: string;
} {
  const raw = text.trim();
  if (!raw) return { ok: false, message: "Fichier CSV vide." };

  const delimiter = detectCsvDelimiter(raw);
  const rows = parseDelimitedRows(raw, delimiter);
  if (rows.length < 2) {
    return { ok: false, message: "Le CSV doit contenir au moins une ligne d'entete et une ligne de donnees." };
  }

  const rawHeaders = rows[0].map((value) => trimBom(value.trim()));
  const headers: string[] = [];
  const seen = new Map<string, number>();
  for (let i = 0; i < rawHeaders.length; i += 1) {
    const base = rawHeaders[i] || `col_${i + 1}`;
    const index = seen.get(base) || 0;
    seen.set(base, index + 1);
    headers.push(index > 0 ? `${base}_${index + 1}` : base);
  }

  const records: JsonRecord[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const normalized = [...row];
    if (normalized.length < headers.length) {
      while (normalized.length < headers.length) normalized.push("");
    }
    const hasData = normalized.some((value) => value.trim() !== "");
    if (!hasData) continue;

    const record: JsonRecord = {};
    for (let c = 0; c < headers.length; c += 1) {
      const key = headers[c];
      const value = (normalized[c] ?? "").trim();
      record[key] = value === "" ? null : value;
    }
    records.push(record);
  }

  if (records.length === 0) {
    return { ok: false, message: "Aucune ligne de donnees exploitable dans le CSV." };
  }

  return { ok: true, headers, records, delimiter };
}

function parsePaged<T>(payload: unknown): { results: T[]; count: number } {
  if (Array.isArray(payload)) return { results: payload as T[], count: payload.length };
  if (!payload || typeof payload !== "object") return { results: [], count: 0 };
  const root = payload as { results?: unknown; count?: unknown };
  if (!Array.isArray(root.results)) return { results: [], count: 0 };
  const count = typeof root.count === "number" ? root.count : root.results.length;
  return { results: root.results as T[], count };
}

function isSubmission(value: unknown): value is WorkflowSubmission {
  return Boolean(value && typeof value === "object" && typeof (value as { submission_id?: unknown }).submission_id === "string");
}

function isHistory(value: unknown): value is WorkflowHistory {
  return Boolean(value && typeof value === "object" && typeof (value as { action_id?: unknown }).action_id === "number");
}

function extractSubmissionFromPayload(payload: unknown): WorkflowSubmission | null {
  if (isSubmission(payload)) return payload;
  if (!payload || typeof payload !== "object") return null;

  const nested = (payload as { submission?: unknown }).submission;
  if (isSubmission(nested)) return nested;
  return null;
}

function parseKoboForms(payload: unknown): KoboFormOption[] {
  if (!payload || typeof payload !== "object") return [];
  const forms = (payload as { forms?: unknown }).forms;
  if (!Array.isArray(forms)) return [];

  const out: KoboFormOption[] = [];
  for (const item of forms) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const dataset_code = typeof row.dataset_code === "string" ? row.dataset_code.trim() : "";
    const asset_uid = typeof row.asset_uid === "string" ? row.asset_uid.trim() : "";
    const label = typeof row.label === "string" ? row.label.trim() : undefined;
    if (!dataset_code || !asset_uid) continue;
    out.push({ dataset_code, asset_uid, label });
  }
  return out;
}

function extractRecords(payload: unknown): JsonRecord[] {
  if (!payload || typeof payload !== "object") return [];
  const records = (payload as { records?: unknown }).records;
  if (!Array.isArray(records)) return [];
  return records.filter((row): row is JsonRecord => !!row && typeof row === "object");
}

function extractReviewLastReject(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const review = (payload as { review?: unknown }).review;
  if (!review || typeof review !== "object") return null;
  const lastReject = (review as { last_reject?: unknown }).last_reject;
  if (!lastReject || typeof lastReject !== "object") return null;
  return lastReject as Record<string, unknown>;
}

function parseIssuesDraft(raw: string): { ok: true; value: RejectIssue[] } | { ok: false; message: string } {
  const text = raw.trim();
  if (!text) return { ok: true, value: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: "JSON des anomalies invalide." };
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, message: "Les anomalies doivent etre un tableau JSON." };
  }

  const issues: RejectIssue[] = [];
  for (let i = 0; i < parsed.length; i += 1) {
    const row = parsed[i];
    if (!row || typeof row !== "object") {
      return { ok: false, message: `Anomalie #${i + 1}: objet attendu.` };
    }
    const obj = row as Record<string, unknown>;
    const message = String(obj.message ?? "").trim();
    if (!message) {
      return { ok: false, message: `Anomalie #${i + 1}: message obligatoire.` };
    }
    const severityRaw = String(obj.severity ?? "error").trim().toLowerCase();
    const severity: "error" | "warning" = severityRaw === "warning" ? "warning" : "error";
    issues.push({
      record_ref: String(obj.record_ref ?? "").trim(),
      field: String(obj.field ?? "").trim(),
      message,
      severity,
    });
  }

  return { ok: true, value: issues };
}

function recordIdentifier(record: JsonRecord, fallbackIndex: number): string {
  for (const key of RECORD_IDENTIFIER_KEYS) {
    const raw = record[key];
    if (raw === null || raw === undefined) continue;
    const value = String(raw).trim();
    if (value) return value;
  }
  return `Ligne ${fallbackIndex + 1}`;
}

function normalizeDatasetCode(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase();
}

function resolveDatasetLabelKey(datasetCode: string | null | undefined): string {
  const ds = normalizeDatasetCode(datasetCode);
  if (!ds) return "";
  if (DATASET_FIELD_LABELS[ds]) return ds;
  if (DATASET_CODE_ALIASES[ds]) return DATASET_CODE_ALIASES[ds];
  for (const [alias, target] of Object.entries(DATASET_CODE_ALIASES)) {
    if (ds.includes(alias) || alias.includes(ds)) return target;
  }
  for (const key of Object.keys(DATASET_FIELD_LABELS)) {
    if (ds.includes(key) || key.includes(ds)) return key;
  }
  return ds;
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ");
}

function inferDatasetFromCsvFileName(fileName: string): { datasetCode: string; datasetLabel: string } | null {
  const normalized = normalizeForMatch(fileName);
  for (const hint of CSV_FILE_DATASET_HINTS) {
    const match = hint.fragments.every((fragment) => normalized.includes(fragment));
    if (match) {
      return { datasetCode: hint.datasetCode, datasetLabel: hint.datasetLabel };
    }
  }
  return null;
}

function resolveChoiceValueLabel(raw: string): string {
  const upper = raw.trim().toUpperCase();
  if (!upper) return "";
  if (CHOICE_VALUE_LABELS[upper]) return CHOICE_VALUE_LABELS[upper];
  return upper
    .split(/[_\-.]+/)
    .filter(Boolean)
    .map((token) => TOKEN_LABELS[token.toLowerCase()] || (token.length <= 3 ? token : token.charAt(0) + token.slice(1).toLowerCase()))
    .join(" ");
}

function prettifyToken(raw: string): string {
  const token = raw.trim().replace(/^_+|_+$/g, "");
  if (!token) return "";
  const lower = token.toLowerCase();
  if (TOKEN_LABELS[lower]) return TOKEN_LABELS[lower];

  const upper = token.toUpperCase();
  if (CHOICE_VALUE_LABELS[upper]) return CHOICE_VALUE_LABELS[upper];

  if (/^\d+m$/i.test(token)) return `${token.slice(0, -1)} mois`;
  if (/^\d+$/.test(token)) return token;
  if (upper.length <= 3 && token === upper) return upper;
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function prettifyRecordFieldName(key: string, datasetCode?: string | null): string {
  const ds = resolveDatasetLabelKey(datasetCode);
  const datasetLabels = ds ? DATASET_FIELD_LABELS[ds] : undefined;
  if (datasetLabels && datasetLabels[key]) return datasetLabels[key];
  if (RECORD_FIELD_LABELS[key]) return RECORD_FIELD_LABELS[key];

  if (key.includes("/")) {
    const [parentRaw, childRaw] = key.split("/", 2);
    const parentLabel =
      (datasetLabels && datasetLabels[parentRaw]) ||
      RECORD_FIELD_LABELS[parentRaw] ||
      parentRaw
        .replace(/^_+/, "")
        .split(/[_\-.]+/)
        .filter(Boolean)
        .map(prettifyToken)
        .join(" ");
    const childLabel = (childRaw.toUpperCase() === childRaw ? resolveChoiceValueLabel(childRaw) : childRaw
      .split(/[_\-.]+/)
      .filter(Boolean)
      .map(prettifyToken)
      .join(" "));
    return `${parentLabel} - ${childLabel}`;
  }

  const cleaned = key.replace(/^_+/, "");
  if (!cleaned) return key;
  return cleaned
    .split(/[_\-.]+/)
    .filter(Boolean)
    .map(prettifyToken)
    .join(" ");
}

function isIsoDateText(value: string): boolean {
  if (!value.includes("T")) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function truncateText(value: string, maxLen = 90): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen - 1)}...`;
}

function formatRecordCell(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "number") return Number.isFinite(value) ? new Intl.NumberFormat("fr-FR").format(value) : "-";

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return "-";
    if (isIsoDateText(text)) {
      const date = new Date(text);
      if (!Number.isNaN(date.getTime())) return date.toLocaleString("fr-FR");
    }
    return truncateText(text);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    const primitive = value.every((item) => item === null || ["string", "number", "boolean"].includes(typeof item));
    if (primitive) {
      return truncateText(value.map((item) => formatRecordCell(item)).join(", "));
    }
    return `${value.length} elements`;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("lat" in obj && "lon" in obj) {
      return `Point (${String(obj.lat)}, ${String(obj.lon)})`;
    }
    if ("latitude" in obj && "longitude" in obj) {
      return `Point (${String(obj.latitude)}, ${String(obj.longitude)})`;
    }
    return truncateText(JSON.stringify(obj));
  }

  return String(value);
}

function buildRecordColumns(records: JsonRecord[], datasetCode?: string | null): Array<{ key: string; label: string }> {
  if (records.length === 0) return [];

  const seen = new Set<string>();
  const keys: string[] = [];
  for (const row of records) {
    for (const key of Object.keys(row)) {
      if (RECORD_IDENTIFIER_KEYS.includes(key)) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
    }
  }

  return keys.map((key) => ({
    key,
    label: prettifyRecordFieldName(key, datasetCode),
  }));
}

function hasNumericCoordinatePair(values: unknown[]): boolean {
  if (values.length < 2) return false;
  const first = Number(values[0]);
  const second = Number(values[1]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return false;
  const looksLikeLatLon = Math.abs(first) <= 90 && Math.abs(second) <= 180;
  const looksLikeLonLat = Math.abs(first) <= 180 && Math.abs(second) <= 90;
  return looksLikeLatLon || looksLikeLonLat;
}

function parseGpsPointText(raw: string): boolean {
  const parts = raw.trim().split(/\s+/).slice(0, 2);
  if (parts.length < 2) return false;
  const first = Number(parts[0]);
  const second = Number(parts[1]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return false;
  const looksLikeLatLon = Math.abs(first) <= 90 && Math.abs(second) <= 180;
  const looksLikeLonLat = Math.abs(first) <= 180 && Math.abs(second) <= 90;
  return looksLikeLatLon || looksLikeLonLat;
}

function recordHasGeometry(record: JsonRecord): boolean {
  const explicitGeometryFields = [record.geometry, record.geom, record.geojson, record.shape, record.polygon, record.line];
  for (const field of explicitGeometryFields) {
    if (field && typeof field === "object") {
      const obj = field as { type?: unknown; coordinates?: unknown };
      if (typeof obj.type === "string" && obj.coordinates !== undefined) return true;
    }
  }

  if (Array.isArray(record._geolocation) && hasNumericCoordinatePair(record._geolocation)) {
    return true;
  }

  const latCandidates = [
    record.latitude,
    record.lat,
    record.y,
    record.gps_latitude,
    record._gps_point_latitude,
  ];
  const lonCandidates = [
    record.longitude,
    record.lon,
    record.lng,
    record.x,
    record.gps_longitude,
    record._gps_point_longitude,
  ];
  const lat = latCandidates.find((value) => Number.isFinite(Number(value)));
  const lon = lonCandidates.find((value) => Number.isFinite(Number(value)));
  if (lat !== undefined && lon !== undefined) {
    return true;
  }

  for (const key of Object.keys(record)) {
    if (!key.toLowerCase().includes("gps_point")) continue;
    const value = record[key];
    if (typeof value === "string" && parseGpsPointText(value)) return true;
    if (Array.isArray(value) && hasNumericCoordinatePair(value)) return true;
  }

  return false;
}

function submissionStatusLabel(submission: WorkflowSubmission): string {
  return submission.status_display || submission.status;
}

function toId(value: number | string | null | undefined): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseRegions(payload: unknown): RegionOption[] {
  const rows: Array<Record<string, unknown>> = [];

  if (payload && typeof payload === "object" && (payload as { type?: unknown }).type === "FeatureCollection") {
    const features = (payload as { features?: unknown }).features;
    if (Array.isArray(features)) {
      for (const feature of features) {
        if (!feature || typeof feature !== "object") continue;
        const props = (feature as { properties?: unknown }).properties;
        if (props && typeof props === "object") rows.push(props as Record<string, unknown>);
      }
    }
  } else {
    const parsed = parsePaged<Record<string, unknown>>(payload);
    rows.push(...parsed.results);
  }

  const seen = new Set<string>();
  const options: RegionOption[] = [];
  for (const row of rows) {
    const idRaw = row.id_region ?? row.region_id ?? row.id;
    const labelRaw = row.nom_region ?? row.region_nom ?? row.nom ?? row.name ?? row.label;
    const id = typeof idRaw === "string" ? idRaw : typeof idRaw === "number" ? String(idRaw) : "";
    const label = typeof labelRaw === "string" ? labelRaw : id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    options.push({ id, label });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label, "fr", { sensitivity: "base" }));
}

export default function WorkflowPage() {
  const router = useRouter();
  const { apiFetch } = useAdminApi();
  const { data: user, isLoading: userLoading } = useUser();

  const [project, setProject] = useState<RefProject | null>(null);
  const [flash, setFlash] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [submissions, setSubmissions] = useState<WorkflowSubmission[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [mineOnly, setMineOnly] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<WorkflowSubmission | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState<WorkflowHistory[]>([]);

  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [koboForms, setKoboForms] = useState<KoboFormOption[]>([]);
  const [koboFormsLoading, setKoboFormsLoading] = useState(false);
  const [koboSince, setKoboSince] = useState("");
  const [koboLimit, setKoboLimit] = useState("200");
  const [createDataset, setCreateDataset] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createRegion, setCreateRegion] = useState("");
  const [createSource, setCreateSource] = useState<SourceType>("manual");
  const [createPayload, setCreatePayload] = useState("{\n  \"records\": []\n}");
  const [csvFileName, setCsvFileName] = useState("");
  const [csvDelimiter, setCsvDelimiter] = useState(";");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRecords, setCsvRecords] = useState<JsonRecord[]>([]);
  const [csvDetectedDatasetLabel, setCsvDetectedDatasetLabel] = useState("");
  const [csvImportError, setCsvImportError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editPayload, setEditPayload] = useState("{}");
  const [rejectReason, setRejectReason] = useState("");
  const [investigatorContact, setInvestigatorContact] = useState("");
  const [notifyNote, setNotifyNote] = useState("");
  const [issuesDraft, setIssuesDraft] = useState("[]");
  const [actionLoading, setActionLoading] = useState<ActionType | null>(null);
  const [recordsPage, setRecordsPage] = useState(1);
  const [showRawPayload, setShowRawPayload] = useState(false);
  const [focusedRecordIndex, setFocusedRecordIndex] = useState<number | null>(null);

  useEffect(() => {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      router.replace("/project-selection");
      return;
    }
    setProject(currentProject);
  }, [router]);

  const role = useMemo(() => normalizeRole(user?.role, user?.is_superuser), [user?.role, user?.is_superuser]);
  const canAccess = role !== "reader";
  const canReviewRole = role === "manager" || role === "project_manager" || role === "admin";
  const canPublishRole = role === "project_manager" || role === "admin";
  const currentUserId = toId(user?.id);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (status !== "all") params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      if (mineOnly) params.set("mine", "1");

      const payload = await apiFetch<unknown>(`/workflow/submissions/?${params.toString()}`);
      const parsed = parsePaged<unknown>(payload);
      const rows = parsed.results.filter(isSubmission);
      setSubmissions(rows);
      setTotalCount(parsed.count);
      if (!selectedId && rows.length > 0) setSelectedId(rows[0].submission_id);
      if (selectedId && rows.length > 0 && !rows.some((item) => item.submission_id === selectedId)) {
        setSelectedId(rows[0].submission_id);
      }
      if (rows.length === 0) {
        setSelectedId(null);
        setSelected(null);
        setHistoryRows([]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur de chargement.";
      setListError(message);
      setSubmissions([]);
      setTotalCount(0);
    } finally {
      setListLoading(false);
    }
  }, [apiFetch, mineOnly, page, search, selectedId, status]);

  const loadDetail = useCallback(
    async (submissionId: string) => {
      setDetailLoading(true);
      try {
        const detailPayload = await apiFetch<unknown>(`/workflow/submissions/${encodeURIComponent(submissionId)}/`);
        const historyPayload = await apiFetch<unknown>(
          `/workflow/submissions/${encodeURIComponent(submissionId)}/history/?page=1&page_size=30`
        );

        if (isSubmission(detailPayload)) {
          setSelected(detailPayload);
          setEditTitle(detailPayload.title || "");
          setEditRegion(detailPayload.region_id || "");
          setEditPayload(JSON.stringify(detailPayload.payload ?? {}, null, 2));
          const lastReject = extractReviewLastReject(detailPayload.payload);
          setInvestigatorContact(String(lastReject?.investigator_contact ?? ""));
          setNotifyNote(String(lastReject?.notify_note ?? ""));
          const issues = Array.isArray(lastReject?.issues) ? lastReject?.issues : [];
          setIssuesDraft(JSON.stringify(issues, null, 2));
        }

        const parsedHistory = parsePaged<unknown>(historyPayload);
        setHistoryRows(parsedHistory.results.filter(isHistory));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur de chargement du detail.";
        setSelected(null);
        setHistoryRows([]);
        setFlash({ type: "error", message });
      } finally {
        setDetailLoading(false);
      }
    },
    [apiFetch]
  );

  const loadRegions = useCallback(async () => {
    try {
      const payload = await apiFetch<unknown>("/data/carto/admin-region/");
      setRegions(parseRegions(payload));
    } catch {
      setRegions([]);
    }
  }, [apiFetch]);

  const loadKoboForms = useCallback(async () => {
    setKoboFormsLoading(true);
    try {
      const payload = await apiFetch<unknown>("/workflow/kobo/forms/");
      setKoboForms(parseKoboForms(payload));
    } catch {
      setKoboForms([]);
    } finally {
      setKoboFormsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!project || userLoading || !canAccess) return;
    void loadRegions();
  }, [project, userLoading, canAccess, loadRegions]);

  useEffect(() => {
    if (!project || userLoading || !canAccess) return;
    void loadKoboForms();
  }, [project, userLoading, canAccess, loadKoboForms]);

  useEffect(() => {
    if (!project || userLoading || !canAccess) return;
    void loadList();
  }, [project, userLoading, canAccess, loadList]);

  useEffect(() => {
    if (!project || !selectedId || !canAccess) return;
    void loadDetail(selectedId);
  }, [project, selectedId, canAccess, loadDetail]);

  useEffect(() => {
    if (createSource !== "kobo") return;
    if (createDataset.trim()) return;
    if (koboForms.length === 0) return;
    setCreateDataset(koboForms[0].dataset_code);
  }, [createDataset, createSource, koboForms]);

  const importCsvFile = useCallback(
    async (file: File | null) => {
      setCsvImportError(null);
      if (!file) {
        setCsvFileName("");
        setCsvDelimiter(";");
        setCsvHeaders([]);
        setCsvRecords([]);
        setCsvDetectedDatasetLabel("");
        return;
      }

      try {
        const text = await file.text();
        const parsed = parseCsvRecords(text);
        const detectedDataset = inferDatasetFromCsvFileName(file.name);
        if (!parsed.ok) {
          setCsvImportError(parsed.message);
          setCsvFileName(file.name);
          setCsvDelimiter(";");
          setCsvHeaders([]);
          setCsvRecords([]);
          setCsvDetectedDatasetLabel(detectedDataset?.datasetLabel || "");
          return;
        }

        setCsvFileName(file.name);
        setCsvDelimiter(parsed.delimiter);
        setCsvHeaders(parsed.headers);
        setCsvRecords(parsed.records);
        setCsvDetectedDatasetLabel(detectedDataset?.datasetLabel || "");
        if (!createDataset.trim()) {
          const proposedDataset = detectedDataset?.datasetCode
            || file.name
              .replace(/\.[^.]+$/, "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "");
          if (proposedDataset) setCreateDataset(proposedDataset);
        }
        if (!createTitle.trim()) {
          setCreateTitle(detectedDataset?.datasetLabel || file.name.replace(/\.[^.]+$/, ""));
        }
      } catch {
        setCsvImportError("Lecture du fichier CSV impossible.");
        setCsvFileName(file.name);
        setCsvDelimiter(";");
        setCsvHeaders([]);
        setCsvRecords([]);
        setCsvDetectedDatasetLabel("");
      }
    },
    [createDataset, createTitle]
  );

  const createSubmission = useCallback(async () => {
    const titleRequired = createSource !== "kobo";
    if (!createDataset.trim() || !createRegion.trim() || (titleRequired && !createTitle.trim())) {
      setFlash({
        type: "error",
        message: titleRequired
          ? "Dataset, titre et region sont obligatoires."
          : "Dataset et region sont obligatoires.",
      });
      return;
    }
    if (createSource === "csv" && csvRecords.length === 0) {
      setFlash({ type: "error", message: "Importez un fichier CSV avant de creer la soumission." });
      return;
    }

    setCreateLoading(true);
    try {
      const datasetCode = createDataset.trim();
      const regionCode = createRegion.trim();
      let payloadValue: unknown = {};
      if (createSource === "csv") {
        payloadValue = {
          meta: {
            connector: "csv_upload",
            file_name: csvFileName || null,
            delimiter: csvDelimiter,
            headers: csvHeaders,
            imported_at: new Date().toISOString(),
            records_count: csvRecords.length,
          },
          records: csvRecords,
        };
      } else if (createSource !== "kobo") {
        const parsed = parsePayload(createPayload);
        if (!parsed.ok) {
          setFlash({ type: "error", message: parsed.message });
          return;
        }
        payloadValue = parsed.value;
      }

      let responsePayload: unknown;

      if (createSource === "kobo") {
        const koboBody: Record<string, unknown> = {
          dataset_code: datasetCode,
          title: createTitle.trim(),
          region_id: regionCode,
          limit: Number.parseInt(koboLimit || "200", 10) || 200,
        };
        if (koboSince.trim()) {
          koboBody.since = koboSince.trim();
        }

        responsePayload = await apiFetch<unknown>("/workflow/kobo/sync/", {
          method: "POST",
          body: JSON.stringify(koboBody),
        });
      } else {
        responsePayload = await apiFetch<unknown>("/workflow/submissions/", {
          method: "POST",
          body: JSON.stringify({
            dataset_code: datasetCode,
            title: createTitle.trim(),
            region_id: regionCode,
            source_type: createSource,
            payload: payloadValue,
          }),
        });
      }

      const created = extractSubmissionFromPayload(responsePayload);
      if (created) {
        setFlash({ type: "success", message: "Soumission creee." });
        setCreateDataset("");
        setCreateTitle("");
        setCreatePayload("{\n  \"records\": []\n}");
        setCsvFileName("");
        setCsvDelimiter(";");
        setCsvHeaders([]);
        setCsvRecords([]);
        setCsvDetectedDatasetLabel("");
        setCsvImportError(null);
        setSelectedId(created.submission_id);
      }
      await loadList();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Creation impossible.";
      setFlash({ type: "error", message });
    } finally {
      setCreateLoading(false);
    }
  }, [
    apiFetch,
    createDataset,
    createPayload,
    createRegion,
    createSource,
    createTitle,
    csvDelimiter,
    csvFileName,
    csvHeaders,
    csvRecords,
    koboLimit,
    koboSince,
    loadList,
  ]);

  const runAction = useCallback(
    async (action: ActionType, endpoint: string, body?: Record<string, unknown>) => {
      setActionLoading(action);
      try {
        await apiFetch(endpoint, {
          method: "POST",
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        setFlash({ type: "success", message: "Action executee." });
        await loadList();
        if (selectedId) await loadDetail(selectedId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Action impossible.";
        setFlash({ type: "error", message });
      } finally {
        setActionLoading(null);
      }
    },
    [apiFetch, loadDetail, loadList, selectedId]
  );

  const resetFilters = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setStatus("all");
    setMineOnly(false);
    setPage(1);
  }, []);

  const saveDraft = useCallback(async () => {
    if (!selected) return;
    const parsed = parsePayload(editPayload);
    if (!parsed.ok) {
      setFlash({ type: "error", message: parsed.message });
      return;
    }
    try {
      await apiFetch(`/workflow/submissions/${encodeURIComponent(selected.submission_id)}/`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle.trim(),
          region_id: editRegion.trim(),
          payload: parsed.value,
        }),
      });
      setFlash({ type: "success", message: "Brouillon mis a jour." });
      await loadList();
      await loadDetail(selected.submission_id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mise a jour impossible.";
      setFlash({ type: "error", message });
    }
  }, [apiFetch, editPayload, editRegion, editTitle, loadDetail, loadList, selected]);

  const isOwner = selected ? toId(selected.created_by) === currentUserId : false;
  const canEditDraft = Boolean(selected && isOwner && (selected.status === "draft" || selected.status === "rejected"));
  const canSubmit = canEditDraft;
  const canReview = Boolean(selected && canReviewRole && selected.status === "submitted" && !isOwner);
  const canPublish = Boolean(selected && canPublishRole && selected.status === "validated");
  const hasActiveFilters = status !== "all" || mineOnly || search.trim().length > 0;
  const activeStatusLabel = useMemo(
    () => statusOptions.find((option) => option.value === status)?.label || "Tous statuts",
    [status]
  );
  const submissionRecords = useMemo(() => extractRecords(selected?.payload), [selected?.payload]);
  const recordColumns = useMemo(
    () => buildRecordColumns(submissionRecords, selected?.dataset_code),
    [selected?.dataset_code, submissionRecords]
  );
  const recordsTotalPages = useMemo(
    () => Math.max(1, Math.ceil(submissionRecords.length / RECORDS_PAGE_SIZE)),
    [submissionRecords.length]
  );
  const pagedSubmissionRecords = useMemo(() => {
    const start = (recordsPage - 1) * RECORDS_PAGE_SIZE;
    return submissionRecords.slice(start, start + RECORDS_PAGE_SIZE);
  }, [recordsPage, submissionRecords]);
  const lastRejectInfo = useMemo(() => extractReviewLastReject(selected?.payload), [selected?.payload]);
  const reviewIssuesCount = useMemo(
    () => (Array.isArray(lastRejectInfo?.issues) ? lastRejectInfo.issues.length : 0),
    [lastRejectInfo]
  );
  const nextActionHint = useMemo(() => {
    if (!selected) return "Selectionnez une soumission pour voir les actions possibles.";
    if (canSubmit) return "Brouillon en cours: vous pouvez le soumettre pour revue.";
    if (canReview) return "Controle qualite en attente: validez ou rejetez avec un motif.";
    if (canPublish) return "Soumission validee: publication possible vers les tables projet.";
    if (selected.status === "published") return "Soumission deja publiee.";
    if (selected.status === "submitted") {
      return isOwner
        ? "Soumission envoyee: en attente de revue manager."
        : "Soumission en attente de validation.";
    }
    if (selected.status === "validated") {
      return canPublishRole
        ? "Soumission prete a etre publiee."
        : "Soumission validee: publication reservee au chef de projet/admin.";
    }
    if (selected.status === "rejected") {
      return isOwner
        ? "Soumission rejetee: corrigez le payload puis soumettez a nouveau."
        : "Soumission rejetee: en attente de correction par le createur.";
    }
    return "Aucune action disponible pour ce role.";
  }, [canPublish, canPublishRole, canReview, canSubmit, isOwner, selected]);

  useEffect(() => {
    setRecordsPage(1);
    setShowRawPayload(false);
    setFocusedRecordIndex(null);
  }, [selected?.submission_id]);

  useEffect(() => {
    if (recordsPage <= recordsTotalPages) return;
    setRecordsPage(recordsTotalPages);
  }, [recordsPage, recordsTotalPages]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 8000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  if (userLoading || !project) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-800 flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          Acces restreint au module workflow.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              setSearch(searchInput.trim());
              setPage(1);
            }}
            placeholder="Recherche titre..."
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg min-w-[220px]"
          />
          <select value={status} onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1); }} className="px-3 py-2 text-sm border border-slate-300 rounded-lg">
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <label className="text-sm flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg">
            <input type="checkbox" checked={mineOnly} onChange={(e) => { setMineOnly(e.target.checked); setPage(1); }} />
            Mes soumissions
          </label>
          <button onClick={() => { setSearch(searchInput.trim()); setPage(1); }} className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg">Filtrer</button>
          <button onClick={() => void loadList()} className="px-3 py-2 text-sm border border-slate-300 rounded-lg inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" />Rafraichir</button>
          {hasActiveFilters ? (
            <button onClick={resetFilters} className="px-3 py-2 text-sm border border-slate-300 rounded-lg">
              Reinitialiser
            </button>
          ) : null}
        </div>
        <p className="text-xs text-slate-500">
          Statut: {activeStatusLabel} | Portee: {mineOnly ? "mes soumissions" : "toutes les soumissions"} | Recherche: {search ? `"${search}"` : "aucune"} | Page {page}/{totalPages}
        </p>
      </div>

      {flash && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${flash.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-700"}`}>
          <div className="flex items-start justify-between gap-3">
            <p>{flash.message}</p>
            <button type="button" onClick={() => setFlash(null)} className="text-xs underline underline-offset-2">
              Fermer
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold">Soumissions ({totalCount})</div>
            <div className="max-h-[65vh] overflow-auto divide-y divide-slate-100">
              {listLoading ? <div className="p-4 text-sm text-slate-500">Chargement...</div> : null}
              {listError ? <div className="p-4 text-sm text-red-700">{listError}</div> : null}
              {!listLoading && !listError && submissions.map((item) => (
                <button key={item.submission_id} onClick={() => setSelectedId(item.submission_id)} className={`w-full text-left p-4 ${selectedId === item.submission_id ? "bg-emerald-50" : "hover:bg-slate-50"}`}>
                  <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.dataset_code} | {item.region_name || item.region_id}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Maj: {formatDate(item.updated_at)}</p>
                  <div className="mt-1">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] ring-1 ring-inset ${statusClass(item.status)}`}>{submissionStatusLabel(item)}</span>
                  </div>
                </button>
              ))}
              {!listLoading && !listError && submissions.length === 0 ? (
                <div className="p-4 space-y-2">
                  <p className="text-sm text-slate-500">Aucune soumission trouvee pour les filtres courants.</p>
                  {hasActiveFilters ? (
                    <button onClick={resetFilters} className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg">
                      Retirer les filtres
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex justify-between">
              <button onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={page <= 1} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-50">Precedent</button>
              <span className="text-xs text-slate-500 self-center">{page}/{totalPages}</span>
              <button onClick={() => setPage((v) => Math.min(totalPages, v + 1))} disabled={page >= totalPages} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-50">Suivant</button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
            <p className="text-sm font-semibold">Nouvelle soumission</p>
            <select value={createSource} onChange={(e) => setCreateSource(e.target.value as SourceType)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
              {sourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            {createSource === "kobo" ? (
              koboForms.length > 0 ? (
                <select value={createDataset} onChange={(e) => setCreateDataset(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
                  {koboForms.map((form) => (
                    <option key={`${form.dataset_code}-${form.asset_uid}`} value={form.dataset_code}>
                      {(form.label || form.dataset_code) + " | " + form.dataset_code}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={createDataset} onChange={(e) => setCreateDataset(e.target.value)} placeholder={koboFormsLoading ? "Chargement des formulaires Kobo..." : "Dataset Kobo (non mappe)"} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
              )
            ) : (
              <input value={createDataset} onChange={(e) => setCreateDataset(e.target.value)} placeholder="Dataset code" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
            )}
            <input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder={createSource === "kobo" ? "Titre (optionnel)" : "Titre"} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
            {regions.length > 0 ? (
              <select value={createRegion} onChange={(e) => setCreateRegion(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
                <option value="">Selectionnez une region</option>
                {regions.map((region) => <option key={region.id} value={region.id}>{region.label} ({region.id})</option>)}
              </select>
            ) : (
              <input value={createRegion} onChange={(e) => setCreateRegion(e.target.value)} placeholder="Code region" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
            )}
            {createSource === "kobo" ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    value={koboSince}
                    onChange={(e) => setKoboSince(e.target.value)}
                    type="datetime-local"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  <input
                    value={koboLimit}
                    onChange={(e) => setKoboLimit(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Limite (ex: 200)"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Le sync Kobo cree une soumission brouillon avec les enregistrements recuperes.
                </p>
              </>
            ) : createSource === "csv" ? (
              <div className="space-y-2">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => void importCsvFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                />
                {csvImportError ? (
                  <p className="text-xs text-rose-700">{csvImportError}</p>
                ) : null}
                {csvRecords.length > 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-1.5">
                    <p className="text-xs text-slate-700 font-medium truncate" title={csvFileName}>
                      Fichier: {csvFileName || "-"}
                    </p>
                    {csvDetectedDatasetLabel ? (
                      <p className="text-xs text-emerald-700">
                        Formulaire detecte: <span className="font-medium">{csvDetectedDatasetLabel}</span>
                      </p>
                    ) : null}
                    <p className="text-xs text-slate-600">
                      Lignes: {csvRecords.length} | Colonnes: {csvHeaders.length} | Delimiteur: {csvDelimiter === "\t" ? "TAB" : csvDelimiter}
                    </p>
                    <div className="max-h-28 overflow-auto rounded border border-slate-200 bg-white">
                      <table className="w-full text-[11px] min-w-max">
                        <thead className="bg-slate-50 text-slate-600 sticky top-0">
                          <tr>
                            {csvHeaders.slice(0, 12).map((header) => (
                              <th key={header} className="text-left px-2 py-1 border-b border-slate-100 whitespace-nowrap">
                                <div className="text-[11px] text-slate-700">{prettifyRecordFieldName(header, createDataset)}</div>
                                <div className="text-[10px] font-mono text-slate-400">{header}</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvRecords.slice(0, 3).map((record, idx) => (
                            <tr key={`csv-preview-${idx}`} className="border-b border-slate-50">
                              {csvHeaders.slice(0, 12).map((header) => (
                                <td key={`${idx}-${header}`} className="px-2 py-1 text-slate-700 whitespace-nowrap">
                                  {formatRecordCell(record[header])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Apercu limite a 12 colonnes / 3 lignes. Les donnees completes seront visibles dans le detail apres creation.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Importez un CSV traite (QGIS) pour preparer la soumission.
                  </p>
                )}
              </div>
            ) : (
              <textarea value={createPayload} onChange={(e) => setCreatePayload(e.target.value)} rows={5} className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg" />
            )}
            <button onClick={() => void createSubmission()} disabled={createLoading} className="px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white inline-flex items-center gap-2 disabled:opacity-60">
              {createLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : createSource === "kobo" ? <Upload className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />} {createSource === "kobo" ? "Synchroniser Kobo" : "Creer"}
            </button>
          </div>
        </div>

        <div className="xl:col-span-8 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold mb-3">Detail</p>
            {detailLoading ? <p className="text-sm text-slate-500">Chargement...</p> : null}
            {!selected ? <p className="text-sm text-slate-500">Selectionnez une soumission.</p> : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] ring-1 ring-inset ${statusClass(selected.status)}`}>{submissionStatusLabel(selected)}</span>
                  <span className="text-xs text-slate-500">v{selected.version}</span>
                  <span className="text-xs text-slate-500">{selected.dataset_code}</span>
                </div>
                <p className="text-xs text-slate-500">Createur: {selected.created_by_username || "-"} | Maj: {formatDate(selected.updated_at)}</p>
                {selected.rejection_reason ? <p className="text-sm text-rose-700">Motif rejet: {selected.rejection_reason}</p> : null}
                {lastRejectInfo ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    <p>
                      Dernier rejet: {String(lastRejectInfo.reason || "-")} | anomalies: {reviewIssuesCount}
                    </p>
                    {lastRejectInfo.investigator_contact ? (
                      <p>Contact enqueteur: {String(lastRejectInfo.investigator_contact)}</p>
                    ) : null}
                    {lastRejectInfo.notify_note ? (
                      <p>Message de correction: {String(lastRejectInfo.notify_note)}</p>
                    ) : null}
                  </div>
                ) : null}

                {canEditDraft ? (
                  <div className="space-y-2">
                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                    <input value={editRegion} onChange={(e) => setEditRegion(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                    <textarea value={editPayload} onChange={(e) => setEditPayload(e.target.value)} rows={8} className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg" />
                    <button onClick={() => void saveDraft()} className="px-3 py-2 text-sm border border-slate-300 rounded-lg">Enregistrer</button>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-700">Affichage metier actif</p>
                      <button
                        type="button"
                        onClick={() => setShowRawPayload((value) => !value)}
                        className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        {showRawPayload ? "Masquer JSON brut" : "Afficher JSON brut"}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Les donnees collectees sont presentees dans le tableau ci-dessous. Le JSON est reserve au debug.
                    </p>
                    {showRawPayload ? (
                      <pre className="text-xs font-mono whitespace-pre-wrap bg-white border border-slate-200 rounded-lg p-3 max-h-64 overflow-auto">
                        {JSON.stringify(selected.payload ?? {}, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                )}

                {canReview ? (
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-700">
                      Controle qualite (anomalies + contact enqueteur)
                    </p>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Motif de rejet"
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                    <input
                      value={investigatorContact}
                      onChange={(e) => setInvestigatorContact(e.target.value)}
                      placeholder="Contact enqueteur (email, tel, username)"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                    <input
                      value={notifyNote}
                      onChange={(e) => setNotifyNote(e.target.value)}
                      placeholder="Instruction de correction a transmettre"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                    <textarea
                      value={issuesDraft}
                      onChange={(e) => setIssuesDraft(e.target.value)}
                      placeholder='Anomalies JSON: [{"record_ref":"...","field":"...","message":"...","severity":"error"}]'
                      rows={5}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                ) : null}

                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-700">Actions disponibles</p>
                  <p className="text-xs text-slate-600">{nextActionHint}</p>
                  <div className="flex flex-wrap gap-2">
                    {canSubmit ? (
                      <button onClick={() => void runAction("submit", `/workflow/submissions/${encodeURIComponent(selected.submission_id)}/submit/`)} disabled={actionLoading !== null} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg inline-flex items-center gap-2 disabled:opacity-60">
                        {actionLoading === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Soumettre
                      </button>
                    ) : null}
                    {canReview ? (
                      <>
                        <button onClick={() => void runAction("validate", `/workflow/submissions/${encodeURIComponent(selected.submission_id)}/validate/`)} disabled={actionLoading !== null} className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg inline-flex items-center gap-2 disabled:opacity-60">
                          {actionLoading === "validate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Valider
                        </button>
                        <button onClick={() => {
                          if (!rejectReason.trim()) {
                            setFlash({ type: "error", message: "Motif rejet obligatoire." });
                            return;
                          }
                          const parsedIssues = parseIssuesDraft(issuesDraft);
                          if (!parsedIssues.ok) {
                            setFlash({ type: "error", message: parsedIssues.message });
                            return;
                          }
                          void runAction("reject", `/workflow/submissions/${encodeURIComponent(selected.submission_id)}/reject/`, {
                            reason: rejectReason.trim(),
                            investigator_contact: investigatorContact.trim(),
                            notify_note: notifyNote.trim(),
                            issues: parsedIssues.value,
                          });
                        }} disabled={actionLoading !== null} className="px-3 py-2 text-sm bg-rose-600 text-white rounded-lg inline-flex items-center gap-2 disabled:opacity-60">
                          {actionLoading === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Rejeter
                        </button>
                      </>
                    ) : null}
                    {canPublish ? (
                      <button onClick={() => void runAction("publish", `/workflow/submissions/${encodeURIComponent(selected.submission_id)}/publish/`)} disabled={actionLoading !== null} className="px-3 py-2 text-sm bg-violet-600 text-white rounded-lg inline-flex items-center gap-2 disabled:opacity-60">
                        {actionLoading === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Publier
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-slate-700">
                      Enregistrements collectes enqueteurs: {submissionRecords.length}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFocusedRecordIndex(null)}
                        disabled={focusedRecordIndex === null}
                        className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg disabled:opacity-50"
                      >
                        Recentrer carte
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const blob = new Blob([JSON.stringify(submissionRecords, null, 2)], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `records_${selected.dataset_code}_${selected.submission_id}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      >
                        Exporter records
                      </button>
                    </div>
                  </div>

                  {submissionRecords.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-[11px] text-slate-500">
                        Tableau complet: {recordColumns.length} colonnes detectees sur {submissionRecords.length} lignes.
                        Cliquez une ligne localisee pour zoomer la carte.
                        {focusedRecordIndex !== null ? ` Ligne ciblee: ${focusedRecordIndex + 1}.` : ""}
                      </div>
                      <div className="max-h-80 overflow-auto rounded border border-slate-200">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 text-slate-600 sticky top-0">
                            <tr>
                              <th className="text-left px-2 py-1.5 font-medium">Ligne</th>
                              <th className="text-left px-2 py-1.5 font-medium">Identifiant</th>
                              {recordColumns.map((column) => (
                                <th key={column.key} className="text-left px-2 py-1.5 font-medium whitespace-nowrap">
                                  <div className="text-[11px] text-slate-700">{column.label}</div>
                                  <div className="text-[10px] font-mono text-slate-400">{column.key}</div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {pagedSubmissionRecords.map((row, idx) => {
                              const absoluteIndex = (recordsPage - 1) * RECORDS_PAGE_SIZE + idx;
                              const rowHasGeometry = recordHasGeometry(row);
                              const isFocusedRow = focusedRecordIndex === absoluteIndex;
                              return (
                                <tr
                                  key={`${selected.submission_id}-${absoluteIndex}`}
                                  onClick={() => {
                                    if (!rowHasGeometry) return;
                                    setFocusedRecordIndex(absoluteIndex);
                                  }}
                                  className={`border-t border-slate-100 align-top ${
                                    rowHasGeometry ? "cursor-pointer hover:bg-emerald-50/70" : "bg-slate-50/30"
                                  } ${isFocusedRow ? "bg-emerald-100/60" : ""}`}
                                  title={rowHasGeometry ? "Cliquer pour zoomer la carte sur cette ligne" : "Aucune geometrie detectee pour cette ligne"}
                                >
                                  <td className="px-2 py-1.5 text-slate-500">{absoluteIndex + 1}</td>
                                  <td className="px-2 py-1.5 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                                    {recordIdentifier(row, absoluteIndex)}
                                    <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] ${rowHasGeometry ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                      {rowHasGeometry ? "Carte" : "Sans geo"}
                                    </span>
                                  </td>
                                  {recordColumns.map((column) => (
                                    <td key={`${column.key}-${absoluteIndex}`} className="px-2 py-1.5 text-slate-700 min-w-[150px]">
                                      {formatRecordCell(row[column.key])}
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setRecordsPage((value) => Math.max(1, value - 1))}
                          disabled={recordsPage <= 1}
                          className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg disabled:opacity-50"
                        >
                          Precedent
                        </button>
                        <span className="text-[11px] text-slate-500">
                          Page {recordsPage}/{recordsTotalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setRecordsPage((value) => Math.min(recordsTotalPages, value + 1))}
                          disabled={recordsPage >= recordsTotalPages}
                          className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg disabled:opacity-50"
                        >
                          Suivant
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Aucun record present dans ce payload.</p>
                  )}

                  <SubmissionGeometryMap records={submissionRecords} focusedRecordIndex={focusedRecordIndex} />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold mb-3">Historique</p>
            {historyRows.length === 0 ? <p className="text-sm text-slate-500">Aucun evenement.</p> : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-3 font-medium">Action</th>
                      <th className="py-2 pr-3 font-medium">Acteur</th>
                      <th className="py-2 pr-3 font-medium">Transition</th>
                      <th className="py-2 pr-3 font-medium">Commentaire</th>
                      <th className="py-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((row) => (
                      <tr key={row.action_id} className="border-b border-slate-100 align-top">
                        <td className="py-2 pr-3">{row.action_display || row.action}</td>
                        <td className="py-2 pr-3">{row.actor_username || "-"}</td>
                        <td className="py-2 pr-3">{(row.from_status || "-") + " -> " + (row.to_status || "-")}</td>
                        <td className="py-2 pr-3">{row.comment || "-"}</td>
                        <td className="py-2">{formatDate(row.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
