/**
 * Gerenciador de Áudio com Web Audio API
 * Sintetiza sons de tiro, acerto (headshot ding), erro e contagem regressiva
 * Sem necessidade de arquivos externos de áudio (baixa latência e 100% autônomo)
 */
class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterVolume = 0.7;
        this.sfxVolume = 0.8;
        this.muted = false;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolumes(master, sfx) {
        this.masterVolume = Math.max(0, Math.min(1, master));
        this.sfxVolume = Math.max(0, Math.min(1, sfx));
    }

    getEffectiveVolume() {
        return this.muted ? 0 : this.masterVolume * this.sfxVolume;
    }

    /**
     * Som de tiro (estilo Vandal / Phantom do Valorant)
     */
    playShot() {
        this.init();
        if (this.getEffectiveVolume() <= 0) return;

        const now = this.ctx.currentTime;
        const vol = this.getEffectiveVolume();

        // 1. Ruído de impacto (Transient punch)
        const bufferSize = this.ctx.sampleRate * 0.08;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3200, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 0.08);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.6 * vol, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);

        // 2. Punch sub-grave (Kick)
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.1);

        oscGain.gain.setValueAtTime(0.7 * vol, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
    }

    /**
     * Som de acerto no alvo (Ding metálico / Headshot satisfatório estilo Valorant)
     */
    playHit() {
        this.init();
        if (this.getEffectiveVolume() <= 0) return;

        const now = this.ctx.currentTime;
        const vol = this.getEffectiveVolume();

        // Duas frequências harmônicas que geram o "ding" nítido de headshot
        const freqs = [1760, 2637]; // La6 e Mi7
        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = idx === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.4 * vol, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.3);
        });
    }

    /**
     * Som suave de erro (tiro que não acertou nada)
     */
    playMiss() {
        this.init();
        if (this.getEffectiveVolume() <= 0) return;

        const now = this.ctx.currentTime;
        const vol = this.getEffectiveVolume() * 0.3;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.07);

        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    /**
     * Som de contagem regressiva (3, 2, 1)
     */
    playCountdown(isFinal = false) {
        this.init();
        if (this.getEffectiveVolume() <= 0) return;

        const now = this.ctx.currentTime;
        const vol = this.getEffectiveVolume() * 0.5;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const freq = isFinal ? 880 : 440;
        osc.frequency.setValueAtTime(freq, now);

        const duration = isFinal ? 0.35 : 0.15;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration + 0.02);
    }

    /**
     * Som de finalização de rodada
     */
    playRoundEnd() {
        this.init();
        if (this.getEffectiveVolume() <= 0) return;

        const notes = [523.25, 659.25, 783.99, 1046.50]; // Acorde Maior C E G C
        notes.forEach((freq, index) => {
            const now = this.ctx.currentTime + index * 0.08;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.3 * this.getEffectiveVolume(), now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.38);
        });
    }
}

window.soundManager = new SoundManager();
