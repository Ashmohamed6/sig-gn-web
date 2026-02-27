// app/(protected)/data/config/tablesConfig.ts

/**
 * Configuration centralisée des tables (module Données)
 *
 * Convention d’URL (côté Front) :
 * - Les appels passent par le proxy Next : /api + <endpoint>
 * - Les endpoints ci-dessous doivent donc commencer par "/data/..."
 *   Exemple : endpoint = "/data/entreprises/" => fetch "/api/data/entreprises/"
 *
 * IMPORTANT :
 * - Les filtres région/prefecture/commune sont en cascade et doivent venir du schéma `ref`.
 * - Les tables sont filtrées par projet via l'en-tête X-Project-Code (FIERE / AGRIECO).
 */

export type UserRole = "lecteur" | "editeur" | "chef_projet" | "admin";
export type ProjectScope = "AGRIECO" | "FIERE" | "ALL";

export type ColumnType =
  | "text"
  | "number"
  | "date"
  | "currency"
  | "percent"
  | "boolean"
  | "badge"
  | "link"
  | "hidden";

export interface ColumnConfig {
  key: string;
  label: string;
  type: ColumnType;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
  width?: string;
  minWidth?: string;
  align?: "left" | "center" | "right";
  format?: string;
  suffix?: string;
  prefix?: string;
  minRole?: UserRole;
  badgeColors?: Record<string, string>;
  sticky?: boolean;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: "select" | "multiselect" | "text" | "number" | "date" | "daterange" | "cascade";
  options?: { value: string; label: string }[];
  /**
   * Si défini, le filtre devient “en cascade” : la valeur du parent est passée
   * au backend sous forme de query param (ex: region_id=...).
   */
  cascadeFrom?: string;
  /** Endpoint (sans /api) : ex: "/data/carto/admin-region/" */
  endpoint?: string;
  placeholder?: string;
  defaultValue?: any;
}

export interface ActionConfig {
  id: string;
  label: string;
  icon: string;
  type: "row" | "bulk" | "both";
  minRole?: UserRole;
  handler?: string;
  confirm?: string;
}

export interface TableConfig {
  id: string;
  name: string;
  description: string;
  /** Endpoint (sans /api) : ex: "/data/entreprises/" */
  endpoint: string;
  icon: string;
  project?: ProjectScope;
  columns: ColumnConfig[];
  /** Filtres spécifiques à la table (en plus de GLOBAL_FILTERS) */
  filters: FilterConfig[];
  actions: ActionConfig[];
  defaultSort?: { key: string; direction: "asc" | "desc" };
  pageSize?: number;
  hasGeometry?: boolean;
  geometryField?: string;
  exportable?: boolean;
}

// ============================================================
// CHEMINS API (côté Front)
// ============================================================

const API_DATA = "/data";
const API_CARTO = "/data/carto"; // endpoints GeoJSON ref (admin_region/prefecture/commune)

// ============================================================
// FILTRES GLOBAUX
// - Région -> Préfecture -> Commune (cascade)
// - Ces endpoints doivent pointer sur les tables du schéma `ref`.
// ============================================================

export const GLOBAL_FILTERS: FilterConfig[] = [
  {
    key: "region_id",
    label: "Région",
    type: "select",
    endpoint: `${API_CARTO}/admin-region/`,
    placeholder: "Toutes les régions",
  },
  {
    key: "prefecture_id",
    label: "Préfecture",
    type: "select",
    cascadeFrom: "region_id",
    endpoint: `${API_CARTO}/admin-prefecture/`,
    placeholder: "Toutes les préfectures",
  },
  {
    key: "commune_id",
    label: "Commune",
    type: "select",
    cascadeFrom: "prefecture_id",
    endpoint: `${API_CARTO}/admin-commune/`,
    placeholder: "Toutes les communes",
  },
  {
    key: "campagne",
    label: "Campagne",
    type: "select",
    options: [
      { value: "2025", label: "2025" },
      { value: "2024", label: "2024" },
      { value: "2023", label: "2023" },
      { value: "2022", label: "2022" },
    ],
    placeholder: "Toutes les campagnes",
  },
];

// ============================================================
// TABLE: CEP (Parcelles)
// ============================================================

export const CEP_TABLE: TableConfig = {
  id: "cep",
  name: "Parcelles CEP",
  description: "Champs École Paysans - Parcelles de démonstration",
  endpoint: `${API_DATA}/cep-parcelles/`,
  icon: "Sprout",
  project: "AGRIECO",
  hasGeometry: true,
  geometryField: "geom",
  exportable: true,
  pageSize: 25,
  defaultSort: { key: "id_cep", direction: "asc" },
  columns: [
    { key: "id_cep", label: "ID CEP", type: "text", sortable: true, filterable: true, sticky: true, width: "120px" },
    {
      key: "filiere_label",
      label: "Filière",
      type: "badge",
      sortable: true,
      width: "120px",
      badgeColors: { Riz: "emerald", Maraîchage: "amber", Arachide: "yellow", Fonio: "orange", Maïs: "blue" },
    },
    { key: "campagne_yyyy", label: "Campagne", type: "text", sortable: true, width: "100px", align: "center" },
    { key: "surface_decl", label: "Surface décl.", type: "number", sortable: true, width: "110px", align: "right", suffix: " ha" },
    { key: "pratiques_agroeco_label", label: "Pratiques", type: "text", sortable: true, width: "170px" },
    { key: "is_active", label: "Active", type: "boolean", sortable: true, width: "80px", align: "center" },
    { key: "rendement", label: "Rendement", type: "number", sortable: true, width: "110px", align: "right", suffix: " kg/ha" },
    { key: "menages_beneficiaires", label: "Ménages", type: "number", sortable: true, width: "90px", align: "center" },
    { key: "commune_nom", label: "Commune", type: "text", sortable: true, width: "140px" },
    { key: "prefecture_nom", label: "Préfecture", type: "text", sortable: true, width: "140px" },
    { key: "region_nom", label: "Région", type: "text", sortable: true, width: "120px" },
  ],
  filters: [
    {
      key: "filiere",
      label: "Filière",
      type: "multiselect",
      options: [
        { value: "RIZ", label: "Riz" },
        { value: "MAIS", label: "Maïs" },
        { value: "ARACHIDE", label: "Arachide" },
        { value: "OIGNON", label: "Oignon" },
        { value: "PDT", label: "Pomme de terre" },
      ],
    },
  ],
  actions: [
    { id: "view_map", label: "Voir sur la carte", icon: "MapPin", type: "both" },
    { id: "view_detail", label: "Voir détail", icon: "Eye", type: "row" },
    { id: "export_pdf", label: "Exporter fiche PDF", icon: "FileText", type: "row" },
    { id: "edit", label: "Modifier", icon: "Pencil", type: "row", minRole: "chef_projet" },
  ],
};

