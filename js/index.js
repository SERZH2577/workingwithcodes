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

let codeReader;
let currentStream = null;
let scannedCodes = new Set();
let stopBtn;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

/* ===================== */
/* AUDIO FIX */
/* ===================== */

document.body.addEventListener(
  "click",
  () => {
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  },
  { once: true }
);

/* ===================== */
/* CLEAR */
/* ===================== */

clearBtn.addEventListener("click", () => {
  clearModal.classList.add("show");
});

confirmBtn.addEventListener("click", () => {
  textareaRef.value = "";
  nameInputRef.value = "";
  statisticTextRef.innerHTML = "";
  scannedCodes.clear();
  clearModal.classList.remove("show");
  textareaRef.focus();
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

  navigator.clipboard
    .writeText(combined)
    .then(() => copyModal.classList.add("show"));
});

okBtn.addEventListener("click", () => {
  copyModal.classList.remove("show");
});

/* ===================== */
/* DUPLICATES */
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
    const repeatInfo = document.createElement("div");
    repeatInfo.innerHTML = `Повторов: <b>${duplicates.length}</b>`;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Удалить повторы";
    deleteBtn.className = "btn";
    deleteBtn.style.marginTop = "10px";

    deleteBtn.onclick = () => {
      textareaRef.value = [...new Set(values)].join("\n");
      checkDuplicates();
    };

    statisticTextRef.appendChild(repeatInfo);
    statisticTextRef.appendChild(deleteBtn);
    return;
  }

  statisticTextRef.innerHTML = `Всего <b>${values.length}</b>`;
}

/* ===================== */
/* SOUND */
/* ===================== */

function playBeep(type = "ok") {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === "scan") {
    osc.frequency.value = 1500;
    osc.type = "square";
  } else if (type === "error") {
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
  scannerBtn.style.display = "none";

  qrReader.style.display = "block";
  qrReader.innerHTML = "";

  stopBtn = document.createElement("button");
  stopBtn.textContent = "STOP";
  stopBtn.className = "stop-btn";
  document.body.appendChild(stopBtn);

  stopBtn.addEventListener("click", stopScanner);

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
        width: { ideal: 1280 },
        height: { ideal: 720 },
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
        flashOverlay("success");
      } else {
        playBeep("error");
        flashOverlay("error");
      }
    });
  } catch (e) {
    alert("Нет доступа к камере");
    stopScanner();
  }
}

/* ===================== */
/* STOP SCANNER */
/* ===================== */

function stopScanner() {
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

/* ===================== */
/* FLASH */
/* ===================== */

function flashOverlay(type) {
  const overlay = document.querySelector(".scanner-overlay");
  if (!overlay) return;

  overlay.classList.remove("success", "error");

  overlay.classList.add(type);

  setTimeout(() => {
    overlay.classList.remove("success", "error");
  }, 150);
}
