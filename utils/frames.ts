export type FrameStyle = "none" | "polaroid" | "vintage" | "neon" | "filmstrip";

export const FRAMES: { id: FrameStyle; label: string; emoji: string }[] = [
    { id: "none", label: "None", emoji: "🚫" },
    { id: "polaroid", label: "Retro", emoji: "📷" },
    { id: "vintage", label: "Sepia", emoji: "🎞️" },
    { id: "neon", label: "Cyber", emoji: "💡" },
    { id: "filmstrip", label: "Reel", emoji: "🎬" },
];

export function applyFrame(ctx: CanvasRenderingContext2D, w: number, h: number, frame: FrameStyle) {
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
