import { NextRequest, NextResponse } from "next/server";
import { createOpenAIClient, AIProviderConfig } from "@/lib/ai-config";
import { EmotionType, getRandomMessage } from "@/lib/emotions";

interface GenerateMessageRequest {
  emotions: EmotionType[];
  personCount: number;
  dominantEmotion: EmotionType;
  eventName: string;
  aiConfig: AIProviderConfig | null;
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

    const emotionList = emotions.join(", ");
    const prompt = `Eres un asistente en un evento llamado "${eventName}". Se detectaron ${personCount} persona(s) con las siguientes emociones: ${emotionList}. La emocion dominante es "${dominantEmotion}".

Genera un mensaje corto, creativo y motivador en espanol (maximo 2 oraciones) que sea relevante para el ambiente emocional del grupo. Usa emojis apropiados. No incluyas explicaciones, solo el mensaje.`;

    const response = await client.chat.completions.create({
      model: aiConfig.modelName,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.8,
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
