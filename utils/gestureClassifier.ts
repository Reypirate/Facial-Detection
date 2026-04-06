// ─── Gesture classifier for Whisper Board ───────────────────────────────

import { SoundboardGestures } from "@/types/models";

const PINCH_THRESHOLD = 0.05;

/**
 * Returns the state of 4 fingers + pinch gesture for the Whisper Board.
 * - A finger is "down" when its tip y > its PIP (middle joint) y.
 * - A "pinch" occurs when thumb tip and index tip are within PINCH_THRESHOLD distance.
 * - All coordinates are in normalized [0,1] space from MediaPipe.
 */
export function getSoundboardGestures(landmarks: any[]): SoundboardGestures {
    // MediaPipe Hand landmark indices:
    //   Thumb  → tip: 4
    //   Index  → tip: 8,  PIP: 6
    //   Middle → tip: 12, PIP: 10
    //   Ring   → tip: 16, PIP: 14
    //   Pinky  → tip: 20, PIP: 18

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    const middleTip = landmarks[12];
    const middlePip = landmarks[10];
    const ringTip = landmarks[16];
    const ringPip = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPip = landmarks[18];

    // Pinch: Euclidean distance between thumb tip and index tip
    const pinchDist = Math.sqrt(
        Math.pow(thumbTip.x - indexTip.x, 2) +
        Math.pow(thumbTip.y - indexTip.y, 2)
    );

    return {
        index: {
            isDown: indexTip.y > indexPip.y,
            tipX: indexTip.x,
            tipY: indexTip.y,
        },
        middle: {
            isDown: middleTip.y > middlePip.y,
            tipX: middleTip.x,
            tipY: middleTip.y,
        },
        ring: {
            isDown: ringTip.y > ringPip.y,
            tipX: ringTip.x,
            tipY: ringTip.y,
        },
        pinky: {
            isDown: pinkyTip.y > pinkyPip.y,
            tipX: pinkyTip.x,
            tipY: pinkyTip.y,
        },
        pinch: {
            isPinching: pinchDist < PINCH_THRESHOLD,
            midX: (thumbTip.x + indexTip.x) / 2,
            midY: (thumbTip.y + indexTip.y) / 2,
        },
    };
}
