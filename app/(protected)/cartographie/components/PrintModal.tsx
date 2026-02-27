// app/(protected)/cartographie/components/PrintModal.tsx

"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  X,
  Printer,
  Download,
  FileImage,
  FileText,
  Loader2,
  Upload,
  Trash2,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Type,
  MapPin,
  Building2,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================

export interface PrintConfig {
  // En-tête officiel
  region: string;
  titreThematique: string;
  
  // Informations complémentaires
  author: string;
  date: string;
  
  // Options de mise en page
  orientation: "landscape" | "portrait";
  format: "pdf" | "jpg" | "png";
  quality: "standard" | "high" | "ultra";
  
  // Éléments à afficher
  showLegend: boolean;
  showScaleBar: boolean;
  showNorthArrow: boolean;
  showCoordinates: boolean;
  showMiniMapEnabel: boolean;
  
  // Logos
  logosStructure: LogoConfig[];
  
  // Notes
  customNotes: string;
}

export interface LogoConfig {
  id: string;
  name: string;
  dataUrl: string;
  position: "header-left" | "header-right" | "footer-left" | "footer-right";
}

interface LayerForLegend {
  id: string;
  name: string;
  color: string;
  type?: "point" | "line" | "polygon";
  legendPreviewHtml?: string;
}

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: (config: PrintConfig) => Promise<void>;
  visibleLayers: LayerForLegend[];
  projectName: string;
  regionOptions: string[];
}

// ============================================================
// DEFAULT CONFIG
// ============================================================

const DEFAULT_CONFIG: PrintConfig = {
  region: "",
  titreThematique: "",
  author: "",
  date: new Date().toLocaleDateString("fr-FR"),
  orientation: "landscape",
  format: "pdf",
  quality: "high",
  showLegend: true,
  showScaleBar: true,
  showNorthArrow: true,
  showCoordinates: true,
  showMiniMapEnabel: true,
  logosStructure: [],
  customNotes: "",
};

// ============================================================
// COMPONENT
// ============================================================

