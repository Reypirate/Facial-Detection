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

// Whisper Board Types

export type FingerName = "thumb" | "index" | "middle" | "ring";
export type WordName = "I" | "love" | "you" | "hate" | "that";

export interface FingerState {
    isDown: boolean;
    tipX: number;
    tipY: number;
}

export interface SoundboardGestures {
    thumb: FingerState;
    index: FingerState;
    middle: FingerState;
    ring: FingerState;
    pinky: FingerState;
    pinch: {
        isPinching: boolean;
        midX: number;
        midY: number;
    };
}

export interface WordConfig {
    word: WordName;
    color: string;
    audioFile: string;
}

/** Soft pastel colors for the Limbo theme */
export const WORD_CONFIG: Record<WordName, WordConfig> = {
    "I":    { word: "I",    color: "rgba(90, 80, 75, 0.75)",   audioFile: "/sounds/I.mp3" },
    "love": { word: "love", color: "rgba(185, 140, 148, 0.8)", audioFile: "/sounds/Love.mp3" },
    "you":  { word: "you",  color: "rgba(130, 160, 180, 0.8)", audioFile: "/sounds/You.mp3" },
    "hate": { word: "hate", color: "rgba(180, 120, 100, 0.8)", audioFile: "/sounds/Hate.mp3" },
    "that": { word: "that", color: "rgba(160, 145, 175, 0.8)", audioFile: "/sounds/That.mp3" },
};

/** Maps finger -> word for the soundboard */
export const FINGER_TO_WORD: Record<FingerName, WordName> = {
    thumb: "hate",
    index: "I",
    middle: "love",
    ring: "you",
};
