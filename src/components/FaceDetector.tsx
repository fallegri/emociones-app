"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import { EmotionType, emotionLabels, emotionEmojis, getRandomMessage, getGroupDominantEmotion } from "@/lib/emotions";
import { AIProviderConfig } from "@/lib/ai-config";

interface DetectedFace {
  emotion: EmotionType;
  confidence: number;
  position: { x: number; y: number; width: number; height: number };
}

interface Props {
  eventName: string;
  aiConfig?: AIProviderConfig | null;
  onCapture?: (data: CaptureData) => void;
}

export interface CaptureData {
  eventName: string;
  personCount: number;
  emotions: EmotionType[];
  dominantEmotion: EmotionType;
  message: string;
}

export default function FaceDetector({ eventName, aiConfig, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [dominantEmotion, setDominantEmotion] = useState<EmotionType | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastCaptureTime = useRef<number>(0);
  const lastAICallTime = useRef<number>(0);
  const aiMessagePending = useRef<boolean>(false);
  // Ref to track latest message value for use inside the detection loop
  // without causing effect re-runs (fixes stale closure issue)
  const currentMessageRef = useRef<string>("");
  const CAPTURE_INTERVAL = 5000; // Save to DB every 5 seconds if faces detected
  const AI_THROTTLE_INTERVAL = 5000; // Only call AI every 5 seconds

  // Keep the ref in sync with state so the detection loop always has the latest message
  useEffect(() => {
    currentMessageRef.current = currentMessage;
  }, [currentMessage]);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelLoaded(true);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading models:", err);
        setError("Error cargando modelos de deteccion facial. Recarga la pagina.");
        setIsLoading(false);
      }
    };
    loadModels();
  }, []);

  // Start webcam
  useEffect(() => {
    if (!isModelLoaded) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 720, height: 560, facingMode: "user" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("No se pudo acceder a la camara. Verifica los permisos.");
      }
    };
    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [isModelLoaded]);

  // Generate AI message
  const generateAIMessage = useCallback(
    async (emotions: EmotionType[], personCount: number, dominant: EmotionType) => {
      if (aiMessagePending.current) return;

      const now = Date.now();
      if (now - lastAICallTime.current < AI_THROTTLE_INTERVAL) return;

      lastAICallTime.current = now;
      aiMessagePending.current = true;

      try {
        const response = await fetch("/api/ai/generate-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emotions,
            personCount,
            dominantEmotion: dominant,
            eventName,
            aiConfig,
          }),
        });

        const data = await response.json();
        if (data.message) {
          setCurrentMessage(data.message);
          currentMessageRef.current = data.message;
        }
      } catch {
        // Fallback to static message on network error
        const isGroup = personCount > 1;
        const fallback = getRandomMessage(dominant, isGroup);
        setCurrentMessage(fallback);
        currentMessageRef.current = fallback;
      } finally {
        aiMessagePending.current = false;
      }
    },
    [eventName, aiConfig]
  );

  // Save capture to database
  const saveCapture = useCallback(
    async (captureData: CaptureData) => {
      try {
        await fetch("/api/captures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(captureData),
        });
        onCapture?.(captureData);
      } catch (err) {
        console.error("Error saving capture:", err);
      }
    },
    [onCapture]
  );

  // Face detection loop
  useEffect(() => {
    if (!isModelLoaded || !videoRef.current) return;

    let animationId: number;
    let isDetecting = false;

    const detect = async () => {
      if (!videoRef.current || !canvasRef.current || isDetecting) {
        animationId = requestAnimationFrame(detect);
        return;
      }

      isDetecting = true;
      const video = videoRef.current;

      if (video.readyState !== 4) {
        isDetecting = false;
        animationId = requestAnimationFrame(detect);
        return;
      }

      const canvas = canvasRef.current;
      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);

      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
        .withFaceExpressions();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      // Clear canvas
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      if (resizedDetections.length > 0) {
        const faces: DetectedFace[] = resizedDetections.map((detection) => {
          const expressions = detection.expressions;
          const maxExpression = Object.entries(expressions).reduce((a, b) =>
            a[1] > b[1] ? a : b
          );

          const box = detection.detection.box;

          // Draw box on canvas
          if (ctx) {
            ctx.strokeStyle = "#00ff88";
            ctx.lineWidth = 2;
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            // Draw emotion label
            const emotionKey = maxExpression[0] as EmotionType;
            const label = `${emotionEmojis[emotionKey]} ${emotionLabels[emotionKey]} (${Math.round(maxExpression[1] * 100)}%)`;
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(box.x, box.y - 28, ctx.measureText(label).width + 16, 28);
            ctx.fillStyle = "#00ff88";
            ctx.font = "14px sans-serif";
            ctx.fillText(label, box.x + 8, box.y - 8);
          }

          return {
            emotion: maxExpression[0] as EmotionType,
            confidence: maxExpression[1],
            position: { x: box.x, y: box.y, width: box.width, height: box.height },
          };
        });

        setDetectedFaces(faces);

        const emotions = faces.map((f) => f.emotion);
        const dominant = getGroupDominantEmotion(emotions);
        setDominantEmotion(dominant);

        // Use AI for message generation if configured, otherwise static
        if (aiConfig && aiConfig.baseUrl && aiConfig.apiKey && aiConfig.modelName) {
          generateAIMessage(emotions, faces.length, dominant);
        } else {
          const isGroup = faces.length > 1;
          const message = getRandomMessage(dominant, isGroup);
          setCurrentMessage(message);
          currentMessageRef.current = message;
        }

        // Auto-save to database at intervals
        const now = Date.now();
        if (now - lastCaptureTime.current >= CAPTURE_INTERVAL) {
          lastCaptureTime.current = now;
          const captureData: CaptureData = {
            eventName,
            personCount: faces.length,
            emotions,
            dominantEmotion: dominant,
            message: currentMessageRef.current,
          };
          saveCapture(captureData);
        }
      } else {
        setDetectedFaces([]);
        setCurrentMessage("");
        setDominantEmotion(null);
      }

      isDetecting = false;
      animationId = requestAnimationFrame(detect);
    };

    animationId = requestAnimationFrame(detect);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isModelLoaded, eventName, saveCapture, aiConfig, generateAIMessage]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-red-50 rounded-xl p-8">
        <div className="text-center">
          <p className="text-red-600 text-lg font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video container - max 2/3 of 1400px = 933px */}
      <div className="relative rounded-xl overflow-hidden bg-gray-900 shadow-2xl max-w-[933px] mx-auto">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
              <p className="text-gray-300">Cargando modelos de IA...</p>
            </div>
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full max-h-[560px] object-cover"
          onLoadedMetadata={() => {
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
            }
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />

        {/* Overlay info */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
          <p className="text-emerald-400 text-sm font-medium">
            📡 {detectedFaces.length > 0 ? "Detectando" : "Buscando rostros..."}
          </p>
        </div>

        {detectedFaces.length > 0 && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
            <p className="text-white text-sm">
              👥 <span className="font-bold">{detectedFaces.length}</span>{" "}
              {detectedFaces.length === 1 ? "persona" : "personas"}
            </p>
          </div>
        )}
      </div>

      {/* Emotion message */}
      {currentMessage && dominantEmotion && (
        <div
          className="rounded-xl p-6 text-center shadow-lg transition-all duration-500 animate-fade-in max-w-[933px] mx-auto"
          style={{
            background: `linear-gradient(135deg, ${getEmotionBg(dominantEmotion)})`
          }}
        >
          <p className="text-2xl font-bold text-white mb-1">
            {emotionEmojis[dominantEmotion]} {emotionLabels[dominantEmotion]}
          </p>
          <p className="text-white/90 text-lg">{currentMessage}</p>
          {detectedFaces.length > 1 && (
            <p className="text-white/70 text-sm mt-2">
              Emociones del grupo: {detectedFaces.map(f => emotionEmojis[f.emotion]).join(" ")}
            </p>
          )}
        </div>
      )}

      {/* Detection panel - ALWAYS shown when faces are detected */}
      {detectedFaces.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 max-w-[933px] mx-auto">
          <h3 className="text-white font-semibold mb-3 text-sm">
            👥 Personas detectadas: {detectedFaces.length}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {detectedFaces.map((face, i) => (
              <div
                key={i}
                className="bg-gray-900 rounded-lg p-3 text-center border border-gray-700"
              >
                <p className="text-2xl">{emotionEmojis[face.emotion]}</p>
                <p className="text-white text-xs mt-1">
                  Persona {i + 1}: {emotionLabels[face.emotion]}
                </p>
                <p className="text-gray-400 text-xs">
                  {Math.round(face.confidence * 100)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getEmotionBg(emotion: EmotionType): string {
  const gradients: Record<EmotionType, string> = {
    happy: "#f59e0b, #eab308",
    sad: "#3b82f6, #6366f1",
    angry: "#ef4444, #dc2626",
    surprised: "#f97316, #fb923c",
    disgusted: "#22c55e, #16a34a",
    fearful: "#a855f7, #7c3aed",
    neutral: "#6b7280, #4b5563",
  };
  return gradients[emotion];
}
