// Gesture classifier for Whisper Board

import { SoundboardGestures } from "@/types/models";

const PINCH_THRESHOLD = 0.05;
const FINGER_BEND_TOLERANCE = 0.03;
const THUMB_BEND_TOLERANCE = 0.01;

function isBent(tipY: number, jointY: number, tolerance: number): boolean {
    return tipY > jointY - tolerance;
}

/**
 * Returns the state of 5 fingers + pinch gesture for the Whisper Board.
 * - A finger is "down" when its tip y is near/below its finger joint y.
 *   (Tolerances are used so a light bend still counts.)
 * - A "pinch" occurs when thumb tip and index tip are within PINCH_THRESHOLD distance.
 * - All coordinates are in normalized [0,1] space from MediaPipe.
 */
export function getSoundboardGestures(landmarks: any[]): SoundboardGestures {
    // MediaPipe Hand landmark indices:
    //   Thumb  -> tip: 4
    //   Index  -> tip: 8,  PIP: 6
    //   Middle -> tip: 12, PIP: 10
    //   Ring   -> tip: 16, PIP: 14
    //   Pinky  -> tip: 20, PIP: 18

    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
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
        thumb: {
            isDown: isBent(thumbTip.y, thumbIp.y, THUMB_BEND_TOLERANCE),
            tipX: thumbTip.x,
            tipY: thumbTip.y,
        },
        index: {
            isDown: isBent(indexTip.y, indexPip.y, FINGER_BEND_TOLERANCE),
            tipX: indexTip.x,
            tipY: indexTip.y,
        },
        middle: {
            isDown: isBent(middleTip.y, middlePip.y, FINGER_BEND_TOLERANCE),
            tipX: middleTip.x,
            tipY: middleTip.y,
        },
        ring: {
            isDown: isBent(ringTip.y, ringPip.y, FINGER_BEND_TOLERANCE),
            tipX: ringTip.x,
            tipY: ringTip.y,
        },
        pinky: {
            isDown: isBent(pinkyTip.y, pinkyPip.y, FINGER_BEND_TOLERANCE),
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
