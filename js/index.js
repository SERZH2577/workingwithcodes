const nameInputRef = document.getElementById("nameInput");
const textareaRef = document.getElementById("myTextarea");
const statisticTextRef = document.querySelector(".js-statistic__text");

const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");
const checkBtn = document.getElementById("checkBtn");

const clearModal = document.getElementById("clearModal");
const confirmBtn = document.getElementById("confirmBtn");
const cancelBtn = document.getElementById("cancelBtn");

const copyModal = document.getElementById("copyModal");
const okBtn = document.getElementById("okBtn");

const scannerBtn = document.getElementById("scanner-btn");
const qrReader = document.getElementById("qr-reader");

const typeBtn = document.getElementById("typeBtn");
const typeMenu = document.getElementById("typeMenu");

const statTitle = document.querySelector(".js-statistic__title");
const statValue = document.querySelector(".js-statistic__value");
const statActionBtn = document.getElementById("statActionBtn");

let codeReader;
let currentStream = null;
let scannedCodes = new Set();
let stopBtn = null;
let isScanning = false;
let torchEnabled = false;
let videoTrack = null;
let selectedType = "короба";
let liveBox = null;
let isValidatedNoDuplicates = false;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

copyBtn.disabled = true;
copyBtn.style.opacity = 0.5;

const clearSound = new Audio("./sounds/clear.mp3");
clearSound.preload = "auto";
clearSound.volume = 0.8;
clearSound.load();

/* ===================== */
/* AUDIO FIX */
/* ===================== */

document.body.addEventListener(
  "click",
  () => {
    if (audioCtx.state === "suspended") audioCtx.resume();
  },
  { once: true },
);

/* ===================== */
/* SOUND */
/* ===================== */

function playBeep(type = "ok") {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

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
  osc.stop(audioCtx.currentTime + 0.12);
}

function playBroom() {
  const duration = 0.25;

  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  // генерим "шум" (как шуршание)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";

  // эффект "сметания" — фильтр уходит вниз
  filter.frequency.setValueAtTime(1000, audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(
    200,
    audioCtx.currentTime + duration,
  );

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioCtx.currentTime + duration,
  );

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  noise.start();
}

function playClick() {
  const now = audioCtx.currentTime;

  // 1. УДАР (резкий щелчок)
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();

  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(1200, now);
  osc1.frequency.exponentialRampToValueAtTime(300, now + 0.03);

  gain1.gain.setValueAtTime(0.1, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

  osc1.connect(gain1);
  gain1.connect(audioCtx.destination);

  osc1.start(now);
  osc1.stop(now + 0.03);

  // 2. "ХВОСТ" (механическое докликивание)
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();

  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(200, now + 0.01);

  gain2.gain.setValueAtTime(0.15, now + 0.01);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);

  osc2.start(now + 0.01);
  osc2.stop(now + 0.08);
}

/* ===================== */
/* CLEAR */
/* ===================== */

clearBtn.addEventListener("click", () => {
  if (!textareaRef.value && !nameInputRef.value) return;
  clearModal.classList.add("show");
});

confirmBtn.addEventListener("click", () => {
  clearSound.currentTime = 0;
  clearSound.play();

  textareaRef.value = "";
  nameInputRef.value = "";

  scannedCodes.clear();
  clearModal.classList.remove("show");

  statTitle.textContent = "";
  statValue.textContent = 0;
  statActionBtn.classList.add("hidden");

  isValidatedNoDuplicates = false;
  copyBtn.disabled = true;
  copyBtn.style.opacity = 0.5;
});

cancelBtn.addEventListener("click", () => {
  clearModal.classList.remove("show");
});

/* ===================== */
/* COPY */
/* ===================== */

copyBtn.addEventListener("click", () => {
  const name = nameInputRef.value.trim();
  const text = textareaRef.value.trim();

  if (!name && !text) return;

  const nameWithType = name ? `${name} (${selectedType})` : "";

  const combined = nameWithType ? nameWithType + "\n\n" + text : text;

  navigator.clipboard.writeText(combined).then(() => {
    copyModal.classList.add("show");
  });

  playBeep("ok");
});

