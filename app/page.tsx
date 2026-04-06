import dynamic from "next/dynamic";

const FaceDetection = dynamic(() => import("@/components/FaceDetection"), {
    ssr: false,
    loading: () => (
        <div className="relative w-full max-w-[640px] aspect-[4/3] bg-cream-50 rounded-2xl border border-warm-300/30 flex flex-col items-center justify-center overflow-hidden shadow-sm">
            <div className="relative z-10 text-center">
                <div className="w-10 h-10 border-2 border-warm-300/30 border-t-warm-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-warm-400 text-xs font-medium tracking-wider">Waking up...</p>
            </div>
        </div>
    ),
});

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-cream-50 text-slate-700 relative overflow-hidden">
            {/* Soft radial glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-soft-lavender/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 text-center mb-6">
                <h1 className="text-4xl md:text-5xl font-light text-slate-700 mb-1 tracking-tight">
                    WhisperWeave
                </h1>
                <p className="text-warm-400 text-[11px] tracking-[0.25em] uppercase font-medium">
                    Gentle AI Vision · Limbo
                </p>
            </div>

            <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
                <FaceDetection />
            </div>

            <div className="fixed bottom-4 text-[9px] text-warm-300 tracking-widest uppercase">
                face-api.js · MediaPipe · TensorFlow
            </div>
        </main>
    );
}