// ============================================================
// TABLE: Intrants (Distributions)
// ============================================================

export const INTRANTS_TABLE: TableConfig = {
  id: "intrants",
  name: "Distributions d'intrants",
  description: "Suivi des distributions d'intrants agricoles",
  endpoint: `${API_DATA}/intrants-distribution/`,
  icon: "Package",
  project: "AGRIECO",
  hasGeometry: true,
  geometryField: "geom",
  exportable: true,
  pageSize: 25,
  defaultSort: { key: "created_at", direction: "desc" },
  columns: [
    { key: "intrant_uuid", label: "UUID", type: "text", sortable: true, sticky: true, width: "120px" },
    {
      key: "type_intrant",
      label: "Type intrant",
      type: "badge",
      sortable: true,
      width: "140px",
      badgeColors: { semence: "green", engrais_min: "blue", engrais_org: "teal", pesticide: "red", outil: "gray" },
    },
    { key: "quantite", label: "Quantité", type: "number", sortable: true, width: "100px", align: "right" },
    { key: "unite_intrant", label: "Unité", type: "text", width: "80px", align: "center" },
    { key: "campagne_yyyy", label: "Campagne", type: "text", sortable: true, width: "100px", align: "center" },
    { key: "menages_beneficiaires", label: "Bénéficiaires", type: "number", sortable: true, width: "110px", align: "center" },
    { key: "source_intrant", label: "Source", type: "text", sortable: true, width: "180px" },
    { key: "commune_nom", label: "Commune", type: "text", sortable: true, width: "140px" },
    { key: "created_at", label: "Date", type: "date", sortable: true, width: "110px" },
  ],
  filters: [
    {
      key: "type_intrant",
      label: "Type",
      type: "multiselect",
      options: [
        { value: "semence", label: "Semence" },
        { value: "engrais_min", label: "Engrais minéral" },
        { value: "engrais_org", label: "Engrais organique" },
        { value: "pesticide", label: "Pesticide" },
      ],
    },
    {
      key: "intrant_conforme",
      label: "Conformité",
      type: "select",
      options: [
        { value: "oui", label: "Oui" },
        { value: "partiel", label: "Partiel" },
        { value: "non", label: "Non" },
      ],
    },
  ],
  actions: [
    { id: "view_map", label: "Voir sur la carte", icon: "MapPin", type: "both" },
    { id: "view_detail", label: "Voir détail", icon: "Eye", type: "row" },
    { id: "export_pdf", label: "Exporter fiche PDF", icon: "FileText", type: "row" },
    { id: "edit", label: "Modifier", icon: "Pencil", type: "row", minRole: "chef_projet" },
  ],
};

// ============================================================
// TABLE: Ouvrages
// ============================================================

export const OUVRAGES_TABLE: TableConfig = {
  id: "ouvrages",
  name: "Ouvrages",
  description: "Infrastructures hydrauliques et de restauration",
  endpoint: `${API_DATA}/ouvrages/`,
  icon: "Landmark",
  project: "AGRIECO",
  hasGeometry: true,
  geometryField: "geom",
  exportable: true,
  pageSize: 25,
  defaultSort: { key: "code_ouvrage", direction: "asc" },
  columns: [
    { key: "code_ouvrage", label: "Code", type: "text", sortable: true, sticky: true, width: "120px" },
    {
      key: "type_ouvrages_label",
      label: "Type",
      type: "badge",
      sortable: true,
      width: "140px",
      badgeColors: { Digue: "blue", Seuil: "teal", "Demi-lune": "green", "Cordons pierreux": "amber" },
    },
    {
      key: "etat_anti_label",
      label: "État antiérosif",
      type: "badge",
      sortable: true,
      width: "120px",
      badgeColors: { "Bon état (fonctionnel)": "green", "Moyen état": "amber", "Mauvais état": "red" },
    },
    { key: "longueur_anti_m", label: "Longueur", type: "number", sortable: true, width: "100px", align: "right", suffix: " m" },
    { key: "surface_couv_ha", label: "Surface", type: "number", sortable: true, width: "110px", align: "right", suffix: " ha" },
    { key: "commune_nom", label: "Commune", type: "text", sortable: true, width: "140px" },
    { key: "localite", label: "Localité", type: "text", sortable: true, width: "140px" },
    { key: "etat_couv_label", label: "État couverture", type: "text", sortable: true, width: "140px" },
  ],
  filters: [
    {
      key: "type_ouvrage_code",
      label: "Type",
      type: "multiselect",
      options: [
        { value: "DIGUE", label: "Digue" },
        { value: "SEUIL", label: "Seuil" },
        { value: "DEMI_LUNE", label: "Demi-lune" },
        { value: "CORDON_PIERR", label: "Cordons pierreux" },
      ],
    },
    {
      key: "etat_anti",
      label: "État antiérosif",
      type: "select",
      options: [
        { value: "BON", label: "Bon" },
        { value: "MOYEN", label: "Moyen" },
        { value: "MAUVAIS", label: "Mauvais" },
      ],
    },
  ],
  actions: [
    { id: "view_map", label: "Voir sur la carte", icon: "MapPin", type: "both" },
    { id: "view_detail", label: "Voir détail", icon: "Eye", type: "row" },
    { id: "export_pdf", label: "Exporter fiche PDF", icon: "FileText", type: "row" },
    { id: "edit", label: "Modifier", icon: "Pencil", type: "row", minRole: "chef_projet" },
  ],
};

// ============================================================
// TABLE: Zones dégradées
// ============================================================

