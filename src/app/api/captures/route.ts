import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emotionCaptures } from "@/lib/schema";
import { desc } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventName, personCount, emotions, dominantEmotion, message } = body;

    if (!eventName || !personCount || !emotions || !dominantEmotion || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const now = new Date();
    const hour = now.getHours();

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
