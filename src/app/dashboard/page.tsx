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
  LineChart,
  Line,
} from "recharts";
import { emotionLabels, emotionEmojis, emotionColors, EmotionType } from "@/lib/emotions";

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

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, "0")}:00`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg">{error}</p>
          <button
            onClick={() => { setError(null); fetchDashboard(); }}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
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
    emoji: emotionEmojis[e.emotion as EmotionType] || "❓",
    color: emotionColors[e.emotion as EmotionType] || "#999",
  })) || [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📊</span>
            <div>
              <h1 className="text-xl font-bold text-white">Dashboard de Emociones</h1>
              <p className="text-xs text-gray-400">Análisis y métricas en tiempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {data?.events && data.events.length > 0 && (
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos los eventos</option>
                {data.events.map((ev) => (
                  <option key={ev.name} value={ev.name}>
                    {ev.name} ({ev.count})
                  </option>
                ))}
              </select>
            )}
            <Link
              href="/"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
            >
              🎭 Detector
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-gray-400 text-sm">Total Capturas</p>
            <p className="text-3xl font-bold text-white mt-1">
              {data?.stats.totalCaptures || 0}
            </p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-gray-400 text-sm">Total Personas Detectadas</p>
            <p className="text-3xl font-bold text-emerald-400 mt-1">
              {data?.stats.totalPersons || 0}
            </p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-gray-400 text-sm">Promedio Personas/Captura</p>
            <p className="text-3xl font-bold text-indigo-400 mt-1">
              {data?.stats.avgPersonsPerCapture || 0}
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Peak Hours Chart */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">
              📈 Picos de Afluencia por Hora
            </h3>
            {peakHourData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={peakHourData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="hora" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Bar dataKey="personas" fill="#10b981" name="Personas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="capturas" fill="#6366f1" name="Capturas" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <p>Sin datos aún. Inicia una detección para ver estadísticas.</p>
              </div>
            )}
          </div>

          {/* Emotion Distribution */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">
              🎭 Distribución de Emociones
            </h3>
            {emotionPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={emotionPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
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
                      <span className="text-gray-300 text-sm">{value}</span>
                    )}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <p>Sin datos de emociones aún.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Captures */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">
            🕐 Capturas Recientes
          </h3>
          {data?.recentCaptures && data.recentCaptures.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-2 text-gray-400 font-medium">Evento</th>
                    <th className="text-left py-3 px-2 text-gray-400 font-medium">Fecha/Hora</th>
                    <th className="text-center py-3 px-2 text-gray-400 font-medium">Personas</th>
                    <th className="text-center py-3 px-2 text-gray-400 font-medium">Emoción</th>
                    <th className="text-left py-3 px-2 text-gray-400 font-medium">Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentCaptures.map((capture) => (
                    <tr key={capture.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-3 px-2 text-white">{capture.eventName}</td>
                      <td className="py-3 px-2 text-gray-300">
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
                        {emotionEmojis[capture.dominantEmotion as EmotionType] || "❓"}
                      </td>
                      <td className="py-3 px-2 text-gray-300 max-w-xs truncate">
                        {capture.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No hay capturas registradas aún.</p>
              <Link href="/" className="text-emerald-400 hover:underline mt-2 inline-block">
                Ir al detector →
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
