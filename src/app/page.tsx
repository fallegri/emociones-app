"use client";

import { useState } from "react";
import FaceDetector from "@/components/FaceDetector";
import Link from "next/link";

export default function Home() {
  const [eventName, setEventName] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);

  const handleStart = () => {
    if (eventName.trim()) {
      setIsStarted(true);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎭</span>
            <div>
              <h1 className="text-xl font-bold text-white">EmotionAI</h1>
              <p className="text-xs text-gray-400">Detección de emociones en tiempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isStarted && (
              <span className="text-sm text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">
                📸 {captureCount} capturas
              </span>
            )}
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
            >
              📊 Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {!isStarted ? (
          /* Event setup */
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700 w-full max-w-md">
              <div className="text-center mb-8">
                <span className="text-6xl mb-4 block">🎭</span>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Detector de Emociones
                </h2>
                <p className="text-gray-400">
                  Ingresa el nombre del evento para comenzar la detección facial en tiempo real
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
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                  />
                </div>

                <button
                  onClick={handleStart}
                  disabled={!eventName.trim()}
                  className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  🚀 Iniciar Detección
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-xs text-gray-500 text-center">
                  Se necesita acceso a la cámara. Los datos se guardan automáticamente cada 5 segundos cuando se detectan rostros.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Active detection */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  📍 {eventName}
                </h2>
                <p className="text-sm text-gray-400">
                  Detección en tiempo real activa
                </p>
              </div>
              <button
                onClick={() => {
                  setIsStarted(false);
                  setCaptureCount(0);
                }}
                className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg hover:bg-red-600/30 transition text-sm"
              >
                ⏹ Detener
              </button>
            </div>

            <FaceDetector
              eventName={eventName}
              onCapture={() => setCaptureCount((c) => c + 1)}
            />
          </div>
        )}
      </div>
    </main>
  );
}
