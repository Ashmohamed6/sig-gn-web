// app/(protected)/cartographie/config/layersConfig.ts

/**
 * Configuration centralisée de toutes les couches cartographiques
 * - Couches référentielles (schéma ref)
 * - Couches de données collectées (schéma core/marts)
 */

export type GeometryType = "Point" | "LineString" | "Polygon" | "MultiPolygon" | "MultiLineString";

export type LayerCategory = "admin" | "environnement" | "infrastructure" | "collecte_agrieco" | "collecte_fiere";

export interface LayerConfig {
  id: string;
  name: string;
  endpoint: string;
  category: LayerCategory;
  geometryType: GeometryType;
  visible: boolean; // Visible par défaut
  minZoom?: number;
  maxZoom?: number;
  cluster?: boolean; // Pour les points nombreux
  style: LayerStyle;
  popupFields: PopupField[];
  project?: "AGRIECO" | "FIERE" | "ALL"; // Filtre par projet
}

export interface LayerStyle {
  // Pour les polygones
  fillColor?: string;
  fillOpacity?: number;
  // Pour les lignes et contours
  color: string;
  weight?: number;
  opacity?: number;
  dashArray?: string;
  // Pour les points
  icon?: string; // Nom de l'icône Lucide ou URL
  iconColor?: string;
  iconSize?: number;
  markerShape?: "circle" | "square" | "diamond";
  // Clustering
  clusterColor?: string;
}

export interface PopupField {
  key: string;
  label: string;
  format?: "text" | "number" | "date" | "area" | "length" | "boolean";
  suffix?: string;
}

// ============================================================
// GROUPES DE COUCHES
// ============================================================

export interface LayerGroup {
  id: string;
  name: string;
  icon: string;
  collapsed: boolean;
  layers: string[]; // IDs des couches
}

export const LAYER_GROUPS: LayerGroup[] = [
  {
    id: "admin",
    name: "Limites administratives",
    icon: "Map",
    collapsed: false,
    layers: ["regions", "prefectures", "communes"],
  },
  {
    id: "environnement",
    name: "Environnement",
    icon: "TreePine",
    collapsed: true,
    layers: ["aires_protegees", "zones_humides", "zones_sableuses", "hydrographie", "occupation_sol"],
  },
  {
    id: "infrastructure",
    name: "Infrastructures",
    icon: "Building2",
    collapsed: true,
    layers: ["reseau_routier", "equipements", "localites", "agglomerations", "habitations_dispersees"],
  },
  {
    id: "collecte_agrieco",
    name: "Données AGRIECO",
    icon: "Leaf",
    collapsed: false,
    layers: [
      "cep_parcelles",
      "intrants",
      "tetes_sources",
      "stations_meteo",
      "ouvrages",
      "couloirs",
      "zones_degradees",
      "organisations",
      "menages",
      "comites",
      "marches",
    ],
  },
  {
    id: "collecte_fiere",
    name: "Données FIERE",
    icon: "GraduationCap",
    collapsed: false,
    layers: ["entreprises", "formations", "sortants", "emplois", "insertions"],
  },
];

// ============================================================
// COUCHES RÉFÉRENTIELLES (schéma ref)
// ============================================================