okBtn.addEventListener("click", () => {
  copyModal.classList.remove("show");
});

/* ===================== */
/* CHECK DUPLICATES + SHARE BUTTON */
/* ===================== */

checkBtn.addEventListener("click", checkDuplicates);

function checkDuplicates() {
  const values = textareaRef.value
    .replace(/\n/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const total = values.length;

  const seen = {};
  let duplicates = 0;

  values.forEach((v) => {
    if (seen[v]) duplicates++;
    else seen[v] = true;
  });

  isValidatedNoDuplicates = false;
  copyBtn.disabled = true;
  copyBtn.style.opacity = 0.5;

  // всегда обновляем число
  statValue.textContent = total;

  // сброс кнопки
  statActionBtn.classList.add("hidden");
  statActionBtn.onclick = null;

  // НЕТ ДАННЫХ
  if (total === 0) {
    statTitle.textContent = "";
    statValue.textContent = 0;
    return;
  }

  // ❌ ЕСТЬ ПОВТОРЫ
  if (duplicates > 0) {
    statTitle.textContent = "Есть повторы!";
    statValue.textContent = duplicates;

    statActionBtn.textContent = "Удалить";
    statActionBtn.className = "statistic__action delete";

    statActionBtn.classList.remove("hidden");

    statActionBtn.onclick = () => {
      textareaRef.value = [...new Set(values)].join("\n");
      checkDuplicates();
    };

    return;
  }

  // ✅ НЕТ ПОВТОРОВ
  statTitle.textContent = "Повторов нет";
  statValue.textContent = total;

  isValidatedNoDuplicates = true;
  copyBtn.disabled = false;
  copyBtn.style.opacity = 1;

  statActionBtn.textContent = "Поделиться";
  statActionBtn.className = "statistic__action share";

  statActionBtn.classList.remove("hidden");

  statActionBtn.onclick = () => {
    const name = nameInputRef.value.trim();
    const text = textareaRef.value.trim();

    const combined = name ? name + "\n\n" + text : text;

    if (navigator.share) {
      navigator.share({ text: combined });
    } else {
      navigator.clipboard.writeText(combined);
    }
  };
}

/* ===================== */
/* Отслеживание изменений textarea */
/* ===================== */

textareaRef.addEventListener("input", () => {
  if (isValidatedNoDuplicates) {
    statTitle.textContent = "";
    statActionBtn.classList.add("hidden");

    isValidatedNoDuplicates = false;

    copyBtn.disabled = true;
    copyBtn.style.opacity = 0.5;
  }
});

/* ===================== */
/* SCANNER */
/* ===================== */

scannerBtn.addEventListener("click", startScanner);

async function startScanner() {
  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock("portrait");
    }
  } catch (e) {
    console.log("Orientation lock not supported");
  }

  if (isScanning) return;
  isScanning = true;

  scannerBtn.style.display = "none";
  qrReader.style.display = "block";
  qrReader.innerHTML = "";

  const existingCodes = [
    ...new Set(
      textareaRef.value
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];

  scannedCodes = new Set(existingCodes);

  stopBtn = document.createElement("button");
  stopBtn.className = "stop-btn";
  stopBtn.textContent = "STOP";
  document.body.appendChild(stopBtn);
  stopBtn.onclick = stopScanner;

  const torchBtn = document.createElement("button");
  torchBtn.className = "torch-btn";
  torchBtn.innerHTML = `<img src="./img/flashlight.svg" alt="flashlight" />`;
  document.body.appendChild(torchBtn);

  torchBtn.onclick = async () => {
    if (!videoTrack) return;

    const caps = videoTrack.getCapabilities?.();
    if (!caps?.torch) return;

    try {
      torchEnabled = !torchEnabled;

      playClick();

      await videoTrack.applyConstraints({
        advanced: [{ torch: torchEnabled }],
      });

      torchBtn.classList.toggle("active", torchEnabled);
    } catch (e) {
      console.log("Torch not supported", e);
    }
  };

  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;

  const overlay = document.createElement("div");
  overlay.className = "scanner-overlay";

  liveBox = document.createElement("div");
  liveBox.className = "scan-live-box";
  liveBox.textContent = scannedCodes.size;
  qrReader.appendChild(liveBox);

  const scanBox = document.createElement("div");
  scanBox.className = "scan-box";

  qrReader.append(video, overlay, scanBox);

  try {
    currentStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });

    video.srcObject = currentStream;
    await video.play();

    videoTrack = currentStream.getVideoTracks()[0];

    const track = currentStream.getVideoTracks()[0];

    try {
      const caps = track.getCapabilities?.();

      const constraints = {};

      if (caps.focusMode) {
        constraints.focusMode = "continuous";
      }

      if (caps.zoom) {
        constraints.zoom = Math.min(2, caps.zoom.max);
      }

      if (Object.keys(constraints).length) {
        track.applyConstraints({ advanced: [constraints] });
      }
    } catch (e) {}

    // 🔥 ВОССТАНОВЛЕНИЕ ФОКУСА / СТАБИЛЬНОСТИ
    try {
      await track.applyConstraints({
        advanced: [
          ...(caps.focusMode ? [{ focusMode: "continuous" }] : []),
          ...(caps.torch ? [{ torch: false }] : []),
        ],
      });
    } catch (e) {}

    codeReader = new ZXing.BrowserMultiFormatReader(undefined, {
      delayBetweenScanAttempts: 30,
    });

    codeReader.decodeFromVideoDevice(null, video, (result) => {
      if (!result) return;

      const text = result.getText();

      if (!scannedCodes.has(text)) {
        scannedCodes.add(text);
        liveBox.textContent = scannedCodes.size;

        textareaRef.value += (textareaRef.value ? "\n" : "") + text;
        textareaRef.dispatchEvent(new Event("input"));

        playBeep("scan");
        flash(overlay, "success");
      } else {
        playBeep("error");
        flash(overlay, "error");
      }
    });
  } catch (e) {
    console.error(e);
    alert("Camera error");
    stopScanner();
  }
}

