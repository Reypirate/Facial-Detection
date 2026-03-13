import { useState, useRef, useEffect } from "react";
import { HandResult } from "../types/models";

export function useAIModels(videoRef: React.RefObject<HTMLVideoElement | null>) {
    const [faceModelsReady, setFaceModelsReady] = useState(false);
    const [handModelsReady, setHandModelsReady] = useState(false);
    const [objectModelReady, setObjectModelReady] = useState(false);

    const handResultsRef = useRef<HandResult | null>(null);
    const objectModelRef = useRef<any>(null); // For COCO-SSD

    const onFaceApiLoad = async () => {
        try {
            const faceapi = (window as any).faceapi;
            if (!faceapi) return;
            await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
            await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
            await faceapi.nets.faceExpressionNet.loadFromUri("/models");
            await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
        } catch (err) {
            console.error("Face model error:", err);
        } finally {
            setFaceModelsReady(true);
        }
    };

    const onCocoSsdLoad = async () => {
        try {
            if (!(window as any).cocoSsd) return;
            // Add a small delay for TFJS WebGL backend to initialize fully before COCO tries to use it
            await new Promise(r => setTimeout(r, 200)); 
            const model = await (window as any).cocoSsd.load();
            objectModelRef.current = model;
        } catch (err) {
            console.error("COCO-SSD error:", err);
        } finally {
            setObjectModelReady(true);
        }
    };

    useEffect(() => {
        let isRunning = false;
        
        // Define Hand loading as a method we can trigger when MediaPipe script is loaded.
        // But since next/script will call onReady/onLoad, we expose this function.
        // Wait! We can expose an onHandsLoad function.
    }, []);

    const onHandsLoad = async () => {
        try {
            const HandsConstructor = (window as any).Hands;
            if (!HandsConstructor) return;
            
            const hands = new HandsConstructor({
                locateFile: (file: string) =>
                    `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
            });
            hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5,
            });
            hands.onResults((r: any) => {
                handResultsRef.current = r;
            });

            const check = setInterval(() => {
                if (videoRef.current && videoRef.current.readyState === 4) {
                    clearInterval(check);
                    const sendFrame = async () => {
                        if (!videoRef.current) return;
                        try { await hands.send({ image: videoRef.current }); } catch (err) {}
                        requestAnimationFrame(sendFrame);
                    }
                    sendFrame();
                    setHandModelsReady(true);
                }
            }, 500);

        } catch (err) {
            console.error("MediaPipe error:", err);
        }
    };

    return {
        faceModelsReady,
        handModelsReady,
        objectModelReady,
        handResultsRef,
        objectModelRef,
        onFaceApiLoad,
        onCocoSsdLoad,
        onHandsLoad
    };
}
