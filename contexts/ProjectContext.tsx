"use client";

import { createContext, useContext, useState } from "react";

export type Project = {
  project_id: string;
  code_fonc: string;
  libelle_public: string;
  actif: boolean;
};

interface ProjectContextType {
  project: Project;
  setProject: (project: Project) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({
  initialProject,
  children,
}: {
  initialProject: Project;
  children: React.ReactNode;
}) {
  const [project, setProject] = useState<Project>(initialProject);

  return (
    <ProjectContext.Provider value={{ project, setProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useActiveProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useActiveProject must be used inside ProjectProvider");
  }
  return ctx;
}
