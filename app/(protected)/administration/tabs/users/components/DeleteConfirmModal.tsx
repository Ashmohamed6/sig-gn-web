"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  userName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  isOpen,
  userName,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden animate-in fade-in zoom-in duration-200">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-red-700">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div className="text-white">
                  <h2 className="text-lg font-semibold">Confirmer la suppression</h2>
                  <p className="text-sm opacity-90">Action irrÃ©versible</p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-900">
                ÃŠtes-vous sÃ»r de vouloir supprimer l&apos;utilisateur
              </p>
              <p className="text-base font-semibold text-red-950 mt-2">
                {userName}
              </p>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <p className="flex items-start gap-2">
                <span className="text-red-600 font-bold">â€¢</span>
                <span>Toutes les donnÃ©es de cet utilisateur seront supprimÃ©es</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-red-600 font-bold">â€¢</span>
                <span>Les projets assignÃ©s seront dÃ©saffectÃ©s</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-red-600 font-bold">â€¢</span>
                <span>Cette action ne peut pas Ãªtre annulÃ©e</span>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
            >
              Supprimer dÃ©finitivement
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
