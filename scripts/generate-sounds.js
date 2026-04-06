// Generate placeholder audio files for the soundboard
// Run: node scripts/generate-sounds.js

const fs = require('fs');
const path = require('path');

const SOUNDS_DIR = path.join(__dirname, '..', 'public', 'sounds');

// Create the sounds directory
if (!fs.existsSync(SOUNDS_DIR)) {
    fs.mkdirSync(SOUNDS_DIR, { recursive: true });
}

// Generate a minimal WAV file with a sine wave tone
function generateWav(frequency, durationMs, filename) {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * (durationMs / 1000));
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = numSamples * blockAlign;
    const fileSize = 36 + dataSize;

    const buffer = Buffer.alloc(44 + dataSize);
    let offset = 0;

    // RIFF header
    buffer.write('RIFF', offset); offset += 4;
    buffer.writeUInt32LE(fileSize, offset); offset += 4;
    buffer.write('WAVE', offset); offset += 4;

    // fmt chunk
    buffer.write('fmt ', offset); offset += 4;
    buffer.writeUInt32LE(16, offset); offset += 4; // chunk size
    buffer.writeUInt16LE(1, offset); offset += 2;  // PCM
    buffer.writeUInt16LE(numChannels, offset); offset += 2;
    buffer.writeUInt32LE(sampleRate, offset); offset += 4;
    buffer.writeUInt32LE(byteRate, offset); offset += 4;
    buffer.writeUInt16LE(blockAlign, offset); offset += 2;
    buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

    // data chunk
    buffer.write('data', offset); offset += 4;
    buffer.writeUInt32LE(dataSize, offset); offset += 4;

    // Generate sine wave with decay envelope
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t * 5) * 0.7;
        const sample = Math.sin(2 * Math.PI * frequency * t) * envelope;
        const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
        buffer.writeInt16LE(intSample, offset);
        offset += 2;
    }

    // Save as .mp3 extension (WAV data is still playable by Web Audio API's decodeAudioData)
    // For a real project, convert to actual MP3 using ffmpeg
    const filePath = path.join(SOUNDS_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    console.log(`Generated: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

// Each finger gets a distinct tone and duration
const sounds = [
    { name: 'I.mp3',    freq: 523.25, duration: 400 },  // C5 - bright, short
    { name: 'Love.mp3', freq: 659.25, duration: 500 },  // E5 - warm
    { name: 'You.mp3',  freq: 783.99, duration: 400 },  // G5 - high
    { name: 'Hate.mp3', freq: 349.23, duration: 500 },  // F4 - low, dramatic
];

sounds.forEach(s => generateWav(s.freq, s.duration, s.name));
console.log('\nAll soundboard audio files generated!');
console.log('Note: These are WAV files with .mp3 extension. Web Audio API handles them fine.');
console.log('For production, replace with real voice recordings or convert with ffmpeg.');
