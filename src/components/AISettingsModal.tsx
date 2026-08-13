"use client";

import { useState, useEffect } from "react";
import { AIProviderConfig, AI_CONFIG_STORAGE_KEY } from "@/lib/ai-config";
import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: (config: AIProviderConfig | null) => void;
}

export default function AISettingsModal({ isOpen, onClose, onConfigSaved }: Props) {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem(AI_CONFIG_STORAGE_KEY);
      if (stored) {
        try {
          const config: AIProviderConfig = JSON.parse(stored);
          setBaseUrl(config.baseUrl);
          setApiKey(config.apiKey);
          setModelName(config.modelName);
        } catch {
          // ignore invalid stored data
        }
      }
    }
  }, [isOpen]);

  const handleValidate = async () => {
    if (!baseUrl || !apiKey || !modelName) {
      setValidationResult({ success: false, message: "Todos los campos son requeridos" });
      return;
    }

    setValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch("/api/ai/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, apiKey, model: modelName }),
      });

      const data = await response.json();

      if (data.success) {
        setValidationResult({ success: true, message: "Conexion validada exitosamente ✓" });
      } else {
        setValidationResult({ success: false, message: data.error || "Error de conexion" });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error de red";
      setValidationResult({ success: false, message: msg });
    } finally {
      setValidating(false);
    }
  };

  const handleSave = () => {
    if (baseUrl && apiKey && modelName) {
      const config: AIProviderConfig = { baseUrl, apiKey, modelName };
      localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config));
      onConfigSaved(config);
    } else {
      localStorage.removeItem(AI_CONFIG_STORAGE_KEY);
      onConfigSaved(null);
    }
    onClose();
  };

  const handleClear = () => {
    setBaseUrl("");
    setApiKey("");
    setModelName("");
    setValidationResult(null);
    localStorage.removeItem(AI_CONFIG_STORAGE_KEY);
    onConfigSaved(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">Configuracion de IA</h2>
            <p className="text-sm text-gray-400 mt-1">
              Conecta con OpenAI, NVIDIA NIM, Ollama u otro proveedor compatible
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              URL Base del Proveedor
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://integrate.api.nvidia.com/v1"
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Ejemplos: https://api.openai.com/v1 | https://integrate.api.nvidia.com/v1 | http://localhost:11434/v1
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-... o nvapi-..."
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-sm"
            />
          </div>

          {/* Model Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Nombre del Modelo
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="gpt-4o, meta/llama-3.1-8b-instruct, llama3"
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-sm"
            />
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div
              className={`p-3 rounded-lg text-sm ${
                validationResult.success
                  ? "bg-emerald-900/40 border border-emerald-700 text-emerald-300"
                  : "bg-red-900/40 border border-red-700 text-red-300"
              }`}
            >
              {validationResult.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm text-gray-400 hover:text-red-400 transition"
          >
            Limpiar
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleValidate}
              disabled={validating || !baseUrl || !apiKey || !modelName}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
            >
              {validating ? "Validando..." : "Validar Conexion"}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
