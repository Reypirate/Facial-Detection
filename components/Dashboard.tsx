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
    // Get last 20 emotion entries for the timeline
    const recentEmotions = emotionHistory.slice(-20);

    return (
        <div className="w-full space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-3">
                <StatCard label="FACES" value={faceCount} color={COLORS.face} />
                <StatCard label="HANDS" value={handCount} color={COLORS.hand} />
                <StatCard label="OBJECTS" value={objectCount} color={COLORS.object} />
                <StatCard label="FPS" value={fps} color="#cbd5e1" />
            </div>

            {/* Current detections */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex flex-col justify-center">
                    <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest font-bold mb-1">Top Expression</p>
                    <p className="text-white font-mono text-sm truncate font-bold tracking-wide">{topExpression || "UNKNOWN"}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex flex-col justify-center">
                    <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest font-bold mb-1">Soundboard</p>
                    <p className="text-white font-mono text-sm truncate font-bold tracking-wide">{topGesture || "LISTENING..."}</p>
                </div>
            </div>

            {/* Emotion Timeline */}
            {recentEmotions.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                    <p className="text-zinc-500 text-[10px] font-mono uppercase mb-3 tracking-widest font-bold">Emotion Telemetry</p>
                    <div className="flex items-end gap-[4px] h-10 w-full rounded-md overflow-hidden bg-black/20 p-1">
                        {recentEmotions.map((e, i) => (
                            <div
                                key={i}
                                className="flex-1 rounded-[2px] transition-all duration-300 relative group"
                                style={{
                                    height: `${Math.max(e.score * 100, 8)}%`,
                                    backgroundColor: getEmotionColor(e.emotion),
                                    opacity: 0.5 + (i / recentEmotions.length) * 0.5,
                                }}
                            >
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[9px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                                    {e.emotion.toUpperCase()} {Math.round(e.score * 100)}%
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2">
                        <span className="text-[9px] text-zinc-600 font-mono tracking-widest">T-20s</span>
                        <span className="text-[9px] text-zinc-600 font-mono tracking-widest text-[#00ff88]">NOW</span>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="flex gap-3 justify-end items-center mt-2 border-t border-white/5 pt-4">
                {detectionPaused && (
                    <span className="px-4 py-2 rounded-xl border border-yellow-500/30 text-yellow-400 bg-yellow-500/10 text-[10px] font-mono uppercase tracking-widest font-bold shadow-[0_0_15px_rgba(250,204,21,0.2)] animate-pulse">
                        System Paused
                    </span>
                )}
                <button
                    onClick={onToggleSound}
                    className={`px-4 py-2 rounded-xl border text-[10px] font-mono tracking-widest uppercase font-bold transition-all ${soundEnabled
                            ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            : "border-white/10 text-zinc-500 bg-white/5 hover:bg-white/10"
                        }`}
                >
                    {soundEnabled ? "🔊 CHIME ON" : "🔇 CHIME OFF"}
                </button>
            </div>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl px-2 py-3 text-center transition-all hover:bg-white/10">
            <p className="text-3xl font-bold font-mono tracking-tighter" style={{ color, textShadow: `0 0 15px ${color}40` }}>
                {value}
            </p>
            <p className="text-zinc-500 text-[9px] font-mono uppercase tracking-widest font-bold mt-1">{label}</p>
        </div>
    );
}

function getEmotionColor(emotion: string): string {
    const map: Record<string, string> = {
        happy: "#00ff88",
        sad: "#6366f1",
        angry: "#ef4444",
        surprised: "#f59e0b",
        disgusted: "#84cc16",
        fearful: "#a855f7",
        neutral: "#6b7280",
    };
    return map[emotion.toLowerCase()] || "#6b7280";
}
