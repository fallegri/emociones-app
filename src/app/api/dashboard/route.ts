import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emotionCaptures } from "@/lib/schema";
import { sql, gte, and, lte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventName = searchParams.get("event");
    const dateFrom = searchParams.get("from");
    const dateTo = searchParams.get("to");
    const format = searchParams.get("format");

    // Build conditions
    const conditions = [];
    if (eventName) {
      conditions.push(sql`${emotionCaptures.eventName} = ${eventName}`);
    }
    if (dateFrom) {
      conditions.push(gte(emotionCaptures.capturedAt, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(emotionCaptures.capturedAt, new Date(dateTo)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // CSV export mode - return full dataset as CSV
    if (format === "csv") {
      const allCaptures = await db
        .select()
        .from(emotionCaptures)
        .where(whereClause)
        .orderBy(sql`${emotionCaptures.capturedAt} DESC`);

      const csvHeader = "Evento,Fecha,Hora,Personas,Emocion Dominante,Mensaje";
      const csvRows = allCaptures.map((capture) => {
        const date = new Date(capture.capturedAt);
        const fecha = date.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const hora = date.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        const escapeCsv = (str: string) => {
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };
        return [
          escapeCsv(capture.eventName),
          fecha,
          hora,
          capture.personCount.toString(),
          escapeCsv(capture.dominantEmotion),
          escapeCsv(capture.message || ""),
        ].join(",");
      });

      const csvContent = [csvHeader, ...csvRows].join("\n");

      return new Response(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="emociones_export.csv"`,
        },
      });
    }

    // Peak hours data
    const peakHours = await db
      .select({
        hour: emotionCaptures.hour,
        totalPersons: sql<number>`sum(${emotionCaptures.personCount})::int`,
        captureCount: sql<number>`count(*)::int`,
      })
      .from(emotionCaptures)
      .where(whereClause)
      .groupBy(emotionCaptures.hour)
      .orderBy(emotionCaptures.hour);

    // Emotion distribution
    const emotionDistribution = await db
      .select({
        emotion: emotionCaptures.dominantEmotion,
        count: sql<number>`count(*)::int`,
      })
      .from(emotionCaptures)
      .where(whereClause)
      .groupBy(emotionCaptures.dominantEmotion);

    // Total stats
    const stats = await db
      .select({
        totalCaptures: sql<number>`count(*)::int`,
        totalPersons: sql<number>`sum(${emotionCaptures.personCount})::int`,
        avgPersonsPerCapture: sql<number>`round(avg(${emotionCaptures.personCount}), 1)`,
      })
      .from(emotionCaptures)
      .where(whereClause);

    // Recent captures
    const recentCaptures = await db
      .select()
      .from(emotionCaptures)
      .where(whereClause)
      .orderBy(sql`${emotionCaptures.capturedAt} DESC`)
      .limit(20);

    // Events list
    const events = await db
      .select({
        name: emotionCaptures.eventName,
        count: sql<number>`count(*)::int`,
      })
      .from(emotionCaptures)
      .groupBy(emotionCaptures.eventName);

    return NextResponse.json({
      peakHours,
      emotionDistribution,
      stats: stats[0],
      recentCaptures,
      events,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
