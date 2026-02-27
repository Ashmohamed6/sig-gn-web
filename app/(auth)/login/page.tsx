'use client';

import React from 'react';
import Image from 'next/image';
import { useLogin } from '@/hooks/useLogin';

const BACKGROUNDS = [
  '/image/login/kindia_login_back2.jpg',
  '/image/login/mamou_login_back2.jpg',
];

export default function LoginScreen() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [currentIdx, setCurrentIdx] = React.useState(0);

  const {
    mutate: login,
    isPending,
    isError,
    error,
  } = useLogin();

  // Diaporama de fond
  React.useEffect(() => {
    const interval = setInterval(
      () => setCurrentIdx((prev) => (prev + 1) % BACKGROUNDS.length),
      8000
    );
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, password });
  };

  return (
    <div className="relative h-screen overflow-hidden">
      {/* 🔁 Arrière-plan plein écran */}
      <div className="absolute inset-0 -z-10">
        {BACKGROUNDS.map((src, index) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            priority={index === 0}
            className={`object-cover transition-opacity duration-1000 ease-in-out ${
              index === currentIdx ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
      </div>

      {/* Contenu centré */}
      <div className="relative z-10 flex h-full items-center justify-center px-4 py-4">
        <div className="w-full max-w-md space-y-4">
          {/* Logo et titre */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-3 bg-white/80 rounded-full p-2 shadow">
              <Image
                src="/armoirie-446x500.png"
                alt="Logo"
                width={96}      // ← plus petit
                height={96}
              />
            </div>

            {/* Petit bloc blanc derrière les textes pour lisibilité */}
            <div className="inline-block px-4 py-2 rounded-full bg-white/80 shadow">
              <h1 className="text-xl font-semibold text-gray-900">
                Dispositif SIG
              </h1>
              <p className="text-xs font-medium text-gray-700 tracking-wide">
                FIERE &amp; AGRIECO
              </p>
            </div>
          </div>

          {/* Carte de connexion */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2 text-center">
              Bienvenue
            </h2>
            <p className="text-sm text-gray-600 mb-4 text-center">
              Connectez-vous pour accéder à la plateforme WebSIG.
            </p>

            <form onSubmit={handleSubmit}>
              {/* Champ e-mail */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email ou nom d'utilisateur
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@domaine.com ou username"
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  style={{ backgroundColor: '#f5f0f0' }}
                />
              </div>

              {/* Champ mot de passe */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    style={{ backgroundColor: '#f5f0f0' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {showPassword ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* Se souvenir de moi + mot de passe oublié */}
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Se souvenir de moi
                  </span>
                </label>
                <button
                  type="button"
                  className="text-sm text-green-600 hover:text-green-700 cursor-pointer"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              {isError && (
                <p className="mb-3 text-sm text-red-600">
                  {(error as any)?.message || 'Échec de la connexion.'}
                </p>
              )}

              {/* Bouton de connexion */}
              <button
                type="submit"
                disabled={!email || !password || isPending}
                className="w-full py-2.5 px-4 rounded-md text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#7cb342' }}
              >
                {isPending ? 'Connexion…' : 'Se connecter'}
              </button>

              {/* Note informative */}
              <div
                className="mt-3 p-3 rounded-md"
                style={{ backgroundColor: '#e3f2fd' }}
              >
                <p className="text-xs text-blue-800 flex items-start">
                  <span className="mr-2">💡</span>
                  <span>
                    Si vous avez accès à plusieurs projets, vous pourrez
                    choisir après connexion.
                  </span>
                </p>
              </div>
            </form>
          </div>

          {/* Pied de page avec fond blanc translucide pour lisibilité */}
          <div className="flex flex-col items-center text-xs text-gray-700">
            <div className="bg-white/80 rounded-full px-4 py-2 shadow text-center">
              <p>© 2025 Enable Guinée - Tous droits réservés</p>
              <p className="mt-1">
                v1.0.2 •{' '}
                <button className="text-gray-800 hover:text-gray-900">
                  Politique de données
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
