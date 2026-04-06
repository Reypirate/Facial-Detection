"use client";

import React, { useRef, useState, useCallback } from "react";
import { playShutter, playCountdownBeep } from "@/utils/sounds";
import { cn } from "@/utils/cn";
import { FrameStyle, applyFrame } from "@/utils/frames";
import PhotoboothControls from "./PhotoboothControls";
import PhotoboothGallery from "./PhotoboothGallery";

interface PhotoboothProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
}

export default function Photobooth({ videoRef, canvasRef }: PhotoboothProps) {
    const [photos, setPhotos] = useState<string[]>([]);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [selectedFrame, setSelectedFrame] = useState<FrameStyle>("polaroid");
    const [stripMode, setStripMode] = useState(false);
    const [stripPhotos, setStripPhotos] = useState<string[]>([]);
    const [flash, setFlash] = useState(false);

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
            setCountdown(5);
            playCountdownBeep();

            let count = 5;
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
        <div className="w-full space-y-4">
            {/* Flash overlay */}
            {flash && (
                <div className="fixed inset-0 bg-white/90 z-50 pointer-events-none animate-[flash_0.3s_ease-out]" />
            )}

            {/* Countdown overlay */}
            {countdown !== null && (
                <div className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none bg-black/20 backdrop-blur-sm">
                    <span className="text-[12rem] font-black font-mono text-white drop-shadow-[0_0_50px_rgba(0,255,136,1)] animate-ping">
                        {countdown}
                    </span>
                </div>
            )}

            <PhotoboothControls
                countdown={countdown}
                selectedFrame={selectedFrame}
                setSelectedFrame={setSelectedFrame}
                onSingleShot={handleSingleShot}
                onStripShot={handleStripShot}
                stripMode={stripMode}
                stripPhotosLength={stripPhotos.length}
            />

            <PhotoboothGallery
                photos={photos}
                onClear={clearGallery}
                onDownload={downloadPhoto}
            />

            {/* Gesture hint */}
            <p className="text-zinc-600 text-[9px] font-mono tracking-widest uppercase font-bold text-center mt-2">
                SYSTEM TIP: FORM 👍 <span className="text-emerald-500 border border-emerald-500/20 bg-emerald-500/10 px-1 rounded">THUMBS UP</span> GESTURE TO AUTO-TRIGGER CAPTURE
            </p>
        </div>
    );
}
