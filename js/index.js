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

let codeReader;
let currentStream = null;
let scannedCodes = new Set();
let stopBtn = null;
let isScanning = false;
let torchEnabled = false;
let videoTrack = null;
let selectedType = "короба";

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

/* ===================== */
/* AUDIO FIX */
/* ===================== */

document.body.addEventListener(
  "click",
  () => {
    if (audioCtx.state === "suspended") audioCtx.resume();
  },
  { once: true }
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

/* ===================== */
/* CLEAR */
/* ===================== */

clearBtn.addEventListener("click", () => {
  if (!textareaRef.value && !nameInputRef.value) return;
  clearModal.classList.add("show");
});

confirmBtn.addEventListener("click", () => {
  textareaRef.value = "";
  nameInputRef.value = "";
  statisticTextRef.innerHTML = "";
  scannedCodes.clear();
  clearModal.classList.remove("show");
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

  statisticTextRef.innerHTML = "";

  if (!values.length) return;

  const seen = {};
  const duplicates = [];

  values.forEach((v) => {
    if (seen[v]) duplicates.push(v);
    else seen[v] = true;
  });

  if (duplicates.length) {
    const info = document.createElement("div");
    info.innerHTML = `Повторов: <b>${duplicates.length}</b>`;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Удалить повторы";
    deleteBtn.className = "btn";
    deleteBtn.style.marginTop = "10px";

    deleteBtn.onclick = () => {
      textareaRef.value = [...new Set(values)].join("\n");
      checkDuplicates();
    };

    statisticTextRef.appendChild(info);
    statisticTextRef.appendChild(deleteBtn);
  } else {
    statisticTextRef.innerHTML = `Всего <b>${values.length}</b>`;

    const shareBtn = document.createElement("button");
    shareBtn.textContent = "Поделиться";
    shareBtn.className = "btn";
    shareBtn.style.marginTop = "10px";

    shareBtn.onclick = () => {
      const name = nameInputRef.value.trim();
      const text = textareaRef.value.trim();

      const nameWithType = name ? `${name} (${selectedType})` : "";

      const combined = nameWithType ? nameWithType + "\n\n" + text : text;

      if (navigator.share) {
        navigator.share({ text: combined });
      } else {
        navigator.clipboard.writeText(combined);
      }
    };

    statisticTextRef.appendChild(shareBtn);
  }
}

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

  stopBtn = document.createElement("button");
  stopBtn.className = "stop-btn";
  stopBtn.textContent = "STOP";
  document.body.appendChild(stopBtn);
  stopBtn.onclick = stopScanner;

  const torchBtn = document.createElement("button");
  torchBtn.textContent = "🔦";
  torchBtn.className = "torch-btn";
  document.body.appendChild(torchBtn);

  torchBtn.onclick = async () => {
    if (!videoTrack) return;

    const caps = videoTrack.getCapabilities?.();
    if (!caps?.torch) return;

    try {
      torchEnabled = !torchEnabled;

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
        textareaRef.value += (textareaRef.value ? "\n" : "") + text;

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

  qrReader.innerHTML = "";
  qrReader.style.display = "none";

  if (stopBtn) stopBtn.remove();

  const torchBtn = document.querySelector(".torch-btn");
  if (torchBtn) torchBtn.remove();

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
