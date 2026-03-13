// ─── Gesture classifier from hand landmarks ────────────────────────────

export function classifyGesture(landmarks: any[]): string {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const thumbMcp = landmarks[2];
    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    const indexMcp = landmarks[5];
    const middleTip = landmarks[12];
    const middlePip = landmarks[10];
    const ringTip = landmarks[16];
    const ringPip = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPip = landmarks[18];

    const indexUp = indexTip.y < indexPip.y;
    const middleUp = middleTip.y < middlePip.y;
    const ringUp = ringTip.y < ringPip.y;
    const pinkyUp = pinkyTip.y < pinkyPip.y;

    const thumbOut = Math.abs(thumbTip.x - indexMcp.x) > 0.06;
    const thumbUp = thumbTip.y < thumbIp.y && thumbTip.y < thumbMcp.y;

    if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) return "THUMBS UP 👍";
    if (thumbTip.y > wrist.y && !indexUp && !middleUp && !ringUp && !pinkyUp) return "THUMBS DOWN 👎";
    if (indexUp && middleUp && !ringUp && !pinkyUp) return "PEACE ✌️";
    if (indexUp && !middleUp && !ringUp && pinkyUp) return "ROCK ON 🤘";

    const thumbIndexDist = Math.sqrt(
        Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2)
    );
    if (thumbIndexDist < 0.05 && middleUp && ringUp && pinkyUp) return "OK 👌";
    if (indexUp && !middleUp && !ringUp && !pinkyUp) return "POINTING ☝️";
    if (indexUp && middleUp && ringUp && pinkyUp && thumbOut) return "OPEN PALM 🖐️";
    if (!indexUp && !middleUp && !ringUp && !pinkyUp && !thumbOut) return "FIST ✊";
    if (indexUp && middleUp && ringUp && !pinkyUp) return "THREE 🤟";
    if (thumbOut && pinkyUp && !indexUp && !middleUp && !ringUp) return "CALL ME 🤙";

    return "HAND DETECTED";
}
