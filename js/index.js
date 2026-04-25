const nameInputRef = document.getElementById("nameInput");
const textareaRef = document.getElementById("myTextarea");
const statisticTextRef = document.querySelector(".js-statistic__text");

const clearBtn = document.getElementById("clearBtn");
const clearModal = document.getElementById("clearModal");
const confirmBtn = document.getElementById("confirmBtn");
const cancelBtn = document.getElementById("cancelBtn");

const copyBtn = document.getElementById("copyBtn");
const copyModal = document.getElementById("copyModal");
const okBtn = document.getElementById("okBtn");

const checkBtn = document.getElementById("checkBtn");

const scannerBtn = document.getElementById("scanner-btn");
const qrReader = document.getElementById("qr-reader");

let codeReader = null;
let currentStream = null;
let scannedCodes = new Set();
let stopBtn = null;
let isScanning = false;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

/* ===================== */
/* AUDIO */
/* ===================== */

document.body.addEventListener(
  "click",
  () => {
    if (audioCtx.state === "suspended") audioCtx.resume();
  },
  { once: true }
);

/* ===================== */
/* CLEAR */
/* ===================== */

clearBtn.addEventListener("click", () => clearModal.classList.add("show"));

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

  const combined = name ? name + "\n\n" + text : text;

  navigator.clipboard.writeText(combined).then(() => {
    copyModal.classList.add("show");
  });
});

okBtn.addEventListener("click", () => {
  copyModal.classList.remove("show");
});

/* ===================== */
/* CHECK + DUPLICATES + SHARE */
/* ===================== */

checkBtn.addEventListener("click", checkDuplicates);

function checkDuplicates() {
  const values = textareaRef.value
    .replace(/\n/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!values.length) {
    statisticTextRef.innerHTML = "";
    return;
  }

  const seen = {};
  const duplicates = [];

  values.forEach((v) => {
    if (seen[v]) duplicates.push(v);
    else seen[v] = true;
  });

  statisticTextRef.innerHTML = "";

  if (duplicates.length) {
    const info = document.createElement("div");
    info.innerHTML = `Повторов: <b>${duplicates.length}</b>`;

    const delBtn = document.createElement("button");
    delBtn.textContent = "Удалить дубли";
    delBtn.className = "btn";
    delBtn.style.marginTop = "10px";

    delBtn.onclick = () => {
      textareaRef.value = [...new Set(values)].join("\n");
      checkDuplicates();
    };

    statisticTextRef.appendChild(info);
    statisticTextRef.appendChild(delBtn);
  } else {
    statisticTextRef.innerHTML = `Всего <b>${values.length}</b>`;

    const shareBtn = document.createElement("button");
    shareBtn.textContent = "Поделиться";
    shareBtn.className = "btn";
    shareBtn.style.marginTop = "10px";

    shareBtn.onclick = () => {
      const name = nameInputRef.value.trim();
      const text = textareaRef.value.trim();
      const combined = name ? name + "\n\n" + text : text;

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
/* SOUND */
/* ===================== */

function playBeep(type) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === "scan") {
    osc.frequency.value = 1500;
    osc.type = "square";
  } else {
    osc.frequency.value = 300;
    osc.type = "sawtooth";
  }

  gain.gain.value = 0.1;

  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

/* ===================== */
/* SCANNER */
/* ===================== */

scannerBtn.addEventListener("click", startScanner);

async function startScanner() {
  if (isScanning) return;
  isScanning = true;

  scannerBtn.style.display = "none";

  qrReader.style.display = "block";
  qrReader.innerHTML = "";

  stopBtn = document.createElement("button");
  stopBtn.textContent = "STOP";
  stopBtn.className = "stop-btn";
  document.body.appendChild(stopBtn);

  stopBtn.onclick = stopScanner;

  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;

  const overlay = document.createElement("div");
  overlay.className = "scanner-overlay";

  const scanBox = document.createElement("div");
  scanBox.className = "scan-box";

  qrReader.appendChild(video);
  qrReader.appendChild(overlay);
  qrReader.appendChild(scanBox);

  try {
    currentStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
      },
    });

    video.srcObject = currentStream;
    await video.play();

    codeReader = new ZXing.BrowserMultiFormatReader();

    codeReader.decodeFromVideoDevice(null, video, (result) => {
      if (!result) return;

      const text = result.getText();

      if (!scannedCodes.has(text)) {
        scannedCodes.add(text);
        textareaRef.value += (textareaRef.value ? "\n" : "") + text;

        playBeep("scan");
      } else {
        playBeep("error");
      }
    });
  } catch (e) {
    console.error(e);
    alert("Нет доступа к камере");
    stopScanner();
  }
}

/* ===================== */
/* STOP */
/* ===================== */

function stopScanner() {
  isScanning = false;

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

  scannerBtn.style.display = "block";
}
