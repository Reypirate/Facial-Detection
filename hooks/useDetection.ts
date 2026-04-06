import { useEffect, useRef, useState, useCallback } from "react";
import { SavedFace, HandResult, FingerName, FingerStates, FINGER_CONFIG } from "../types/models";
import { getFingerStates } from "@/utils/gestureClassifier";
import { drawLabeledBox, drawHandSkeleton, getHandBoundingBox, COLORS } from "@/utils/drawingHelpers";
import { playSample, initSoundboard } from "@/utils/sounds";

// ─── Liveness Detection (EAR) Helper ────────────────────────────────────
function calculateEAR(eyeLandmarks: any[]) {
    const v1 = Math.hypot(eyeLandmarks[1].x - eyeLandmarks[5].x, eyeLandmarks[1].y - eyeLandmarks[5].y);
    const v2 = Math.hypot(eyeLandmarks[2].x - eyeLandmarks[4].x, eyeLandmarks[2].y - eyeLandmarks[4].y);
    const h = Math.hypot(eyeLandmarks[0].x - eyeLandmarks[3].x, eyeLandmarks[0].y - eyeLandmarks[3].y);
    return (v1 + v2) / (2.0 * h);
}

// ─── Face Matching helper ───────────────────────────────────────────────
function matchFace(descriptor: Float32Array, saved: SavedFace[]): string | null {
    if (saved.length === 0) return null;
    let bestMatch: string | null = null;
    let bestDist = 0.6;
    for (const face of saved) {
        let sum = 0;
        for (let i = 0; i < descriptor.length; i++) {
            sum += Math.pow(descriptor[i] - face.descriptor[i], 2);
        }
        const dist = Math.sqrt(sum);
        if (dist < bestDist) {
            bestDist = dist;
            bestMatch = face.name;
        }
    }
    return bestMatch;
}

// ─── Draw floating glowing text above a finger tip ──────────────────────
function drawFingerLabel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    label: string,
    color: string
) {
    const textY = y - 30; // Float above the fingertip

    ctx.save();

    // Outer glow
    ctx.font = "bold 28px 'Inter', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = color;
    ctx.shadowBlur = 25;
    ctx.fillStyle = color;
    ctx.fillText(label, x, textY);

    // Inner brighter pass for intensity
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.8;
    ctx.fillText(label, x, textY);

    // Pulsing ring around fingertip
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.stroke();

    ctx.restore();
}

interface DetectionProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    cameraReady: boolean;
    faceModelsReady: boolean;
    handModelsReady: boolean;
    objectModelReady: boolean;
    handResultsRef: React.MutableRefObject<HandResult | null>;
    objectModelRef: React.MutableRefObject<any>;
    detectionPaused: boolean;
    savedFaces: SavedFace[];
}

