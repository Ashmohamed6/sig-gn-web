// app/no-project/page.tsx
"use client";

import { useRouter } from "next/navigation";

export default function NoProjectPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#050B1A] text-white grid place-items-center px-6">
      <div className="max-w-xl w-full rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-bold">Aucun projet associé à ce compte</h1>
        <p className="mt-2 text-sm text-white/70">
          Votre compte est bien authentifié, mais aucun projet n’est retourné par <code>/api/accounts/me/</code>.
          Vérifiez l’affectation du projet FIERE à l’utilisateur (voir ci-dessous).
        </p>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => router.replace("/login")}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-700"
          >
            Retour login
          </button>
          <button
            onClick={() => router.replace("/dashboard")}
            className="rounded-xl border border-white/20 bg-black/20 px-4 py-2 text-sm font-semibold hover:bg-black/30"
          >
            Aller au dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