export const REF_LAYERS: LayerConfig[] = [
  // --- Limites administratives ---
  {
    id: "regions",
    name: "Régions",
    endpoint: "/data/carto/admin-region/",
    category: "admin",
    geometryType: "MultiPolygon",
    visible: true,
    minZoom: 0,
    maxZoom: 10,
    style: {
      color: "#1e40af",
      weight: 2.5,
      opacity: 1,
      fillColor: "#3b82f6",
      fillOpacity: 0.1,
      dashArray: "",
    },
    popupFields: [
      { key: "nom_region", label: "Région" },
      { key: "code_region", label: "Code" },
      { key: "superficie_km2", label: "Superficie", format: "area", suffix: "km²" },
      { key: "pays", label: "Pays" },
    ],
  },
  {
    id: "prefectures",
    name: "Préfectures",
    endpoint: "/data/carto/admin-prefecture/",
    category: "admin",
    geometryType: "MultiPolygon",
    visible: false,
    minZoom: 7,
    maxZoom: 12,
    style: {
      color: "#7c3aed",
      weight: 1.5,
      opacity: 0.9,
      fillColor: "#8b5cf6",
      fillOpacity: 0.08,
      dashArray: "5,5",
    },
    popupFields: [
      { key: "nom_prefecture", label: "Préfecture" },
      { key: "nom_region", label: "Région" },
      { key: "code_prefecture", label: "Code" },
    ],
  },
  {
    id: "communes",
    name: "Communes",
    endpoint: "/data/carto/admin-commune/",
    category: "admin",
    geometryType: "MultiPolygon",
    visible: false,
    minZoom: 9,
    style: {
      color: "#059669",
      weight: 1,
      opacity: 0.7,
      fillColor: "#10b981",
      fillOpacity: 0.05,
      dashArray: "3,3",
    },
    popupFields: [
      { key: "nom_commune", label: "Commune" },
      { key: "nom_prefecture", label: "Préfecture" },
      { key: "nom_region", label: "Région" },
    ],
  },

  // --- Environnement ---
  {
    id: "aires_protegees",
    name: "Aires protégées",
    endpoint: "/data/carto/aire-protegee/",
    category: "environnement",
    geometryType: "MultiPolygon",
    visible: false,
    style: {
      color: "#15803d",
      weight: 2,
      opacity: 1,
      fillColor: "#22c55e",
      fillOpacity: 0.3,
    },
    popupFields: [
      { key: "nom", label: "Nom" },
      { key: "type_aire", label: "Type" },
      { key: "superficie_ha", label: "Superficie", format: "area", suffix: "ha" },
      { key: "statut", label: "Statut" },
    ],
  },
  {
    id: "zones_humides",
    name: "Zones humides",
    endpoint: "/data/carto/zone-humide/",
    category: "environnement",
    geometryType: "MultiPolygon",
    visible: false,
    style: {
      color: "#0891b2",
      weight: 1.5,
      opacity: 0.8,
      fillColor: "#06b6d4",
      fillOpacity: 0.4,
    },
    popupFields: [
      { key: "nom", label: "Nom" },
      { key: "type_zone", label: "Type" },
      { key: "superficie_ha", label: "Superficie", format: "area", suffix: "ha" },
    ],
  },
  {
    id: "zones_sableuses",
    name: "Zones sableuses",
    endpoint: "/data/carto/zone-sableuse/",
    category: "environnement",
    geometryType: "MultiPolygon",
    visible: false,
    style: {
      color: "#d97706",
      weight: 1,
      opacity: 0.7,
      fillColor: "#fbbf24",
      fillOpacity: 0.4,
    },
    popupFields: [
      { key: "nom", label: "Nom" },
      { key: "superficie_ha", label: "Superficie", format: "area", suffix: "ha" },
    ],
  },
  {
    id: "hydrographie",
    name: "Hydrographie",
    endpoint: "/data/carto/hydrographie/",
    category: "environnement",
    geometryType: "MultiLineString",
    visible: false,
    style: {
      color: "#0ea5e9",
      weight: 2,
      opacity: 0.9,
    },
    popupFields: [
      { key: "nom", label: "Nom" },
      { key: "nom_fr", label: "Nom (FR)" },
      { key: "type_hydro", label: "Type" },
    ],
  },
  {
    id: "occupation_sol",
    name: "Occupation du sol",
    endpoint: "/data/carto/occupation-sol/",
    category: "environnement",
    geometryType: "MultiPolygon",
    visible: false,
    minZoom: 10,
    style: {
      color: "#65a30d",
      weight: 0.5,
      opacity: 0.5,
      fillColor: "#84cc16",
      fillOpacity: 0.35,
    },
    popupFields: [
      { key: "type_occupation", label: "Type" },
      { key: "superficie_ha", label: "Superficie", format: "area", suffix: "ha" },
    ],
  },

  // --- Infrastructures ---
  {
    id: "reseau_routier",
    name: "Réseau routier",
    endpoint: "/data/carto/reseau-routier/",
    category: "infrastructure",
    geometryType: "MultiLineString",
    visible: false,
    style: {
      color: "#ea580c",
      weight: 2.5,
      opacity: 0.9,
    },
    popupFields: [
      { key: "type_route", label: "Type" },
      { key: "etat_route", label: "État" },
      { key: "longueur_km", label: "Longueur", format: "length", suffix: "km" },
    ],
  },
  {
    id: "equipements",
    name: "Équipements publics",
    endpoint: "/data/carto/equipements/",
    category: "infrastructure",
    geometryType: "Point",
    visible: false,
    cluster: true,
    style: {
      color: "#0369a1",
      icon: "Building",
      iconColor: "#0369a1",
      iconSize: 18,
      markerShape: "square",
      clusterColor: "#0369a1",
    },
    popupFields: [
      { key: "nom", label: "Nom" },
      { key: "type_equipement", label: "Type" },
      { key: "commune_nom", label: "Commune" },
    ],
  },
  {
    id: "localites",
    name: "Localités",
    endpoint: "/data/carto/localites/",
    category: "infrastructure",
    geometryType: "Point",
    visible: false,
    cluster: true,
    style: {
      color: "#475569",
      icon: "MapPin",
      iconColor: "#475569",
      iconSize: 14,
      markerShape: "circle",
      clusterColor: "#475569",
    },
    popupFields: [
      { key: "nom_localite", label: "Localité" },
      { key: "type_localite", label: "Type" },
      { key: "population", label: "Population", format: "number" },
      { key: "commune_nom", label: "Commune" },
    ],
  },
  {
    id: "agglomerations",
    name: "Agglomérations",
    endpoint: "/data/carto/agglomerations/",
    category: "infrastructure",
    geometryType: "Polygon",
    visible: false,
    style: {
      color: "#f59e0b",
      weight: 1.5,
      opacity: 0.8,
      fillColor: "#fbbf24",
      fillOpacity: 0.2,
    },
    popupFields: [
      { key: "nom_agglomeration", label: "Agglomération" },
      { key: "superficie_ha", label: "Superficie", format: "area", suffix: "ha" },
      { key: "commune_nom", label: "Commune" },
    ],
  },
  {
    id: "habitations_dispersees",
    name: "Habitations dispersées",
    endpoint: "/data/carto/habitations-dispersees/",
    category: "infrastructure",
    geometryType: "Point",
    visible: false,
    cluster: true,
    style: {
      color: "#92400e",
      icon: "Home",
      iconColor: "#92400e",
      iconSize: 12,
      markerShape: "diamond",
      clusterColor: "#92400e",
    },
    popupFields: [
      { key: "nb_habitations", label: "Habitations", format: "number" },
      { key: "commune_nom", label: "Commune" },
    ],
  },
];

