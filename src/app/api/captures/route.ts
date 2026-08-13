import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emotionCaptures } from "@/lib/schema";
import { desc } from "drizzle-orm";

// Validate personEmotions shape: array of { personId: string, emotions: array }
function isValidPersonEmotions(data: unknown): boolean {
  if (!Array.isArray(data)) return false;
  return data.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof (item as Record<string, unknown>).personId === "string" &&
      Array.isArray((item as Record<string, unknown>).emotions) &&
      ((item as Record<string, unknown>).emotions as unknown[]).every(
        (entry) =>
          entry &&
          typeof entry === "object" &&
          typeof (entry as Record<string, unknown>).emotion === "string" &&
          typeof (entry as Record<string, unknown>).timestamp === "string"
      )
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventName, personCount, emotions, dominantEmotion, message, personEmotions, snapshotImage } = body;

    if (!eventName || !personCount || !emotions || !dominantEmotion || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate personEmotions if provided
    if (personEmotions !== undefined && personEmotions !== null) {
      if (!isValidPersonEmotions(personEmotions)) {
        return NextResponse.json(
          { error: "Invalid personEmotions format: expected array of { personId: string, emotions: { emotion: string, timestamp: string }[] }" },
          { status: 400 }
        );
      }
    }

    const now = new Date();
    const hour = now.getHours();

    // Always store the flat emotions array in the `emotions` column for consistency.
    // Per-person data goes into the separate `person_emotions` column.
    const capture = await db
      .insert(emotionCaptures)
      .values({
        eventName,
        personCount,
        emotions,
        dominantEmotion,
        message,
        hour,
        capturedAt: now,
        snapshotImage: snapshotImage || null,
        personEmotions: personEmotions || null,
      })
      .returning();

    return NextResponse.json(capture[0], { status: 201 });
  } catch (error) {
    console.error("Error saving capture:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const captures = await db
      .select()
      .from(emotionCaptures)
      .orderBy(desc(emotionCaptures.capturedAt))
      .limit(50);

    return NextResponse.json(captures);
  } catch (error) {
    console.error("Error fetching captures:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
