"use client";

import React, { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { toggleSounds } from "@/utils/sounds";
import { cn } from "@/utils/cn";
import Dashboard from "./Dashboard";
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
type TabId = "detection" | "register" | "soundboard";

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
        savedFaces,
        activeTab
    });

    const isRegistrationReady = lastDescriptorRef.current !== null && registerName.trim().length > 0 && hasBlinked;

    const handleRegisterFace = () => {
        if (!registerName.trim()) {
            setRegisterStatus("Please enter a name.");
            return;
        }
        if (!lastDescriptorRef.current) {
            setRegisterStatus("No face detected. Look at the camera.");
            return;
        }
        saveFaceToDB(registerName.trim(), lastDescriptorRef.current);
        setSavedFaces(loadSavedFaces());
        setRegisterStatus(`✓ Registered: ${registerName}`);
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
    
    // Soft border states
    let videoBorderClass = "border-warm-300/40";
    if (activeTab === "register") {
        videoBorderClass = isRegistrationReady 
            ? "border-emerald-300 shadow-sm" 
            : "border-rose-200 shadow-sm";
    } else if (activeTab === "soundboard") {
        videoBorderClass = "border-soft-lavender/60 shadow-sm";
    }

    const TABS: { id: TabId; label: string; icon: string }[] = [
        { id: "detection", label: "Detection", icon: "👁" },
        { id: "register", label: "Register", icon: "✎" },
        { id: "soundboard", label: "Whisper Board", icon: "♪" },
    ];

    if (cameraError) {
        return (
            <div className={cn(
                "flex flex-col items-center justify-center w-full max-w-[800px] aspect-[4/3]",
                "bg-white rounded-2xl border border-warm-300/50 text-center",
                "p-8 shadow-sm"
            )}>
                <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mb-5">
                    <p className="text-3xl">📷</p>
                </div>
                <h2 className="text-slate-700 font-medium mb-2 text-lg">Camera Access Needed</h2>
                <p className="text-warm-400 text-sm mb-6 max-w-sm leading-relaxed">
                    Please allow camera access so we can detect faces and hands.
                </p>
                <button
                    onClick={retryCamera}
                    className={cn(
                        "px-6 py-2.5 bg-slate-700 text-white rounded-xl",
                        "hover:bg-slate-600 transition-all text-sm font-medium shadow-sm"
                    )}
                >
                    Try Again
                </button>
            </div>
        );
    }

    // ── Status Indicator ──
    const renderStatusIndicator = () => {
        if (!cameraReady) {
            return (
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                    </span>
                    <span className="text-warm-500 text-[10px] font-medium tracking-wider">Connecting...</span>
                </div>
            );
        }
        if (areAllModelsLoading) {
            return (
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                    </span>
                    <span className="text-warm-500 text-[10px] font-medium tracking-wider">Loading models...</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span className="text-warm-500 text-[10px] font-medium tracking-wider">Ready</span>
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
                "border shadow-sm transition-all duration-500 bg-cream-50",
                videoBorderClass
            )}>
                
                {/* Raw Video Feed */}
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ transform: "scaleX(-1)", filter: "brightness(1.02) contrast(1.02)" }}
                />

                {/* Detection Canvas Overlay */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{ transform: "scaleX(-1)" }}
                />

                {/* Top Nav */}
                <div className="absolute top-3 inset-x-3 z-30 flex justify-between items-start pointer-events-none">
                    {/* Tab Bar */}
                    <div className="pointer-events-auto bg-white/80 backdrop-blur-md border border-warm-300/30 rounded-xl p-1 flex gap-0.5 shadow-sm">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-[11px] transition-all font-medium tracking-wide",
                                    activeTab === tab.id
                                        ? "bg-slate-700 text-white shadow-sm"
                                        : "text-warm-500 hover:text-slate-600 hover:bg-cream-100"
                                )}
                            >
                                {tab.icon} <span className="hidden sm:inline-block ml-0.5">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Status Pill */}
                    <div className="pointer-events-auto bg-white/80 backdrop-blur-md border border-warm-300/30 rounded-full px-3 py-1.5 shadow-sm">
                        {renderStatusIndicator()}
                    </div>
                </div>

                {/* Center Loading State */}
                {areAllModelsLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/60 backdrop-blur-sm pointer-events-none">
                        <div className={cn(
                            "w-12 h-12 border-2 border-warm-300/30 border-t-warm-500",
                            "rounded-full animate-spin mb-4"
                        )} />
                        <p className="text-warm-400 text-xs font-medium tracking-wider">Loading models...</p>
                    </div>
                )}
                
                {/* Paused Overlay */}
                {detectionPaused && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-20 pointer-events-none">
                        <span className="text-2xl font-medium text-slate-600 tracking-wide">Paused</span>
                    </div>
                )}
            </div>

            {/* Panel Below Video */}
            <div className="w-full max-w-[800px] mt-4 flex flex-col items-center justify-end z-30">
                <div className={cn(
                    "w-full overflow-y-auto no-scrollbar rounded-2xl bg-cream-50",
                    "border border-warm-300/30 shadow-sm transition-all p-5"
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

                    {activeTab === "soundboard" && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-warm-500 text-[10px] font-medium uppercase mb-1 tracking-widest">Whisper Board</p>
                                <p className="text-warm-400 text-xs leading-relaxed">
                                    Curl your fingers to trigger words. Pinch your thumb and index finger together for &ldquo;that&rdquo;.
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-5 gap-2">
                                {[
                                    { word: "I", finger: "Index", color: "bg-warm-300/40" },
                                    { word: "love", finger: "Middle", color: "bg-soft-rose/30" },
                                    { word: "you", finger: "Ring", color: "bg-soft-sky/30" },
                                    { word: "hate", finger: "Pinky", color: "bg-soft-peach/30" },
                                    { word: "that", finger: "Pinch", color: "bg-soft-lavender/30" },
                                ].map(({ word, finger, color }) => (
                                    <div key={word} className={cn(
                                        "rounded-xl p-3 text-center border border-warm-300/20 transition-all",
                                        color
                                    )}>
                                        <p className="text-slate-700 text-lg font-medium">{word}</p>
                                        <p className="text-warm-400 text-[9px] uppercase tracking-widest mt-1">{finger}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-white border border-warm-300/30 rounded-xl px-4 py-3">
                                <p className="text-warm-400 text-[10px] font-medium uppercase mb-2 tracking-widest">Current Output</p>
                                <p className="text-slate-700 text-base font-medium min-h-[1.5em]">
                                    {topGesture || <span className="text-warm-300 italic">listening...</span>}
                                </p>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleToggleSound}
                                    className={cn(
                                        "px-4 py-2 rounded-xl border text-[10px] tracking-widest uppercase font-medium transition-all",
                                        soundEnabled
                                            ? "border-soft-sage text-emerald-700 bg-emerald-50/50"
                                            : "border-warm-300/50 text-warm-400 bg-white hover:bg-cream-100"
                                    )}
                                >
                                    {soundEnabled ? "🔊 Sound On" : "🔇 Sound Off"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex gap-5 px-5 py-2.5 bg-white/80 backdrop-blur-sm rounded-full border border-warm-300/20 text-[9px] tracking-widest uppercase font-medium text-warm-400 shadow-sm">
                <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: "#B5C4B1" }} /> Faces
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: "#A8C4D9" }} /> Hands
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: "#E8C4A8" }} /> Objects
                </span>
            </div>
        </div>
    );
}