// ============================================================
// COUCHES COLLECTÉES (schéma core/marts)
// ============================================================

export const COLLECTED_LAYERS: LayerConfig[] = [
  // --- AGRIECO ---
  {
    id: "cep_parcelles",
    name: "CEP - Parcelles",
    endpoint: "/data/carto/agr-cep-parcelles/",
    category: "collecte_agrieco",
    geometryType: "Polygon",
    visible: false,
    project: "AGRIECO",
    style: {
      color: "#166534",
      weight: 1.5,
      opacity: 0.9,
      fillColor: "#4ade80",
      fillOpacity: 0.3,
    },
    popupFields: [
      { key: "code_parcelle", label: "Code" },
      { key: "geom_source_label", label: "Source emprise" },
      { key: "superficie_ha", label: "Superficie", format: "area", suffix: "ha" },
      { key: "culture_principale", label: "Culture" },
      { key: "commune_nom", label: "Commune" },
    ],
  },
  {
    id: "intrants",
    name: "Intrants distribués",
    endpoint: "/data/carto/agr-intrants/",
    category: "collecte_agrieco",
    geometryType: "Point",
    visible: false,
    cluster: true,
    project: "AGRIECO",
    style: {
      color: "#0f766e",
      icon: "Package",
      iconColor: "#0f766e",
      iconSize: 18,
      markerShape: "square",
      clusterColor: "#0f766e",
    },
    popupFields: [
      { key: "type_intrant", label: "Type" },
      { key: "quantite", label: "Quantité", format: "number" },
      { key: "unite_intrant", label: "Unité" },
      { key: "filiere_label", label: "Filière" },
      { key: "commune_nom", label: "Commune" },
    ],
  },
  {
    id: "tetes_sources",
    name: "Têtes de sources",
    endpoint: "/data/carto/agr-tetes-sources/",
    category: "collecte_agrieco",
    geometryType: "Point",
    visible: false,
    project: "AGRIECO",
    style: {
      color: "#0e7490",
      icon: "Droplets",
      iconColor: "#0e7490",
      iconSize: 16,
      markerShape: "diamond",
    },
    popupFields: [
      { key: "nom_source", label: "Source" },
      { key: "pop_desservie", label: "Population desservie", format: "number" },
      { key: "protection_exist", label: "Protection", format: "boolean" },
      { key: "commune_nom", label: "Commune" },
    ],
  },
  {
    id: "stations_meteo",
    name: "Stations météo",
    endpoint: "/data/carto/agr-stations-meteo/",
    category: "collecte_agrieco",
    geometryType: "Point",
    visible: false,
    project: "AGRIECO",
    style: {
      color: "#1d4ed8",
      icon: "CloudRain",
      iconColor: "#1d4ed8",
      iconSize: 20,
      markerShape: "square",
    },
    popupFields: [
      { key: "code_station", label: "Code" },
      { key: "type_station", label: "Type" },
      { key: "commune_nom", label: "Commune" },
    ],
  },
  {
    id: "ouvrages",
    name: "Ouvrages hydro-agricoles",
    endpoint: "/data/carto/agr-ouvrages/",
    category: "collecte_agrieco",
    geometryType: "Point",
    visible: false,
    project: "AGRIECO",
    style: {
      color: "#4f46e5",
      icon: "Wrench",
      iconColor: "#4f46e5",
      iconSize: 18,
      markerShape: "diamond",
    },
    popupFields: [
      { key: "type_ouvrage", label: "Type" },
      { key: "etat_ouvrage", label: "État" },
      { key: "longueur_anti_m", label: "Longueur antiérosive", format: "length", suffix: "m" },
      { key: "commune_nom", label: "Commune" },
    ],
  },
  {
    id: "couloirs",
    name: "Couloirs de transhumance",
    endpoint: "/data/carto/agr-couloirs/",
    category: "collecte_agrieco",
    geometryType: "LineString",
    visible: false,
    project: "AGRIECO",
    style: {
      color: "#a855f7",
      weight: 3,
      opacity: 0.8,
      dashArray: "8,8",
    },
    popupFields: [
      { key: "nom_couloir", label: "Couloir" },
      { key: "longueur_km", label: "Longueur", format: "length", suffix: "km" },
      { key: "commune_nom", label: "Commune" },
    ],
  },
  {
    id: "zones_degradees",
    name: "Zones dégradées",
    endpoint: "/data/carto/agr-zones-degradees/",
    category: "collecte_agrieco",
    geometryType: "Polygon",
    visible: false,
    project: "AGRIECO",
    style: {
      color: "#b91c1c",
      weight: 2,
      opacity: 0.9,
      fillColor: "#ef4444",
      fillOpacity: 0.3,
    },
    popupFields: [
      { key: "type_degradation", label: "Type" },
      { key: "surface_degradee_ha", label: "Surface dégradée", format: "area", suffix: "ha" },
      { key: "surface_restauree_ha", label: "Surface restaurée", format: "area", suffix: "ha" },
      { key: "commune_nom", label: "Commune" },
    ],
  },
  {
    id: "organisations",
    name: "Organisations (OP)",
    endpoint: "/data/carto/agr-organisations/",
    category: "collecte_agrieco",
    geometryType: "Point",
    visible: false,
    cluster: true,
    project: "AGRIECO",
    style: {
      color: "#7c3aed",
      icon: "Users",
      iconColor: "#7c3aed",
      iconSize: 18,
      markerShape: "circle",
      clusterColor: "#7c3aed",
    },
    popupFields: [
      { key: "nom_org", label: "Organisation" },
      { key: "type_org", label: "Type" },
      { key: "nb_membres", label: "Membres", format: "number" },
      { key: "commune_nom", label: "Commune" },
    ],
  },
  {
    id: "menages",
    name: "Ménages",
    endpoint: "/data/carto/agr-menages/",
    category: "collecte_agrieco",
    geometryType: "Point",
    visible: false,
    cluster: true,
    project: "AGRIECO",
    style: {
      color: "#be123c",
      icon: "Home",
      iconColor: "#be123c",
      iconSize: 16,
      markerShape: "square",
      clusterColor: "#be123c",
    },
    popupFields: [
      { key: "id_menage", label: "ID Ménage" },
      { key: "chef_menage", label: "Chef de ménage" },
      { key: "nb_personnes", label: "Personnes", format: "number" },
      { key: "commune_nom", label: "Commune" },
    ],
  },
  {
    id: "comites",
    name: "Comités",
    endpoint: "/data/carto/agr-comites/",
    category: "collecte_agrieco",
    geometryType: "Point",
    visible: false,
    cluster: true,
    project: "AGRIECO",
    style: {
      color: "#7c2d12",
      icon: "UsersRound",
      iconColor: "#7c2d12",
      iconSize: 18,
      markerShape: "circle",
      clusterColor: "#7c2d12",
    },
    popupFields: [
      { key: "nom_comite", label: "Comité" },
      { key: "type_comite_label", label: "Type" },
      { key: "statut_comite_label", label: "Statut" },
      { key: "nb_membres_total", label: "Membres", format: "number" },
      { key: "commune_nom", label: "Commune" },
    ],
  },
  {
    id: "marches",
    name: "Marchés",
    endpoint: "/data/carto/marches/",
    category: "collecte_agrieco",
    geometryType: "Point",
    visible: false,
    project: "AGRIECO",
    style: {
      color: "#c026d3",
      icon: "Store",
      iconColor: "#c026d3",
      iconSize: 20,
      markerShape: "diamond",
    },
    popupFields: [
      { key: "nom_marche", label: "Marché" },
      { key: "type_marche", label: "Type" },
      { key: "frequence_marche", label: "Fréquence" },
      { key: "commune_nom", label: "Commune" },
    ],
  },

  // --- FIERE ---
  {
    id: "entreprises",
    name: "Entreprises",
    endpoint: "/data/carto/entreprises/",
    category: "collecte_fiere",
    geometryType: "Point",
    visible: false,
    cluster: true,
    project: "FIERE",
    style: {
      color: "#1e40af",
      icon: "Building2",
      iconColor: "#1e40af",
      iconSize: 20,
      markerShape: "square",
      clusterColor: "#1e40af",
    },
    popupFields: [
      { key: "nom_entreprise", label: "Entreprise" },
      { key: "taille_entreprise", label: "Taille" },
      { key: "secteur_activite", label: "Secteur" },
      { key: "nb_employes", label: "Employés", format: "number" },
      { key: "commune_nom", label: "Commune" },
    ],
  },
  {
    id: "formations",
    name: "Centres de formation",
    endpoint: "/data/carto/formations/",
    category: "collecte_fiere",
    geometryType: "Point",
    visible: false,
    project: "FIERE",
    style: {
      color: "#b45309",
      icon: "GraduationCap",
      iconColor: "#b45309",
      iconSize: 22,
      markerShape: "diamond",
    },
    popupFields: [
      { key: "nom_centre", label: "Centre" },
      { key: "type_formation", label: "Type" },
      { key: "nb_apprenants", label: "Apprenants", format: "number" },
      { key: "commune_nom", label: "Commune" },
    ],
  },
  {
    id: "sortants",
    name: "Sortants (lieu insertion)",
    endpoint: "/data/carto/sortants/",
    category: "collecte_fiere",
    geometryType: "Point",
    visible: false,
    cluster: true,
    project: "FIERE",
    style: {
      color: "#15803d",
      icon: "UserCheck",
      iconColor: "#15803d",
      iconSize: 18,
      markerShape: "circle",
      clusterColor: "#15803d",
    },
    popupFields: [
      { key: "nom_sortant", label: "Nom" },
      { key: "filiere", label: "Filière" },
      { key: "statut_insertion", label: "Statut" },
      { key: "type_insertion", label: "Type insertion" },
      { key: "commune_nom", label: "Commune" },
    ],
  },
  {
    id: "emplois",
    name: "Emplois par domaine",
    endpoint: "/data/carto/fiere-emplois/",
    category: "collecte_fiere",
    geometryType: "Point",
    visible: false,
    cluster: true,
    project: "FIERE",
    style: {
      color: "#1d4ed8",
      icon: "Briefcase",
      iconColor: "#1d4ed8",
      iconSize: 18,
      markerShape: "square",
      clusterColor: "#1d4ed8",
    },
    popupFields: [
      { key: "raison_sociale", label: "Entreprise" },
      { key: "domaine_label", label: "Domaine" },
      { key: "nb_empl_dom", label: "Emplois", format: "number" },
      { key: "commune_nom", label: "Commune" },
    ],
  },
  {
    id: "insertions",
    name: "Insertions par domaine",
    endpoint: "/data/carto/fiere-insertions/",
    category: "collecte_fiere",
    geometryType: "Point",
    visible: false,
    cluster: true,
    project: "FIERE",
    style: {
      color: "#15803d",
      icon: "TrendingUp",
      iconColor: "#15803d",
      iconSize: 18,
      markerShape: "diamond",
      clusterColor: "#15803d",
    },
    popupFields: [
      { key: "raison_sociale", label: "Entreprise" },
      { key: "domaine_label", label: "Domaine" },
      { key: "type_insertion_label", label: "Type insertion" },
      { key: "nb_ins_dom", label: "Insertions", format: "number" },
      { key: "commune_nom", label: "Commune" },
    ],
  },
];

