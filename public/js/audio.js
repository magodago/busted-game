// BUSTED - Web Audio API Sound System
// All sounds synthesised procedurally - no external files needed

const BustedAudio = (() => {
  let actx = null;
  let muted = false;

  function init() {
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not available');
    }
  }

  function ensureContext() {
    if (!actx) init();
    if (actx && actx.state === 'suspended') {
      actx.resume();
    }
    return actx;
  }

  function beep(freq, dur, type = 'square', vol = 0.08, delay = 0) {
    const ctx = ensureContext();
    if (!ctx || muted) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur);
    } catch (e) { /* ignore audio errors */ }
  }

  function noise(dur, vol = 0.04) {
    const ctx = ensureContext();
    if (!ctx || muted) return;
    try {
      const bufferSize = ctx.sampleRate * dur;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch (e) { /* ignore */ }
  }

  const sfx = {
    click() {
      beep(800, 0.06, 'square', 0.03);
    },

    card() {
      beep(600, 0.08, 'triangle', 0.05);
      beep(900, 0.06, 'sine', 0.03, 0.05);
    },

    tension() {
      beep(200, 0.3, 'sawtooth', 0.04);
      beep(250, 0.2, 'sawtooth', 0.03, 0.1);
    },

    stamp() {
      // Impact sound
      noise(0.15, 0.1);
      beep(80, 0.2, 'square', 0.08);
      beep(60, 0.3, 'triangle', 0.06);
    },

    busted() {
      // Dramatic descending tone
      beep(200, 0.4, 'sawtooth', 0.06);
      beep(150, 0.3, 'sawtooth', 0.05, 0.15);
      beep(100, 0.4, 'square', 0.07, 0.3);
      noise(0.5, 0.06);
    },

    liberado() {
      // Rising triumphant tone
      beep(300, 0.3, 'triangle', 0.05);
      beep(400, 0.3, 'triangle', 0.05, 0.15);
      beep(500, 0.4, 'triangle', 0.06, 0.3);
      beep(600, 0.5, 'sine', 0.04, 0.45);
    },

    reveal() {
      beep(400, 0.1, 'sine', 0.04);
      beep(600, 0.1, 'sine', 0.04, 0.08);
      beep(800, 0.15, 'sine', 0.05, 0.16);
    },

    victory() {
      [523, 659, 784, 1047].forEach((f, i) => {
        beep(f, 0.2, 'triangle', 0.05, i * 0.12);
      });
    },

    lobby_join() {
      beep(400, 0.1, 'sine', 0.04);
      beep(600, 0.08, 'sine', 0.03, 0.08);
    },

    error() {
      beep(200, 0.2, 'sawtooth', 0.05);
      beep(180, 0.3, 'sawtooth', 0.04, 0.15);
    },

    accuse() {
      // Dramatic chord
      beep(220, 0.3, 'triangle', 0.05);
      beep(277, 0.3, 'triangle', 0.04, 0.05);
      beep(330, 0.3, 'triangle', 0.03, 0.1);
      beep(100, 0.4, 'square', 0.05);
    },

    tick() {
      beep(1000, 0.03, 'square', 0.02);
    },

    powerup() {
      beep(500, 0.08, 'sine', 0.05);
      beep(700, 0.08, 'sine', 0.04, 0.06);
      beep(900, 0.1, 'sine', 0.04, 0.12);
    }
  };

  function toggleMute() {
    muted = !muted;
    return muted;
  }

  function isMuted() { return muted; }

  return { sfx, toggleMute, isMuted, init };
})();
