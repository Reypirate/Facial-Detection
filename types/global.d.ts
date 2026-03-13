export {};

declare global {
    interface Window {
        faceapi: any; // Still using any for face-api.js as it has very complex typings not easily imported here without the full library types
        cocoSsd: {
            load: () => Promise<any>;
        };
        Hands: any; // Hands class from MediaPipe
    }
}
