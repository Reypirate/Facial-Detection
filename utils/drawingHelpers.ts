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
    // Soft bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    ctx.setLineDash([]);

    // Rounded corner accents
    const cornerLen = 14;
    ctx.lineWidth = 2.5;
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

    // Label pill
    ctx.font = "500 13px 'Inter', sans-serif";
    const textWidth = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    const pillX = box.x;
    const pillY = box.y - 24;
    const pillW = textWidth + 16;
    const pillH = 22;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 6);
    ctx.fill();

    // Label text
    ctx.fillStyle = "#3a3430";
    ctx.fillText(label, pillX + 8, pillY + 15);

    // Sublabel
    if (sublabel) {
        ctx.font = "400 11px 'Inter', sans-serif";
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.fillText(sublabel, box.x + 4, box.y + box.height + 15);
        ctx.globalAlpha = 1;
    }
}

export function drawHandSkeleton(
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    w: number,
    h: number
) {
    // Soft landmark dots
    ctx.fillStyle = "rgba(168, 152, 136, 0.5)";
    landmarks.forEach((lm: any) => {
        ctx.beginPath();
        ctx.arc(lm.x * w, lm.y * h, 2.5, 0, 2 * Math.PI);
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
    ctx.strokeStyle = "rgba(168, 152, 136, 0.25)";
    ctx.lineWidth = 1;
    connections.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
        ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
        ctx.stroke();
    });
}

// Soft colors for detection labels
export const COLORS = {
    face: "#B5C4B1",    // Sage green
    hand: "#A8C4D9",    // Soft sky blue
    object: "#E8C4A8",  // Warm peach
    pose: "#C4B5D4",    // Lavender
};