/* ===================== */
/* STOP SCANNER */
/* ===================== */

function stopScanner() {
  try {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  } catch (e) {}

  isScanning = false;

  torchEnabled = false;

  if (videoTrack) {
    try {
      videoTrack.applyConstraints({
        advanced: [{ torch: false }],
      });
    } catch (e) {}
  }

  if (codeReader) {
    codeReader.reset();
    codeReader = null;
  }

  if (currentStream) {
    currentStream.getTracks().forEach((t) => t.stop());
    currentStream = null;
  }

  if (statValue) {
    statValue.textContent = scannedCodes.size;
  }

  qrReader.innerHTML = "";
  qrReader.style.display = "none";

  if (stopBtn) stopBtn.remove();

  const torchBtn = document.querySelector(".torch-btn");
  if (torchBtn) torchBtn.remove();

  if (liveBox) {
    liveBox.remove();
    liveBox = null;
  }

  scannerBtn.style.display = "block";
}

/* ===================== */
/* FLASH */
/* ===================== */

function flash(el, type) {
  el.className = "scanner-overlay " + type;

  setTimeout(() => {
    el.className = "scanner-overlay";
  }, 150);
}

// =========================
// Выподающее меню
// =========================

typeBtn.addEventListener("click", () => {
  typeMenu.classList.toggle("hidden");
});

typeMenu.addEventListener("click", (e) => {
  const value = e.target.dataset.value;
  if (!value) return;

  selectedType = value;
  typeBtn.textContent = value;

  typeMenu.classList.add("hidden");
});

document.addEventListener("click", (e) => {
  if (!typeMenu.contains(e.target) && e.target !== typeBtn) {
    typeMenu.classList.add("hidden");
  }
});
