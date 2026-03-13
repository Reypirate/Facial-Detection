"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { playShutter, playCountdownBeep } from "@/utils/sounds";

interface PhotoboothProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
}

type FrameStyle = "none" | "polaroid" | "vintage" | "neon" | "filmstrip";

const FRAMES: { id: FrameStyle; label: string; emoji: string }[] = [
    { id: "none", label: "No Frame", emoji: "🚫" },
    { id: "polaroid", label: "Polaroid", emoji: "📷" },
    { id: "vintage", label: "Vintage", emoji: "🎞️" },
    { id: "neon", label: "Neon", emoji: "💡" },
    { id: "filmstrip", label: "Film Strip", emoji: "🎬" },
];

export default function Photobooth({ videoRef, canvasRef }: PhotoboothProps) {
    const [photos, setPhotos] = useState<string[]>([]);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [selectedFrame, setSelectedFrame] = useState<FrameStyle>("polaroid");
    const [stripMode, setStripMode] = useState(false);
    const [stripPhotos, setStripPhotos] = useState<string[]>([]);
    const [flash, setFlash] = useState(false);
    const captureCanvasRef = useRef<HTMLCanvasElement>(null);

    const capturePhoto = useCallback(() => {
        const video = videoRef.current;
        if (!video || video.readyState !== 4) return null;

        const canvas = document.createElement("canvas");
        const w = video.videoWidth;
        const h = video.videoHeight;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;

        // Mirror the image
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, h);
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Draw overlay from detection canvas
        if (canvasRef.current) {
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(canvasRef.current, 0, 0, w, h);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        // Apply frame
        applyFrame(ctx, w, h, selectedFrame);

        return canvas.toDataURL("image/png");
    }, [videoRef, canvasRef, selectedFrame]);

    const startCountdown = useCallback(
        (onFinish: () => void) => {
            setCountdown(3);
            playCountdownBeep();

            let count = 3;
            const timer = setInterval(() => {
                count--;
                if (count > 0) {
                    setCountdown(count);
                    playCountdownBeep();
                } else {
                    clearInterval(timer);
                    setCountdown(null);
                    playCountdownBeep(true);
                    setFlash(true);
                    setTimeout(() => setFlash(false), 200);
                    playShutter();
                    onFinish();
                }
            }, 1000);
        },
        []
    );

    const handleSingleShot = () => {
        startCountdown(() => {
            const photo = capturePhoto();
            if (photo) setPhotos((prev) => [photo, ...prev]);
        });
    };

    const handleStripShot = () => {
        setStripMode(true);
        setStripPhotos([]);

        // Use a local array to collect shots (avoids React state batching issues)
        const collectedShots: string[] = [];

        function takeNext() {
            startCountdown(() => {
                const photo = capturePhoto();
                if (photo) {
                    collectedShots.push(photo);
                    setStripPhotos([...collectedShots]); // update UI progress

                    if (collectedShots.length < 4) {
                        // 6 second delay so people can pose
                        setTimeout(takeNext, 6000);
                    } else {
                        // All 4 shots taken — combine into one strip
                        setTimeout(() => {
                            combineStrip(collectedShots);
                            setStripMode(false);
                            setStripPhotos([]);
                        }, 500);
                    }
                }
            });
        }
        takeNext();
    };

    const combineStrip = (shots: string[]) => {
        const canvas = document.createElement("canvas");
        const imgW = 320;
        const imgH = 240;
        const padding = 10;
        canvas.width = imgW + padding * 2;
        canvas.height = (imgH + padding) * 4 + padding;
        const ctx = canvas.getContext("2d")!;

        // Background
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Title
        ctx.fillStyle = "#00ff88";
        ctx.font = "bold 14px monospace";

        let loaded = 0;
        shots.forEach((src, i) => {
            const img = new Image();
            img.onload = () => {
                const y = padding + i * (imgH + padding);
                // White border
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(padding - 3, y - 3, imgW + 6, imgH + 6);
                ctx.drawImage(img, padding, y, imgW, imgH);
                loaded++;
                if (loaded === shots.length) {
                    setPhotos((prev) => [canvas.toDataURL("image/png"), ...prev]);
                }
            };
            img.src = src;
        });
    };

    const downloadPhoto = (dataUrl: string, index: number) => {
        const link = document.createElement("a");
        link.download = `ai-vision-photo-${index + 1}.png`;
        link.href = dataUrl;
        link.click();
    };

    const clearGallery = () => setPhotos([]);

    return (
        <div className="w-full max-w-[640px] mt-4 space-y-3">
            {/* Flash overlay */}
            {flash && (
                <div className="fixed inset-0 bg-white/80 z-50 pointer-events-none animate-pulse" />
            )}

            {/* Countdown overlay */}
            {countdown !== null && (
                <div className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none">
                    <span className="text-9xl font-black text-white drop-shadow-[0_0_40px_rgba(0,255,136,0.8)] animate-bounce">
                        {countdown}
                    </span>
                </div>
            )}

            {/* Frame selection */}
            <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2">
                <p className="text-zinc-500 text-[10px] font-mono uppercase mb-2">Frame Style</p>
                <div className="flex gap-2">
                    {FRAMES.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setSelectedFrame(f.id)}
                            className={`flex-1 py-1.5 rounded-lg border text-xs font-mono transition-all ${selectedFrame === f.id
                                ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                                : "border-zinc-700 text-zinc-500 hover:border-zinc-600"
                                }`}
                        >
                            {f.emoji} {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Capture buttons */}
            <div className="flex gap-2">
                <button
                    onClick={handleSingleShot}
                    disabled={countdown !== null}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold rounded-xl text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    📸 Single Shot
                </button>
                <button
                    onClick={handleStripShot}
                    disabled={countdown !== null || stripMode}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    🎬 Photo Strip (4x)
                </button>
            </div>

            {/* Strip progress */}
            {stripMode && (
                <div className="bg-zinc-800/60 border border-purple-500/50 rounded-lg px-3 py-2">
                    <p className="text-purple-400 font-mono text-sm">
                        📷 Strip: {stripPhotos.length}/4 shots taken...
                    </p>
                </div>
            )}

            {/* Gallery */}
            {photos.length > 0 && (
                <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-3">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-zinc-500 text-[10px] font-mono uppercase">
                            Gallery ({photos.length})
                        </p>
                        <button
                            onClick={clearGallery}
                            className="text-xs text-red-400 hover:text-red-300 font-mono"
                        >
                            🗑️ Clear
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {photos.map((photo, i) => (
                            <div key={i} className="relative group cursor-pointer">
                                <img
                                    src={photo}
                                    alt={`Photo ${i + 1}`}
                                    className="w-full rounded-lg border border-zinc-700 hover:border-emerald-500 transition-all"
                                />
                                <button
                                    onClick={() => downloadPhoto(photo, i)}
                                    className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all font-mono"
                                >
                                    ⬇️ Save
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <canvas ref={captureCanvasRef} className="hidden" />

            {/* Gesture hint */}
            <p className="text-zinc-600 text-[10px] font-mono text-center">
                💡 Tip: Show 👍 Thumbs Up gesture to auto-capture a photo!
            </p>
        </div>
    );
}

// ─── Frame drawing ──────────────────────────────────────────────────────
function applyFrame(ctx: CanvasRenderingContext2D, w: number, h: number, frame: FrameStyle) {
    switch (frame) {
        case "polaroid": {
            const borderW = 20;
            const bottomW = 60;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, borderW);
            ctx.fillRect(0, 0, borderW, h);
            ctx.fillRect(w - borderW, 0, borderW, h);
            ctx.fillRect(0, h - bottomW, w, bottomW);
            ctx.fillStyle = "#333";
            ctx.font = "italic 16px serif";
            ctx.fillText("AI Vision • " + new Date().toLocaleDateString(), borderW + 8, h - 20);
            break;
        }
        case "vintage": {
            ctx.fillStyle = "rgba(160, 120, 60, 0.25)";
            ctx.fillRect(0, 0, w, h);
            // Vignette
            const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
            grad.addColorStop(0, "transparent");
            grad.addColorStop(1, "rgba(0,0,0,0.5)");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
            break;
        }
        case "neon": {
            ctx.shadowColor = "#00ff88";
            ctx.shadowBlur = 15;
            ctx.strokeStyle = "#00ff88";
            ctx.lineWidth = 4;
            ctx.strokeRect(10, 10, w - 20, h - 20);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "#00bbff";
            ctx.lineWidth = 2;
            ctx.strokeRect(16, 16, w - 32, h - 32);
            break;
        }
        case "filmstrip": {
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, w, 30);
            ctx.fillRect(0, h - 30, w, 30);
            // Sprocket holes
            for (let i = 0; i < w; i += 40) {
                ctx.fillStyle = "#333";
                ctx.fillRect(i + 10, 5, 20, 20);
                ctx.fillRect(i + 10, h - 25, 20, 20);
            }
            break;
        }
    }
}
