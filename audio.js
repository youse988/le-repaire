/**
 * Moteur Audio Web Audio API
 * Génère des effets sonores dynamiques et rétro/modernes sans aucun fichier externe requis !
 */

class SoundEffects {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    playClick() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    playCardFlip() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(250, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(550, this.ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
    }

    playImposterAlarm() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        // Effet d'alarme dramatique
        const notes = [220, 196, 174, 130];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const start = this.ctx.currentTime + (i * 0.15);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, start);
            osc.frequency.linearRampToValueAtTime(freq * 0.9, start + 0.25);

            gain.gain.setValueAtTime(0.2, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(start);
            osc.stop(start + 0.3);
        });
    }

    playInnocentChime() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const start = this.ctx.currentTime + (idx * 0.08);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0.18, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(start);
            osc.stop(start + 0.35);
        });
    }

    playTick() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.03);
    }

    playVictory() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        // Fanfare de victoire
        const chord = [
            { f: 523.25, t: 0 },
            { f: 659.25, t: 0.12 },
            { f: 783.99, t: 0.24 },
            { f: 1046.50, t: 0.36 },
            { f: 1046.50, t: 0.55 },
            { f: 1318.51, t: 0.75 }
        ];

        chord.forEach(item => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const start = this.ctx.currentTime + item.t;
            const dur = (item.t >= 0.75) ? 0.6 : 0.2;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(item.f, start);

            gain.gain.setValueAtTime(0.2, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(start);
            osc.stop(start + dur);
        });
    }

    playEliminated() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.5);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }
}

const Sound = new SoundEffects();
