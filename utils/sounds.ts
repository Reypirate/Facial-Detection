// ─── Whisper Board Audio Engine ─────────────────────────────────────────

import { WordName, WORD_CONFIG } from "@/types/models";

let audioCtx: AudioContext | null = null;
let soundEnabled = true;
const sampleBuffers: Partial<Record<WordName, AudioBuffer>> = {};
let initialized = false;

function getAudioCtx(): AudioContext {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
}

export function toggleSounds(on: boolean) {
    soundEnabled = on;
}

export function isSoundEnabled() {
    return soundEnabled;
}

// ─── Fallback tone generation ───────────────────────────────────────────
const FALLBACK_FREQ: Record<WordName, number> = {
    "I": 523,
    "love": 659,
    "you": 784,
    "hate": 349,
    "that": 440,
};

function generateFallbackBuffer(ctx: AudioContext, word: WordName): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const duration = 0.4;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    const freq = FALLBACK_FREQ[word];

    for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t * 6);
        data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
    }
    return buffer;
}

// ─── Initialize: load all 5 audio samples ───────────────────────────────
export async function initSoundboard(): Promise<void> {
    if (initialized) return;
    initialized = true;

    const ctx = getAudioCtx();
    const words: WordName[] = ["I", "love", "you", "hate", "that"];

    await Promise.all(
        words.map(async (word) => {
            const config = WORD_CONFIG[word];
            try {
                const response = await fetch(config.audioFile);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                sampleBuffers[word] = await ctx.decodeAudioData(arrayBuffer);
                console.log(`[WhisperBoard] Loaded ${config.audioFile}`);
            } catch (err) {
                console.warn(
                    `[WhisperBoard] Failed to load ${config.audioFile}, using fallback tone`,
                    err
                );
                sampleBuffers[word] = generateFallbackBuffer(ctx, word);
            }
        })
    );

    console.log("[WhisperBoard] All audio samples ready");
}

// ─── Play a word sample ─────────────────────────────────────────────────
export function playWord(word: WordName): void {
    if (!soundEnabled) return;

    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();

    const buffer = sampleBuffers[word];
    if (!buffer) {
        console.warn(`[WhisperBoard] No buffer for "${word}"`);
        return;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.45, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + buffer.duration);

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
}

// ─── Utility sounds (kept for registration, etc.) ───────────────────────

export function playShutter() {
    if (!soundEnabled) return;
    const ctx = getAudioCtx();
    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.25;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
}

export function playCountdownBeep(final: boolean = false) {
    if (!soundEnabled) return;
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = final ? 880 : 600;
    const dur = final ? 0.3 : 0.12;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
}
