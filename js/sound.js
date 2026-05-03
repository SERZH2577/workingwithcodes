let audioCtx;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  return audioCtx;
}

export function unlockAudio() {
  const ctx = getAudioCtx();
  if (ctx.state === "suspended") {
    ctx.resume();
  }
}

export function playCopyTick() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(1400, now);

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.06);
}

export function playSweepSound() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.28, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const w = Math.random() * 2 - 1;
    last = last * 0.95 + w * 0.05;
    data[i] = last * 0.6;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(150, now);
  filter.frequency.exponentialRampToValueAtTime(3000, now + 0.25);
  filter.Q.value = 1;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.7, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

  const master = ctx.createGain();
  master.gain.value = 3;

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  master.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + 0.28);
}

export function playBeep(type = "ok") {
  const ctx = getAudioCtx();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  if (type === "scan") {
    osc.frequency.value = 1600;
    osc.type = "square";
  } else if (type === "error") {
    osc.frequency.value = 300;
    osc.type = "sawtooth";
  } else {
    osc.frequency.value = 1000;
    osc.type = "sine";
  }

  gain.gain.value = 0.08;

  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

export function playBroom() {
  const ctx = getAudioCtx();

  const duration = 0.25;

  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";

  filter.frequency.setValueAtTime(1000, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(
    200,
    ctx.currentTime + duration,
  );

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start();
}

export function playClick() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();

  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(1200, now);
  osc1.frequency.exponentialRampToValueAtTime(300, now + 0.03);

  gain1.gain.setValueAtTime(0.25, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.03);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();

  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(200, now + 0.01);

  gain2.gain.setValueAtTime(0.15, now + 0.01);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc2.start(now + 0.01);
  osc2.stop(now + 0.08);
}

export function uiSuccess() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();

  osc1.type = "sine";
  osc1.frequency.setValueAtTime(600, now);

  gain1.gain.setValueAtTime(0.3, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.15);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();

  osc2.type = "sine";
  osc2.frequency.setValueAtTime(900, now + 0.1);

  gain2.gain.setValueAtTime(0.24, now + 0.1);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc2.start(now + 0.1);
  osc2.stop(now + 0.3);
}

export function playFailBzzt() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  filter.Q.value = 0.7;
  filter.connect(master);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "square";

  osc.frequency.setValueAtTime(170, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.setValueAtTime(0.9, now + 0.003);
  gain.gain.setValueAtTime(0.0, now + 0.085);

  osc.connect(gain);
  gain.connect(filter);

  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.22;
  }

  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();

  noise.buffer = buffer;

  noiseGain.gain.setValueAtTime(0.22, now);
  noiseGain.gain.setValueAtTime(0.0, now + 0.06);

  noise.connect(noiseGain);
  noiseGain.connect(filter);

  osc.start(now);
  noise.start(now);

  osc.stop(now + 0.09);
  noise.stop(now + 0.06);
}

export const sound = {
  playCopyTick,
  playSweepSound,
  playBeep,
  playBroom,
  playClick,
  uiSuccess,
  playFailBzzt,
};