export const ZONES_DEGRADEES_TABLE: TableConfig = {
  id: "zones_degradees",
  name: "Zones dégradées",
  description: "Zones de restauration écologique",
  endpoint: `${API_DATA}/zone-degradee/`,
  icon: "Mountain",
  project: "AGRIECO",
  hasGeometry: true,
  geometryField: "geom",
  exportable: true,
  pageSize: 25,
  defaultSort: { key: "id_zone", direction: "asc" },
  columns: [
    { key: "id_zone", label: "ID Zone", type: "text", sortable: true, sticky: true, width: "110px" },
    {
      key: "etat_restaur_label",
      label: "État restauration",
      type: "badge",
      sortable: true,
      width: "140px",
      badgeColors: { Restaurée: "green", "En cours": "amber", "Non traitée": "red", Planifiée: "blue" },
    },
    { key: "surface_degrad_ha", label: "Surface dégr.", type: "number", sortable: true, width: "120px", align: "right", suffix: " ha" },
    { key: "surface_restaur_ha", label: "Surface rest.", type: "number", sortable: true, width: "120px", align: "right", suffix: " ha" },
    { key: "taux_survie_pct", label: "Taux survie", type: "percent", sortable: true, width: "90px", align: "right" },
    { key: "nb_plants", label: "Plants", type: "number", sortable: true, width: "100px", align: "right" },
    { key: "commune_nom", label: "Commune", type: "text", sortable: true, width: "140px" },
    { key: "annee_plantation", label: "Année", type: "text", sortable: true, width: "90px", align: "center" },
    { key: "restauration_real", label: "Restaurée", type: "badge", sortable: true, width: "90px", align: "center", badgeColors: { oui: "green", non: "red", Oui: "green", Non: "red" } },
  ],
  filters: [
    {
      key: "etat_restaur",
      label: "État",
      type: "select",
      options: [
        { value: "BON", label: "Bon" },
        { value: "MOYEN", label: "Moyen" },
        { value: "FAIBLE", label: "Faible" },
      ],
    },
    {
      key: "restauration_real",
      label: "Restauration réalisée",
      type: "select",
      options: [
        { value: "oui", label: "Oui" },
        { value: "non", label: "Non" },
      ],
    },
  ],
  actions: [
    { id: "view_map", label: "Voir sur la carte", icon: "MapPin", type: "both" },
    { id: "view_detail", label: "Voir détail", icon: "Eye", type: "row" },
    { id: "export_pdf", label: "Exporter fiche PDF", icon: "FileText", type: "row" },
    { id: "edit", label: "Modifier", icon: "Pencil", type: "row", minRole: "chef_projet" },
  ],
};

// ============================================================
// TABLE: Têtes de sources
// ============================================================

export const TETES_SOURCES_TABLE: TableConfig = {
  id: "tetes_sources",
  name: "Têtes de sources",
  description: "Points d'eau protégés",
  endpoint: `${API_DATA}/tete-source/`,
  icon: "Droplets",
  project: "AGRIECO",
  hasGeometry: true,
  geometryField: "geom",
  exportable: true,
  pageSize: 25,
  defaultSort: { key: "id_ts", direction: "asc" },
  columns: [
    { key: "id_ts", label: "ID", type: "text", sortable: true, sticky: true, width: "100px" },
    {
      key: "type_source_label",
      label: "Type",
      type: "badge",
      sortable: true,
      width: "130px",
      badgeColors: { Source: "blue", Puits: "cyan", Forage: "teal" },
    },
    { key: "usage_principal_label", label: "Usage", type: "text", sortable: true, width: "140px" },
    { key: "pop_desservie", label: "Pop. desservie", type: "number", sortable: true, width: "120px", align: "right" },
    {
      key: "protection_exist",
      label: "Protection",
      type: "badge",
      sortable: true,
      width: "100px",
      badgeColors: { Oui: "green", Non: "red", Partiel: "yellow" },
    },
    {
      key: "etat_fonctionnel_label",
      label: "État",
      type: "badge",
      sortable: true,
      width: "110px",
      badgeColors: { Fonctionnel: "green", "En panne": "red", Dégradé: "yellow" },
    },
    { key: "commune_nom", label: "Commune", type: "text", sortable: true, width: "140px" },
    { key: "localite", label: "Localité", type: "text", sortable: true, width: "140px" },
  ],
  filters: [
    {
      key: "type_source",
      label: "Type",
      type: "multiselect",
      options: [
        { value: "SOURCE", label: "Source" },
        { value: "PUITS", label: "Puits" },
        { value: "FORAGE", label: "Forage" },
      ],
    },
    {
      key: "etat_fonctionnel",
      label: "État",
      type: "select",
      options: [
        { value: "FONCTIONNEL", label: "Fonctionnel" },
        { value: "EN_PANNE", label: "En panne" },
        { value: "DEGRADE", label: "Dégradé" },
      ],
    },
  ],
  actions: [
    { id: "view_map", label: "Voir sur la carte", icon: "MapPin", type: "both" },
    { id: "view_detail", label: "Voir détail", icon: "Eye", type: "row" },
    { id: "export_pdf", label: "Exporter fiche PDF", icon: "FileText", type: "row" },
    { id: "edit", label: "Modifier", icon: "Pencil", type: "row", minRole: "chef_projet" },
  ],
};

// ============================================================
// TABLE: Couloirs de transhumance
// ============================================================

export const COULOIRS_TABLE: TableConfig = {
  id: "couloirs",
  name: "Couloirs de transhumance",
  description: "Corridors de passage du bétail",
  endpoint: `${API_DATA}/couloirs/`,
  icon: "Route",
  project: "AGRIECO",
  hasGeometry: true,
  geometryField: "geom",
  exportable: true,
  pageSize: 25,
  defaultSort: { key: "id_couloir", direction: "asc" },
  columns: [
    { key: "id_couloir", label: "ID", type: "text", sortable: true, sticky: true, width: "100px" },
    { key: "nom_couloir", label: "Nom", type: "text", sortable: true, width: "180px" },
    {
      key: "type_couloir_label",
      label: "Type",
      type: "badge",
      sortable: true,
      width: "120px",
      badgeColors: { Principal: "blue", Secondaire: "gray", Local: "green" },
    },
    { key: "longueur_km", label: "Longueur", type: "number", sortable: true, width: "100px", align: "right", suffix: " km" },
    { key: "largeur_m", label: "Largeur", type: "number", sortable: true, width: "90px", align: "right", suffix: " m" },
    {
      key: "statut_couloir_label",
      label: "Statut",
      type: "badge",
      sortable: true,
      width: "120px",
      badgeColors: { Balisé: "green", "Non balisé": "red", "En cours": "yellow" },
    },
    { key: "saison_usage", label: "Saison", type: "text", sortable: true, width: "100px" },
    { key: "commune_nom", label: "Commune", type: "text", sortable: true, width: "140px" },
  ],
  filters: [
    {
      key: "type_couloir",
      label: "Type",
      type: "select",
      options: [
        { value: "PRINCIPAL", label: "Principal" },
        { value: "SECONDAIRE", label: "Secondaire" },
        { value: "LOCAL", label: "Local" },
      ],
    },
    {
      key: "statut_couloir",
      label: "Statut",
      type: "select",
      options: [
        { value: "BALISE", label: "Balisé" },
        { value: "NON_BALISE", label: "Non balisé" },
      ],
    },
  ],
  actions: [
    { id: "view_map", label: "Voir sur la carte", icon: "MapPin", type: "both" },
    { id: "view_detail", label: "Voir détail", icon: "Eye", type: "row" },
    { id: "export_pdf", label: "Exporter fiche PDF", icon: "FileText", type: "row" },
    { id: "edit", label: "Modifier", icon: "Pencil", type: "row", minRole: "chef_projet" },
  ],
};

