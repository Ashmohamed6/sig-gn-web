// app/(protected)/dashboard/components/ExportDashboard.tsx
"use client";

import React, { useState } from "react";
import { Download, FileSpreadsheet, Image, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

interface ExportDashboardProps {
  data: {
    agrieco?: any;
    fiere?: any;
  };
  projectName?: string;
}

export default function ExportDashboard({ data, projectName }: ExportDashboardProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<"csv" | "image" | null>(null);

  // Export CSV
  const handleExportCSV = () => {
    setIsExporting(true);
    setExportType("csv");

    try {
      const csvContent = generateCSV(data);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", `dashboard_${projectName || "stats"}_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur inconnue";
      alert(`Erreur lors de l'export CSV: ${msg}`);
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  // Export Image (PNG)
  const handleExportImage = async () => {
    setIsExporting(true);
    setExportType("image");

    try {
      const dashboardElement = document.getElementById("dashboard-content");
      if (!dashboardElement) {
        throw new Error("Élément #dashboard-content introuvable dans le DOM");
      }

      const canvas = await html2canvas(dashboardElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#020617",
        logging: false,
        windowWidth: dashboardElement.scrollWidth,
        windowHeight: dashboardElement.scrollHeight,
      } as any);

      canvas.toBlob((blob) => {
        if (!blob) {
          alert("Erreur: impossible de générer l'image PNG");
          setIsExporting(false);
          setExportType(null);
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `dashboard_${projectName || "stats"}_${new Date().toISOString().split("T")[0]}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setIsExporting(false);
        setExportType(null);
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur inconnue";
      alert(`Erreur lors de l'export PNG: ${msg}`);
      setIsExporting(false);
      setExportType(null);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleExportCSV}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg transition-colors text-sm font-medium"
      >
        {isExporting && exportType === "csv" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Export...
          </>
        ) : (
          <>
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </>
        )}
      </button>

      <button
        onClick={handleExportImage}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors text-sm font-medium"
      >
        {isExporting && exportType === "image" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Export...
          </>
        ) : (
          <>
            <Image className="h-4 w-4" />
            Export PNG
          </>
        )}
      </button>
    </div>
  );
}

// Génération CSV
function generateCSV(data: any): string {
  const lines: string[] = [];
  const date = new Date().toLocaleDateString("fr-FR");

  lines.push(`"Tableau de Bord - Statistiques Export","Date: ${date}"`);
  lines.push("");

  // Section Agri-Eco
  if (data.agrieco) {
    lines.push("=== AGRICULTURE & ENVIRONNEMENT ===");
    lines.push("");

    // Ménages
    if (data.agrieco.menages?.global) {
      const g = data.agrieco.menages.global;
      lines.push('"Indicateur","Valeur"');
      lines.push(`"Total ménages","${g.total_menages || 0}"`);
      lines.push(`"Ménages pratiquant agroécologie","${g.nb_menages_prat_agroeco || 0}"`);
      lines.push(`"Séances sensibilisation","${g.total_seances_sensib || 0}"`);
      lines.push(`"Foyers améliorés","${g.nb_menages_foyers_ameliores || 0}"`);
      lines.push(`"Ruches","${g.nb_ruches || 0}"`);
      lines.push("");
    }

    if (data.agrieco.menages?.by_region && Array.isArray(data.agrieco.menages.by_region)) {
      lines.push('"Région","Total Ménages","Ménages Agroécologie"');
      data.agrieco.menages.by_region.forEach((r: any) => {
        lines.push(`"${r.region_nom || "N/A"}","${r.total_menages || 0}","${r.nb_menages_prat_agroeco || 0}"`);
      });
      lines.push("");
    }

    // Organisations
    if (data.agrieco.organisations?.global) {
      const g = data.agrieco.organisations.global;
      lines.push('"Organisation","Valeur"');
      lines.push(`"Total organisations","${g.total_organisations || 0}"`);
      lines.push(`"OP identifiées","${g.nb_op || 0}"`);
      lines.push(`"Emplois verts","${g.total_emplois_verts || 0}"`);
      lines.push(`"Groupements éleveurs","${g.nb_groupements_eleveurs || 0}"`);
      lines.push(`"Bovins","${g.total_bovins || 0}"`);
      lines.push(`"Ovins","${g.total_ovins || 0}"`);
      lines.push(`"Caprins","${g.total_caprins || 0}"`);
      lines.push("");
    }

    // Comités
    if (data.agrieco.comites?.global) {
      const g = data.agrieco.comites.global;
      lines.push('"Comités","Valeur"');
      lines.push(`"Total comités","${g.total_comites || 0}"`);
      lines.push(`"Comités feux","${g.nb_comites_feux || 0}"`);
      lines.push(`"Conflits résolus","${g.total_conflits_regles || 0}"`);
      lines.push(`"Techniciens formés","${g.nb_techniciens_formes || 0}"`);
      lines.push("");
    }

    // Parcelles
    if (data.agrieco.parcelles?.global) {
      const g = data.agrieco.parcelles.global;
      lines.push('"Parcelles CEP","Valeur"');
      lines.push(`"Total parcelles","${g.total_parcelles || 0}"`);
      lines.push(`"Surface totale (ha)","${g.total_surface_decl_ha?.toFixed(2) || 0}"`);
      lines.push(`"Rendement moyen (kg/ha)","${g.rendement_moyen?.toFixed(2) || 0}"`);
      lines.push("");
    }

    // Sources et environnement
    if (data.agrieco.sources?.global) {
      const g = data.agrieco.sources.global;
      lines.push('"Sources & Eau","Valeur"');
      lines.push(`"Sources aménagées","${g.nb_sources_amenagees || 0}"`);
      lines.push(`"Accès eau potable (%)","${g.taux_acces_eau_potable_pct?.toFixed(1) || 0}"`);
      lines.push("");
    }

    if (data.agrieco.zones?.global) {
      const g = data.agrieco.zones.global;
      lines.push('"Zones & Environnement","Valeur"');
      lines.push(`"Zones restaurées (ha)","${g.surface_zone_restauree_ha?.toFixed(2) || 0}"`);
      lines.push(`"Zones dégradées (ha)","${g.surface_zone_degradee_ha?.toFixed(2) || 0}"`);
      lines.push("");
    }
  }

  // Section Fiere
  if (data.fiere) {
    lines.push("=== FORMATION & ENTREPRENEURIAT ===");
    lines.push("");

    // Formations
    if (data.fiere.formations?.global) {
      const g = data.fiere.formations.global;
      lines.push('"Formation","Valeur"');
      lines.push(`"Total sessions","${g.total_sessions || 0}"`);
      lines.push(`"Total participants","${g.total_participants || 0}"`);
      lines.push(`"Dont femmes","${g.total_femmes || 0}"`);
      lines.push(`"Dont jeunes","${g.total_jeunes || 0}"`);
      lines.push(`"Sortants","${g.nb_sortants || 0}"`);
      lines.push("");
    }

    // Entreprises
    if (data.fiere.entreprises?.global) {
      const g = data.fiere.entreprises.global;
      lines.push('"Entreprises","Valeur"');
      lines.push(`"Total entreprises","${g.total_entreprises || 0}"`);
      lines.push(`"Entreprises actives","${g.nb_actives || 0}"`);
      lines.push(`"Emplois créés","${g.total_emplois_crees || 0}"`);
      lines.push("");
    }

    // Insertions
    if (data.fiere.insertions?.global) {
      const g = data.fiere.insertions.global;
      lines.push('"Insertions","Valeur"');
      lines.push(`"Total insertions","${g.total_insertions || 0}"`);
      lines.push(`"Insertions réussies","${g.nb_insertions_reussies || 0}"`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
