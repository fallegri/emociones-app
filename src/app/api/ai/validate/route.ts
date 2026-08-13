import { NextRequest, NextResponse } from "next/server";
import { createOpenAIClient } from "@/lib/ai-config";

export async function POST(request: NextRequest) {
  try {
    const { baseUrl, apiKey, model } = await request.json();

    if (!baseUrl || !apiKey || !model) {
      return NextResponse.json(
        { success: false, error: "Faltan campos requeridos: baseUrl, apiKey, model" },
        { status: 400 }
      );
    }

    const client = createOpenAIClient({ baseUrl, apiKey, modelName: model });

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: "Di hola en una palabra." }],
      max_tokens: 10,
    });

    if (response.choices && response.choices.length > 0) {
      return NextResponse.json({ success: true, message: "Conexion validada exitosamente" });
    }

    return NextResponse.json(
      { success: false, error: "No se recibio respuesta del modelo" },
      { status: 500 }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido al validar la conexion";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
