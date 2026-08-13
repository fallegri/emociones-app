"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AIProviderConfig,
  AIProviderType,
  AI_CONFIG_STORAGE_KEY,
  PROVIDER_DEFAULTS,
  getEffectiveConfig,
} from "@/lib/ai-config";
import { ArrowLeft, Shield, Cpu, Globe, Key, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";

const PROVIDER_OPTIONS: AIProviderType[] = ["nvidia", "openai", "ollama", "custom"];

export default function SettingsPage() {
  const [provider, setProvider] = useState<AIProviderType | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [validating, setValidating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(AI_CONFIG_STORAGE_KEY);
    if (stored) {
      try {
        const config: AIProviderConfig = JSON.parse(stored);
        setBaseUrl(config.baseUrl);
        setApiKey(config.apiKey);
        setModelName(config.modelName);
        if (config.provider) {
          setProvider(config.provider);
        } else {
          // Try to detect provider from stored baseUrl
          if (config.baseUrl.includes("nvidia")) setProvider("nvidia");
          else if (config.baseUrl.includes("openai")) setProvider("openai");
          else if (config.baseUrl.includes("localhost:11434")) setProvider("ollama");
          else setProvider("custom");
        }
      } catch {
        // ignore invalid stored data
      }
    }
  }, []);

  const handleProviderSelect = (p: AIProviderType) => {
    setProvider(p);
    setSaved(false);
    setValidationResult(null);

    if (p !== "custom") {
      const defaults = PROVIDER_DEFAULTS[p];
      setBaseUrl(defaults.baseUrl);
      setModelName(defaults.modelName);
      setShowAdvanced(false);
    } else {
      setShowAdvanced(true);
      // Don't clear fields if switching to custom - user might have values
    }
  };

  const getEffectiveBaseUrl = () => {
    if (provider && provider !== "custom") {
      return baseUrl || PROVIDER_DEFAULTS[provider].baseUrl;
    }
    return baseUrl;
  };

  const getEffectiveModel = () => {
    if (provider && provider !== "custom") {
      return modelName || PROVIDER_DEFAULTS[provider].modelName;
    }
    return modelName;
  };

  const canValidate = () => {
    if (!apiKey) return false;
    if (provider && provider !== "custom") return true;
    return !!(baseUrl && modelName);
  };

  const handleValidate = async () => {
    if (!canValidate()) {
      setValidationResult({ success: false, message: "Se requiere al menos la API Key" });
      return;
    }

    setValidating(true);
    setValidationResult(null);

    const effectiveUrl = getEffectiveBaseUrl();
    const effectiveModel = getEffectiveModel();

    try {
      const response = await fetch("/api/ai/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl: effectiveUrl, apiKey, model: effectiveModel }),
      });

      const data = await response.json();

      if (data.success) {
        setValidationResult({ success: true, message: "Conexion validada exitosamente" });
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
    if (!provider) {
      setValidationResult({ success: false, message: "Selecciona un proveedor" });
      return;
    }

    const effectiveUrl = getEffectiveBaseUrl();
    const effectiveModel = getEffectiveModel();

    if (apiKey && effectiveUrl && effectiveModel) {
      const config: AIProviderConfig = {
        baseUrl: effectiveUrl,
        apiKey,
        modelName: effectiveModel,
        provider,
      };
      localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config));
    } else if (!apiKey && provider !== "custom") {
      // Save just the provider selection without API key
      const config: AIProviderConfig = {
        baseUrl: effectiveUrl,
        apiKey: "",
        modelName: effectiveModel,
        provider,
      };
      localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config));
    } else {
      localStorage.removeItem(AI_CONFIG_STORAGE_KEY);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleClear = () => {
    setProvider(null);
    setBaseUrl("");
    setApiKey("");
    setModelName("");
    setValidationResult(null);
    setShowAdvanced(false);
    localStorage.removeItem(AI_CONFIG_STORAGE_KEY);
    setSaved(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200 group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform duration-200" />
              <span className="text-sm font-medium hidden sm:inline">Volver al Detector</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Cpu size={20} className="text-indigo-400" />
            <h1 className="text-lg font-bold text-white">Configuracion</h1>
          </div>
          <div className="w-[120px] hidden sm:block" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Proveedor de IA
          </h2>
          <p className="text-gray-400 text-sm sm:text-base">
            Selecciona tu proveedor y solo ingresa tu API Key. La URL y modelo se configuran automaticamente.
          </p>
        </div>

        {/* Step 1: Provider Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            1. Selecciona tu proveedor
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PROVIDER_OPTIONS.map((p) => {
              const defaults = PROVIDER_DEFAULTS[p];
              const isSelected = provider === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleProviderSelect(p)}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
                      : "border-gray-700/50 bg-gray-800/50 hover:border-gray-600/70 hover:bg-gray-800/70"
                  }`}
                >
                  <div className="text-2xl mb-2">{defaults.icon}</div>
                  <p className={`text-xs font-medium ${isSelected ? "text-indigo-300" : "text-gray-400"}`}>
                    {defaults.label}
                  </p>
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: API Key (shown after provider selection) */}
        {provider && (
          <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 shadow-xl overflow-hidden">
            <div className="p-6 sm:p-8 space-y-6">
              {/* Provider info */}
              {provider !== "custom" && (
                <div className="flex items-center gap-3 p-3 bg-gray-900/40 rounded-xl border border-gray-700/30">
                  <span className="text-xl">{PROVIDER_DEFAULTS[provider].icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{PROVIDER_DEFAULTS[provider].label}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {PROVIDER_DEFAULTS[provider].baseUrl} &middot; {PROVIDER_DEFAULTS[provider].modelName}
                    </p>
                  </div>
                </div>
              )}

              {/* API Key - Primary field */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <Key size={16} className="text-amber-400" />
                  2. Ingresa tu API Key
                  {provider === "ollama" && (
                    <span className="text-xs text-gray-500 font-normal">(opcional para Ollama local)</span>
                  )}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setSaved(false); }}
                  placeholder={
                    provider === "nvidia"
                      ? "nvapi-..."
                      : provider === "openai"
                      ? "sk-..."
                      : provider === "ollama"
                      ? "Dejar vacio si es local"
                      : "Tu API key"
                  }
                  className="w-full px-4 py-3 bg-gray-900/60 border border-gray-600/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all duration-200 text-sm"
                />
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Shield size={12} />
                  Se almacena localmente en tu navegador. No se envia a ningun servidor externo.
                </p>
              </div>

              {/* Advanced settings (URL & Model) - collapsible for known providers */}
              {provider === "custom" ? (
                <>
                  {/* Base URL */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                      <Globe size={16} className="text-indigo-400" />
                      URL Base del Proveedor
                    </label>
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => { setBaseUrl(e.target.value); setSaved(false); }}
                      placeholder="https://tu-proveedor.com/v1"
                      className="w-full px-4 py-3 bg-gray-900/60 border border-gray-600/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all duration-200 text-sm"
                    />
                  </div>

                  {/* Model Name */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                      <Cpu size={16} className="text-emerald-400" />
                      Nombre del Modelo
                    </label>
                    <input
                      type="text"
                      value={modelName}
                      onChange={(e) => { setModelName(e.target.value); setSaved(false); }}
                      placeholder="gpt-4o, meta/llama-3.1-8b-instruct, llama3..."
                      className="w-full px-4 py-3 bg-gray-900/60 border border-gray-600/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all duration-200 text-sm"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    Configuracion avanzada (URL y Modelo)
                  </button>

                  {showAdvanced && (
                    <div className="mt-4 space-y-4 p-4 bg-gray-900/30 rounded-xl border border-gray-700/30">
                      {/* Base URL */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-400">
                          <Globe size={14} className="text-indigo-400" />
                          URL Base
                        </label>
                        <input
                          type="text"
                          value={baseUrl}
                          onChange={(e) => { setBaseUrl(e.target.value); setSaved(false); }}
                          placeholder={PROVIDER_DEFAULTS[provider].baseUrl}
                          className="w-full px-3 py-2 bg-gray-900/60 border border-gray-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all duration-200 text-xs"
                        />
                      </div>

                      {/* Model Name */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-400">
                          <Cpu size={14} className="text-emerald-400" />
                          Modelo
                        </label>
                        <input
                          type="text"
                          value={modelName}
                          onChange={(e) => { setModelName(e.target.value); setSaved(false); }}
                          placeholder={PROVIDER_DEFAULTS[provider].modelName}
                          className="w-full px-3 py-2 bg-gray-900/60 border border-gray-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all duration-200 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Validation Result */}
              {validationResult && (
                <div
                  className={`flex items-center gap-3 p-4 rounded-xl text-sm transition-all duration-300 ${
                    validationResult.success
                      ? "bg-emerald-900/30 border border-emerald-700/50 text-emerald-300"
                      : "bg-red-900/30 border border-red-700/50 text-red-300"
                  }`}
                >
                  {validationResult.success ? (
                    <CheckCircle size={18} className="shrink-0" />
                  ) : (
                    <XCircle size={18} className="shrink-0" />
                  )}
                  <span>{validationResult.message}</span>
                </div>
              )}

              {/* Saved notification */}
              {saved && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm bg-emerald-900/30 border border-emerald-700/50 text-emerald-300">
                  <CheckCircle size={18} className="shrink-0" />
                  <span>Configuracion guardada exitosamente</span>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-6 sm:p-8 border-t border-gray-700/50 bg-gray-900/30">
              <button
                onClick={handleClear}
                className="px-4 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-200 order-3 sm:order-1"
              >
                Limpiar configuracion
              </button>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 order-1 sm:order-2">
                <button
                  onClick={handleValidate}
                  disabled={validating || !canValidate()}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40"
                >
                  {validating ? (
                    <span className="flex items-center gap-2 justify-center">
                      <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                      Validando...
                    </span>
                  ) : (
                    "Validar Conexion"
                  )}
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-all duration-200 text-sm font-medium shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info section */}
        <div className="mt-8 p-4 sm:p-6 bg-gray-800/30 rounded-xl border border-gray-700/30">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Como funciona</h3>
          <ul className="space-y-2 text-xs text-gray-500">
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5">1.</span>
              Selecciona tu proveedor de IA (NVIDIA NIM, OpenAI, Ollama o Custom)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5">2.</span>
              Ingresa solo tu API Key (la URL y modelo se configuran automaticamente)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5">3.</span>
              Valida la conexion y guarda. El detector generara mensajes contextuales con IA.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
