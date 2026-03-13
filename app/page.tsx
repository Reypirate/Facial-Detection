import dynamic from "next/dynamic";

const FaceDetection = dynamic(() => import("@/components/FaceDetection"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center w-[640px] h-[480px] bg-zinc-800 rounded-xl border-2 border-zinc-700">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-zinc-400 font-mono text-sm">Loading AI Vision...</p>
            </div>
        </div>
    ),
});

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-zinc-950 text-white">
            <div className="text-center mb-6">
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 mb-1">
                    AI Vision Studio
                </h1>
                <p className="text-zinc-500 font-mono text-xs">
                    Face &bull; Hand Gestures &bull; Object Detection &bull; Photobooth
                </p>
            </div>

            <div className="w-full max-w-4xl flex flex-col items-center">
                <FaceDetection />
            </div>

            <div className="fixed bottom-3 text-[10px] text-zinc-700 font-mono">
                face-api.js &bull; MediaPipe Hands &bull; TensorFlow COCO-SSD
            </div>
        </main>
    );
}