// ============================================================
// TABLE: Organisations agricoles
// ============================================================

export const ORGANISATIONS_TABLE: TableConfig = {
  id: "organisations",
  name: "Organisations",
  description: "Organisations paysannes et coopératives",
  endpoint: `${API_DATA}/agr-organisations/`,
  icon: "Users",
  project: "AGRIECO",
  hasGeometry: true,
  geometryField: "geom",
  exportable: true,
  pageSize: 25,
  defaultSort: { key: "id_org", direction: "asc" },
  columns: [
    { key: "id_org", label: "ID Org", type: "text", sortable: true, sticky: true, width: "100px" },
    {
      key: "type_org_label",
      label: "Type",
      type: "badge",
      sortable: true,
      width: "130px",
      badgeColors: { Coopérative: "emerald", Groupement: "blue", Union: "purple" },
    },
    { key: "statut_juridique_label", label: "Statut", type: "text", sortable: true, width: "120px" },
    { key: "nb_membres_total", label: "Membres", type: "number", sortable: true, width: "90px", align: "center" },
    { key: "nb_membres_femmes", label: "Femmes", type: "number", sortable: true, width: "90px", align: "center" },
    { key: "commune_nom", label: "Commune", type: "text", sortable: true, width: "140px" },
    { key: "localite", label: "Localité", type: "text", width: "120px", minRole: "editeur" },
    { key: "nb_planteurs_accompagnes", label: "Planteurs appuyés", type: "number", sortable: true, width: "130px", align: "right" },
    { key: "nb_emplois_verts", label: "Emplois verts", type: "number", sortable: true, width: "100px", align: "center" },
  ],
  filters: [
    {
      key: "type_org",
      label: "Type",
      type: "multiselect",
      options: [
        { value: "COOP", label: "Coopérative" },
        { value: "OP", label: "Organisation paysanne" },
        { value: "UNION", label: "Union" },
      ],
    },
    {
      key: "pratiques_adoptees",
      label: "Pratiques adoptées",
      type: "select",
      options: [
        { value: "oui", label: "Oui" },
        { value: "non", label: "Non" },
      ],
    },
  ],
  actions: [
    { id: "view_map", label: "Voir sur la carte", icon: "MapPin", type: "both" },
    { id: "view_detail", label: "Voir détail", icon: "Eye", type: "row" },
    { id: "export_pdf", label: "Exporter fiche PDF", icon: "FileText", type: "row" },
    { id: "edit", label: "Modifier", icon: "Pencil", type: "row", minRole: "chef_projet" },
  ],
};

// ============================================================
// TABLE: Formations (FIERE)
// ============================================================

export const FORMATIONS_TABLE: TableConfig = {
  id: "formations",
  name: "Sessions de formation",
  description: "Formations et renforcement des capacités",
  endpoint: `${API_DATA}/formations-eco-cat/`,
  icon: "GraduationCap",
  project: "FIERE",
  hasGeometry: true,
  geometryField: "geom",
  exportable: true,
  pageSize: 25,
  defaultSort: { key: "date_debut", direction: "desc" },
  columns: [
    { key: "id_formation", label: "ID Session", type: "text", sortable: true, sticky: true, width: "110px" },
    {
      key: "type_formation_label",
      label: "Type",
      type: "badge",
      sortable: true,
      width: "140px",
      badgeColors: { Technique: "blue", Gestion: "purple", Entrepreneuriat: "emerald" },
    },
    { key: "intitule_formation", label: "Thème", type: "text", sortable: true, width: "180px" },
    { key: "date_debut", label: "Début", type: "date", sortable: true, width: "100px" },
    { key: "date_fin", label: "Fin", type: "date", sortable: true, width: "100px" },
    { key: "duree_jours", label: "Jours", type: "number", sortable: true, width: "80px", align: "center" },
    { key: "nb_part_cat", label: "Participants", type: "number", sortable: true, width: "110px", align: "center" },
    { key: "commune_nom", label: "Commune", type: "text", sortable: true, width: "140px" },
    { key: "organisme_formateur", label: "Formateur", type: "text", sortable: true, width: "150px" },
  ],
  filters: [
    {
      key: "type_formation",
      label: "Type",
      type: "multiselect",
      options: [
        { value: "RENF_CAP", label: "Renforcement capacités" },
        { value: "PROFESSIONNEL", label: "Professionnel" },
        { value: "AUTRE", label: "Autre" },
      ],
    },
    { key: "date_debut", label: "Période", type: "daterange" },
  ],
  actions: [
    { id: "view_map", label: "Voir sur la carte", icon: "MapPin", type: "both" },
    { id: "view_detail", label: "Voir détail", icon: "Eye", type: "row" },
    { id: "export_pdf", label: "Exporter fiche PDF", icon: "FileText", type: "row" },
    { id: "edit", label: "Modifier", icon: "Pencil", type: "row", minRole: "chef_projet" },
  ],
};

// ============================================================
// TABLE: Entreprises (FIERE)
// ============================================================

