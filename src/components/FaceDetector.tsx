"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import { EmotionType, emotionLabels, emotionEmojis, getRandomMessage, getGroupDominantEmotion } from "@/lib/emotions";
import { getRandomPoem } from "@/lib/poems";
import { AIProviderConfig } from "@/lib/ai-config";

interface DetectedFace {
  emotion: EmotionType;
  confidence: number;
  position: { x: number; y: number; width: number; height: number };
}

interface TrackedFace {
  id: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  lastSeen: number;
}

interface Props {
  eventName: string;
  aiConfig?: AIProviderConfig | null;
  mode: "snapshot" | "contador";
  onCapture?: (data: CaptureData) => void;
  onPersonCount?: (count: number) => void;
}

export interface PersonEmotionEntry {
  emotion: string;
  timestamp: string;
}

export interface PersonEmotionData {
  personId: string;
  emotions: PersonEmotionEntry[];
}

export interface CaptureData {
  eventName: string;
  personCount: number;
  emotions: EmotionType[];
  dominantEmotion: EmotionType;
  message: string;
  personEmotions?: PersonEmotionData[];
}

export default function FaceDetector({ eventName, aiConfig, mode, onCapture, onPersonCount }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [dominantEmotion, setDominantEmotion] = useState<EmotionType | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  // Snapshot mode state
  const [snapshotImage, setSnapshotImage] = useState<string | null>(null);
  const [snapshotPoem, setSnapshotPoem] = useState<string>("");
  const [snapshotEmotion, setSnapshotEmotion] = useState<EmotionType | null>(null);
  const [isSnapshotActive, setIsSnapshotActive] = useState(false);

  const lastCaptureTime = useRef<number>(0);
  const lastAICallTime = useRef<number>(0);
  const aiMessagePending = useRef<boolean>(false);
  const currentMessageRef = useRef<string>("");

  // Face tracking refs
  const trackedFacesRef = useRef<TrackedFace[]>([]);
  const uniquePersonCountRef = useRef<number>(0);
  const nextFaceIdRef = useRef<number>(1);
  const lastFacesSeenTimeRef = useRef<number>(Date.now());
  const snapshotShownForFacesRef = useRef<Set<number>>(new Set());

  // Per-person emotion history (for contador mode)
  const personEmotionHistoryRef = useRef<Map<number, PersonEmotionEntry[]>>(new Map());
  const personLastEmotionRef = useRef<Map<number, string>>(new Map());

  // Tracked face IDs for current detections (to show in UI)
  const [currentFaceIds, setCurrentFaceIds] = useState<number[]>([]);

  const CAPTURE_INTERVAL = 5000;
  const AI_THROTTLE_INTERVAL = 5000;
  const FACE_DISAPPEAR_RESET_MS = 3000;
  const SNAPSHOT_DISPLAY_MS = 10000;

  // Reset snapshot tracking when switching to snapshot mode so current faces can trigger it
  const prevModeRef = useRef<string>(mode);
  useEffect(() => {
    if (mode === "snapshot" && prevModeRef.current !== "snapshot") {
      snapshotShownForFacesRef.current = new Set();
    }
    prevModeRef.current = mode;
  }, [mode]);

  // Keep the ref in sync with state
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

  // Enumerate available video devices
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach((track) => track.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((d) => d.kind === "videoinput");
        setVideoDevices(cameras);
        if (cameras.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(cameras[0].deviceId);
        }
      } catch (err) {
        console.error("Error enumerating devices:", err);
      }
    };
    if (isModelLoaded) {
      enumerateDevices();
    }
  }, [isModelLoaded]);

  // Start webcam with selected device
  useEffect(() => {
    if (!isModelLoaded || !selectedDeviceId) return;

    const startCamera = async () => {
      try {
        if (videoRef.current?.srcObject) {
          const existingTracks = (videoRef.current.srcObject as MediaStream).getTracks();
          existingTracks.forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: { exact: selectedDeviceId },
            width: 720,
            height: 560,
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
  }, [isModelLoaded, selectedDeviceId]);

  // Face tracking: match detected faces to tracked faces
  const updateTracking = useCallback((faces: DetectedFace[]): number[] => {
    const now = Date.now();

    if (faces.length === 0) {
      // If no faces for more than FACE_DISAPPEAR_RESET_MS, reset tracking array
      // but keep cumulative unique count and snapshot history for the session
      if (now - lastFacesSeenTimeRef.current > FACE_DISAPPEAR_RESET_MS) {
        trackedFacesRef.current = [];
      }
      return [];
    }

    lastFacesSeenTimeRef.current = now;

    const currentTracked = trackedFacesRef.current;
    const matchedTrackIds: number[] = [];
    const unmatchedFaceIndices: number[] = [];
    const usedTrackedIndices = new Set<number>();

    // For each detected face, try to match to existing tracked face
    faces.forEach((face, faceIdx) => {
      const faceCenterX = face.position.x + face.position.width / 2;
      const faceCenterY = face.position.y + face.position.height / 2;
      const threshold = face.position.width * 0.5;

      let bestMatch = -1;
      let bestDist = Infinity;

      currentTracked.forEach((tracked, trackIdx) => {
        if (usedTrackedIndices.has(trackIdx)) return;
        const dist = Math.sqrt(
          Math.pow(faceCenterX - tracked.centerX, 2) +
          Math.pow(faceCenterY - tracked.centerY, 2)
        );
        if (dist < threshold && dist < bestDist) {
          bestDist = dist;
          bestMatch = trackIdx;
        }
      });

      if (bestMatch >= 0) {
        // Update tracked face position
        usedTrackedIndices.add(bestMatch);
        currentTracked[bestMatch].centerX = faceCenterX;
        currentTracked[bestMatch].centerY = faceCenterY;
        currentTracked[bestMatch].width = face.position.width;
        currentTracked[bestMatch].height = face.position.height;
        currentTracked[bestMatch].lastSeen = now;
        matchedTrackIds.push(currentTracked[bestMatch].id);
      } else {
        unmatchedFaceIndices.push(faceIdx);
      }
    });

    // Create new tracked faces for unmatched detections
    unmatchedFaceIndices.forEach((faceIdx) => {
      const face = faces[faceIdx];
      const newId = nextFaceIdRef.current++;
      const newTracked: TrackedFace = {
        id: newId,
        centerX: face.position.x + face.position.width / 2,
        centerY: face.position.y + face.position.height / 2,
        width: face.position.width,
        height: face.position.height,
        lastSeen: now,
      };
      currentTracked.push(newTracked);
      uniquePersonCountRef.current++;
      matchedTrackIds.push(newId);
    });

    // Remove old tracked faces (not seen for a while)
    trackedFacesRef.current = currentTracked.filter(
      (t) => now - t.lastSeen < FACE_DISAPPEAR_RESET_MS
    );

    onPersonCount?.(uniquePersonCountRef.current);
    return matchedTrackIds;
  }, [onPersonCount]);

  // Capture snapshot from video
  const captureVideoSnapshot = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video) return null;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return tempCanvas.toDataURL("image/jpeg", 0.85);
  }, []);

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

  // Handle snapshot mode trigger
  const triggerSnapshot = useCallback((faces: DetectedFace[], dominant: EmotionType, faceIds: number[]) => {
    // Check if we already showed snapshot for these faces
    const allShown = faceIds.every((id) => snapshotShownForFacesRef.current.has(id));
    if (allShown && faceIds.length > 0) return;

    // For groups: check if at least 50% have confidence > 0.3
    if (faces.length > 1) {
      const confidentFaces = faces.filter((f) => f.confidence > 0.3);
      if (confidentFaces.length < faces.length * 0.5) return;
    } else if (faces.length === 1) {
      // Single face must also meet minimum confidence threshold
      if (faces[0].confidence <= 0.3) return;
    }

    const image = captureVideoSnapshot();
    if (!image) return;

    const poem = getRandomPoem(dominant);
    setSnapshotImage(image);
    setSnapshotPoem(poem);
    setSnapshotEmotion(dominant);
    setIsSnapshotActive(true);

    // Mark these faces as snapshot-shown
    faceIds.forEach((id) => snapshotShownForFacesRef.current.add(id));

    // Save snapshot capture to database
    const emotions = faces.map((f) => f.emotion);
    const captureData: CaptureData = {
      eventName,
      personCount: faces.length,
      emotions,
      dominantEmotion: dominant,
      message: poem,
    };
    saveCapture(captureData);

    // Auto-dismiss after SNAPSHOT_DISPLAY_MS
    setTimeout(() => {
      setIsSnapshotActive(false);
      setSnapshotImage(null);
      setSnapshotPoem("");
      setSnapshotEmotion(null);
    }, SNAPSHOT_DISPLAY_MS);
  }, [captureVideoSnapshot, eventName, saveCapture]);

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

      // Only draw on canvas when snapshot is not active
      const ctx = !isSnapshotActive ? canvas.getContext("2d") : null;
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

        // Update face tracking
        const faceIds = updateTracking(faces);
        setCurrentFaceIds(faceIds);

        // Per-person emotion tracking (contador mode)
        if (mode === "contador" && faceIds.length > 0) {
          faceIds.forEach((id, idx) => {
            const currentEmotion = faces[idx]?.emotion;
            if (!currentEmotion) return;

            const lastEmotion = personLastEmotionRef.current.get(id);
            if (lastEmotion !== currentEmotion) {
              personLastEmotionRef.current.set(id, currentEmotion);
              const history = personEmotionHistoryRef.current.get(id) || [];
              history.push({
                emotion: currentEmotion,
                timestamp: new Date().toISOString(),
              });
              personEmotionHistoryRef.current.set(id, history);
              console.log(`per${id}: ${lastEmotion || "inicio"} -> ${currentEmotion}`);
            }
          });
        }

        // Mode-specific behavior
        if (mode === "snapshot" && !isSnapshotActive) {
          // Trigger snapshot if conditions are met
          triggerSnapshot(faces, dominant, faceIds);
        }

        // Generate message (for contador mode or when snapshot not active)
        if (mode === "contador") {
          if (aiConfig && aiConfig.baseUrl && aiConfig.apiKey && aiConfig.modelName) {
            generateAIMessage(emotions, faces.length, dominant);
          } else {
            const isGroup = faces.length > 1;
            const message = getRandomMessage(dominant, isGroup);
            setCurrentMessage(message);
            currentMessageRef.current = message;
          }
        }

        // Auto-save to database at intervals
        const now = Date.now();
        if (now - lastCaptureTime.current >= CAPTURE_INTERVAL) {
          lastCaptureTime.current = now;

          // Build personEmotions data from history
          const personEmotions: PersonEmotionData[] = [];
          if (mode === "contador") {
            personEmotionHistoryRef.current.forEach((emotions, personId) => {
              personEmotions.push({
                personId: `per${personId}`,
                emotions,
              });
            });
          }

          const captureData: CaptureData = {
            eventName,
            personCount: faces.length,
            emotions,
            dominantEmotion: dominant,
            message: currentMessageRef.current,
            ...(personEmotions.length > 0 ? { personEmotions } : {}),
          };
          saveCapture(captureData);
        }
      } else {
        setDetectedFaces([]);
        setCurrentMessage("");
        setDominantEmotion(null);
        // Update tracking with empty faces (handles reset logic)
        updateTracking([]);
      }

      isDetecting = false;
      animationId = requestAnimationFrame(detect);
    };

    animationId = requestAnimationFrame(detect);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isModelLoaded, isSnapshotActive, eventName, mode, saveCapture, aiConfig, generateAIMessage, updateTracking, triggerSnapshot]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px] bg-red-900/20 border border-red-700/30 rounded-xl p-6 sm:p-8">
        <div className="text-center">
          <p className="text-red-400 text-base sm:text-lg font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-all duration-200"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Camera selector */}
      {videoDevices.length > 1 && (
        <div className="w-full lg:max-w-[933px] lg:mx-auto">
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Camara
          </label>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-gray-800/80 border border-gray-700/50 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all duration-200"
          >
            {videoDevices.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camara ${index + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Video container */}
      <div className="relative rounded-xl overflow-hidden bg-gray-900 shadow-2xl border border-gray-700/30 w-full lg:max-w-[933px] lg:mx-auto">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
              <p className="text-gray-300 text-sm">Cargando modelos de IA...</p>
            </div>
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full max-h-[400px] sm:max-h-[480px] lg:max-h-[560px] object-cover"
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

        {/* Snapshot overlay */}
        {isSnapshotActive && snapshotImage && snapshotEmotion && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 animate-zoom-in">
            <div className="w-[90%] max-w-lg rounded-xl overflow-hidden shadow-2xl border border-white/20">
              <img
                src={snapshotImage}
                alt="Snapshot capturado"
                className="w-full object-cover max-h-[300px]"
              />
              <div
                className="p-4 sm:p-6 text-center"
                style={{
                  background: `linear-gradient(135deg, ${getEmotionBg(snapshotEmotion)})`,
                }}
              >
                <p className="text-2xl sm:text-3xl mb-2">
                  {emotionEmojis[snapshotEmotion]}
                </p>
                <p className="text-white/90 text-sm sm:text-base italic leading-relaxed">
                  &ldquo;{snapshotPoem}&rdquo;
                </p>
                <p className="text-white/60 text-xs mt-3">
                  {emotionLabels[snapshotEmotion]}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Overlay info */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2">
          <p className="text-emerald-400 text-xs sm:text-sm font-medium">
            📡 {detectedFaces.length > 0 ? "Detectando" : "Buscando..."}
          </p>
        </div>

        {detectedFaces.length > 0 && (
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2">
            <p className="text-white text-xs sm:text-sm">
              👥 <span className="font-bold">{detectedFaces.length}</span>{" "}
              {detectedFaces.length === 1 ? "persona" : "personas"}
            </p>
          </div>
        )}
      </div>

      {/* Emotion message (Contador mode only) */}
      {mode === "contador" && currentMessage && dominantEmotion && (
        <div
          className="rounded-xl p-4 sm:p-6 text-center shadow-lg transition-all duration-500 animate-fade-in w-full lg:max-w-[933px] lg:mx-auto border border-white/10"
          style={{
            background: `linear-gradient(135deg, ${getEmotionBg(dominantEmotion)})`
          }}
        >
          <p className="text-xl sm:text-2xl font-bold text-white mb-1">
            {emotionEmojis[dominantEmotion]} {emotionLabels[dominantEmotion]}
          </p>
          <p className="text-white/90 text-sm sm:text-lg">{currentMessage}</p>
          {detectedFaces.length > 1 && (
            <p className="text-white/70 text-xs sm:text-sm mt-2">
              Emociones del grupo: {detectedFaces.map(f => emotionEmojis[f.emotion]).join(" ")}
            </p>
          )}
        </div>
      )}

      {/* Detection panel */}
      {detectedFaces.length > 0 && (
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-gray-700/50 w-full lg:max-w-[933px] lg:mx-auto">
          <h3 className="text-white font-semibold mb-3 text-xs sm:text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Personas detectadas: {detectedFaces.length}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {detectedFaces.map((face, i) => {
              const faceId = currentFaceIds[i];
              const emotionColor = getEmotionAccentColor(face.emotion);
              return (
                <div
                  key={faceId || i}
                  className="bg-gray-900/80 rounded-lg p-2.5 sm:p-3 text-center border-l-4 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200"
                  style={{ borderLeftColor: emotionColor }}
                >
                  <p className="text-xl sm:text-2xl">{emotionEmojis[face.emotion]}</p>
                  <p className="text-white text-[10px] sm:text-xs mt-1 font-bold tracking-wide">
                    {faceId ? `per${faceId}` : `Persona ${i + 1}`}
                  </p>
                  <p className="text-white/80 text-[10px] sm:text-xs font-medium">
                    {emotionLabels[face.emotion]}
                  </p>
                  <p className="text-emerald-300 text-[10px] font-semibold">
                    {Math.round(face.confidence * 100)}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getEmotionBg(emotion: EmotionType): string {
  const gradients: Record<EmotionType, string> = {
    happy: "#fbbf24, #f59e0b",
    sad: "#60a5fa, #818cf8",
    angry: "#f87171, #ef4444",
    surprised: "#fb923c, #f97316",
    disgusted: "#4ade80, #22c55e",
    fearful: "#c084fc, #a855f7",
    neutral: "#9ca3af, #6b7280",
  };
  return gradients[emotion];
}

function getEmotionAccentColor(emotion: EmotionType): string {
  const colors: Record<EmotionType, string> = {
    happy: "#fbbf24",
    sad: "#60a5fa",
    angry: "#f87171",
    surprised: "#fb923c",
    disgusted: "#4ade80",
    fearful: "#c084fc",
    neutral: "#9ca3af",
  };
  return colors[emotion];
}
