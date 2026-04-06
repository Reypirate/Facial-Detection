"use client";

import React from "react";
import { COLORS } from "@/utils/drawingHelpers";

interface DashboardProps {
    faceCount: number;
    handCount: number;
    objectCount: number;
    fps: number;
    topExpression: string;
    topGesture: string;
    emotionHistory: { time: number; emotion: string; score: number }[];
    soundEnabled: boolean;
    onToggleSound: () => void;
    detectionPaused: boolean;
}

export default function Dashboard({
    faceCount,
    handCount,
    objectCount,
    fps,
    topExpression,
    topGesture,
    emotionHistory,
    soundEnabled,
    onToggleSound,
    detectionPaused,
}: DashboardProps) {
    const recentEmotions = emotionHistory.slice(-20);

    return (
        <div className="w-full space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-3">
                <StatCard label="Faces" value={faceCount} color={COLORS.face} />
                <StatCard label="Hands" value={handCount} color={COLORS.hand} />
                <StatCard label="Objects" value={objectCount} color={COLORS.object} />
                <StatCard label="FPS" value={fps} color="#A89888" />
            </div>

            {/* Current detections */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-warm-300/50 rounded-xl px-4 py-3 flex flex-col justify-center">
                    <p className="text-warm-400 text-[10px] font-medium uppercase tracking-widest mb-1">Expression</p>
                    <p className="text-slate-700 text-sm truncate font-medium">{topExpression || "—"}</p>
                </div>
                <div className="bg-white border border-warm-300/50 rounded-xl px-4 py-3 flex flex-col justify-center">
                    <p className="text-warm-400 text-[10px] font-medium uppercase tracking-widest mb-1">Whisper Board</p>
                    <p className="text-slate-700 text-sm truncate font-medium">{topGesture || "listening..."}</p>
                </div>
            </div>

            {/* Emotion Timeline */}
            {recentEmotions.length > 0 && (
                <div className="bg-white border border-warm-300/50 rounded-xl px-4 py-3">
                    <p className="text-warm-400 text-[10px] font-medium uppercase mb-3 tracking-widest">Emotion Timeline</p>
                    <div className="flex items-end gap-[3px] h-10 w-full rounded-lg overflow-hidden bg-cream-100 p-1">
                        {recentEmotions.map((e, i) => (
                            <div
                                key={i}
                                className="flex-1 rounded-sm transition-all duration-300 relative group"
                                style={{
                                    height: `${Math.max(e.score * 100, 8)}%`,
                                    backgroundColor: getEmotionColor(e.emotion),
                                    opacity: 0.4 + (i / recentEmotions.length) * 0.6,
                                }}
                            >
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                                    {e.emotion} {Math.round(e.score * 100)}%
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2">
                        <span className="text-[9px] text-warm-400 tracking-widest">-20s</span>
                        <span className="text-[9px] text-warm-500 tracking-widest">now</span>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="flex gap-3 justify-end items-center mt-2 border-t border-warm-300/30 pt-4">
                {detectionPaused && (
                    <span className="px-4 py-2 rounded-xl border border-amber-200 text-amber-600 bg-amber-50 text-[10px] uppercase tracking-widest font-medium animate-pulse">
                        Paused
                    </span>
                )}
                <button
                    onClick={onToggleSound}
                    className={`px-4 py-2 rounded-xl border text-[10px] tracking-widest uppercase font-medium transition-all ${soundEnabled
                            ? "border-soft-sage text-emerald-700 bg-emerald-50/50"
                            : "border-warm-300/50 text-warm-400 bg-white hover:bg-cream-100"
                        }`}
                >
                    {soundEnabled ? "🔊 Sound On" : "🔇 Sound Off"}
                </button>
            </div>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="bg-white border border-warm-300/30 rounded-xl px-2 py-3 text-center transition-all hover:shadow-sm">
            <p className="text-3xl font-light tracking-tighter" style={{ color }}>
                {value}
            </p>
            <p className="text-warm-400 text-[9px] uppercase tracking-widest font-medium mt-1">{label}</p>
        </div>
    );
}

function getEmotionColor(emotion: string): string {
    const map: Record<string, string> = {
        happy: "#B5C4B1",
        sad: "#A8C4D9",
        angry: "#E8B4B8",
        surprised: "#E8C4A8",
        disgusted: "#C4B5D4",
        fearful: "#A8C4D9",
        neutral: "#C9BDB0",
    };
    return map[emotion.toLowerCase()] || "#C9BDB0";
}
