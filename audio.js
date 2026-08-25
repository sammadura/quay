const AUDIO = (() => {
  const KEY = "quay_mute";
  let ctx = null;
  let muted = false;
  let footT = 0;
  let hornT = 18;
  let waterNodes = null;
  let humNodes = null;

  try { muted = localStorage.getItem(KEY) === "1"; } catch (_) {}

  function AC() {
    return window.AudioContext || window.webkitAudioContext;
  }

  function ensure() {
    const C = AC();
    if (!C) return null;
    if (!ctx) ctx = new C();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function persist() {
    try { localStorage.setItem(KEY, muted ? "1" : "0"); } catch (_) {}
  }

  function envGain(t, a, h, d, peak) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + h);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + h + d);
    return g;
  }

  function startWater() {
    if (!ctx || waterNodes) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.55;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 380;
    bp.Q.value = 0.55;
    const g = ctx.createGain();
    g.gain.value = muted ? 0 : 0.028;
    src.connect(bp); bp.connect(g); g.connect(ctx.destination);
    src.start();
    waterNodes = { src, g };
  }

  function startHum() {
    if (!ctx || humNodes) return;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = "sine"; o2.type = "sine";
    o1.frequency.value = 58; o2.frequency.value = 117;
    const g = ctx.createGain();
    g.gain.value = 0;
    o1.connect(g); o2.connect(g); g.connect(ctx.destination);
    o1.start(); o2.start();
    humNodes = { g };
  }

  function setMuted(v) {
    muted = !!v;
    persist();
    if (waterNodes) waterNodes.g.gain.value = muted ? 0 : 0.028;
    if (humNodes && muted) humNodes.g.gain.value = 0;
  }

  function toggleMute() { setMuted(!muted); return muted; }

  function init() {
    if (!ensure()) return;
    startWater();
    startHum();
  }

  function foot(moving, dt) {
    if (!ctx || muted || !moving) { if (!moving) footT = 0.16; return; }
    footT -= dt;
    if (footT > 0) return;
    footT = 0.42 + Math.random() * 0.06;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(92, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.09);
    const nbuf = ctx.createBuffer(1, 1024, ctx.sampleRate);
    const nd = nbuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const ns = ctx.createBufferSource();
    ns.buffer = nbuf;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 720;
    const g = envGain(t, 0.008, 0.02, 0.11, 0.07);
    o.connect(g); ns.connect(f); f.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.14);
    ns.start(t); ns.stop(t + 0.12);
  }

  function hum(dist) {
    if (!humNodes || muted) return;
    const near = dist < 4 ? (1 - dist / 4) : 0;
    const target = near * 0.016;
    const g = humNodes.g.gain;
    g.setTargetAtTime(target, ctx.currentTime, 0.12);
  }

  function foghorn() {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = "sine"; o2.type = "sine";
    o1.frequency.setValueAtTime(118, t);
    o1.frequency.linearRampToValueAtTime(96, t + 1.8);
    o2.frequency.setValueAtTime(59, t);
    o2.frequency.linearRampToValueAtTime(48, t + 1.8);
    const g = envGain(t, 0.18, 0.7, 1.1, 0.11);
    o1.connect(g); o2.connect(g); g.connect(ctx.destination);
    o1.start(t); o2.start(t);
    o1.stop(t + 2.1); o2.stop(t + 2.1);
  }

  function bell() {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = "sine"; o2.type = "sine";
    o1.frequency.value = 392;
    o2.frequency.value = 196;
    const g = envGain(t, 0.02, 0.15, 2.4, 0.14);
    o1.connect(g); o2.connect(g); g.connect(ctx.destination);
    o1.start(t); o2.start(t);
    o1.stop(t + 2.6); o2.stop(t + 2.6);
  }

  function tick(dt) {
    if (!ctx || muted) return;
    hornT -= dt;
    if (hornT <= 0) {
      foghorn();
      hornT = 26 + Math.random() * 18;
    }
  }

  return { init, foot, hum, foghorn, bell, tick, toggleMute, isMuted: () => muted, setMuted };
})();
