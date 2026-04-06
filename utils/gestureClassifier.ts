// ─── Per-finger state detector for Soundboard ──────────────────────────

import { FingerStates } from "@/types/models";

/**
 * Returns the state of 4 trackable fingers (Index, Middle, Ring, Pinky).
 * A finger is "down" (tapped) when its tip landmark y > its PIP (middle joint) y.
 * Coordinates are in normalized [0,1] space from MediaPipe.
 */
export function getFingerStates(landmarks: any[]): FingerStates {
    // MediaPipe Hand landmark indices:
    //   Index  → tip: 8,  PIP: 6
    //   Middle → tip: 12, PIP: 10
    //   Ring   → tip: 16, PIP: 14
    //   Pinky  → tip: 20, PIP: 18

    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    const middleTip = landmarks[12];
    const middlePip = landmarks[10];
    const ringTip = landmarks[16];
    const ringPip = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPip = landmarks[18];

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
    };
}