export default function PrintModal({
  isOpen,
  onClose,
  onPrint,
  visibleLayers,
  projectName,
  regionOptions,
}: PrintModalProps) {
  const [config, setConfig] = useState<PrintConfig>({
    ...DEFAULT_CONFIG,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"header" | "layout" | "logos">("header");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const normalizedRegionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (regionOptions || [])
            .map((value) => String(value || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" })),
    [regionOptions]
  );
  const singleRegion = normalizedRegionOptions.length === 1 ? normalizedRegionOptions[0] : "";
  const isSingleRegionLocked = Boolean(singleRegion);

  useEffect(() => {
    if (!isOpen || !singleRegion) return;
    setConfig((prev) => (prev.region === singleRegion ? prev : { ...prev, region: singleRegion }));
  }, [isOpen, singleRegion]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleChange = useCallback(
    (field: keyof PrintConfig, value: any) => {
      setConfig((prev) => ({ ...prev, [field]: value }));
      setError(null);
      setSuccess(false);
    },
    []
  );

  const handleLogoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      if (config.logosStructure.length >= 2) {
        setError("Maximum 2 logos de structure autorisés");
        return;
      }

      Array.from(files).forEach((file) => {
        if (!file.type.startsWith("image/")) {
          setError("Seules les images sont acceptées");
          return;
        }

        if (file.size > 2 * 1024 * 1024) {
          setError("La taille maximum est de 2 Mo par logo");
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          const newLogo: LogoConfig = {
            id: `logo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            dataUrl,
            position: config.logosStructure.length === 0 ? "footer-left" : "footer-right",
          };

          setConfig((prev) => ({
            ...prev,
            logosStructure: [...prev.logosStructure, newLogo].slice(0, 2),
          }));
        };
        reader.readAsDataURL(file);
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [config.logosStructure.length]
  );

  const handleRemoveLogo = useCallback((logoId: string) => {
    setConfig((prev) => ({
      ...prev,
      logosStructure: prev.logosStructure.filter((l) => l.id !== logoId),
    }));
  }, []);

  const handleReset = useCallback(() => {
    setConfig({
      ...DEFAULT_CONFIG,
      region: singleRegion || "",
    });
    setError(null);
    setSuccess(false);
  }, [singleRegion]);

  const handleGenerate = useCallback(async () => {
    // Validations
    if (normalizedRegionOptions.length === 0) {
      setError("Aucune région disponible pour votre compte");
      return;
    }
    if (!config.region) {
      setError("Veuillez sélectionner une région");
      return;
    }
    if (!config.titreThematique.trim()) {
      setError("Le titre de la carte thématique est obligatoire");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      await onPrint(config);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la génération");
    } finally {
      setIsGenerating(false);
    }
  }, [config, normalizedRegionOptions.length, onPrint]);

  // ============================================================
  // RENDER
  // ============================================================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#009639] via-[#FFCD00] to-[#CE1126] text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Printer className="h-6 w-6" />
              <div>
                <h2 className="text-lg font-semibold">Exporter la carte</h2>
                <p className="text-sm text-white/80">
                  Format officiel République de Guinée
                </p>
                <p className="text-xs text-white/70 truncate max-w-[26rem]">
                  Projet : {projectName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 border-b border-slate-200">
          <div className="flex">
            {[
              { id: "header", label: "En-tête & Titre", icon: Type },
              { id: "layout", label: "Mise en page", icon: FileText },
              { id: "logos", label: "Logos structure", icon: Building2 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? "border-[#009639] text-[#009639]"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab: En-tête & Titre */}
          {activeTab === "header" && (
            <div className="space-y-6">
              {/* Aperçu de l’en-tête */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs text-slate-500 mb-3 uppercase tracking-wide">Aperçu de l’en-tête</p>
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center text-xs text-slate-400">
                      Logo GN
                    </div>
                    <div className="text-center flex-1 px-4">
                      <p className="font-bold text-black text-sm">RÉPUBLIQUE DE GUINÉE</p>
                      <p className="font-bold text-black text-sm">
                        Région de {config.region || "___________"}
                      </p>
                      <p className="font-bold text-red-600 text-sm mt-1">
                        Carte thématique : {config.titreThematique || "___________"}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center text-xs text-slate-400">
                      Logo GN
                    </div>
                  </div>
                </div>
              </div>

              {/* Région */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Région *
                </label>
                <select
                  value={config.region}
                  onChange={(e) => handleChange("region", e.target.value)}
                  disabled={isSingleRegionLocked || normalizedRegionOptions.length === 0}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#009639] focus:border-[#009639] transition-all"
                >
                  <option value="">Sélectionner une région</option>
                  {normalizedRegionOptions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
                {isSingleRegionLocked && (
                  <p className="text-xs text-emerald-700 mt-1">
                    Région imposée par le profil utilisateur : {singleRegion}
                  </p>
                )}
                {!isSingleRegionLocked && normalizedRegionOptions.length > 1 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Compte multi-régions : choisissez la région de sortie.
                  </p>
                )}
              </div>

              {/* Titre thématique */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Type className="h-4 w-4 inline mr-1" />
                  Titre de la carte thématique *
                </label>
                <input
                  type="text"
                  value={config.titreThematique}
                  onChange={(e) => handleChange("titreThematique", e.target.value)}
                  placeholder="Ex: Parcelles CEP et couloirs de transhumance"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#009639] focus:border-[#009639] transition-all"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Ce titre apparaîtra en rouge gras sous « Carte thématique : »
                </p>
              </div>

              {/* Auteur et Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Réalisateur
                  </label>
                  <input
                    type="text"
                    value={config.author}
                    onChange={(e) => handleChange("author", e.target.value)}
                    placeholder="Votre nom"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#009639] focus:border-[#009639] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Date
                  </label>
                  <input
                    type="text"
                    value={config.date}
                    onChange={(e) => handleChange("date", e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#009639] focus:border-[#009639] transition-all"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Notes / Commentaires (optionnel)
                </label>
                <textarea
                  value={config.customNotes}
                  onChange={(e) => handleChange("customNotes", e.target.value)}
                  placeholder="Informations supplémentaires..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#009639] focus:border-[#009639] transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* Tab: Mise en page */}
          {activeTab === "layout" && (
            <div className="space-y-6">
              {/* Orientation */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Orientation
                </label>
                <div className="flex gap-3">
                  {[
                    { value: "landscape", label: "Paysage (A4)", icon: "H" },
                    { value: "portrait", label: "Portrait (A4)", icon: "V" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleChange("orientation", opt.value)}
                      className={`flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                        config.orientation === opt.value
                          ? "border-[#009639] bg-green-50 text-[#009639]"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-2xl">{opt.icon}</span>
                      <span className="font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Format de sortie */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Format de sortie
                </label>
                <div className="flex gap-3">
                  {[
                    { value: "pdf", label: "PDF", icon: FileText },
                    { value: "jpg", label: "JPG", icon: FileImage },
                    { value: "png", label: "PNG", icon: FileImage },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleChange("format", opt.value)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        config.format === opt.value
                          ? "border-[#009639] bg-green-50 text-[#009639]"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <opt.icon className="h-5 w-5" />
                      <span className="font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Qualité */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Qualité d’export
                </label>
                <div className="flex gap-3">
                  {[
                    { value: "standard", label: "Standard", desc: "150 DPI - Rapide" },
                    { value: "high", label: "Haute", desc: "300 DPI - Recommandé" },
                    { value: "ultra", label: "Ultra", desc: "600 DPI - Impression pro" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleChange("quality", opt.value)}
                      className={`flex-1 flex flex-col items-center px-4 py-3 rounded-lg border-2 transition-all ${
                        config.quality === opt.value
                          ? "border-[#009639] bg-green-50 text-[#009639]"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-xs text-slate-500">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Options d'affichage */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Éléments à afficher
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "showLegend", label: "Légende des couches" },
                    { key: "showScaleBar", label: "Barre d'échelle" },
                    { key: "showNorthArrow", label: "Flèche Nord" },
                    { key: "showCoordinates", label: "Coordonnées" },
                    { key: "showMiniMapEnabel", label: "Logo Enabel (partenaire)" },
                  ].map((opt) => (
                    <label
                      key={opt.key}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={config[opt.key as keyof PrintConfig] as boolean}
                        onChange={(e) =>
                          handleChange(opt.key as keyof PrintConfig, e.target.checked)
                        }
                        className="w-4 h-4 text-[#009639] rounded focus:ring-[#009639]"
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Aperçu légende */}
              {config.showLegend && visibleLayers.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    Couches dans la légende ({visibleLayers.length})
                  </p>
                  <div className="space-y-2">
                    {visibleLayers.map((layer) => (
                      <div
                        key={layer.id}
                        className="flex items-center gap-2 px-2 py-1 bg-white rounded text-xs border border-slate-200"
                      >
                        {layer.legendPreviewHtml ? (
                          <span
                            className="inline-flex h-7 w-8 items-center justify-center shrink-0"
                            dangerouslySetInnerHTML={{ __html: layer.legendPreviewHtml }}
                          />
                        ) : (
                          <span
                            className="inline-flex h-4 w-4 rounded-sm shrink-0"
                            style={{ backgroundColor: layer.color }}
                          />
                        )}
                        <span className="truncate">{layer.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info source */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Source :</strong> Dispositif SIG (ajouté automatiquement)
                </p>
              </div>
            </div>
          )}

          {/* Tab: Logos structure */}
          {activeTab === "logos" && (
            <div className="space-y-6">
              {/* Info Enabel */}
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center border border-orange-200">
                    <span className="text-xs text-orange-600 font-bold">ENABEL</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-orange-800">Logo Enabel</p>
                    <p className="text-xs text-orange-600 mt-1">
                      Le logo Enabel sera automatiquement ajouté en miniature pour indiquer 
                      que ce dispositif SIG a été mis en place grâce au partenariat avec Enabel.
                    </p>
                    <label className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        checked={config.showMiniMapEnabel}
                        onChange={(e) => handleChange("showMiniMapEnabel", e.target.checked)}
                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <span className="text-sm text-orange-700">Afficher le logo Enabel</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Upload zone logos structure */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Logos de votre structure (max 2)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    config.logosStructure.length >= 2
                      ? "border-slate-200 bg-slate-50 cursor-not-allowed"
                      : "border-slate-300 hover:border-[#009639] hover:bg-green-50/50"
                  }`}
                >
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 font-medium">
                    {config.logosStructure.length >= 2
                      ? "Maximum atteint (2 logos)"
                      : "Cliquez pour ajouter le logo de votre structure"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    PNG, JPG - Max 2 Mo
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={config.logosStructure.length >= 2}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Liste des logos structure */}
              {config.logosStructure.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">
                    Logos ajoutés ({config.logosStructure.length}/2)
                  </p>
                  {config.logosStructure.map((logo, index) => (
                    <div
                      key={logo.id}
                      className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="w-14 h-14 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
                        <img
                          src={logo.dataUrl}
                          alt={logo.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700 truncate">
                          {logo.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          Position : {index === 0 ? "Gauche" : "Droite"} du pied de page
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveLogo(logo.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Aperçu disposition */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs text-slate-500 mb-3 uppercase tracking-wide">
                  Aperçu du pied de page
                </p>
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {config.logosStructure[0] ? (
                        <img
                          src={config.logosStructure[0].dataUrl}
                          alt=""
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-400">
                          ?
                        </div>
                      )}
                      <span className="text-slate-500">Source : Dispositif SIG</span>
                    </div>
                    <div className="text-slate-500">
                      {config.author || "Réalisateur"} - {config.date}
                    </div>
                    <div className="flex items-center gap-2">
                      {config.showMiniMapEnabel && (
                        <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                          <span className="text-[6px] text-orange-600 font-bold">ENABEL</span>
                        </div>
                      )}
                      {config.logosStructure[1] ? (
                        <img
                          src={config.logosStructure[1].dataUrl}
                          alt=""
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-400">
                          ?
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-200 p-4 bg-slate-50">
          {/* Messages */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm mb-3 p-2 bg-red-50 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-green-600 text-sm mb-3 p-2 bg-green-50 rounded-lg">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              Export généré avec succès !
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 px-6 py-2 bg-[#009639] hover:bg-[#007a2f] disabled:bg-[#009639]/50 text-white rounded-lg transition-colors"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Exporter en {config.format.toUpperCase()}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


