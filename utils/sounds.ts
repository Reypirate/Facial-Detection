// ─── Sound effects using Web Audio API ──────────────────────────────────

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioCtx() {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
}

export function toggleSounds(on: boolean) {
    soundEnabled = on;
}

export function isSoundEnabled() {
    return soundEnabled;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine") {
    if (!soundEnabled) return;
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
}

export function playShutter() {
    if (!soundEnabled) return;
    const ctx = getAudioCtx();
    // White noise burst for shutter click
    const bufferSize = ctx.sampleRate * 0.08;
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

export function playGestureSound(gesture: string) {
    if (!soundEnabled) return;
    switch (gesture) {
        case "THUMBS UP 👍":
            playTone(523, 0.15); // C5
            setTimeout(() => playTone(659, 0.15), 100); // E5
            setTimeout(() => playTone(784, 0.2), 200); // G5
            break;
        case "THUMBS DOWN 👎":
            playTone(392, 0.15);
            setTimeout(() => playTone(330, 0.15), 100);
            setTimeout(() => playTone(262, 0.2), 200);
            break;
        case "PEACE ✌️":
            playTone(440, 0.1);
            setTimeout(() => playTone(554, 0.1), 80);
            break;
        case "OPEN PALM 🖐️":
            playTone(660, 0.3, "triangle");
            break;
        case "FIST ✊":
            playTone(220, 0.15, "square");
            break;
        default:
            playTone(500, 0.08);
    }
}

export function playCountdownBeep(final: boolean = false) {
    if (!soundEnabled) return;
    if (final) {
        playTone(880, 0.3);
    } else {
        playTone(600, 0.12);
    }
}
