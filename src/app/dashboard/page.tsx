"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { emotionLabels, emotionEmojis, emotionColors, EmotionType } from "@/lib/emotions";
import { ArrowLeft, Download } from "lucide-react";

interface DashboardData {
  peakHours: { hour: number; totalPersons: number; captureCount: number }[];
  emotionDistribution: { emotion: string; count: number }[];
  stats: { totalCaptures: number; totalPersons: number; avgPersonsPerCapture: number };
  recentCaptures: {
    id: number;
    eventName: string;
    capturedAt: string;
    personCount: number;
    dominantEmotion: string;
    message: string;
    emotions: string[];
  }[];
  events: { name: string; count: number }[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, [selectedEvent]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedEvent) params.set("event", selectedEvent);

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (!res.ok) throw new Error("Error fetching data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError("Error cargando datos del dashboard");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams();
      params.set("format", "csv");
      if (selectedEvent) params.set("event", selectedEvent);

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (!res.ok) throw new Error("Error exporting CSV");

      const csvText = await res.text();
      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `emociones_${selectedEvent || "todos"}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting CSV:", err);
    }
  };

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, "0")}:00`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-gray-300 text-sm">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 text-base sm:text-lg">{error}</p>
          <button
            onClick={() => { setError(null); fetchDashboard(); }}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all duration-200"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const peakHourData = data?.peakHours.map((h) => ({
    hora: formatHour(h.hour),
    personas: h.totalPersons,
    capturas: h.captureCount,
  })) || [];

  const emotionPieData = data?.emotionDistribution.map((e) => ({
    name: emotionLabels[e.emotion as EmotionType] || e.emotion,
    value: e.count,
    emoji: emotionEmojis[e.emotion as EmotionType] || "?",
    color: emotionColors[e.emotion as EmotionType] || "#999",
  })) || [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-2xl sm:text-3xl">📊</span>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-white">Dashboard</h1>
              <p className="text-[10px] sm:text-xs text-gray-400 hidden sm:block">
                Analisis y metricas en tiempo real
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {data?.events && data.events.length > 0 && (
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 max-w-[140px] sm:max-w-none"
              >
                <option value="">Todos</option>
                {data.events.map((ev) => (
                  <option key={ev.name} value={ev.name}>
                    {ev.name} ({ev.count})
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all duration-200 text-xs sm:text-sm font-medium shadow-lg shadow-indigo-600/20"
              title="Exportar datos a CSV"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-all duration-200 text-xs sm:text-sm font-medium shadow-lg shadow-emerald-600/20"
            >
              <ArrowLeft size={14} className="hidden sm:block" />
              <span>🎭</span>
              <span className="hidden sm:inline">Detector</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
            <p className="text-gray-400 text-xs sm:text-sm">Total Capturas</p>
            <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
              {data?.stats.totalCaptures || 0}
            </p>
          </div>
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
            <p className="text-gray-400 text-xs sm:text-sm">Total Personas</p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">
              {data?.stats.totalPersons || 0}
            </p>
          </div>
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
            <p className="text-gray-400 text-xs sm:text-sm">Promedio/Captura</p>
            <p className="text-2xl sm:text-3xl font-bold text-indigo-400 mt-1">
              {data?.stats.avgPersonsPerCapture || 0}
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Peak Hours Chart */}
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-700/50">
            <h3 className="text-sm sm:text-lg font-bold text-white mb-4">
              📈 Picos de Afluencia por Hora
            </h3>
            {peakHourData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
                <BarChart data={peakHourData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="hora" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Bar dataKey="personas" fill="#10b981" name="Personas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="capturas" fill="#6366f1" name="Capturas" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] sm:h-[300px] text-gray-500">
                <p className="text-sm text-center px-4">Sin datos aun. Inicia una deteccion para ver estadisticas.</p>
              </div>
            )}
          </div>

          {/* Emotion Distribution */}
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-700/50">
            <h3 className="text-sm sm:text-lg font-bold text-white mb-4">
              🎭 Distribucion de Emociones
            </h3>
            {emotionPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
                <PieChart>
                  <Pie
                    data={emotionPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ percent }: { percent?: number }) =>
                      `${((percent || 0) * 100).toFixed(0)}%`
                    }
                  >
                    {emotionPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value) => (
                      <span className="text-gray-300 text-xs sm:text-sm">{value}</span>
                    )}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] sm:h-[300px] text-gray-500">
                <p className="text-sm text-center px-4">Sin datos de emociones aun.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Captures */}
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-700/50">
          <h3 className="text-sm sm:text-lg font-bold text-white mb-4">
            🕐 Capturas Recientes
          </h3>
          {data?.recentCaptures && data.recentCaptures.length > 0 ? (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700/50">
                      <th className="text-left py-3 px-2 text-gray-400 font-medium text-xs">Evento</th>
                      <th className="text-left py-3 px-2 text-gray-400 font-medium text-xs">Fecha/Hora</th>
                      <th className="text-center py-3 px-2 text-gray-400 font-medium text-xs">Personas</th>
                      <th className="text-center py-3 px-2 text-gray-400 font-medium text-xs">Emocion</th>
                      <th className="text-left py-3 px-2 text-gray-400 font-medium text-xs">Mensaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentCaptures.map((capture) => (
                      <tr key={capture.id} className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors duration-150">
                        <td className="py-3 px-2 text-white text-sm">{capture.eventName}</td>
                        <td className="py-3 px-2 text-gray-300 text-sm">
                          {new Date(capture.capturedAt).toLocaleString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-2 text-center text-emerald-400 font-bold">
                          {capture.personCount}
                        </td>
                        <td className="py-3 px-2 text-center text-xl">
                          {emotionEmojis[capture.dominantEmotion as EmotionType] || "?"}
                        </td>
                        <td className="py-3 px-2 text-gray-300 max-w-xs truncate text-sm">
                          {capture.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {data.recentCaptures.map((capture) => (
                  <div key={capture.id} className="bg-gray-900/40 rounded-lg p-3 border border-gray-700/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-xs font-medium truncate max-w-[60%]">{capture.eventName}</span>
                      <span className="text-xl">{emotionEmojis[capture.dominantEmotion as EmotionType] || "?"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        {new Date(capture.capturedAt).toLocaleString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-emerald-400 font-medium">
                        👥 {capture.personCount}
                      </span>
                    </div>
                    {capture.message && (
                      <p className="text-gray-500 text-[10px] mt-1.5 truncate">{capture.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No hay capturas registradas aun.</p>
              <Link href="/" className="text-emerald-400 hover:text-emerald-300 mt-2 inline-block text-sm transition-colors">
                Ir al detector →
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
