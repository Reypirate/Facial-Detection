import { useEffect, useRef, useState, useCallback } from "react";
import { SavedFace, HandResult, CocoPrediction } from "../types/models";
import { classifyGesture } from "@/utils/gestureClassifier";
import { drawLabeledBox, drawHandSkeleton, getHandBoundingBox, COLORS } from "@/utils/drawingHelpers";
import { playGestureSound } from "@/utils/sounds";
import { checkGestureAction } from "@/utils/gestureActions";

// Face Matching helper
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
            }

            resized.forEach((det: any) => {
                const box = det.detection.box;
                const conf = Math.round(det.detection.score * 100);

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
            });
        } else {
            setHandCount(0);
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
        lastDescriptorRef
    };
}
