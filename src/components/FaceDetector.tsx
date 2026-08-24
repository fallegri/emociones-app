"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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
  snapshotImage?: string;
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
  const [selectedResolution, setSelectedResolution] = useState<string>("720");

  // Snapshot mode state
  const [snapshotImage, setSnapshotImage] = useState<string | null>(null);
  const [snapshotPoem, setSnapshotPoem] = useState<string>("");
  const [snapshotEmotion, setSnapshotEmotion] = useState<EmotionType | null>(null);
  const [isSnapshotActive, setIsSnapshotActive] = useState(false);
  const isSnapshotActiveRef = useRef(false);
  const [compositedImage, setCompositedImage] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

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

  // Refs to hold latest props/callbacks without causing effect restarts
  const modeRef = useRef(mode);
  const eventNameRef = useRef(eventName);
  const aiConfigRef = useRef(aiConfig);
  const onCaptureRef = useRef(onCapture);
  const onPersonCountRef = useRef(onPersonCount);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { eventNameRef.current = eventName; }, [eventName]);
  useEffect(() => { aiConfigRef.current = aiConfig; }, [aiConfig]);
  useEffect(() => { onCaptureRef.current = onCapture; }, [onCapture]);
  useEffect(() => { onPersonCountRef.current = onPersonCount; }, [onPersonCount]);

  const CAPTURE_INTERVAL = 5000;
  const AI_THROTTLE_INTERVAL = 5000;
  const FACE_DISAPPEAR_RESET_MS = 3000;
  const SNAPSHOT_DISPLAY_MS = 10000;
  const SNAPSHOT_STABILIZATION_MS = 1500; // Wait after mode switch before triggering snapshot

  // Track client-side mount for portal rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset snapshot tracking when switching to snapshot mode so current faces can trigger it
  const prevModeRef = useRef<string>(mode);
  const snapshotModeActivatedAtRef = useRef<number>(0);
  useEffect(() => {
    if (mode === "snapshot" && prevModeRef.current !== "snapshot") {
      snapshotShownForFacesRef.current = new Set();
      snapshotModeActivatedAtRef.current = Date.now();
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
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
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

    const resolutions: Record<string, { width: number; height: number }> = {
      "480": { width: 640, height: 480 },
      "720": { width: 1280, height: 720 },
      "1080": { width: 1920, height: 1080 },
    };

    const res = resolutions[selectedResolution] || resolutions["720"];

    const startCamera = async () => {
      try {
        if (videoRef.current?.srcObject) {
          const existingTracks = (videoRef.current.srcObject as MediaStream).getTracks();
          existingTracks.forEach((track) => track.stop());
        }

        let stream: MediaStream;
        try {
          // Try with exact deviceId first
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: selectedDeviceId },
              width: { ideal: res.width },
              height: { ideal: res.height },
            },
          });
        } catch {
          // Fallback: try without resolution constraints
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: selectedDeviceId } },
          });
        }

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
  }, [isModelLoaded, selectedDeviceId, selectedResolution]);

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

  // Composite snapshot with overlay, emoji, poem, and watermark
  const compositeSnapshot = useCallback((imageDataUrl: string, emotion: EmotionType, poem: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }

        // Draw captured photo as background
        ctx.drawImage(img, 0, 0);

        // Semi-transparent dark gradient at bottom third
        const gradientStartY = img.height * 0.6;
        const gradient = ctx.createLinearGradient(0, gradientStartY, 0, img.height);
        gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        gradient.addColorStop(0.3, "rgba(0, 0, 0, 0.6)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.85)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, gradientStartY, img.width, img.height - gradientStartY);

        // Emoji centered above text area
        const emoji = emotionEmojis[emotion];
        const emojiFontSize = Math.max(40, img.width * 0.08);
        ctx.font = `${emojiFontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(emoji, img.width / 2, gradientStartY + emojiFontSize + 10);

        // Poem text with word-wrapping on the gradient area
        // Dynamically reduce font size if text would overflow the available space
        const availableHeight = img.height - (gradientStartY + emojiFontSize + 30);
        // Reserve space for the emotion label below the poem
        const reservedForLabel = Math.max(14, img.width * 0.028) * 2;
        const maxPoemHeight = availableHeight - reservedForLabel;

        let poemFontSize = Math.max(14, img.width * 0.028);
        const minPoemFontSize = 10;
        let lines: string[] = [];
        let lineHeight = poemFontSize * 1.5;

        // Try progressively smaller font sizes until the poem fits
        while (poemFontSize >= minPoemFontSize) {
          ctx.font = `italic ${poemFontSize}px Georgia, serif`;
          lineHeight = poemFontSize * 1.5;

          const maxTextWidth = img.width * 0.8;
          const words = poem.split(" ");
          lines = [];
          let currentLine = "";

          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxTextWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) lines.push(currentLine);

          const totalTextHeight = lines.length * lineHeight;
          if (totalTextHeight <= maxPoemHeight) break;

          // Reduce font and retry
          poemFontSize -= 2;
        }

        // Final cap: if still overflowing after hitting min font size, truncate lines
        const maxLines = Math.max(2, Math.floor(maxPoemHeight / lineHeight));
        if (lines.length > maxLines) {
          lines = lines.slice(0, maxLines);
          // Add ellipsis to last line
          lines[lines.length - 1] = lines[lines.length - 1] + "...";
        }

        ctx.font = `italic ${poemFontSize}px Georgia, serif`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
        ctx.textAlign = "center";

        const textStartY = gradientStartY + emojiFontSize + 30 + poemFontSize;

        lines.forEach((line, index) => {
          ctx.fillText(line, img.width / 2, textStartY + index * lineHeight);
        });

        // Emotion label below poem
        const labelY = textStartY + lines.length * lineHeight + poemFontSize;
        ctx.font = `${poemFontSize * 0.8}px sans-serif`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.fillText(emotionLabels[emotion], img.width / 2, labelY);

        // "EmotionAI" watermark in bottom-right corner
        const watermarkFontSize = Math.max(12, img.width * 0.02);
        ctx.font = `bold ${watermarkFontSize}px sans-serif`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.textAlign = "right";
        ctx.fillText("EmotionAI", img.width - 15, img.height - 15);

        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = () => resolve(null);
      img.src = imageDataUrl;
    });
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
    // Wait for stabilization after mode switch before triggering
    if (Date.now() - snapshotModeActivatedAtRef.current < SNAPSHOT_STABILIZATION_MS) return;

    // Check if we already showed snapshot for these faces
    const allShown = faceIds.every((id) => snapshotShownForFacesRef.current.has(id));
    if (allShown && faceIds.length > 0) return;

    // If faces are detected by SsdMobilenetv1 (minConfidence: 0.3), they are real - just trigger
    if (faces.length === 0) return;

    // Ensure video has valid dimensions before capturing
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const image = captureVideoSnapshot();
    if (!image) return;

    const poem = getRandomPoem(dominant);

    // Mark these faces as snapshot-shown ONLY after successful capture
    faceIds.forEach((id) => snapshotShownForFacesRef.current.add(id));

    // Set state to show popup
    setSnapshotImage(image);
    setSnapshotPoem(poem);
    setSnapshotEmotion(dominant);
    setIsSnapshotActive(true);
    isSnapshotActiveRef.current = true;

    // Composite the image with overlay (async, updates when ready)
    compositeSnapshot(image, dominant, poem).then((composited) => {
      if (composited) {
        setCompositedImage(composited);
      }
    });

    // Save snapshot capture to database
    const emotions = faces.map((f) => f.emotion);
    const captureData: CaptureData = {
      eventName,
      personCount: faces.length,
      emotions,
      dominantEmotion: dominant,
      message: poem,
      snapshotImage: image,
    };
    saveCapture(captureData);

    // Auto-dismiss after SNAPSHOT_DISPLAY_MS
    setTimeout(() => {
      setIsSnapshotActive(false);
      isSnapshotActiveRef.current = false;
      setSnapshotImage(null);
      setSnapshotPoem("");
      setSnapshotEmotion(null);
      setCompositedImage(null);
    }, SNAPSHOT_DISPLAY_MS);
  }, [captureVideoSnapshot, compositeSnapshot, eventName, saveCapture]);

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

  // Face detection loop - uses refs to avoid dependency-driven restarts
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

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
          .withFaceExpressions();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        const ctx = !isSnapshotActiveRef.current ? canvas.getContext("2d") : null;
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (resizedDetections.length > 0) {
          const faces: DetectedFace[] = resizedDetections.map((detection) => {
            const expressions = detection.expressions;
            const maxExpression = Object.entries(expressions).reduce((a, b) =>
              a[1] > b[1] ? a : b
            );

            const emotionKey: EmotionType = maxExpression[1] >= 0.25
              ? (maxExpression[0] as EmotionType)
              : "neutral";

            const box = detection.detection.box;

            if (ctx) {
              ctx.strokeStyle = "#00ff88";
              ctx.lineWidth = 2;
              ctx.strokeRect(box.x, box.y, box.width, box.height);
              const label = `${emotionEmojis[emotionKey]} ${emotionLabels[emotionKey]} (${Math.round(maxExpression[1] * 100)}%)`;
              ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
              ctx.fillRect(box.x, box.y - 28, ctx.measureText(label).width + 16, 28);
              ctx.fillStyle = "#00ff88";
              ctx.font = "14px sans-serif";
              ctx.fillText(label, box.x + 8, box.y - 8);
            }

            return {
              emotion: emotionKey,
              confidence: maxExpression[1],
              position: { x: box.x, y: box.y, width: box.width, height: box.height },
            };
          });

          setDetectedFaces(faces);

          const emotions = faces.map((f) => f.emotion);
          const dominant = getGroupDominantEmotion(emotions);
          setDominantEmotion(dominant);

          // Update face tracking
          const now = Date.now();
          lastFacesSeenTimeRef.current = now;
          const currentTracked = trackedFacesRef.current;
          const matchedIds: number[] = [];
          const unmatched: number[] = [];
          const usedIndices = new Set<number>();

          faces.forEach((face, idx) => {
            const cx = face.position.x + face.position.width / 2;
            const cy = face.position.y + face.position.height / 2;
            const threshold = face.position.width * 0.5;
            let best = -1, bestD = Infinity;
            currentTracked.forEach((t, ti) => {
              if (usedIndices.has(ti)) return;
              const d = Math.sqrt((cx - t.centerX) ** 2 + (cy - t.centerY) ** 2);
              if (d < threshold && d < bestD) { bestD = d; best = ti; }
            });
            if (best >= 0) {
              usedIndices.add(best);
              currentTracked[best].centerX = cx;
              currentTracked[best].centerY = cy;
              currentTracked[best].width = face.position.width;
              currentTracked[best].height = face.position.height;
              currentTracked[best].lastSeen = now;
              matchedIds.push(currentTracked[best].id);
            } else {
              unmatched.push(idx);
            }
          });

          unmatched.forEach((idx) => {
            const face = faces[idx];
            const newId = nextFaceIdRef.current++;
            currentTracked.push({
              id: newId,
              centerX: face.position.x + face.position.width / 2,
              centerY: face.position.y + face.position.height / 2,
              width: face.position.width,
              height: face.position.height,
              lastSeen: now,
            });
            uniquePersonCountRef.current++;
            matchedIds.push(newId);
          });

          trackedFacesRef.current = currentTracked.filter(t => now - t.lastSeen < FACE_DISAPPEAR_RESET_MS);
          onPersonCountRef.current?.(uniquePersonCountRef.current);

          // Snapshot mode
          if (modeRef.current === "snapshot" && !isSnapshotActiveRef.current) {
            const stabilized = Date.now() - snapshotModeActivatedAtRef.current > SNAPSHOT_STABILIZATION_MS;
            const allShown = matchedIds.every(id => snapshotShownForFacesRef.current.has(id));
            
            if (stabilized && !allShown && video.videoWidth > 0) {
              // Capture snapshot
              const tempCanvas = document.createElement("canvas");
              tempCanvas.width = video.videoWidth;
              tempCanvas.height = video.videoHeight;
              const tCtx = tempCanvas.getContext("2d");
              if (tCtx) {
                tCtx.drawImage(video, 0, 0);
                const image = tempCanvas.toDataURL("image/jpeg", 0.85);
                const poem = getRandomPoem(dominant);

                matchedIds.forEach(id => snapshotShownForFacesRef.current.add(id));
                
                setSnapshotImage(image);
                setSnapshotPoem(poem);
                setSnapshotEmotion(dominant);
                setIsSnapshotActive(true);
                isSnapshotActiveRef.current = true;

                // Save to DB
                fetch("/api/captures", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    eventName: eventNameRef.current,
                    personCount: faces.length,
                    emotions,
                    dominantEmotion: dominant,
                    message: poem,
                    snapshotImage: image,
                  }),
                }).then(() => onCaptureRef.current?.({
                  eventName: eventNameRef.current,
                  personCount: faces.length,
                  emotions,
                  dominantEmotion: dominant,
                  message: poem,
                  snapshotImage: image,
                })).catch(() => {});

                // Composite image async
                const cImg = new Image();
                cImg.onload = () => {
                  const c = document.createElement("canvas");
                  c.width = cImg.width; c.height = cImg.height;
                  const cCtx = c.getContext("2d");
                  if (cCtx) {
                    cCtx.drawImage(cImg, 0, 0);
                    const gy = cImg.height * 0.55;
                    const grad = cCtx.createLinearGradient(0, gy, 0, cImg.height);
                    grad.addColorStop(0, "rgba(0,0,0,0)");
                    grad.addColorStop(0.3, "rgba(0,0,0,0.7)");
                    grad.addColorStop(1, "rgba(0,0,0,0.9)");
                    cCtx.fillStyle = grad;
                    cCtx.fillRect(0, gy, cImg.width, cImg.height - gy);
                    const fs = Math.max(16, cImg.width * 0.03);
                    cCtx.font = `italic ${fs}px Georgia, serif`;
                    cCtx.fillStyle = "rgba(255,255,255,0.9)";
                    cCtx.textAlign = "center";
                    // Word wrap poem
                    const words = poem.split(" ");
                    const lines: string[] = [];
                    let line = "";
                    for (const w of words) {
                      const test = line ? `${line} ${w}` : w;
                      if (cCtx.measureText(test).width > cImg.width * 0.8 && line) {
                        lines.push(line); line = w;
                      } else line = test;
                    }
                    if (line) lines.push(line);
                    const startY = gy + 40;
                    lines.slice(0, 5).forEach((l, i) => {
                      cCtx.fillText(l, cImg.width / 2, startY + i * fs * 1.4);
                    });
                    cCtx.font = `bold ${fs * 0.7}px sans-serif`;
                    cCtx.fillStyle = "rgba(255,255,255,0.5)";
                    cCtx.textAlign = "right";
                    cCtx.fillText("EmotionAI", cImg.width - 10, cImg.height - 10);
                    setCompositedImage(c.toDataURL("image/jpeg", 0.9));
                  }
                };
                cImg.src = image;

                // Auto dismiss
                setTimeout(() => {
                  setIsSnapshotActive(false);
                  isSnapshotActiveRef.current = false;
                  setSnapshotImage(null);
                  setSnapshotPoem("");
                  setSnapshotEmotion(null);
                  setCompositedImage(null);
                }, SNAPSHOT_DISPLAY_MS);
              }
            }
          }

          // Per-person emotion tracking (contador mode)
          if (modeRef.current === "contador" && matchedIds.length > 0) {
            matchedIds.forEach((id, idx) => {
              const em = faces[idx]?.emotion;
              if (!em) return;
              const last = personLastEmotionRef.current.get(id);
              if (last !== em) {
                personLastEmotionRef.current.set(id, em);
                const hist = personEmotionHistoryRef.current.get(id) || [];
                hist.push({ emotion: em, timestamp: new Date().toISOString() });
                personEmotionHistoryRef.current.set(id, hist);
              }
            });
          }

          // Auto-save to database at intervals
          if (now - lastCaptureTime.current >= CAPTURE_INTERVAL) {
            lastCaptureTime.current = now;
            const personEmotions: PersonEmotionData[] = [];
            if (modeRef.current === "contador") {
              personEmotionHistoryRef.current.forEach((ems, pid) => {
                personEmotions.push({ personId: `per${pid}`, emotions: ems });
              });
              personEmotionHistoryRef.current.clear();
            }
            const captureData: CaptureData = {
              eventName: eventNameRef.current,
              personCount: faces.length,
              emotions,
              dominantEmotion: dominant,
              message: currentMessageRef.current,
              ...(personEmotions.length > 0 ? { personEmotions } : {}),
            };
            fetch("/api/captures", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(captureData),
            }).then(() => onCaptureRef.current?.(captureData)).catch(() => {});
          }
        } else {
          setDetectedFaces([]);
          setDominantEmotion(null);
          if (Date.now() - lastFacesSeenTimeRef.current > FACE_DISAPPEAR_RESET_MS) {
            trackedFacesRef.current = [];
          }
        }
      } catch (err) {
        console.error("Detection error:", err);
      }

      isDetecting = false;
      animationId = requestAnimationFrame(detect);
    };

    animationId = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(animationId);
  }, [isModelLoaded]);

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
    <div className="space-y-2">
      {/* Camera and resolution selectors - always show resolution */}
      <div className="w-full flex flex-wrap items-center gap-2">
        {videoDevices.length > 0 && (
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-1.5 bg-gray-800/80 border border-gray-700/50 rounded-lg text-xs text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all duration-200"
          >
            {videoDevices.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camara ${index + 1}`}
              </option>
            ))}
          </select>
        )}
        <select
          value={selectedResolution}
          onChange={(e) => setSelectedResolution(e.target.value)}
          className="px-3 py-1.5 bg-gray-800/80 border border-gray-700/50 rounded-lg text-xs text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all duration-200"
        >
          <option value="480">480p (640×480)</option>
          <option value="720">720p HD (1280×720)</option>
          <option value="1080">1080p Full HD (1920×1080)</option>
        </select>
      </div>

      {/* Video container */}
      <div className="relative rounded-xl overflow-hidden bg-gray-900 shadow-2xl border border-gray-700/30 w-full max-h-[60vh]">
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
          className="w-full max-h-[60vh] object-contain"
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

        {/* Snapshot overlay removed from here - now shown as full-screen popup below */}

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

      {/* Full-screen snapshot popup modal - rendered via portal to escape overflow/transform contexts */}
      {isMounted && isSnapshotActive && snapshotEmotion && snapshotImage && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4" style={{ margin: 0 }}>
          <div className="w-full max-w-lg rounded-xl overflow-hidden shadow-2xl border border-white/20 flex flex-col items-center bg-gray-900">
            <img
              src={compositedImage || snapshotImage}
              alt="Snapshot con poema"
              className="w-full object-contain max-h-[60vh]"
            />
            {!compositedImage && snapshotPoem && (
              <div className="w-full p-3 text-center bg-gray-800">
                <p className="text-white text-sm italic">&ldquo;{snapshotPoem}&rdquo;</p>
                <p className="text-gray-400 text-xs mt-1">{emotionEmojis[snapshotEmotion]} {emotionLabels[snapshotEmotion]}</p>
              </div>
            )}
            <div className="w-full p-3 bg-gray-900 flex items-center justify-center gap-3">
              <a
                href={compositedImage || snapshotImage}
                download={`emotionai-${snapshotEmotion}-${Date.now()}.jpg`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-all text-sm flex items-center gap-2"
              >
                ⬇️ Descargar
              </a>
              <button
                onClick={() => {
                  setIsSnapshotActive(false);
                  isSnapshotActiveRef.current = false;
                  setSnapshotImage(null);
                  setSnapshotPoem("");
                  setSnapshotEmotion(null);
                  setCompositedImage(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium rounded-lg transition-all text-sm"
              >
                ✕ Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

