import { useEffect, useRef, useState, useCallback } from "react";
import { SavedFace, HandResult, CocoPrediction } from "../types/models";
import { classifyGesture } from "@/utils/gestureClassifier";
import { drawLabeledBox, drawHandSkeleton, getHandBoundingBox, COLORS } from "@/utils/drawingHelpers";
import { playGestureSound } from "@/utils/sounds";
import { checkGestureAction } from "@/utils/gestureActions";

// ─── Liveness Detection (EAR) Helper ────────────────────────────────────
function calculateEAR(eyeLandmarks: any[]) {
    // eyeLandmarks is an array of 6 points. 
    // vertical distances:
    const v1 = Math.hypot(eyeLandmarks[1].x - eyeLandmarks[5].x, eyeLandmarks[1].y - eyeLandmarks[5].y);
    const v2 = Math.hypot(eyeLandmarks[2].x - eyeLandmarks[4].x, eyeLandmarks[2].y - eyeLandmarks[4].y);
    // horizontal distance:
    const h = Math.hypot(eyeLandmarks[0].x - eyeLandmarks[3].x, eyeLandmarks[0].y - eyeLandmarks[3].y);
    
    return (v1 + v2) / (2.0 * h);
}

// ─── Face Matching helper ───────────────────────────────────────────────
function matchFace(descriptor: Float32Array, saved: SavedFace[]): string | null {
    if (saved.length === 0) return null;
    let bestMatch: string | null = null;
    let bestDist = 0.6; // threshold
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
    const lastGestureSound = useRef<string>("");
    const lastGestureSoundTime = useRef(0);
    const requestRef = useRef<number | null>(null);

    // This loop effectively replaces the setInterval loop mapping predictions to UI and canvas
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
            // DEBUG LOG HERE
            if (frameCountRef.current % 30 === 0) console.log("Faces detected:", resized.length, "Raw dets:", faceDets.length);

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

                    // Standard EAR threshold for a blink is around 0.2
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

        // 4. Draw Hands (Synchronous from ref)
        if (handModelsReady && handResultsRef.current?.multiHandLandmarks) {
            const results = handResultsRef.current;
            const hands = results.multiHandLandmarks;
            setHandCount(hands.length);

            hands.forEach((landmarks: any[], idx: number) => {
                const gesture = classifyGesture(landmarks);
                const box = getHandBoundingBox(landmarks, w, h);
                const handedness = results.multiHandedness?.[idx]?.label || "Hand";

                setTopGesture(gesture);
                drawLabeledBox(ctx, box, gesture, COLORS.hand, `${handedness} hand`);
                drawHandSkeleton(ctx, landmarks, w, h);

                const now2 = Date.now();
                if (
                    gesture !== lastGestureSound.current &&
                    now2 - lastGestureSoundTime.current > 1500
                ) {
                    lastGestureSound.current = gesture;
                    lastGestureSoundTime.current = now2;
                    playGestureSound(gesture);
                }

                checkGestureAction(gesture);

                // ─── Virtual Cursor & Pinch Click ───
                // Only process cursor for the first hand detected
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
                        // Draw pinch indicator
                        ctx.beginPath();
                        ctx.arc(pX, pY, 15, 0, 2 * Math.PI);
                        ctx.strokeStyle = "#ff00ff";
                        ctx.lineWidth = 3;
                        ctx.stroke();

                        if (now - pinchCooldownRef.current > 1000) {
                            pinchCooldownRef.current = now;
                            
                            // Map canvas coordinates to screen for synthetic click
                            const canvasRect = canvas.getBoundingClientRect();
                            // Because video is horizontally flipped in CSS via scaleX(-1), 
                            // we must invert the X coordinate relative to the canvas width.
                            const flippedX = w - pX; 
                            const scaleX = canvasRect.width / w;
                            const scaleY = canvasRect.height / h;
                            
                            const screenX = canvasRect.left + (flippedX * scaleX);
                            const screenY = canvasRect.top + (pY * scaleY);
                            
                            // Trigger synthetic DOM click
                            const element = document.elementFromPoint(screenX, screenY);
                            if (element && element instanceof HTMLElement) {
                                element.click();
                                playGestureSound("PINCH_CLICK"); // Optional audio feedback
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
