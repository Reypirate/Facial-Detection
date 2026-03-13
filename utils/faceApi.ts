

export const loadModels = async () => {
    const faceapi = (await import('face-api.js'));
    const MODEL_URL = '/models';
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        console.log('Models loaded successfully');
    } catch (error) {
        console.error('Error loading models:', error);
    }
};

export const detectFaces = async (video: HTMLVideoElement) => {
    const faceapi = (await import('face-api.js'));
    const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();
    return detections;
};
