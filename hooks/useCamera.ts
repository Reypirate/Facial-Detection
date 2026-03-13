import { useState, useEffect, useRef } from "react";

export function useCamera() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);

    const startCamera = async () => {
        setCameraError(false);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: "user" },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                try {
                    await videoRef.current.play();
                } catch (playErr: any) {
                    // Ignore AbortError caused by React Strict Mode double-invoking the stream play
                    if (playErr.name !== 'AbortError') throw playErr;
                }
                setCameraReady(true);
            }
        } catch (err) {
            console.error("Camera error:", err);
            setCameraError(true);
            setCameraReady(false);
        }
    };

    useEffect(() => {
        startCamera();
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

    const retryCamera = () => {
        startCamera();
    };

    return { videoRef, cameraReady, cameraError, retryCamera };
}
