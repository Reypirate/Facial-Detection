// ─── Soundboard Audio Engine ────────────────────────────────────────────

import { FingerName, FINGER_CONFIG } from "@/types/models";

let audioCtx: AudioContext | null = null;
let soundEnabled = true;
const sampleBuffers: Partial<Record<FingerName, AudioBuffer>> = {};
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

// ─── Generate a fallback tone buffer for a finger ───────────────────────
// Each finger gets a distinct frequency so they sound different
const FALLBACK_FREQ: Record<FingerName, number> = {
    index: 523,   // C5
    middle: 659,  // E5
    ring: 784,    // G5
    pinky: 440,   // A4
};

function generateFallbackBuffer(ctx: AudioContext, finger: FingerName): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const duration = 0.4;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    const freq = FALLBACK_FREQ[finger];

    for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        // Sine wave with exponential decay envelope
        const envelope = Math.exp(-t * 6);
        data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.4;
    }
    return buffer;
}

// ─── Initialize the soundboard: load MP3s with fallback ─────────────────
export async function initSoundboard(): Promise<void> {
    if (initialized) return;
    initialized = true;

    const ctx = getAudioCtx();
    const fingers: FingerName[] = ["index", "middle", "ring", "pinky"];

    await Promise.all(
        fingers.map(async (finger) => {
            const config = FINGER_CONFIG[finger];
            try {
                const response = await fetch(config.audioFile);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                sampleBuffers[finger] = await ctx.decodeAudioData(arrayBuffer);
                console.log(`[Soundboard] Loaded ${config.audioFile}`);
            } catch (err) {
                console.warn(
                    `[Soundboard] Failed to load ${config.audioFile}, using fallback tone`,
                    err
                );
                sampleBuffers[finger] = generateFallbackBuffer(ctx, finger);
            }
        })
    );

    console.log("[Soundboard] Initialization complete");
}

// ─── Play a sample for a specific finger ────────────────────────────────
export function playSample(finger: FingerName): void {
    if (!soundEnabled) return;

    const ctx = getAudioCtx();
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === "suspended") ctx.resume();

    const buffer = sampleBuffers[finger];
    if (!buffer) {
        console.warn(`[Soundboard] No buffer loaded for ${finger}`);
        return;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + buffer.duration);

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
}

// ─── Kept for other features (face registration, etc.) ──────────────────

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
    gain.gain.value = 0.3;
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
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
}
