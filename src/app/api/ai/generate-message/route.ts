import { NextRequest, NextResponse } from "next/server";
import { createOpenAIClient, AIProviderConfig } from "@/lib/ai-config";
import { EmotionType, getRandomMessage } from "@/lib/emotions";

// NOTE: Security consideration - the API key is sent in the request body from the client.
// This is acceptable for now because the key is already stored in localStorage (visible to the user)
// and the transport is HTTPS. A production system should use server-side session storage.

interface GenerateMessageRequest {
  emotions: EmotionType[];
  personCount: number;
  dominantEmotion: EmotionType;
  eventName: string;
  aiConfig: AIProviderConfig | null;
}

const AI_TIMEOUT_MS = 10_000; // 10 second timeout for AI calls

/**
 * Sanitize user-provided event name to prevent prompt injection.
 * Truncates to 100 chars and strips control characters.
 */
function sanitizeEventName(name: string): string {
  return name
    .slice(0, 100)
    .replace(/[\x00-\x1f\x7f-\x9f]/g, "")
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateMessageRequest = await request.json();
    const { emotions, personCount, dominantEmotion, eventName, aiConfig } = body;

    // Fall back to static messages if AI is not configured
    if (!aiConfig || !aiConfig.baseUrl || !aiConfig.apiKey || !aiConfig.modelName) {
      const isGroup = personCount > 1;
      const message = getRandomMessage(dominantEmotion, isGroup);
      return NextResponse.json({ message, source: "static" });
    }

    const client = createOpenAIClient(aiConfig);

    const sanitizedEventName = sanitizeEventName(eventName);
    const emotionList = emotions.join(", ");

    const systemPrompt = `Eres un asistente motivador en un evento. Tu trabajo es generar mensajes cortos, creativos y motivadores en espanol (maximo 2 oraciones) basados en las emociones detectadas en los asistentes. Usa emojis apropiados. No incluyas explicaciones, solo el mensaje.`;

    const userContent = `Evento: ${sanitizedEventName}
Personas detectadas: ${personCount}
Emociones: ${emotionList}
Emocion dominante: ${dominantEmotion}

Genera un mensaje motivador apropiado para este ambiente emocional.`;

    const response = await client.chat.completions.create({
      model: aiConfig.modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 150,
      temperature: 0.8,
    }, {
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });

    const aiMessage = response.choices?.[0]?.message?.content?.trim();

    if (aiMessage) {
      return NextResponse.json({ message: aiMessage, source: "ai" });
    }

    // Fallback if AI returns empty
    const isGroup = personCount > 1;
    const message = getRandomMessage(dominantEmotion, isGroup);
    return NextResponse.json({ message, source: "static" });
  } catch (error: unknown) {
    console.error("Error generating AI message:", error);
    // Fallback to static message on any error
    try {
      const body = await request.clone().json();
      const { dominantEmotion, personCount } = body;
      const isGroup = personCount > 1;
      const message = getRandomMessage(dominantEmotion, isGroup);
      return NextResponse.json({ message, source: "static" });
    } catch {
      return NextResponse.json({ message: "Momento especial detectado ✨", source: "static" });
    }
  }
}
