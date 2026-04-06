import React from "react";
import { cn } from "@/utils/cn";
import { FrameStyle, FRAMES } from "@/utils/frames";

interface PhotoboothControlsProps {
    countdown: number | null;
    selectedFrame: FrameStyle;
    setSelectedFrame: (frame: FrameStyle) => void;
    onSingleShot: () => void;
    onStripShot: () => void;
    stripMode: boolean;
    stripPhotosLength: number;
}

export default function PhotoboothControls({
    countdown,
    selectedFrame,
    setSelectedFrame,
    onSingleShot,
    onStripShot,
    stripMode,
    stripPhotosLength,
}: PhotoboothControlsProps) {
    return (
        <div className="space-y-4">
            {/* Frame selection */}
            <div>
                <p className="text-zinc-500 text-[10px] font-mono uppercase mb-2 tracking-widest font-bold">Aesthetic Filter</p>
                <div className="flex gap-2 bg-white/5 border border-white/10 p-1.5 rounded-xl overflow-x-auto no-scrollbar">
                    {FRAMES.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setSelectedFrame(f.id)}
                            className={cn(
                                "flex-1 min-w-[80px] py-2 rounded-lg text-[10px] font-mono tracking-widest uppercase transition-all whitespace-nowrap font-bold",
                                selectedFrame === f.id
                                    ? "bg-emerald-500/20 text-emerald-400 shadow-[inset_0_0_10px_rgba(16,185,129,0.3)] border border-emerald-500/30"
                                    : "text-zinc-500 hover:text-zinc-300 border border-transparent hover:bg-white/5"
                            )}
                        >
                            {f.emoji} {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Capture buttons */}
            <div className="flex gap-3">
                <button
                    onClick={onSingleShot}
                    disabled={countdown !== null}
                    className={cn(
                        "flex-1 py-4 rounded-xl text-xs font-black uppercase font-mono tracking-widest transition-all",
                        "bg-gradient-to-br from-emerald-500 via-emerald-600 to-cyan-600 text-black",
                        "hover:from-emerald-400 hover:via-emerald-500 hover:to-cyan-500",
                        "disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    )}
                >
                    📸 CAPTURE NODE
                </button>
                <button
                    onClick={onStripShot}
                    disabled={countdown !== null || stripMode}
                    className={cn(
                        "flex-1 py-4 rounded-xl text-xs font-black uppercase font-mono tracking-widest transition-all",
                        "bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 text-white",
                        "hover:from-purple-400 hover:via-purple-500 hover:to-pink-500",
                        "disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                    )}
                >
                    🎬 BURST SEQUENCE
                </button>
            </div>

            {/* Strip progress */}
            {stripMode && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-purple-500 animate-ping" />
                    <p className="text-purple-400 font-mono text-xs tracking-widest font-bold">
                        BUFFERING: {stripPhotosLength}/4 FRAMES SECURED...
                    </p>
                </div>
            )}
        </div>
    );
}
