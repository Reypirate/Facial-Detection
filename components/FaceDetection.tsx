"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import { registerGestureAction } from "@/utils/gestureActions";
import { toggleSounds } from "@/utils/sounds";
import Dashboard from "./Dashboard";
import Photobooth from "./Photobooth";
import { useCamera } from "@/hooks/useCamera";
import { useAIModels } from "@/hooks/useAIModels";
import { useDetection } from "@/hooks/useDetection";
import { SavedFace } from "@/types/models";

// ─── Face Registration store ────────────────────────────────────────────
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

// ─── Tabs ───────────────────────────────────────────────────────────────
type TabId = "detection" | "photobooth" | "register";

export default function FaceDetection() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [activeTab, setActiveTab] = useState<TabId>("detection");
    const [detectionPaused, setDetectionPaused] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const { videoRef, cameraReady, cameraError, retryCamera } = useCamera();
    const {
        faceModelsReady,
        handModelsReady,
        objectModelReady,
        handResultsRef,
        objectModelRef,
        onFaceApiLoad,
        onCocoSsdLoad,
        onHandsLoad
    } = useAIModels(videoRef);

    // Face registration state
    const [registerName, setRegisterName] = useState("");
    const [registerStatus, setRegisterStatus] = useState("");
    const [savedFaces, setSavedFaces] = useState<SavedFace[]>([]);

    useEffect(() => {
        setSavedFaces(loadSavedFaces());
    }, []);

    // Registration visual feedback logic
    const {
        faceCount,
        handCount,
        objectCount,
        fps,
        topExpression,
        topGesture,
        emotionHistory,
        lastDescriptorRef
    } = useDetection({
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
    });

    const isRegistrationReady = lastDescriptorRef.current !== null && registerName.trim().length > 0;

    // Register global gesture actions manually
    useEffect(() => {
        registerGestureAction("THUMBS UP 👍", () => {
            window.dispatchEvent(new CustomEvent("gesture-capture"));
        });
    }, []);

    // ── Status text ─────────────────────────────────────────────────────
    const getStatusText = () => {
        if (cameraError) return "⚠️ Camera denied. Allow permissions & refresh.";
        if (!cameraReady) return "Initializing camera...";
        
        const parts = [];
        if (faceModelsReady) parts.push("Face");
        if (handModelsReady) parts.push("Hand");
        if (objectModelReady) parts.push("Object");

        if (parts.length === 0) {
            return "📷 Camera active. Loading AI models...";
        } else if (parts.length < 3) {
            return `✅ ${parts.join(" + ")} AI ready. Loading others...`;
        } else {
            return "✅ All AI Ready — Detecting faces, hands & objects";
        }
    };
    const status = getStatusText();

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

    const areAllModelsLoading = cameraReady && (!faceModelsReady || !handModelsReady || !objectModelReady);
    
    // Dynamic border for recording tab
    let videoBorderClass = "border-emerald-500/50 shadow-emerald-500/20";
    if (activeTab === "register") {
        videoBorderClass = isRegistrationReady 
            ? "border-green-500 shadow-green-500/40" 
            : "border-red-500/50 shadow-red-500/20";
    }

    const TABS: { id: TabId; label: string; emoji: string }[] = [
        { id: "detection", label: "Detection", emoji: "🔍" },
        { id: "photobooth", label: "Photobooth", emoji: "📸" },
        { id: "register", label: "Faces", emoji: "🏷️" },
    ];

    if (cameraError) {
        return (
            <div className="flex flex-col items-center justify-center w-full max-w-[640px] h-[480px] bg-zinc-900 rounded-xl border border-red-500/50 text-center p-6 shadow-2xl shadow-red-500/10">
                <p className="text-4xl mb-4">📷</p>
                <h2 className="text-red-400 font-bold mb-2 font-mono">Camera Permission Denied</h2>
                <p className="text-zinc-400 text-sm mb-6">
                    Please allow access to your camera in your browser settings to use the AI detection features.
                </p>
                <button
                    onClick={retryCamera}
                    className="px-6 py-3 bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 rounded-lg transition-all font-mono text-sm uppercase tracking-wider"
                >
                    Retry Camera
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full">
            {/* AI Model Scripts */}
            <Script
                src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"
                strategy="lazyOnload"
                onLoad={onFaceApiLoad}
            />
            <Script
                src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js"
                strategy="lazyOnload"
                onLoad={() => {
                    // Start COCO-SSD load request after tf loads
                    const cocoScript = document.createElement("script");
                    cocoScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js";
                    cocoScript.onload = onCocoSsdLoad;
                    document.head.appendChild(cocoScript);
                }}
            />
            <Script
                src="https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js"
                strategy="lazyOnload"
                crossOrigin="anonymous"
                onLoad={onHandsLoad}
            />

            {/* Tab bar */}
            <div className="flex gap-1 mb-4 bg-zinc-800/60 p-1 rounded-xl border border-zinc-700">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-mono transition-all ${
                            activeTab === tab.id
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                                : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                        }`}
                    >
                        {tab.emoji} {tab.label}
                    </button>
                ))}
            </div>

            {/* Camera view */}
            <div className={`relative rounded-xl overflow-hidden border-2 shadow-2xl transition-all duration-300 ${videoBorderClass}`}>
                <video
                    ref={videoRef}
                    width={640}
                    height={480}
                    muted
                    playsInline
                    className="rounded-xl bg-black"
                    style={{ transform: "scaleX(-1)" }}
                />
                <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={{ transform: "scaleX(-1)" }}
                />
                
                {/* Visual initial loading state indicator overlay */}
                {areAllModelsLoading && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm z-10 transition-opacity">
                        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
                        <span className="text-emerald-400 font-mono text-sm tracking-widest animate-pulse">LOADING AI ENGINES...</span>
                    </div>
                )}

                {/* Scan line */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none border border-emerald-500/20 rounded-xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent animate-pulse" />
                </div>
                {/* Paused overlay */}
                {detectionPaused && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
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
                    <span className="w-3 h-3 rounded-sm bg-[#00ff88]" /> Face
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-[#ff00ff]" /> Hand
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-[#00ddff]" /> Object
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
                <Photobooth videoRef={videoRef} canvasRef={canvasRef} />
            )}

            {activeTab === "register" && (
                <div className="w-full max-w-[640px] mt-4 space-y-3">
                    <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-4 py-3 transition-colors">
                        <p className="text-zinc-500 text-[10px] font-mono uppercase mb-2">
                            Register Your Face
                        </p>
                        <p className="text-zinc-400 text-xs mb-3">
                            Look at the camera and enter your name. Once registered, the app will
                            show your name instead of "HUMAN". The frame will glow green when ready to register.
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
                                disabled={!isRegistrationReady}
                                className={`px-4 py-2 font-bold rounded-lg text-sm transition-all ${
                                    isRegistrationReady 
                                        ? "bg-emerald-500 text-black hover:bg-emerald-400" 
                                        : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                                }`}
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
