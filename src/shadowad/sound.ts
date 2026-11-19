// Off by default. Wind over the ridge, a low drone indoors, short ticks for the UI.
// All synthesized with Web Audio, so the page ships no audio files.
export function createSound() {
  let ctx: AudioContext | null = null;
  let master: GainNode, windGain: GainNode, droneGain: GainNode;
  let on = false, lastMood = '';

  function init() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    // wind: brown noise through a wandering band-pass
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.6;
    windGain = ctx.createGain(); windGain.gain.value = 0.8;
    src.connect(bp).connect(windGain).connect(master); src.start();
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
    const lg = ctx.createGain(); lg.gain.value = 300; lfo.connect(lg).connect(bp.frequency); lfo.start();
    // drone
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    droneGain = ctx.createGain(); droneGain.gain.value = 0.12;
    [55, 82.41, 110.2, 164.8].forEach((f, i) => {
      const o = ctx!.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = (i - 1.5) * 5;
      const g = ctx!.createGain(); g.gain.value = [0.32, 0.16, 0.1, 0.05][i];
      o.connect(g).connect(lp); o.start();
    });
    lp.connect(droneGain).connect(master);
  }

  return {
    toggle() {
      on = !on;
      if (!ctx) init();
      ctx!.resume();
      master.gain.setTargetAtTime(on ? 0.45 : 0, ctx!.currentTime, 0.5);
      return on;
    },
    mood(chapter: string, local: number) {
      if (!ctx || !on) return;
      const key = chapter + (local > 0.5 ? '1' : '0');
      if (key === lastMood) return;
      lastMood = key;
      const outside = chapter === 'bastion' && local < 0.7;
      windGain.gain.setTargetAtTime(outside ? 0.85 : 0.18, ctx.currentTime, 1.2);
      droneGain.gain.setTargetAtTime(outside ? 0.1 : chapter === 'rings' ? 0.5 : 0.32, ctx.currentTime, 1.5);
    },
    blip(kind = 0) {
      if (!ctx || !on) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      const f = [2400, 1600, 700][kind] ?? 2000;
      o.frequency.setValueAtTime(f, t);
      if (kind === 2) o.frequency.exponentialRampToValueAtTime(220, t + 0.35);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(kind === 2 ? 0.12 : 0.05, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 2 ? 0.4 : 0.07));
      o.connect(g).connect(master);
      o.start(t); o.stop(t + 0.45);
    },
  };
}