export const ENTREPRISES_TABLE: TableConfig = {
  id: "entreprises",
  name: "Entreprises",
  description: "Micro, petites et moyennes entreprises appuyées",
  endpoint: `${API_DATA}/entreprises/`,
  icon: "Building2",
  project: "FIERE",
  hasGeometry: true,
  geometryField: "geom",
  exportable: true,
  pageSize: 25,
  defaultSort: { key: "raison_sociale", direction: "asc" },
  columns: [
    { key: "id_ent", label: "ID", type: "text", sortable: true, sticky: true, width: "100px" },
    { key: "raison_sociale", label: "Raison sociale", type: "text", sortable: true, width: "200px" },
    {
      key: "secteur_principal_label",
      label: "Secteur",
      type: "badge",
      sortable: true,
      width: "140px",
      badgeColors: { Agriculture: "green", Commerce: "blue", Artisanat: "amber", Services: "purple" },
    },
    {
      key: "taille_entreprise_label",
      label: "Taille",
      type: "badge",
      sortable: true,
      width: "100px",
      badgeColors: { Micro: "gray", Petite: "blue", Moyenne: "emerald" },
    },
    { key: "effectif_total", label: "Employés", type: "number", sortable: true, width: "90px", align: "center" },
    { key: "est_mpme_formalisee", label: "Formalisée", type: "boolean", sortable: true, width: "100px", align: "center" },
    { key: "est_mpme_appuyee_fiere", label: "Appuyée FIERE", type: "boolean", sortable: true, width: "120px", align: "center" },
    { key: "commune_nom", label: "Commune", type: "text", sortable: true, width: "140px" },
    { key: "localite", label: "Localité", type: "text", sortable: true, width: "140px" },
  ],
  filters: [
    {
      key: "secteur_principal",
      label: "Secteur",
      type: "multiselect",
      options: [
        { value: "COM_AGRI", label: "Commerce agricole" },
        { value: "MANIOC", label: "Manioc" },
        { value: "RIZ", label: "Riz" },
        { value: "TRANSFO_AGRO", label: "Transformation agro" },
        { value: "SL_AUTRE", label: "Autre secteur" },
      ],
    },
    {
      key: "est_mpme_appuyee",
      label: "Appuyée FIERE",
      type: "select",
      options: [
        { value: "true", label: "Oui" },
        { value: "false", label: "Non" },
      ],
    },
  ],
  actions: [
    { id: "view_map", label: "Voir sur la carte", icon: "MapPin", type: "both" },
    { id: "view_detail", label: "Voir détail", icon: "Eye", type: "row" },
    { id: "export_pdf", label: "Exporter fiche PDF", icon: "FileText", type: "row" },
    { id: "edit", label: "Modifier", icon: "Pencil", type: "row", minRole: "chef_projet" },
  ],
};

// ============================================================
// TABLE: Marchés
// ============================================================

export const MARCHES_TABLE: TableConfig = {
  id: "marches",
  name: "Marchés",
  description: "Transactions commerciales",
  endpoint: `${API_DATA}/marches/`,
  icon: "ShoppingCart",
  project: "AGRIECO",
  hasGeometry: true,
  geometryField: "geom",
  exportable: true,
  pageSize: 25,
  defaultSort: { key: "created_at", direction: "desc" },
  columns: [
    { key: "marche_uuid", label: "ID", type: "text", sortable: true, sticky: true, width: "100px" },
    {
      key: "filiere_label",
      label: "Filière",
      type: "badge",
      sortable: true,
      width: "120px",
      badgeColors: { Riz: "emerald", Maraîchage: "amber", Arachide: "yellow", Fonio: "orange" },
    },
    { key: "type_comptoir", label: "Type comptoir", type: "text", sortable: true, width: "120px", align: "center" },
    { key: "frequence_marche", label: "Fréquence", type: "text", sortable: true, width: "100px", align: "right" },
    { key: "gestionnaire", label: "Gestionnaire", type: "text", sortable: true, width: "110px", align: "right" },
    { key: "localite", label: "Localité", type: "text", sortable: true, width: "180px" },
    { key: "commune_nom", label: "Commune", type: "text", sortable: true, width: "140px" },
    { key: "created_at", label: "Date", type: "date", sortable: true, width: "110px" },
  ],
  filters: [
    {
      key: "filiere",
      label: "Filière",
      type: "multiselect",
      options: [
        { value: "RIZ", label: "Riz" },
        { value: "MAIS", label: "Maïs" },
        { value: "ARACHIDE", label: "Arachide" },
        { value: "OIGNON", label: "Oignon" },
        { value: "PDT", label: "Pomme de terre" },
      ],
    },
  ],
  actions: [
    { id: "view_map", label: "Voir sur la carte", icon: "MapPin", type: "both" },
    { id: "view_detail", label: "Voir détail", icon: "Eye", type: "row" },
    { id: "export_pdf", label: "Exporter fiche PDF", icon: "FileText", type: "row" },
    { id: "edit", label: "Modifier", icon: "Pencil", type: "row", minRole: "chef_projet" },
  ],
};

// ============================================================
// TABLE: Ménages agricoles
// ============================================================

export const MENAGES_TABLE: TableConfig = {
  id: "menages",
  name: "Ménages",
  description: "Ménages agricoles et pratiques agroécologiques",
  endpoint: `${API_DATA}/agr-menages/`,
  icon: "Home",
  project: "AGRIECO",
  hasGeometry: true,
  geometryField: "geom",
  exportable: true,
  pageSize: 25,
  defaultSort: { key: "nom_chef_menage", direction: "asc" },
  columns: [
    { key: "id_menage", label: "ID", type: "text", sortable: true, sticky: true, width: "100px" },
    { key: "nom_chef_menage", label: "Chef de ménage", type: "text", sortable: true, width: "180px" },
    {
      key: "type_menage_label",
      label: "Type",
      type: "badge",
      sortable: true,
      width: "130px",
      badgeColors: { Agriculteur: "green", Éleveur: "amber", Agropastoral: "blue", Pêcheur: "cyan" },
    },
    { key: "nb_personnes", label: "Personnes", type: "number", sortable: true, width: "100px", align: "center" },
    { key: "nb_enfants_u5", label: "Enfants <5", type: "number", sortable: true, width: "100px", align: "center" },
    { key: "menage_prat_agroeco", label: "Prat. agroéco", type: "boolean", sortable: true, width: "120px", align: "center" },
    { key: "utilise_intrants_chimiques", label: "Intrants chim.", type: "boolean", sortable: true, width: "120px", align: "center" },
    { key: "applique_bonnes_prat_nutrition", label: "Bonnes prat. nutri.", type: "boolean", sortable: true, width: "140px", align: "center" },
    { key: "utilise_foyer_ameliore", label: "Foyer amélioré", type: "boolean", sortable: true, width: "120px", align: "center" },
    { key: "commune_nom", label: "Commune", type: "text", sortable: true, width: "140px" },
    { key: "prefecture_nom", label: "Préfecture", type: "text", sortable: true, width: "140px" },
    { key: "region_nom", label: "Région", type: "text", sortable: true, width: "120px" },
  ],
  filters: [
    {
      key: "type_menage",
      label: "Type de ménage",
      type: "select",
      options: [
        { value: "AGRICULTEUR", label: "Agriculteur" },
        { value: "ELEVEUR", label: "Éleveur" },
        { value: "AGROPASTORAL", label: "Agropastoral" },
        { value: "PECHEUR", label: "Pêcheur" },
      ],
    },
    {
      key: "menage_prat_agroeco",
      label: "Pratiques agroéco",
      type: "select",
      options: [
        { value: "true", label: "Oui" },
        { value: "false", label: "Non" },
      ],
    },
    {
      key: "utilise_foyer_ameliore",
      label: "Foyer amélioré",
      type: "select",
      options: [
        { value: "true", label: "Oui" },
        { value: "false", label: "Non" },
      ],
    },
  ],
  actions: [
    { id: "view_map", label: "Voir sur la carte", icon: "MapPin", type: "both" },
    { id: "view_detail", label: "Voir détail", icon: "Eye", type: "row" },
    { id: "export_pdf", label: "Exporter fiche PDF", icon: "FileText", type: "row" },
    { id: "edit", label: "Modifier", icon: "Pencil", type: "row", minRole: "chef_projet" },
  ],
};

