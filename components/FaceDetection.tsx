"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import { registerGestureAction } from "@/utils/gestureActions";
import { toggleSounds } from "@/utils/sounds";
import { cn } from "@/utils/cn";
import Dashboard from "./Dashboard";
import Photobooth from "./Photobooth";
import { useCamera } from "@/hooks/useCamera";
import { useAIModels } from "@/hooks/useAIModels";
import { useDetection } from "@/hooks/useDetection";
import { SavedFace } from "@/types/models";
import RegisterTab from "./RegisterTab";

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
    // 1. Core Detection Canvas
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
        lastDescriptorRef,
        hasBlinked,
        cursorPos,
        isPinching
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

    const isRegistrationReady = lastDescriptorRef.current !== null && registerName.trim().length > 0 && hasBlinked;

    // Register global gesture actions manually
    useEffect(() => {
        registerGestureAction("THUMBS UP 👍", () => {
            window.dispatchEvent(new CustomEvent("gesture-capture"));
        });
    }, []);

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
    let videoBorderClass = "border-white/10";
    if (activeTab === "register") {
        videoBorderClass = isRegistrationReady 
            ? "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]" 
            : "border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]";
    }

    const TABS: { id: TabId; label: string; emoji: string }[] = [
        { id: "detection", label: "Detection", emoji: "🔍" },
        { id: "photobooth", label: "Photobooth", emoji: "📸" },
        { id: "register", label: "Faces", emoji: "🏷️" },
    ];

    if (cameraError) {
        return (
            <div className={cn(
                "flex flex-col items-center justify-center w-full max-w-[800px] aspect-[4/3]",
                "bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-red-500/30 text-center",
                "p-6 shadow-[0_0_50px_rgba(239,68,68,0.1)]"
            )}>
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <p className="text-4xl animate-bounce">📷</p>
                </div>
                <h2 className="text-red-400 font-bold mb-3 font-mono text-xl tracking-tight">Camera Permission Denied</h2>
                <p className="text-zinc-400 text-sm mb-8 max-w-sm leading-relaxed">
                    AI Vision Studio requires camera access to process local models. Please allow permissions in your browser.
                </p>
                <button
                    onClick={retryCamera}
                    className={cn(
                        "px-8 py-3 bg-red-500/10 text-red-400 border border-red-500/50 rounded-xl",
                        "hover:bg-red-500/20 transition-all font-mono text-sm uppercase tracking-widest font-bold"
                    )}
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    // ── Status Indicator ──
    const renderStatusIndicator = () => {
        if (!cameraReady) {
            return (
                <div className="flex items-center gap-3">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
                    </span>
                    <span className="text-yellow-400 font-mono text-xs font-bold tracking-wider">CAMERA BOOT</span>
                </div>
            );
        }
        if (areAllModelsLoading) {
            return (
                <div className="flex items-center gap-3">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
                    </span>
                    <span className="text-yellow-400 font-mono text-xs font-bold tracking-wider">LOADING AI CORE</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-mono text-xs font-bold tracking-wider">SYSTEM ACTIVE</span>
            </div>
        );
    };

    return (
        <div className="flex flex-col items-center w-full">
            {/* AI Model Scripts */}
            <Script src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js" strategy="lazyOnload" onLoad={onFaceApiLoad} />
            <Script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js" strategy="lazyOnload" onLoad={() => {
                const cocoScript = document.createElement("script");
                cocoScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js";
                cocoScript.onload = onCocoSsdLoad;
                document.head.appendChild(cocoScript);
            }} />
            <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js" strategy="lazyOnload" crossOrigin="anonymous" onLoad={onHandsLoad} />

            {/* Main Stage */}
            <div className={cn(
                "relative w-full max-w-[800px] aspect-[4/3] rounded-2xl overflow-hidden",
                "border shadow-2xl transition-all duration-500 bg-black",
                videoBorderClass
            )}>
                
                {/* Raw Video Feed */}
                <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                />

                {/* Layer 2: Detection Bounding Boxes and Logic */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{ transform: "scaleX(-1)" }}
                />

                {/* Top Nav (Hovering) */}
                <div className="absolute top-4 inset-x-4 z-30 flex justify-between items-start pointer-events-none">
                    {/* Tab Bar */}
                    <div className="pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-1 flex gap-1 shadow-lg">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-mono transition-all font-bold",
                                    activeTab === tab.id
                                        ? "bg-emerald-500/20 text-emerald-400 shadow-[inset_0_0_10px_rgba(16,185,129,0.2)]"
                                        : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                {tab.emoji} <span className="hidden sm:inline-block ml-1">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Status Pill */}
                    <div className="pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2.5 shadow-lg">
                        {renderStatusIndicator()}
                    </div>
                </div>

                {/* Center Loading State */}
                {areAllModelsLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/60 backdrop-blur-sm pointer-events-none">
                        <div className={cn(
                            "w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500",
                            "rounded-full animate-spin mb-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                        )} />
                    </div>
                )}

                {/* Scan line effect */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent animate-pulse" />
                </div>
                
                {/* Paused Overlay */}
                {detectionPaused && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20 pointer-events-none">
                        <span className="text-4xl font-bold font-mono text-yellow-400 tracking-widest drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">PAUSED</span>
                    </div>
                )}
            </div>

            <div className="w-full max-w-[800px] mt-4 flex flex-col items-center justify-end z-30">
                <div className={cn(
                    "w-full overflow-y-auto no-scrollbar rounded-2xl bg-black/40",
                    "backdrop-blur-xl border border-white/10 shadow-lg transition-all p-5"
                )}>
                    
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
                            <RegisterTab
                                registerName={registerName}
                                setRegisterName={setRegisterName}
                                registerStatus={registerStatus}
                                savedFaces={savedFaces}
                                hasBlinked={hasBlinked}
                                isRegistrationReady={isRegistrationReady}
                                onRegister={handleRegisterFace}
                                onDeleteFace={handleDeleteFace}
                            />
                        )}
                    </div>
                </div>

            {/* Legend Below the controls */}
            <div className="mt-4 flex gap-6 px-4 py-2 bg-black/30 backdrop-blur-md rounded-full border border-white/5 text-[10px] font-mono tracking-widest uppercase font-bold text-zinc-500">
                <span className="flex items-center gap-2 transition-colors hover:text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#00ff88]" /> Face Net
                </span>
                <span className="flex items-center gap-2 transition-colors hover:text-cyan-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#00bbff]" /> Gesture Net
                </span>
                <span className="flex items-center gap-2 transition-colors hover:text-orange-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#ff9f43]" /> Object Net
                </span>
            </div>
        </div>
    );
}
