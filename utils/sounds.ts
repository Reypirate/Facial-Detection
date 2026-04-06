import { WordName } from "@/types/models";

const WORD_AUDIO_PATHS: Record<WordName, string[]> = {
    I: ["/sounds/I.mp3", "/sounds/i.mp3"],
    love: ["/sounds/love.mp3", "/sounds/Love.mp3"],
    you: ["/sounds/you.mp3", "/sounds/You.mp3"],
    hate: ["/sounds/hate.mp3", "/sounds/Hate.mp3"],
    that: ["/sounds/that.mp3", "/sounds/That.mp3"],
};

const EXPECTED_WORD_COUNT = 5;

let audioCtx: AudioContext | null = null;
let soundEnabled = true;
let initialized = false;
let initPromise: Promise<void> | null = null;

const decodedBuffers: Partial<Record<WordName, AudioBuffer>> = {};

function getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    if (!audioCtx) {
        const extendedWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
        const AudioContextCtor = window.AudioContext || extendedWindow.webkitAudioContext;

        if (!AudioContextCtor) {
            console.warn("[WhisperBoard] Web Audio API is not supported in this browser.");
            return null;
        }

        audioCtx = new AudioContextCtor();
    }

    return audioCtx;
}

function normalizeWord(word: string): WordName | null {
    const cleaned = word.trim().toLowerCase();
    if (cleaned === "i") return "I";
    if (cleaned === "love") return "love";
    if (cleaned === "you") return "you";
    if (cleaned === "hate") return "hate";
    if (cleaned === "that") return "that";
    return null;
}

async function decodeWordBuffer(ctx: AudioContext, word: WordName): Promise<void> {
    const candidates = WORD_AUDIO_PATHS[word];
    let lastError: unknown = null;

    for (const audioPath of candidates) {
        try {
            const response = await fetch(audioPath, { cache: "no-store" });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const compressedData = await response.arrayBuffer();
            const decoded = await ctx.decodeAudioData(compressedData);
            decodedBuffers[word] = decoded;
            return;
        } catch (error) {
            lastError = error;
        }
    }

    console.warn(
        `[WhisperBoard] Failed to load/decode audio for "${word}". Tried: ${candidates.join(", ")}.`,
        lastError
    );
}

async function tryResumeContext(ctx: AudioContext): Promise<boolean> {
    if (ctx.state === "running") return true;

    try {
        await ctx.resume();
    } catch (error) {
        console.warn(
            "[WhisperBoard] AudioContext resume was blocked. Trigger init/resume from a user click/tap.",
            error
        );
        return false;
    }

    if (ctx.state !== "running") {
        console.warn(
            "[WhisperBoard] AudioContext is not running yet. A user gesture may be required before playback."
        );
        return false;
    }

    return true;
}

export function toggleSounds(on: boolean) {
    soundEnabled = on;
}

export function isSoundEnabled() {
    return soundEnabled;
}

export async function initSoundboard(): Promise<void> {
    if (initialized) return;
    if (initPromise) return initPromise;

    const ctx = getAudioContext();
    if (!ctx) {
        console.warn("[WhisperBoard] Unable to initialize audio context.");
        return;
    }

    initPromise = (async () => {
        const words = Object.keys(WORD_AUDIO_PATHS) as WordName[];
        await Promise.all(words.map((word) => decodeWordBuffer(ctx, word)));

        initialized = true;

        const loadedCount = words.filter((word) => Boolean(decodedBuffers[word])).length;
        if (loadedCount < EXPECTED_WORD_COUNT) {
            console.warn(
                `[WhisperBoard] Loaded ${loadedCount}/${EXPECTED_WORD_COUNT} audio buffers. Missing files will be silent.`
            );
        } else {
            console.log("[WhisperBoard] All custom MP3 buffers are decoded and ready.");
        }

        if (ctx.state !== "running") {
            console.warn(
                "[WhisperBoard] Audio decoded, but context is suspended. Call init/resume from a user interaction to unlock playback."
            );
        }
    })().finally(() => {
        initPromise = null;
    });

    return initPromise;
}

export async function resumeSoundboard(): Promise<void> {
    const ctx = getAudioContext();
    if (!ctx) return;
    await tryResumeContext(ctx);
}

export function playWord(word: string): void {
    if (!soundEnabled) return;

    const normalized = normalizeWord(word);
    if (!normalized) {
        console.warn(`[WhisperBoard] Unknown word "${word}". Expected one of: I, love, you, hate, that.`);
        return;
    }

    if (!initialized && !initPromise) {
        void initSoundboard();
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    const buffer = decodedBuffers[normalized];
    if (!buffer) {
        console.warn(
            `[WhisperBoard] Buffer for "${normalized}" is not ready yet. Ensure initSoundboard() has finished.`
        );
        return;
    }

    void (async () => {
        const canPlay = await tryResumeContext(ctx);
        if (!canPlay) return;

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
    })();
}