// ============================================================
// TABLE: Comités agricoles
// ============================================================

export const COMITES_TABLE: TableConfig = {
  id: "comites",
  name: "Comités",
  description: "Comités de gestion des ressources naturelles",
  endpoint: `${API_DATA}/agr-comites/`,
  icon: "UsersRound",
  project: "AGRIECO",
  hasGeometry: true,
  geometryField: "geom",
  exportable: true,
  pageSize: 25,
  defaultSort: { key: "nom_comite", direction: "asc" },
  columns: [
    { key: "id_comite", label: "ID", type: "text", sortable: true, sticky: true, width: "100px" },
    { key: "nom_comite", label: "Nom", type: "text", sortable: true, width: "200px" },
    {
      key: "type_comite_label",
      label: "Type",
      type: "badge",
      sortable: true,
      width: "140px",
      badgeColors: { CGRN: "green", CLC: "blue", CVGF: "purple", CVD: "amber" },
    },
    {
      key: "statut_comite_label",
      label: "Statut",
      type: "badge",
      sortable: true,
      width: "120px",
      badgeColors: { Actif: "green", Inactif: "red", "En création": "amber" },
    },
    { key: "annee_creation", label: "Année", type: "text", sortable: true, width: "80px", align: "center" },
    { key: "nb_membres_total", label: "Membres", type: "number", sortable: true, width: "90px", align: "center" },
    { key: "nb_membres_femmes", label: "Femmes", type: "number", sortable: true, width: "90px", align: "center" },
    { key: "nb_reunions_12m", label: "Réunions/12m", type: "number", sortable: true, width: "110px", align: "center" },
    { key: "suit_conflits", label: "Suivi conflits", type: "boolean", sortable: true, width: "110px", align: "center" },
    { key: "nb_conflits_regles", label: "Conflits réglés", type: "number", sortable: true, width: "120px", align: "center" },
    { key: "commune_nom", label: "Commune", type: "text", sortable: true, width: "140px" },
    { key: "region_nom", label: "Région", type: "text", sortable: true, width: "120px" },
  ],
  filters: [
    {
      key: "type_comite",
      label: "Type",
      type: "select",
      options: [
        { value: "CGRN", label: "CGRN" },
        { value: "CLC", label: "CLC" },
        { value: "CVGF", label: "CVGF" },
        { value: "CVD", label: "CVD" },
      ],
    },
    {
      key: "statut_comite",
      label: "Statut",
      type: "select",
      options: [
        { value: "ACTIF", label: "Actif" },
        { value: "INACTIF", label: "Inactif" },
      ],
    },
    {
      key: "suit_conflits",
      label: "Suivi conflits",
      type: "select",
      options: [
        { value: "true", label: "Oui" },
        { value: "false", label: "Non" },
      ],
    },
  ],
  actions: [
    { id: "view_map", label: "Voir sur la carte", icon: "MapPin", type: "both" },
    { id: "view_detail", label: "Voir détail", icon: "Eye", type: "row" },
    { id: "export_pdf", label: "Exporter fiche PDF", icon: "FileText", type: "row" },
    { id: "edit", label: "Modifier", icon: "Pencil", type: "row", minRole: "chef_projet" },
  ],
};

// ============================================================
// TABLE: Stations météo
// ============================================================

export const STATIONS_METEO_TABLE: TableConfig = {
  id: "stations_meteo",
  name: "Stations météo",
  description: "Stations de mesure météorologique",
  endpoint: `${API_DATA}/meteo/stations/`,
  icon: "CloudRain",
  project: "AGRIECO",
  hasGeometry: true,
  geometryField: "geom",
  exportable: true,
  pageSize: 25,
  defaultSort: { key: "nom_station", direction: "asc" },
  columns: [
    { key: "code_station", label: "Code", type: "text", sortable: true, sticky: true, width: "110px" },
    { key: "nom_station", label: "Nom", type: "text", sortable: true, width: "200px" },
    {
      key: "type_station_label",
      label: "Type",
      type: "badge",
      sortable: true,
      width: "130px",
      badgeColors: { Automatique: "blue", Manuelle: "amber", Hybride: "purple" },
    },
    { key: "proprietaire_label", label: "Propriétaire", type: "text", sortable: true, width: "150px" },
    {
      key: "statut_station_label",
      label: "Statut",
      type: "badge",
      sortable: true,
      width: "120px",
      badgeColors: { Opérationnelle: "green", "En panne": "red", "En maintenance": "amber" },
    },
    { key: "date_mise_service", label: "Mise en service", type: "date", sortable: true, width: "120px" },
    { key: "frequence_mesure_label", label: "Fréquence", type: "text", sortable: true, width: "120px" },
    {
      key: "etat_equipements_label",
      label: "État équip.",
      type: "badge",
      sortable: true,
      width: "120px",
      badgeColors: { Bon: "green", Moyen: "amber", Mauvais: "red" },
    },
    { key: "is_active", label: "Active", type: "boolean", sortable: true, width: "80px", align: "center" },
    { key: "commune_nom", label: "Commune", type: "text", sortable: true, width: "140px" },
    { key: "region_nom", label: "Région", type: "text", sortable: true, width: "120px" },
  ],
  filters: [
    {
      key: "type_station",
      label: "Type",
      type: "select",
      options: [
        { value: "AUTOMATIQUE", label: "Automatique" },
        { value: "MANUELLE", label: "Manuelle" },
        { value: "HYBRIDE", label: "Hybride" },
      ],
    },
    {
      key: "statut_station",
      label: "Statut",
      type: "select",
      options: [
        { value: "OPERATIONNELLE", label: "Opérationnelle" },
        { value: "EN_PANNE", label: "En panne" },
        { value: "EN_MAINTENANCE", label: "En maintenance" },
      ],
    },
    {
      key: "is_active",
      label: "Active",
      type: "select",
      options: [
        { value: "true", label: "Oui" },
        { value: "false", label: "Non" },
      ],
    },
  ],
  actions: [
    { id: "view_map", label: "Voir sur la carte", icon: "MapPin", type: "both" },
    { id: "view_detail", label: "Voir détail", icon: "Eye", type: "row" },
    { id: "export_pdf", label: "Exporter fiche PDF", icon: "FileText", type: "row" },
    { id: "edit", label: "Modifier", icon: "Pencil", type: "row", minRole: "chef_projet" },
  ],
};

