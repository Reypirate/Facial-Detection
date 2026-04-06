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
                <p className="text-warm-500 text-[10px] font-medium uppercase mb-1 tracking-widest">
                    Face Registration
                </p>
                <p className="text-warm-400 text-xs mb-4 leading-relaxed">
                    Look directly at the camera. The border turns{" "}
                    <span className="text-emerald-600 font-medium">green</span>{" "}
                    when your face is detected. Enter a name to register.
                </p>

                {/* Liveness Indicator */}
                <div className={cn(
                    "mb-4 border rounded-xl p-3 flex items-center justify-between transition-all",
                    hasBlinked
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-amber-50 border-amber-200"
                )}>
                    <div className="flex flex-col">
                        <span className="text-xs font-medium tracking-wide text-slate-600">
                            Liveness Check
                        </span>
                        <span className={cn(
                            "text-[10px] tracking-wide mt-0.5",
                            hasBlinked ? "text-emerald-600" : "text-amber-600 animate-pulse"
                        )}>
                            {hasBlinked ? "✓ Verified — blink detected" : "Waiting for blink..."}
                        </span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        placeholder="Enter name..."
                        className={cn(
                            "flex-1 bg-white border border-warm-300/50 rounded-xl px-4 py-2.5",
                            "text-slate-700 text-sm outline-none transition-all",
                            "focus:outline-none focus:border-warm-400 focus:ring-1 focus:ring-warm-300/30",
                            "placeholder:text-warm-300"
                        )}
                    />
                    <button
                        onClick={onRegister}
                        disabled={!isRegistrationReady}
                        className={cn(
                            "px-6 py-2.5 font-medium rounded-xl text-sm transition-all tracking-wide",
                            isRegistrationReady
                                ? "bg-slate-700 text-white hover:bg-slate-600 shadow-sm"
                                : "bg-cream-200 text-warm-400 cursor-not-allowed"
                        )}
                    >
                        Register
                    </button>
                </div>
                {registerStatus && (
                    <p className="mt-3 text-xs text-emerald-600 font-medium animate-pulse">
                        {registerStatus}
                    </p>
                )}
            </div>

            {savedFaces.length > 0 && (
                <div className="pt-4 border-t border-warm-300/30">
                    <p className="text-warm-500 text-[10px] font-medium uppercase mb-3 tracking-widest">
                        Registered Faces ({savedFaces.length})
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {savedFaces.map((f, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between bg-white border border-warm-300/30 hover:border-warm-300 rounded-xl px-3 py-2 transition-colors"
                            >
                                <span className="text-slate-700 text-xs font-medium truncate pr-3">
                                    {f.name}
                                </span>
                                <button
                                    onClick={() => onDeleteFace(f.name)}
                                    className="text-rose-400 hover:text-rose-500 text-[10px] uppercase tracking-widest shrink-0 transition-colors"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
