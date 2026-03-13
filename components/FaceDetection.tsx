"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { classifyGesture } from "@/utils/gestureClassifier";
import {
    drawLabeledBox,
    drawHandSkeleton,
    getHandBoundingBox,
    COLORS,
} from "@/utils/drawingHelpers";
import { playGestureSound, toggleSounds, isSoundEnabled } from "@/utils/sounds";
import { registerGestureAction, checkGestureAction } from "@/utils/gestureActions";
import Dashboard from "./Dashboard";
import Photobooth from "./Photobooth";

declare global {
    interface Window {
        faceapi: any;
        cocoSsd: any;
    }
}

// ─── Face Registration store ────────────────────────────────────────────
interface SavedFace {
    name: string;
    descriptor: Float32Array;
}

function loadSavedFaces(): SavedFace[] {
    try {
        const raw = localStorage.getItem("ai-vision-faces");
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return parsed.map((f: any) => ({
            name: f.name,
            descriptor: new Float32Array(f.descriptor),
        }));
    } catch {
        return [];
    }
}

function saveFaceToDB(name: string, descriptor: Float32Array) {
    const existing = loadSavedFaces();
    existing.push({ name, descriptor });
    const serialized = existing.map((f) => ({
        name: f.name,
        descriptor: Array.from(f.descriptor),
    }));
    localStorage.setItem("ai-vision-faces", JSON.stringify(serialized));
}

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

// ─── Tabs ───────────────────────────────────────────────────────────────
type TabId = "detection" | "photobooth" | "register";