// ============================================================
// TABLE: Suivi des sortants (FIERE)
// ============================================================

export const SORTANTS_TABLE: TableConfig = {
  id: "sortants",
  name: "Suivi sortants",
  description: "Suivi de l'insertion des sortants de formation FIERE",
  endpoint: `${API_DATA}/fiere-suivi-sortants/`,
  icon: "UserCheck",
  project: "FIERE",
  hasGeometry: true,
  geometryField: "geom",
  exportable: true,
  pageSize: 25,
  defaultSort: { key: "date_suivi", direction: "desc" },
  columns: [
    { key: "id_sortant", label: "ID Sortant", type: "text", sortable: true, sticky: true, width: "110px" },
    { key: "nom_sortant", label: "Nom", type: "text", sortable: true, width: "180px" },
    { key: "sexe_label", label: "Sexe", type: "text", sortable: true, width: "80px", align: "center" },
    {
      key: "filiere_principale_label",
      label: "Filière",
      type: "badge",
      sortable: true,
      width: "140px",
      badgeColors: { Agriculture: "green", Élevage: "amber", Artisanat: "purple", BTP: "blue", Commerce: "teal" },
    },
    { key: "intitule_formation", label: "Formation", type: "text", sortable: true, width: "180px" },
    { key: "centre_formation", label: "Centre", type: "text", sortable: true, width: "150px" },
    {
      key: "insere",
      label: "Inséré",
      type: "badge",
      sortable: true,
      width: "90px",
      badgeColors: { oui: "green", non: "red", Oui: "green", Non: "red" },
    },
    { key: "type_insertion_label", label: "Type insertion", type: "text", sortable: true, width: "140px" },
    { key: "domaine_emploi_label", label: "Domaine emploi", type: "text", sortable: true, width: "140px" },
    { key: "date_suivi", label: "Date suivi", type: "date", sortable: true, width: "110px" },
    { key: "commune_nom", label: "Commune", type: "text", sortable: true, width: "140px" },
    { key: "region_nom", label: "Région", type: "text", sortable: true, width: "120px" },
  ],
  filters: [
    {
      key: "filiere_principale",
      label: "Filière",
      type: "multiselect",
      options: [
        { value: "AGRICULTURE", label: "Agriculture" },
        { value: "ELEVAGE", label: "Élevage" },
        { value: "ARTISANAT", label: "Artisanat" },
        { value: "BTP", label: "BTP" },
        { value: "COMMERCE", label: "Commerce" },
      ],
    },
    {
      key: "insere",
      label: "Insertion",
      type: "select",
      options: [
        { value: "oui", label: "Inséré" },
        { value: "non", label: "Non inséré" },
      ],
    },
    {
      key: "sexe",
      label: "Sexe",
      type: "select",
      options: [
        { value: "M", label: "Masculin" },
        { value: "F", label: "Féminin" },
      ],
    },
  ],
  actions: [
    { id: "view_map", label: "Voir sur la carte", icon: "MapPin", type: "both" },
    { id: "view_detail", label: "Voir détail", icon: "Eye", type: "row" },
    { id: "export_pdf", label: "Exporter fiche PDF", icon: "FileText", type: "row" },
    { id: "edit", label: "Modifier", icon: "Pencil", type: "row", minRole: "chef_projet" },
  ],
};

// ============================================================
// TABLE: Emplois par domaine (FIERE)
// ============================================================

export const EMPLOIS_TABLE: TableConfig = {
  id: "emplois",
  name: "Emplois",
  description: "Emplois par domaine dans les entreprises appuyées",
  endpoint: `${API_DATA}/ent-emplois-dom/`,
  icon: "Briefcase",
  project: "FIERE",
  hasGeometry: true,
  geometryField: "geom",
  exportable: true,
  pageSize: 25,
  defaultSort: { key: "raison_sociale", direction: "asc" },
  columns: [
    { key: "id_ent", label: "ID Entreprise", type: "text", sortable: true, sticky: true, width: "120px" },
    { key: "raison_sociale", label: "Raison sociale", type: "text", sortable: true, width: "200px" },
    { key: "annee_ref", label: "Année", type: "text", sortable: true, width: "80px", align: "center" },
    {
      key: "domaine_label",
      label: "Domaine",
      type: "badge",
      sortable: true,
      width: "140px",
      badgeColors: { Agriculture: "green", Commerce: "blue", Artisanat: "amber", Services: "purple", BTP: "teal" },
    },
    { key: "nb_empl_dom", label: "Emplois dom.", type: "number", sortable: true, width: "110px", align: "center" },
    { key: "nb_empl_fem_dom", label: "Femmes", type: "number", sortable: true, width: "90px", align: "center" },
    { key: "nb_empl_jeunes_dom", label: "Jeunes", type: "number", sortable: true, width: "90px", align: "center" },
    {
      key: "emploi_vert_dom",
      label: "Emploi vert",
      type: "badge",
      sortable: true,
      width: "110px",
      badgeColors: { oui: "green", non: "gray", Oui: "green", Non: "gray" },
    },
    { key: "emplois_total", label: "Total emplois", type: "number", sortable: true, width: "110px", align: "center" },
    { key: "commune_nom", label: "Commune", type: "text", sortable: true, width: "140px" },
    { key: "region_nom", label: "Région", type: "text", sortable: true, width: "120px" },
  ],
  filters: [
    {
      key: "annee_ref",
      label: "Année",
      type: "select",
      options: [
        { value: "2025", label: "2025" },
        { value: "2024", label: "2024" },
        { value: "2023", label: "2023" },
        { value: "2022", label: "2022" },
      ],
    },
    {
      key: "domaine_code",
      label: "Domaine",
      type: "multiselect",
      options: [
        { value: "AGRICULTURE", label: "Agriculture" },
        { value: "COMMERCE", label: "Commerce" },
        { value: "ARTISANAT", label: "Artisanat" },
        { value: "SERVICES", label: "Services" },
        { value: "BTP", label: "BTP" },
      ],
    },
    {
      key: "emploi_vert_dom",
      label: "Emploi vert",
      type: "select",
      options: [
        { value: "oui", label: "Oui" },
        { value: "non", label: "Non" },
      ],
    },
  ],
  actions: [
    { id: "view_map", label: "Voir sur la carte", icon: "MapPin", type: "both" },
    { id: "view_detail", label: "Voir détail", icon: "Eye", type: "row" },
    { id: "export_pdf", label: "Exporter fiche PDF", icon: "FileText", type: "row" },
    { id: "edit", label: "Modifier", icon: "Pencil", type: "row", minRole: "chef_projet" },
  ],
};