// ============================================================
// HELPERS
// ============================================================

/**
 * Récupère toutes les couches
 */
export function getAllLayers(): LayerConfig[] {
  return [...REF_LAYERS, ...COLLECTED_LAYERS].filter(
    (layer): layer is LayerConfig => Boolean(layer && (layer as LayerConfig).id)
  );
}

/**
 * Récupère une couche par son ID
 */
export function getLayerById(id: string): LayerConfig | undefined {
  return getAllLayers().find((layer) => layer.id === id);
}

/**
 * Récupère les couches par catégorie
 */
export function getLayersByCategory(category: LayerCategory): LayerConfig[] {
  return getAllLayers().filter((layer) => layer.category === category);
}

/**
 * Récupère les couches pour un projet donné
 */
export function getLayersForProject(projectCode: string): LayerConfig[] {
  const isAgrieco = projectCode.toUpperCase().includes("AGRIECO");
  const isFiere = projectCode.toUpperCase().includes("FIERE");

  return getAllLayers().filter((layer) => {
    if (!layer) return false;
    // Les couches ref sont toujours visibles
    if (!layer.project || layer.project === "ALL") return true;
    // Filtrer par projet
    if (isAgrieco && layer.project === "AGRIECO") return true;
    if (isFiere && layer.project === "FIERE") return true;
    return false;
  });
}