export function useDetection({
    videoRef,
    canvasRef,
    cameraReady,
    faceModelsReady,
    handModelsReady,
    objectModelReady,
    handResultsRef,
    objectModelRef,
    detectionPaused,
    savedFaces
}: DetectionProps) {
    const [faceCount, setFaceCount] = useState(0);
    const [handCount, setHandCount] = useState(0);
    const [objectCount, setObjectCount] = useState(0);
    const [fps, setFps] = useState(0);
    const [topExpression, setTopExpression] = useState("");
    const [topGesture, setTopGesture] = useState("");
    const [emotionHistory, setEmotionHistory] = useState<
        { time: number; emotion: string; score: number }[]
    >([]);
    
    // Advanced Tracking States
    const [hasBlinked, setHasBlinked] = useState(false);
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
    const [isPinching, setIsPinching] = useState(false);

    const livenessRef = useRef(false);
    const pinchCooldownRef = useRef(0);
    const lastDescriptorRef = useRef<Float32Array | null>(null);
    const frameCountRef = useRef(0);
    const lastFpsTime = useRef(Date.now());
    const requestRef = useRef<number | null>(null);

    // ─── Soundboard: previous finger state for edge detection ───────────
    const prevFingerDownRef = useRef<Record<FingerName, boolean>>({
        index: false,
        middle: false,
        ring: false,
        pinky: false,
    });

    // Initialize soundboard audio buffers on mount
    useEffect(() => {
        initSoundboard();
    }, []);

    const detectionLoop = useCallback(async () => {
        if (!cameraReady || detectionPaused) {
            requestRef.current = requestAnimationFrame(detectionLoop);
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== 4) {
            requestRef.current = requestAnimationFrame(detectionLoop);
            return;
        }

        const w = video.videoWidth;
        const h = video.videoHeight;
        
        // 1. Await all async predictions BEFORE altering the canvas at all
        let faceDets: any = null;
        let objectDets: any = null;

        if (faceModelsReady && (window as any).faceapi) {
            try {
                const fa = (window as any).faceapi;
                faceDets = await fa
                    .detectAllFaces(video, new fa.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceExpressions()
                    .withFaceDescriptors();
            } catch (e) {
                console.error("Face detection error:", e);
            }
        }

        if (objectModelReady && objectModelRef.current) {
            try {
                objectDets = await objectModelRef.current.detect(video);
            } catch (e) {
                console.error("Object detection error:", e);
            }
        }

        // 2. Prepare Canvas now that data is ready
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            requestRef.current = requestAnimationFrame(detectionLoop);
            return;
        }
        ctx.clearRect(0, 0, w, h);

        // FPS
        frameCountRef.current++;
        const now = Date.now();
        if (now - lastFpsTime.current >= 1000) {
            setFps(frameCountRef.current);
            frameCountRef.current = 0;
            lastFpsTime.current = now;
        }

        // 3. Draw Faces
        if (faceModelsReady && faceDets) {
            const fa = (window as any).faceapi;
            const resized = fa.resizeResults(faceDets, { width: w, height: h });
            setFaceCount(resized.length);

            if (resized.length === 0) {
                lastDescriptorRef.current = null;
                if (livenessRef.current) {
                    livenessRef.current = false;
                    setHasBlinked(false);
                }
            }

            resized.forEach((det: any) => {
                const box = det.detection.box;
                const conf = Math.round(det.detection.score * 100);

                // Check Blink
                const landmarks = det.landmarks;
                if (landmarks && !livenessRef.current) {
                    const leftEye = landmarks.getLeftEye();
                    const rightEye = landmarks.getRightEye();
                    const leftEAR = calculateEAR(leftEye);
                    const rightEAR = calculateEAR(rightEye);
                    const avgEAR = (leftEAR + rightEAR) / 2.0;
                    if (avgEAR < 0.2) {
                        livenessRef.current = true;
                        setHasBlinked(true);
                    }
                }

                let label = `HUMAN ${conf}%`;
                if (det.descriptor) {
                    lastDescriptorRef.current = det.descriptor;
                    const name = matchFace(det.descriptor, savedFaces);
                    if (name) label = `${name.toUpperCase()} ${conf}%`;
                }

                const sorted = Object.entries(det.expressions).sort(
                    (a: any, b: any) => b[1] - a[1]
                );
                const expr =
                    sorted.length > 0
                        ? `${(sorted[0][0] as string).toUpperCase()} ${Math.round(
                            (sorted[0][1] as number) * 100
                        )}%`
                        : undefined;

                if (sorted.length > 0) {
                    setTopExpression(expr || "");
                    setEmotionHistory((prev) => [
                        ...prev.slice(-30),
                        {
                            time: Date.now(),
                            emotion: sorted[0][0] as string,
                            score: sorted[0][1] as number,
                        },
                    ]);
                }

                drawLabeledBox(ctx, box, label, COLORS.face, expr);
            });
        } else if (!faceModelsReady) {
            setFaceCount(0);
        }

        // 4. Draw Hands — Soundboard + Virtual Cursor
        if (handModelsReady && handResultsRef.current?.multiHandLandmarks) {
            const results = handResultsRef.current;
            const hands = results.multiHandLandmarks;
            setHandCount(hands.length);

            hands.forEach((landmarks: any[], idx: number) => {
                const handedness = results.multiHandedness?.[idx]?.label || "Hand";
                const box = getHandBoundingBox(landmarks, w, h);

                // ─── Finger State Detection (Soundboard) ───
                const fingerStates: FingerStates = getFingerStates(landmarks);
                const fingerNames: FingerName[] = ["index", "middle", "ring", "pinky"];
                const activeLabels: string[] = [];

                for (const finger of fingerNames) {
                    const state = fingerStates[finger];
                    const config = FINGER_CONFIG[finger];
                    const wasDown = prevFingerDownRef.current[finger];

                    if (state.isDown) {
                        activeLabels.push(config.label);

                        // Edge detection: trigger sound only on the frame finger goes DOWN
                        if (!wasDown) {
                            playSample(finger);
                        }

                        // Draw glowing floating text above the fingertip
                        const tipPx = state.tipX * w;
                        const tipPy = state.tipY * h;
                        drawFingerLabel(ctx, tipPx, tipPy, config.label, config.color);
                    }
                }

                // Update previous state for next frame's edge detection
                prevFingerDownRef.current = {
                    index: fingerStates.index.isDown,
                    middle: fingerStates.middle.isDown,
                    ring: fingerStates.ring.isDown,
                    pinky: fingerStates.pinky.isDown,
                };

                // Update gesture display with active soundboard labels
                const gestureText = activeLabels.length > 0
                    ? activeLabels.join(" · ")
                    : "LISTENING...";
                setTopGesture(gestureText);

                // Draw hand bounding box and skeleton
                drawLabeledBox(ctx, box, gestureText, COLORS.hand, `${handedness} hand`);
                drawHandSkeleton(ctx, landmarks, w, h);

                // ─── Virtual Cursor & Pinch Click (preserved) ───
                if (idx === 0) {
                    const indexTip = landmarks[8];
                    const thumbTip = landmarks[4];
                    
                    const pX = indexTip.x * w;
                    const pY = indexTip.y * h;
                    setCursorPos({ x: pX, y: pY });

                    // Draw glowing cursor dot
                    ctx.beginPath();
                    ctx.arc(pX, pY, 8, 0, 2 * Math.PI);
                    ctx.fillStyle = "#00ff88";
                    ctx.shadowColor = "#00ff88";
                    ctx.shadowBlur = 15;
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    const pinchDist = Math.hypot(pX - thumbTip.x * w, pY - thumbTip.y * h);
                    
                    if (pinchDist < 30) {
                        setIsPinching(true);
                        ctx.beginPath();
                        ctx.arc(pX, pY, 15, 0, 2 * Math.PI);
                        ctx.strokeStyle = "#ff00ff";
                        ctx.lineWidth = 3;
                        ctx.stroke();

                        if (now - pinchCooldownRef.current > 1000) {
                            pinchCooldownRef.current = now;
                            const canvasRect = canvas.getBoundingClientRect();
                            const flippedX = w - pX; 
                            const scaleX = canvasRect.width / w;
                            const scaleY = canvasRect.height / h;
                            const screenX = canvasRect.left + (flippedX * scaleX);
                            const screenY = canvasRect.top + (pY * scaleY);
                            const element = document.elementFromPoint(screenX, screenY);
                            if (element && element instanceof HTMLElement) {
                                element.click();
                            }
                        }
                    } else {
                        setIsPinching(false);
                    }
                }
            });
        } else {
            setHandCount(0);
            setCursorPos(null);
            setIsPinching(false);
            // Reset finger states when no hand detected
            prevFingerDownRef.current = {
                index: false,
                middle: false,
                ring: false,
                pinky: false,
            };
        }

        // 5. Draw Objects
        if (objectModelReady && objectDets) {
            const filtered = objectDets.filter(
                (p: any) => p.class !== "person" && p.score > 0.5
            );
            setObjectCount(filtered.length);

            filtered.forEach((pred: any) => {
                const [x, y, bw, bh] = pred.bbox;
                const label = `${pred.class.toUpperCase()} ${Math.round(pred.score * 100)}%`;
                drawLabeledBox(ctx, { x, y, width: bw, height: bh }, label, COLORS.object);
            });
        } else if (!objectModelReady) {
            setObjectCount(0);
        }

        requestRef.current = requestAnimationFrame(detectionLoop);
    }, [
        cameraReady,
        detectionPaused,
        faceModelsReady,
        handModelsReady,
        objectModelReady,
        handResultsRef,
        objectModelRef,
        savedFaces,
        videoRef,
        canvasRef
    ]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(detectionLoop);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [detectionLoop]);

    return {
        faceCount,
        handCount,
        objectCount,
        fps,
        topExpression,
        topGesture,
        emotionHistory,
        lastDescriptorRef,
        hasBlinked,
        cursorPos,
        isPinching
    };
}