export default function FaceDetection() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState("Initializing camera...");
    const [cameraReady, setCameraReady] = useState(false);
    const [faceModelsReady, setFaceModelsReady] = useState(false);
    const [handModelsReady, setHandModelsReady] = useState(false);
    const [objectModelReady, setObjectModelReady] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const handResultsRef = useRef<any>(null);
    const objectModelRef = useRef<any>(null);
    const [activeTab, setActiveTab] = useState<TabId>("detection");
    const [detectionPaused, setDetectionPaused] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Dashboard state
    const [faceCount, setFaceCount] = useState(0);
    const [handCount, setHandCount] = useState(0);
    const [objectCount, setObjectCount] = useState(0);
    const [fps, setFps] = useState(0);
    const [topExpression, setTopExpression] = useState("");
    const [topGesture, setTopGesture] = useState("");
    const [emotionHistory, setEmotionHistory] = useState<
        { time: number; emotion: string; score: number }[]
    >([]);

    // Face registration
    const [registerName, setRegisterName] = useState("");
    const [registerStatus, setRegisterStatus] = useState("");
    const [savedFaces, setSavedFaces] = useState<SavedFace[]>([]);
    const lastDescriptorRef = useRef<Float32Array | null>(null);

    // FPS counter
    const frameCountRef = useRef(0);
    const lastFpsTime = useRef(Date.now());

    // Gesture action cooldown ref
    const lastGestureSound = useRef<string>("");
    const lastGestureSoundTime = useRef(0);

    useEffect(() => {
        setSavedFaces(loadSavedFaces());
    }, []);

    // Register gesture actions
    useEffect(() => {
        registerGestureAction("THUMBS UP 👍", () => {
            // Trigger photobooth capture (handled via event)
            window.dispatchEvent(new CustomEvent("gesture-capture"));
        });
        registerGestureAction("FIST ✊", () => {
            setDetectionPaused((p) => !p);
        });
    }, []);

    // ── Load face-api.js ────────────────────────────────────────────────
    useEffect(() => {
        const script = document.createElement("script");
        script.src =
            "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
        script.async = true;
        script.onload = async () => {
            try {
                const faceapi = window.faceapi;
                await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
                await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
                await faceapi.nets.faceExpressionNet.loadFromUri("/models");
                await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
                setFaceModelsReady(true);
            } catch (err) {
                console.error("Face model error:", err);
            }
        };
        document.head.appendChild(script);
        return () => {
            try { document.head.removeChild(script); } catch { }
        };
    }, []);

    // ── Load COCO-SSD ───────────────────────────────────────────────────
    useEffect(() => {
        const tfScript = document.createElement("script");
        tfScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js";
        tfScript.async = true;
        document.head.appendChild(tfScript);

        tfScript.onload = () => {
            const cocoScript = document.createElement("script");
            cocoScript.src =
                "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js";
            cocoScript.async = true;
            document.head.appendChild(cocoScript);

            cocoScript.onload = async () => {
                try {
                    const model = await (window as any).cocoSsd.load();
                    objectModelRef.current = model;
                    setObjectModelReady(true);
                } catch (err) {
                    console.error("COCO-SSD error:", err);
                }
            };
        };
    }, []);

    // ── Load MediaPipe Hands ────────────────────────────────────────────
    useEffect(() => {
        let mounted = true;

        async function loadHands() {
            const script = document.createElement("script");
            script.src =
                "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js";
            script.crossOrigin = "anonymous";
            document.head.appendChild(script);

            await new Promise<void>((r) => (script.onload = () => r()));
            await new Promise((r) => setTimeout(r, 500));
            if (!mounted) return;

            try {
                const hands = new (window as any).Hands({
                    locateFile: (file: string) =>
                        `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
                });
                hands.setOptions({
                    maxNumHands: 2,
                    modelComplexity: 1,
                    minDetectionConfidence: 0.7,
                    minTrackingConfidence: 0.5,
                });
                hands.onResults((r: any) => {
                    handResultsRef.current = r;
                });

                const check = setInterval(() => {
                    if (videoRef.current && videoRef.current.readyState === 4) {
                        clearInterval(check);
                        async function sendFrame() {
                            if (!mounted || !videoRef.current) return;
                            try { await hands.send({ image: videoRef.current }); } catch { }
                            requestAnimationFrame(sendFrame);
                        }
                        sendFrame();
                        setHandModelsReady(true);
                    }
                }, 500);
            } catch (err) {
                console.error("MediaPipe error:", err);
            }
        }

        loadHands();
        return () => { mounted = false; };
    }, []);

    // ── Camera ──────────────────────────────────────────────────────────
    useEffect(() => {
        let stream: MediaStream | null = null;
        async function start() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480, facingMode: "user" },
                    audio: false,
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                    setCameraReady(true);
                }
            } catch {
                setStatus("⚠️ Camera denied. Allow permissions & refresh.");
            }
        }
        start();
        return () => {
            if (stream) stream.getTracks().forEach((t) => t.stop());
        };
    }, []);

    // ── Status updates ──────────────────────────────────────────────────
    useEffect(() => {
        if (!cameraReady) return;
        const parts = [];
        if (faceModelsReady) parts.push("Face");
        if (handModelsReady) parts.push("Hand");
        if (objectModelReady) parts.push("Object");

        if (parts.length === 0) {
            setStatus("📷 Camera active. Loading AI models...");
        } else if (parts.length < 3) {
            setStatus(`✅ ${parts.join(" + ")} AI ready. Loading others...`);
        } else {
            setStatus("✅ All AI Ready — Detecting faces, hands & objects");
        }
    }, [cameraReady, faceModelsReady, handModelsReady, objectModelReady]);

    // ── Detection loop ──────────────────────────────────────────────────
    useEffect(() => {
        if (!cameraReady) return;
        const anyReady = faceModelsReady || handModelsReady || objectModelReady;
        if (!anyReady) return;

        intervalRef.current = setInterval(async () => {
            if (detectionPaused) return;

            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || video.readyState !== 4) return;

            const w = video.videoWidth;
            const h = video.videoHeight;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            ctx.clearRect(0, 0, w, h);

            // FPS
            frameCountRef.current++;
            const now = Date.now();
            if (now - lastFpsTime.current >= 1000) {
                setFps(frameCountRef.current);
                frameCountRef.current = 0;
                lastFpsTime.current = now;
            }

            // ── Face detection ──
            if (faceModelsReady && window.faceapi) {
                try {
                    const fa = window.faceapi;
                    const dets = await fa
                        .detectAllFaces(video, new fa.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
                        .withFaceLandmarks()
                        .withFaceExpressions()
                        .withFaceDescriptors();

                    const resized = fa.resizeResults(dets, { width: w, height: h });
                    setFaceCount(resized.length);

                    resized.forEach((det: any) => {
                        const box = det.detection.box;
                        const conf = Math.round(det.detection.score * 100);

                        // Try to match against saved faces
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
                } catch { }
            }

            // ── Hand detection ──
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

                    // Sound on new gesture
                    const now2 = Date.now();
                    if (
                        gesture !== lastGestureSound.current &&
                        now2 - lastGestureSoundTime.current > 1500
                    ) {
                        lastGestureSound.current = gesture;
                        lastGestureSoundTime.current = now2;
                        playGestureSound(gesture);
                    }

                    // Gesture actions
                    checkGestureAction(gesture);
                });
            } else {
                setHandCount(0);
            }

            // ── Object detection ──
            if (objectModelReady && objectModelRef.current) {
                try {
                    const preds = await objectModelRef.current.detect(video);
                    // Filter out "person" since we already have face detection
                    const filtered = preds.filter(
                        (p: any) => p.class !== "person" && p.score > 0.5
                    );
                    setObjectCount(filtered.length);

                    filtered.forEach((pred: any) => {
                        const [x, y, bw, bh] = pred.bbox;
                        const label = `${pred.class.toUpperCase()} ${Math.round(pred.score * 100)}%`;
                        drawLabeledBox(ctx, { x, y, width: bw, height: bh }, label, COLORS.object);
                    });
                } catch { }
            }
        }, 200);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [cameraReady, faceModelsReady, handModelsReady, objectModelReady, detectionPaused, savedFaces]);

    // ── Face registration handler ───────────────────────────────────────
    const handleRegisterFace = () => {
        if (!registerName.trim()) {
            setRegisterStatus("⚠️ Enter a name first!");
            return;
        }
        if (!lastDescriptorRef.current) {
            setRegisterStatus("⚠️ No face detected. Look at the camera!");
            return;
        }
        saveFaceToDB(registerName.trim(), lastDescriptorRef.current);
        setSavedFaces(loadSavedFaces());
        setRegisterStatus(`✅ "${registerName}" registered!`);
        setRegisterName("");
        setTimeout(() => setRegisterStatus(""), 3000);
    };

    const handleDeleteFace = (name: string) => {
        const remaining = savedFaces.filter((f) => f.name !== name);
        const serialized = remaining.map((f) => ({
            name: f.name,
            descriptor: Array.from(f.descriptor),
        }));
        localStorage.setItem("ai-vision-faces", JSON.stringify(serialized));
        setSavedFaces(remaining);
    };

    const handleToggleSound = () => {
        const next = !soundEnabled;
        setSoundEnabled(next);
        toggleSounds(next);
    };

    // ── Tab content renderers ───────────────────────────────────────────
    const TABS: { id: TabId; label: string; emoji: string }[] = [
        { id: "detection", label: "Detection", emoji: "🔍" },
        { id: "photobooth", label: "Photobooth", emoji: "📸" },
        { id: "register", label: "Faces", emoji: "🏷️" },
    ];

    return (
        <div className="flex flex-col items-center w-full">
            {/* Tab bar */}
            <div className="flex gap-1 mb-4 bg-zinc-800/60 p-1 rounded-xl border border-zinc-700">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-mono transition-all ${activeTab === tab.id
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                                : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                            }`}
                    >
                        {tab.emoji} {tab.label}
                    </button>
                ))}
            </div>

            {/* Camera view */}
            <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500/50 shadow-2xl shadow-emerald-500/20">
                <video
                    ref={videoRef as any}
                    width={640}
                    height={480}
                    muted
                    playsInline
                    className="rounded-xl bg-black"
                    style={{ transform: "scaleX(-1)" }}
                />
                <canvas
                    ref={canvasRef as any}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={{ transform: "scaleX(-1)" }}
                />
                {/* Scan line */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none border border-emerald-500/20 rounded-xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent animate-pulse" />
                </div>
                {/* Paused overlay */}
                {detectionPaused && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-4xl font-bold text-yellow-400 animate-pulse">⏸ PAUSED</span>
                    </div>
                )}
            </div>

            {/* Status */}
            <div className="mt-3 px-4 py-2 bg-zinc-800/80 border border-zinc-700 rounded-lg">
                <p className="text-emerald-400 font-mono text-sm">{status}</p>
            </div>

            {/* Legend */}
            <div className="mt-2 flex gap-4 text-xs font-mono">
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm" style={{ background: COLORS.face }} /> Face
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm" style={{ background: COLORS.hand }} /> Hand
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm" style={{ background: COLORS.object }} /> Object
                </span>
            </div>

            {/* Tab content */}
            {activeTab === "detection" && (
                <Dashboard
                    faceCount={faceCount}
                    handCount={handCount}
                    objectCount={objectCount}
                    fps={fps}
                    topExpression={topExpression}
                    topGesture={topGesture}
                    emotionHistory={emotionHistory}
                    soundEnabled={soundEnabled}
                    onToggleSound={handleToggleSound}
                    detectionPaused={detectionPaused}
                />
            )}

            {activeTab === "photobooth" && (
                <Photobooth videoRef={videoRef as any} canvasRef={canvasRef as any} />
            )}

            {activeTab === "register" && (
                <div className="w-full max-w-[640px] mt-4 space-y-3">
                    <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-4 py-3">
                        <p className="text-zinc-500 text-[10px] font-mono uppercase mb-2">
                            Register Your Face
                        </p>
                        <p className="text-zinc-400 text-xs mb-3">
                            Look at the camera and enter your name. Once registered, the app will
                            show your name instead of &quot;HUMAN&quot;.
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={registerName}
                                onChange={(e) => setRegisterName(e.target.value)}
                                placeholder="Your name..."
                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                            />
                            <button
                                onClick={handleRegisterFace}
                                className="px-4 py-2 bg-emerald-500 text-black font-bold rounded-lg text-sm hover:bg-emerald-400 transition-all"
                            >
                                Register
                            </button>
                        </div>
                        {registerStatus && (
                            <p className="mt-2 text-sm font-mono text-emerald-400">{registerStatus}</p>
                        )}
                    </div>

                    {savedFaces.length > 0 && (
                        <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-4 py-3">
                            <p className="text-zinc-500 text-[10px] font-mono uppercase mb-2">
                                Saved Faces ({savedFaces.length})
                            </p>
                            <div className="space-y-1">
                                {savedFaces.map((f, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between border border-zinc-700 rounded-lg px-3 py-1.5"
                                    >
                                        <span className="text-white font-mono text-sm">
                                            🏷️ {f.name}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteFace(f.name)}
                                            className="text-red-400 hover:text-red-300 text-xs font-mono"
                                        >
                                            ✕ Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