// ============================================================
// TABLE: Insertions par domaine (FIERE)
// ============================================================

export const INSERTIONS_TABLE: TableConfig = {
  id: "insertions",
  name: "Insertions",
  description: "Insertions professionnelles par domaine",
  endpoint: `${API_DATA}/ent-insertions-dom/`,
  icon: "TrendingUp",
  project: "FIERE",
  hasGeometry: true,
  geometryField: "geom",
  exportable: true,
  pageSize: 25,
  defaultSort: { key: "raison_sociale", direction: "asc" },
  columns: [
    { key: "id_ent", label: "ID Entreprise", type: "text", sortable: true, sticky: true, width: "120px" },
    { key: "raison_sociale", label: "Raison sociale", type: "text", sortable: true, width: "200px" },
    { key: "annee_ref", label: "Année", type: "text", sortable: true, width: "80px", align: "center" },
    {
      key: "domaine_label",
      label: "Domaine",
      type: "badge",
      sortable: true,
      width: "140px",
      badgeColors: { Agriculture: "green", Commerce: "blue", Artisanat: "amber", Services: "purple", BTP: "teal" },
    },
    {
      key: "type_insertion_label",
      label: "Type insertion",
      type: "badge",
      sortable: true,
      width: "140px",
      badgeColors: { Stage: "blue", Emploi: "green", "Auto-emploi": "amber", Apprentissage: "purple" },
    },
    { key: "nb_ins_dom", label: "Insertions dom.", type: "number", sortable: true, width: "120px", align: "center" },
    { key: "nb_ins_fem_dom", label: "Femmes", type: "number", sortable: true, width: "90px", align: "center" },
    { key: "nb_ins_jeunes_dom", label: "Jeunes", type: "number", sortable: true, width: "90px", align: "center" },
    { key: "duree_insertion_mois", label: "Durée (mois)", type: "number", sortable: true, width: "110px", align: "center" },
    {
      key: "insertion_verte_dom",
      label: "Insertion verte",
      type: "badge",
      sortable: true,
      width: "120px",
      badgeColors: { oui: "green", non: "gray", Oui: "green", Non: "gray" },
    },
    { key: "insert_total", label: "Total insert.", type: "number", sortable: true, width: "100px", align: "center" },
    { key: "commune_nom", label: "Commune", type: "text", sortable: true, width: "140px" },
    { key: "region_nom", label: "Région", type: "text", sortable: true, width: "120px" },
  ],
  filters: [
    {
      key: "annee_ref",
      label: "Année",
      type: "select",
      options: [
        { value: "2025", label: "2025" },
        { value: "2024", label: "2024" },
        { value: "2023", label: "2023" },
        { value: "2022", label: "2022" },
      ],
    },
    {
      key: "domaine_code",
      label: "Domaine",
      type: "multiselect",
      options: [
        { value: "AGRICULTURE", label: "Agriculture" },
        { value: "COMMERCE", label: "Commerce" },
        { value: "ARTISANAT", label: "Artisanat" },
        { value: "SERVICES", label: "Services" },
        { value: "BTP", label: "BTP" },
      ],
    },
    {
      key: "type_insertion_code",
      label: "Type insertion",
      type: "select",
      options: [
        { value: "STAGE", label: "Stage" },
        { value: "EMPLOI", label: "Emploi" },
        { value: "AUTO_EMPLOI", label: "Auto-emploi" },
        { value: "APPRENTISSAGE", label: "Apprentissage" },
      ],
    },
  ],
  actions: [
    { id: "view_map", label: "Voir sur la carte", icon: "MapPin", type: "both" },
    { id: "view_detail", label: "Voir détail", icon: "Eye", type: "row" },
    { id: "export_pdf", label: "Exporter fiche PDF", icon: "FileText", type: "row" },
    { id: "edit", label: "Modifier", icon: "Pencil", type: "row", minRole: "chef_projet" },
  ],
};

// ============================================================
// EXPORT DE TOUTES LES TABLES
// ============================================================

export const ALL_TABLES: TableConfig[] = [
  // AGRIECO (11 tables)
  CEP_TABLE,
  INTRANTS_TABLE,
  OUVRAGES_TABLE,
  ZONES_DEGRADEES_TABLE,
  TETES_SOURCES_TABLE,
  COULOIRS_TABLE,
  ORGANISATIONS_TABLE,
  MENAGES_TABLE,
  COMITES_TABLE,
  STATIONS_METEO_TABLE,
  MARCHES_TABLE,
  // FIERE (5 tables)
  FORMATIONS_TABLE,
  ENTREPRISES_TABLE,
  SORTANTS_TABLE,
  EMPLOIS_TABLE,
  INSERTIONS_TABLE,
];

export function getTableConfig(tableId: string): TableConfig | undefined {
  return ALL_TABLES.find((t) => t.id === tableId);
}

export function getTablesByProject(projectCode: string): TableConfig[] {
  const code = String(projectCode || "").toUpperCase();
  if (code !== "AGRIECO" && code !== "FIERE") return ALL_TABLES;

  return ALL_TABLES.filter((t) => t.project === code || t.project === "ALL");
}
