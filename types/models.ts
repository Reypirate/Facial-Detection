export interface HandLandmark {
    x: number;
    y: number;
    z: number;
}

export interface HandResult {
    multiHandLandmarks: HandLandmark[][];
    multiHandedness: { label: string; score: number }[];
}

export interface CocoPrediction {
    bbox: [number, number, number, number];
    class: string;
    score: number;
}

export interface SavedFace {
    name: string;
    descriptor: Float32Array;
}

// ─── Soundboard Finger Tracking Types ───────────────────────────────────

export type FingerName = "index" | "middle" | "ring" | "pinky";

export interface FingerState {
    isDown: boolean;
    tipX: number;
    tipY: number;
}

export type FingerStates = Record<FingerName, FingerState>;

export interface FingerConfig {
    label: string;
    color: string;
    audioFile: string;
}

export const FINGER_CONFIG: Record<FingerName, FingerConfig> = {
    index:  { label: "I",    color: "#ff007f", audioFile: "/sounds/I.mp3" },
    middle: { label: "Love", color: "#39ff14", audioFile: "/sounds/Love.mp3" },
    ring:   { label: "U",    color: "#007fff", audioFile: "/sounds/You.mp3" },
    pinky:  { label: "Hate", color: "#ff073a", audioFile: "/sounds/Hate.mp3" },
};
