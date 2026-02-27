import { Suspense } from "react";
import ProjectSelectionContent from "./ProjectSelectionContent";

function LoadingFallback() {
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
          <div className="flex items-center gap-3">
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
            </div>
          </div>
        </div>
      </div>

      {/* Loading spinner */}
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600"></div>
          <p className="mt-6 text-lg text-white/80">Chargement des projets...</p>
        </div>
      </div>
    </div>
  );
}

export default function ProjectSelectionPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ProjectSelectionContent />
    </Suspense>
  );
}