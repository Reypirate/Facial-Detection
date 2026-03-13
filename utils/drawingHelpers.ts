// ─── Drawing helpers for detection overlays ─────────────────────────────

export function getHandBoundingBox(landmarks: any[], w: number, h: number) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const lm of landmarks) {
        if (lm.x < minX) minX = lm.x;
        if (lm.y < minY) minY = lm.y;
        if (lm.x > maxX) maxX = lm.x;
        if (lm.y > maxY) maxY = lm.y;
    }
    const pad = 0.03;
    return {
        x: (minX - pad) * w,
        y: (minY - pad) * h,
        width: (maxX - minX + pad * 2) * w,
        height: (maxY - minY + pad * 2) * h,
    };
}

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function drawLabeledBox(
    ctx: CanvasRenderingContext2D,
    box: BoundingBox,
    label: string,
    color: string,
    sublabel?: string
) {
    // Bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // Corner accents
    const cornerLen = 18;
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;

    ctx.beginPath();
    ctx.moveTo(box.x, box.y + cornerLen);
    ctx.lineTo(box.x, box.y);
    ctx.lineTo(box.x + cornerLen, box.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(box.x + box.width - cornerLen, box.y);
    ctx.lineTo(box.x + box.width, box.y);
    ctx.lineTo(box.x + box.width, box.y + cornerLen);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(box.x, box.y + box.height - cornerLen);
    ctx.lineTo(box.x, box.y + box.height);
    ctx.lineTo(box.x + cornerLen, box.y + box.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(box.x + box.width - cornerLen, box.y + box.height);
    ctx.lineTo(box.x + box.width, box.y + box.height);
    ctx.lineTo(box.x + box.width, box.y + box.height - cornerLen);
    ctx.stroke();

    // Label background
    ctx.font = "bold 14px monospace";
    const textWidth = ctx.measureText(label).width;
    ctx.fillStyle = color;
    ctx.fillRect(box.x, box.y - 26, textWidth + 14, 24);

    // Label text
    ctx.fillStyle = "#000000";
    ctx.fillText(label, box.x + 7, box.y - 8);

    // Sublabel
    if (sublabel) {
        ctx.font = "bold 12px monospace";
        ctx.fillStyle = color + "cc";
        ctx.fillText(sublabel, box.x + 4, box.y + box.height + 16);
    }
}

export function drawHandSkeleton(
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    w: number,
    h: number
) {
    // Landmark dots
    ctx.fillStyle = "rgba(0, 187, 255, 0.6)";
    landmarks.forEach((lm: any) => {
        ctx.beginPath();
        ctx.arc(lm.x * w, lm.y * h, 3, 0, 2 * Math.PI);
        ctx.fill();
    });

    // Bone connections
    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [5, 9], [9, 10], [10, 11], [11, 12],
        [9, 13], [13, 14], [14, 15], [15, 16],
        [13, 17], [17, 18], [18, 19], [19, 20],
        [0, 17],
    ];
    ctx.strokeStyle = "rgba(0, 187, 255, 0.3)";
    ctx.lineWidth = 1;
    connections.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
        ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
        ctx.stroke();
    });
}

// Colors for each detection type
export const COLORS = {
    face: "#00ff88",
    hand: "#00bbff",
    object: "#ff9f43",
    pose: "#ff6b9d",
};
