"use client";

import { useState, useEffect, useCallback } from "react";
import FaceDetector from "@/components/FaceDetector";
import Link from "next/link";
import { Settings, BarChart3, Camera, Users } from "lucide-react";
import { AIProviderConfig, AI_CONFIG_STORAGE_KEY, isAIConfigured, getEffectiveConfig } from "@/lib/ai-config";

type DetectionMode = "snapshot" | "contador";

export default function Home() {
  const [eventName, setEventName] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const [aiConfig, setAiConfig] = useState<AIProviderConfig | null>(null);
  const [aiConfigChecked, setAiConfigChecked] = useState(false);
  const [mode, setMode] = useState<DetectionMode>("contador");
  const [personCount, setPersonCount] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(AI_CONFIG_STORAGE_KEY);
    if (stored) {
      try {
        setAiConfig(JSON.parse(stored));
      } catch {
        // ignore invalid stored data
      }
    }
    setAiConfigChecked(true);
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

  const handlePersonCount = useCallback((count: number) => {
    setPersonCount(count);
  }, []);

  const handleStart = () => {
    if (eventName.trim()) {
      setIsStarted(true);
    }
  };

  // Determine current step
  const aiReady = isAIConfigured(aiConfig);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-700/60 bg-gray-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-2xl sm:text-3xl">🎭</span>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-white tracking-tight">EmotionAI</h1>
              <p className="text-[10px] sm:text-xs text-gray-300 hidden sm:block">
                Deteccion de emociones en tiempo real
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {isStarted && (
              <span className="text-xs sm:text-sm text-emerald-300 bg-emerald-400/15 px-2 sm:px-3 py-1 rounded-full border border-emerald-400/30 font-medium">
                📸 {captureCount}
              </span>
            )}
            <Link
              href="/settings"
              className="relative p-2 text-gray-300 hover:text-white hover:bg-gray-700/60 rounded-lg transition-all duration-200"
              title="Configuracion de IA"
            >
              <Settings size={20} />
              {aiReady && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-gray-900 animate-pulse" />
              )}
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 transition-all duration-200 text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-500/25"
            >
              <BarChart3 size={16} />
              <span>Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {!aiConfigChecked ? (
          /* Loading AI config check */
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center animate-fade-in">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400 mx-auto mb-4"></div>
              <p className="text-gray-300 text-sm">Verificando configuracion...</p>
            </div>
          </div>
        ) : !aiReady && !isStarted ? (
          /* Step 1: AI not configured - prompt to configure */
          <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
            <div className="bg-gray-800/90 backdrop-blur-md rounded-2xl p-8 sm:p-10 shadow-2xl border border-gray-600/40 w-full max-w-md text-center">
              <div className="mb-8">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-indigo-400/30 flex items-center justify-center">
                  <Settings className="text-indigo-300" size={36} />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
                  Configurar IA
                </h2>
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                  Para comenzar, necesitas configurar un proveedor de IA. Esto permite generar mensajes contextuales con las emociones detectadas.
                </p>
              </div>

              <Link
                href="/settings"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-400 text-gray-900 rounded-xl font-bold hover:from-emerald-400 hover:to-emerald-300 transition-all duration-200 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-400/50 hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base"
              >
                <Settings size={20} />
                Ir a Configuracion
              </Link>

              <p className="text-xs text-gray-400 text-center mt-6">
                Compatible con OpenAI, NVIDIA NIM, Ollama y cualquier proveedor OpenAI-compatible.
              </p>

              {/* Dashboard link below */}
              <div className="mt-8 pt-6 border-t border-gray-600/40">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 text-indigo-300 hover:text-indigo-200 transition-colors text-sm font-medium hover:underline"
                >
                  <BarChart3 size={16} />
                  Ver Dashboard de eventos anteriores
                </Link>
              </div>
            </div>
          </div>
        ) : !isStarted ? (
          /* Step 2: Event name input (AI is configured) */
          <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
            <div className="bg-gray-800/90 backdrop-blur-md rounded-2xl p-8 sm:p-10 shadow-2xl border border-gray-600/40 w-full max-w-md">
              <div className="text-center mb-8">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 border border-emerald-400/30 flex items-center justify-center">
                  <span className="text-4xl sm:text-5xl">🎭</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
                  Detector de Emociones
                </h2>
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                  Ingresa el nombre del evento para comenzar la deteccion facial en tiempo real
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Nombre del Evento
                  </label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleStart()}
                    placeholder="Ej: Conferencia Tech 2026"
                    className="w-full px-4 py-3 bg-gray-900/70 border border-gray-500/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 outline-none transition-all duration-200"
                  />
                </div>

                <button
                  onClick={handleStart}
                  disabled={!eventName.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-400 text-gray-900 rounded-xl font-bold hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-emerald-500 disabled:hover:to-emerald-400 transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/40 hover:scale-[1.01] active:scale-[0.99] text-sm sm:text-base"
                >
                  🚀 Iniciar Deteccion
                </button>
              </div>

              {/* AI Status indicator */}
              <div className="mt-6 pt-6 border-t border-gray-600/40">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    IA configurada &middot;{" "}
                    <Link href="/settings" className="text-indigo-300 hover:text-indigo-200 transition-colors font-medium hover:underline">
                      Cambiar
                    </Link>
                  </span>
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">
                  Se necesita acceso a la camara. Los datos se guardan cada 5 segundos.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Step 3: Active detection - compact single-screen layout */
          <div className="flex flex-col h-[calc(100vh-80px)] animate-fade-in">
            {/* TOP BAR: compact row with mode badge + person count + event name + stop button */}
            <div className="flex items-center gap-2 sm:gap-3 px-1 py-2">
              {/* Mode badge - small colored pill */}
              <span
                className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border ${
                  mode === "contador"
                    ? "bg-indigo-500/15 text-indigo-300 border-indigo-400/40"
                    : "bg-emerald-500/15 text-emerald-300 border-emerald-400/40"
                }`}
              >
                {mode === "contador" ? (
                  <><Users size={12} /> Contador</>
                ) : (
                  <><Camera size={12} /> Snapshot</>
                )}
              </span>

              {/* Person count inline */}
              <span className="shrink-0 text-xs sm:text-sm text-white font-bold">
                👥 {personCount}
              </span>

              {/* Event name */}
              <span className="text-xs sm:text-sm text-gray-300 truncate min-w-0">
                📍 {eventName}
              </span>

              {/* Stop button */}
              <button
                onClick={() => {
                  setIsStarted(false);
                  setCaptureCount(0);
                  setPersonCount(0);
                }}
                className="shrink-0 ml-auto px-2.5 py-1 bg-red-500/15 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/25 hover:text-red-200 transition-all duration-200 text-xs font-medium"
              >
                ⏹ Detener
              </button>
            </div>

            {/* MIDDLE: Camera video (takes remaining space) */}
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <div className="w-full h-full max-h-[60vh]">
                <FaceDetector
                  eventName={eventName}
                  aiConfig={aiConfig ? getEffectiveConfig(aiConfig) : null}
                  mode={mode}
                  onCapture={() => setCaptureCount((c) => c + 1)}
                  onPersonCount={handlePersonCount}
                />
              </div>
            </div>

            {/* BOTTOM: Compact mode toggle - two small buttons side by side */}
            <div className="py-2 px-1">
              <div className="flex gap-2 w-full max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={() => setMode("contador")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border transition-all duration-200 text-xs sm:text-sm font-medium ${
                    mode === "contador"
                      ? "border-indigo-400 bg-indigo-500/15 text-indigo-300"
                      : "border-gray-600/50 bg-gray-900/40 text-gray-400 hover:border-gray-500/60 hover:text-gray-300"
                  }`}
                >
                  <Users size={14} />
                  Contador
                </button>
                <button
                  type="button"
                  onClick={() => setMode("snapshot")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border transition-all duration-200 text-xs sm:text-sm font-medium ${
                    mode === "snapshot"
                      ? "border-emerald-400 bg-emerald-500/15 text-emerald-300"
                      : "border-gray-600/50 bg-gray-900/40 text-gray-400 hover:border-gray-500/60 hover:text-gray-300"
                  }`}
                >
                  <Camera size={14} />
                  Snapshot
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
