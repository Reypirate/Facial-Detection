import React from "react";
import { cn } from "@/utils/cn";
import { SavedFace } from "@/types/models";

interface RegisterTabProps {
    registerName: string;
    setRegisterName: (name: string) => void;
    registerStatus: string;
    savedFaces: SavedFace[];
    hasBlinked: boolean;
    isRegistrationReady: boolean;
    onRegister: () => void;
    onDeleteFace: (name: string) => void;
}

export default function RegisterTab({
    registerName,
    setRegisterName,
    registerStatus,
    savedFaces,
    hasBlinked,
    isRegistrationReady,
    onRegister,
    onDeleteFace,
}: RegisterTabProps) {
    return (
        <div className="space-y-4">
            <div>
                <p className="text-zinc-500 text-[10px] font-mono uppercase mb-1 tracking-widest font-bold">
                    Identity Registration
                </p>
                <p className="text-zinc-400 text-xs mb-4 leading-relaxed">
                    Face the camera center. The frame pulses <span className="text-emerald-400 font-bold">green</span> when your face is locked on. Enter an alias to train the local recognition net.
                </p>

                {/* Liveness Indicator */}
                <div className={`mb-4 border rounded-xl p-3 flex items-center justify-between transition-all ${hasBlinked
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-red-500/10 border-red-500/30"
                    }`}>
                    <div className="flex flex-col">
                        <span className="text-xs font-mono font-bold tracking-widest uppercase text-zinc-300">
                            Liveness Check (Anti-Spoofing)
                        </span>
                        <span className={`text-[10px] font-mono tracking-widest uppercase mt-0.5 ${hasBlinked ? "text-emerald-400" : "text-red-400 animate-pulse"
                            }`}>
                            {hasBlinked ? "✔️ REAL HUMAN DETECTED" : "⚠️ WAITING FOR BLINK..."}
                        </span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        placeholder="Enter classification alias..."
                        className={cn(
                            "flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5",
                            "text-white font-mono text-sm outline-none transition-all",
                            "focus:outline-none focus:border-emerald-500/50 focus:bg-white/5",
                            "placeholder:text-zinc-600"
                        )}
                    />
                    <button
                        onClick={onRegister}
                        disabled={!isRegistrationReady}
                        className={cn(
                            "px-6 py-2.5 font-bold font-mono rounded-xl text-sm transition-all tracking-wide",
                            isRegistrationReady
                                ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:bg-emerald-400"
                                : "bg-white/5 text-zinc-600 cursor-not-allowed border border-white/5"
                        )}
                    >
                        ENROLL
                    </button>
                </div>
                {registerStatus && (
                    <p className="mt-3 text-xs font-mono text-emerald-400 flex items-center gap-2">
                        {registerStatus}
                    </p>
                )}
            </div>

            {savedFaces.length > 0 && (
                <div className="pt-4 border-t border-white/10">
                    <p className="text-zinc-500 text-[10px] font-mono uppercase mb-3 tracking-widest font-bold">
                        Active Profiles Database ({savedFaces.length})
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {savedFaces.map((f, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-3 py-2"
                            >
                                <span className="text-zinc-300 font-mono text-xs font-bold truncate pr-3">
                                    {f.name}
                                </span>
                                <button
                                    onClick={() => onDeleteFace(f.name)}
                                    className="text-red-400/70 hover:text-red-400 text-[10px] uppercase font-mono tracking-widest shrink-0"
                                >
                                    Purge
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
