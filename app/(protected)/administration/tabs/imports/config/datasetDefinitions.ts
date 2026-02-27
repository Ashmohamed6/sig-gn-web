export type ProjectCode = "AGRIECO" | "FIERE";

export interface DatasetDefinition {
  datasetCode: string;
  label: string;
  description: string;
  projects: ProjectCode[];
  stageTable?: string;
}

export const DATASET_DEFINITIONS: DatasetDefinition[] = [
  {
    datasetCode: "agr-menages",
    label: "Menages sensibilisation",
    description: "Menages, sensibilisation et pratiques agroecologiques",
    projects: ["AGRIECO"],
  },
  {
    datasetCode: "agr-organisations",
    label: "Organisations producteurs",
    description: "Organisations de producteurs et activites",
    projects: ["AGRIECO"],
  },
  {
    datasetCode: "agr-comites",
    label: "Comites",
    description: "Comites locaux de gouvernance",
    projects: ["AGRIECO"],
  },
  {
    datasetCode: "cep-parcelles",
    label: "Parcelles CEP",
    description: "Parcelles CEP et suivi rendement",
    projects: ["AGRIECO"],
  },
  {
    datasetCode: "agr-pratiques-rendements",
    label: "Pratiques agro",
    description: "Pratiques agroecologiques et rendements",
    projects: ["AGRIECO"],
  },
  {
    datasetCode: "agr-intrants-comptoirs",
    label: "Intrants et comptoirs",
    description: "Distribution intrants et comptoirs agricoles",
    projects: ["AGRIECO"],
  },
  {
    datasetCode: "agr-ouvrages",
    label: "Ouvrages",
    description: "Ouvrages hydro-agricoles",
    projects: ["AGRIECO"],
  },
  {
    datasetCode: "agr-couloirs",
    label: "Couloirs",
    description: "Couloirs de transhumance",
    projects: ["AGRIECO"],
  },
  {
    datasetCode: "agr-stations-pluie",
    label: "Stations meteo",
    description: "Stations meteorologiques",
    projects: ["AGRIECO"],
  },
  {
    datasetCode: "agr-mesures-meteo",
    label: "Mesures meteo",
    description: "Mesures meteorologiques terrain",
    projects: ["AGRIECO"],
  },
  {
    datasetCode: "agr-tetes-sources",
    label: "Tetes de source",
    description: "Tetes de source et protection",
    projects: ["AGRIECO"],
  },
  {
    datasetCode: "agr-zones-degradees",
    label: "Zones degradees",
    description: "Zones degradees et restauration",
    projects: ["AGRIECO"],
  },
  {
    datasetCode: "agr-marches",
    label: "Marches",
    description: "Marches et dynamique locale",
    projects: ["AGRIECO"],
  },
  {
    datasetCode: "fiere-suivi-sortants",
    label: "Suivi sortants",
    description: "Suivi insertion des sortants de formation",
    projects: ["FIERE"],
  },
  {
    datasetCode: "fiere-entreprises",
    label: "Entreprises",
    description: "Entreprises et unites economiques",
    projects: ["FIERE"],
  },
  {
    datasetCode: "fiere-formations",
    label: "Formations",
    description: "Formations et renforcement des capacites",
    projects: ["FIERE"],
  },
  {
    datasetCode: "fiere-emploi-insertion",
    label: "Emploi / insertion",
    description: "Suivi emploi et insertion professionnelle",
    projects: ["FIERE"],
  },
  {
    datasetCode: "fiere-participation",
    label: "Participation acteurs",
    description: "Participation aux dispositifs d'appui",
    projects: ["FIERE"],
  },
];

export function normalizeProjectCode(raw: string | null | undefined): ProjectCode | null {
  const value = String(raw || "").trim().toUpperCase();
  if (value === "AGRIECO" || value === "FIERE") {
    return value;
  }
  return null;
}

export function getDatasetsForProject(projectCode: string | null | undefined): DatasetDefinition[] {
  const normalized = normalizeProjectCode(projectCode);
  if (!normalized) {
    return [];
  }
  return DATASET_DEFINITIONS.filter((dataset) => dataset.projects.includes(normalized));
}

export function getDatasetDefinitionByCode(datasetCode: string | null | undefined): DatasetDefinition | null {
  const normalized = String(datasetCode || "").trim().toLowerCase();
  if (!normalized) return null;
  return (
    DATASET_DEFINITIONS.find(
      (dataset) => dataset.datasetCode.toLowerCase() === normalized
    ) || null
  );
}
