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