/**
 * Récupère les groupes de couches pour un projet
 */
export function getLayerGroupsForProject(projectCode: string): LayerGroup[] {
  const isAgrieco = projectCode.toUpperCase().includes("AGRIECO");
  const isFiere = projectCode.toUpperCase().includes("FIERE");

  return LAYER_GROUPS.filter((group) => {
    if (group.id === "collecte_agrieco" && !isAgrieco) return false;
    if (group.id === "collecte_fiere" && !isFiere) return false;
    return true;
  });
}

// ============================================================
// FONDS DE CARTE (BASEMAPS)
// ============================================================

export interface BasemapConfig {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  crossOrigin?: boolean;
  thumbnail?: string;
}

export const BASEMAPS: BasemapConfig[] = [
  {
    id: "osm",
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
    crossOrigin: true,
  },
  {
    id: "osm_fr",
    name: "OSM France",
    url: "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> France',
    maxZoom: 20,
    crossOrigin: true,
  },
  {
    id: "satellite",
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    maxZoom: 18,
    crossOrigin: true,
  },
  {
    id: "terrain",
    name: "Terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
    crossOrigin: true,
  },
  {
    id: "light",
    name: "Clair",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
    crossOrigin: true,
  },
  {
    id: "dark",
    name: "Sombre",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
    crossOrigin: true,
  },
];

// ============================================================
// CONFIGURATION CARTE GUINÉE
// ============================================================

export const MAP_CONFIG = {
  // Centre de la Guinée
  center: {
    lat: 10.0,
    lng: -11.0,
  },
  // Zoom initial
  defaultZoom: 7,
  minZoom: 5,
  maxZoom: 18,
  // Bounds de la Guinée (pour contraindre la vue)
  bounds: {
    southWest: { lat: 7.0, lng: -15.5 },
    northEast: { lat: 12.7, lng: -7.5 },
  },
  // Contrôles de zoom
  showZoomControl: false,
  zoomControlPosition: "topright" as const,
};





