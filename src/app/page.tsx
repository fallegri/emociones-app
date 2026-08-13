"use client";

import { useState, useEffect } from "react";
import FaceDetector from "@/components/FaceDetector";
import Link from "next/link";
import { Settings, BarChart3 } from "lucide-react";
import { AIProviderConfig, AI_CONFIG_STORAGE_KEY, isAIConfigured } from "@/lib/ai-config";

export default function Home() {
  const [eventName, setEventName] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const [aiConfig, setAiConfig] = useState<AIProviderConfig | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(AI_CONFIG_STORAGE_KEY);
    if (stored) {
      try {
        setAiConfig(JSON.parse(stored));
      } catch {
        // ignore invalid stored data
      }
    }
  }, []);

  // Re-check AI config when page gains focus (user may have changed it in /settings)
  useEffect(() => {
    const handleFocus = () => {
      const stored = localStorage.getItem(AI_CONFIG_STORAGE_KEY);
      if (stored) {
        try {
          setAiConfig(JSON.parse(stored));
        } catch {
          setAiConfig(null);
        }
      } else {
        setAiConfig(null);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const handleStart = () => {
    if (eventName.trim()) {
      setIsStarted(true);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-2xl sm:text-3xl">🎭</span>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-white">EmotionAI</h1>
              <p className="text-[10px] sm:text-xs text-gray-400 hidden sm:block">
                Deteccion de emociones en tiempo real
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {isStarted && (
              <span className="text-xs sm:text-sm text-emerald-400 bg-emerald-400/10 px-2 sm:px-3 py-1 rounded-full border border-emerald-400/20">
                📸 {captureCount}
              </span>
            )}
            <Link
              href="/settings"
              className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200"
              title="Configuracion de IA"
            >
              <Settings size={20} />
              {isAIConfigured(aiConfig) && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-gray-900" />
              )}
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all duration-200 text-xs sm:text-sm font-medium shadow-lg shadow-indigo-600/20"
            >
              <BarChart3 size={16} />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {!isStarted ? (
          /* Event setup */
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 sm:p-10 shadow-2xl border border-gray-700/50 w-full max-w-md">
              <div className="text-center mb-8">
                <span className="text-5xl sm:text-6xl mb-4 block">🎭</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  Detector de Emociones
                </h2>
                <p className="text-sm sm:text-base text-gray-400">
                  Ingresa el nombre del evento para comenzar la deteccion facial en tiempo real
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre del Evento
                  </label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleStart()}
                    placeholder="Ej: Conferencia Tech 2026"
                    className="w-full px-4 py-3 bg-gray-900/60 border border-gray-600/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all duration-200"
                  />
                </div>

                <button
                  onClick={handleStart}
                  disabled={!eventName.trim()}
                  className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40"
                >
                  🚀 Iniciar Deteccion
                </button>
              </div>

              {/* AI Status indicator */}
              <div className="mt-6 pt-6 border-t border-gray-700/50">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <div className={`w-2 h-2 rounded-full ${isAIConfigured(aiConfig) ? "bg-emerald-400" : "bg-gray-600"}`} />
                  <span>
                    {isAIConfigured(aiConfig) ? "IA configurada" : "IA no configurada"} &middot;{" "}
                    <Link href="/settings" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                      Configurar
                    </Link>
                  </span>
                </div>
                <p className="text-[10px] text-gray-600 text-center mt-2">
                  Se necesita acceso a la camara. Los datos se guardan cada 5 segundos.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Active detection */
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-white truncate">
                  📍 {eventName}
                </h2>
                <p className="text-xs sm:text-sm text-gray-400">
                  Deteccion en tiempo real activa
                </p>
              </div>
              <button
                onClick={() => {
                  setIsStarted(false);
                  setCaptureCount(0);
                }}
                className="shrink-0 px-3 sm:px-4 py-2 bg-red-600/10 text-red-400 border border-red-600/20 rounded-lg hover:bg-red-600/20 transition-all duration-200 text-xs sm:text-sm"
              >
                ⏹ Detener
              </button>
            </div>

            <FaceDetector
              eventName={eventName}
              aiConfig={aiConfig}
              onCapture={() => setCaptureCount((c) => c + 1)}
            />
          </div>
        )}
      </div>
    </main>
  );
}
