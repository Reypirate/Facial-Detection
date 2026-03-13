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
        <div className="w-full max-w-[640px] mt-4 space-y-3">
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-2">
                <StatCard label="Faces" value={faceCount} color={COLORS.face} />
                <StatCard label="Hands" value={handCount} color={COLORS.hand} />
                <StatCard label="Objects" value={objectCount} color={COLORS.object} />
                <StatCard label="FPS" value={fps} color="#888" />
            </div>

            {/* Current detections */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2">
                    <p className="text-zinc-500 text-[10px] font-mono uppercase">Expression</p>
                    <p className="text-white font-mono text-sm truncate">{topExpression || "—"}</p>
                </div>
                <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2">
                    <p className="text-zinc-500 text-[10px] font-mono uppercase">Gesture</p>
                    <p className="text-white font-mono text-sm truncate">{topGesture || "—"}</p>
                </div>
            </div>

            {/* Emotion Timeline */}
            {recentEmotions.length > 0 && (
                <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2">
                    <p className="text-zinc-500 text-[10px] font-mono uppercase mb-1">Emotion Timeline</p>
                    <div className="flex items-end gap-[2px] h-8">
                        {recentEmotions.map((e, i) => (
                            <div
                                key={i}
                                className="flex-1 rounded-sm transition-all duration-300"
                                style={{
                                    height: `${Math.max(e.score * 100, 8)}%`,
                                    backgroundColor: getEmotionColor(e.emotion),
                                    opacity: 0.4 + (i / recentEmotions.length) * 0.6,
                                }}
                                title={`${e.emotion} ${Math.round(e.score * 100)}%`}
                            />
                        ))}
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-[9px] text-zinc-600 font-mono">older</span>
                        <span className="text-[9px] text-zinc-600 font-mono">now</span>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="flex gap-2">
                <button
                    onClick={onToggleSound}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${soundEnabled
                            ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                            : "border-zinc-700 text-zinc-500 bg-zinc-800/60"
                        }`}
                >
                    {soundEnabled ? "🔊 Sound ON" : "🔇 Sound OFF"}
                </button>
                {detectionPaused && (
                    <span className="px-3 py-1.5 rounded-lg border border-yellow-500/50 text-yellow-400 bg-yellow-500/10 text-xs font-mono">
                        ⏸ Paused (show fist to resume)
                    </span>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2 text-center">
            <p className="text-2xl font-bold font-mono" style={{ color }}>
                {value}
            </p>
            <p className="text-zinc-500 text-[10px] font-mono uppercase">{label}</p>
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
