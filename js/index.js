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

// --- Аудио ---
document.body.addEventListener(
  "click",
  () => {
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  },
  { once: true }
);

// --- Очистка ---
document.body.addEventListener(
  "click",
  () => {
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  },
  { once: true }
);
clearBtn.addEventListener("click", () => clearModal.classList.add("show"));
confirmBtn.addEventListener("click", () => {
  textareaRef.value = "";
  nameInputRef.value = "";
  statisticTextRef.innerHTML = "";
  clearModal.classList.remove("show");
  scannedCodes.clear();
  textareaRef.focus();
});
cancelBtn.addEventListener("click", () => clearModal.classList.remove("show"));

// --- Копирование ---
copyBtn.addEventListener("click", () => {
  const name = nameInputRef.value.trim();
  const text = textareaRef.value.trim();
  if (!name && !text) return;
  const combined = name ? name + "\n\n" + text : text;
  navigator.clipboard
    .writeText(combined)
    .then(() => copyModal.classList.add("show"));
});
okBtn.addEventListener("click", () => copyModal.classList.remove("show"));

// --- Проверка дублирования ---
checkBtn.addEventListener("click", checkDuplicates);

function checkDuplicates() {
  const values = textareaRef.value
    .replace(/\n/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (values.length === 0) {
    statisticTextRef.innerHTML = "";
    return;
  }

  const seen = {};
  const duplicates = [];

  values.forEach((v, i) => {
    seen[v] ? duplicates.push({ num: v, index: i }) : (seen[v] = true);
  });

  statisticTextRef.innerHTML = "";

  if (duplicates.length > 0) {
    highlightFirstDuplicate(duplicates[0].num);

    const repeatInfo = document.createElement("div");
    repeatInfo.className = "repeat-info";
    repeatInfo.innerHTML = `Повторов: <span class="statistic__text-data">${duplicates.length}</span>`;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Удалить повторы";
    deleteBtn.className = "btn delete-btn";
    deleteBtn.style.marginTop = "10px";
    deleteBtn.addEventListener("click", () => deleteAllDuplicates(values));

    statisticTextRef.appendChild(repeatInfo);
    statisticTextRef.appendChild(deleteBtn);
    return;
  }

  const count = values.length;
  let corob = "коробов";

  if (count % 10 === 1 && count % 100 !== 11) corob = "короб";
  else if (
    [2, 3, 4].includes(count % 10) &&
    ![12, 13, 14].includes(count % 100)
  )
    corob = "короба";

  statisticTextRef.innerHTML = `Всего <span class="statistic__text-data">${count}</span> ${corob}.`;

  let shareIcon = document.querySelector(".share-icon");

  if (!shareIcon) {
    shareIcon = document.createElement("img");
    shareIcon.src = "img/share.svg";
    shareIcon.className = "share-icon";
    shareIcon.style.width = "48px";
    shareIcon.style.marginTop = "10px";

    shareIcon.addEventListener("click", () => {
      const name = nameInputRef.value.trim();
      const text = textareaRef.value.trim();
      const combined = name ? name + "\n\n" + text : text;

      if (navigator.share) {
        navigator.share({ title: "Список коробов", text: combined });
      } else {
        navigator.clipboard.writeText(combined);
        alert("Скопировано!");
      }
    });

    statisticTextRef.appendChild(shareIcon);
  }
}

function highlightFirstDuplicate(val) {
  const text = textareaRef.value;
  const match = new RegExp(`\\b${val}\\b`).exec(text);
  if (match) {
    textareaRef.focus();
    textareaRef.setSelectionRange(match.index, match.index + val.length);
  }
}

function deleteAllDuplicates(values) {
  textareaRef.value = [...new Set(values)].join("\n");
  checkDuplicates();
}

function playBeep(type = "ok") {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  // 🔥 НАСТРОЙКА ЗВУКА
  if (type === "ok") {
    oscillator.frequency.value = 1000;
    oscillator.type = "sine";
  }

  if (type === "scan") {
    oscillator.frequency.value = 1800;
    oscillator.type = "square";
  }

  if (type === "error") {
    oscillator.frequency.value = 300;
    oscillator.type = "sawtooth";
  }

  gainNode.gain.value = 0.1;

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.12);
}

// =====================
// ✅ ZXING СКАНЕР
// =====================

scannerBtn.addEventListener("click", startScanner);

async function startScanner() {
  document.body.classList.add("scanner-active");
  document.addEventListener("dblclick", stopScanner);

  scannerBtn.style.display = "none";

  stopBtn = document.createElement("button");
  stopBtn.textContent = "STOP SCAN";
  stopBtn.className = "btn";
  stopBtn.style.height = "50px";
  stopBtn.style.marginBottom = "10px";
  document.body.appendChild(stopBtn);

  qrReader.innerHTML = ""; // очистка контейнера

  // создаем видео элемент
  const video = document.createElement("video");
  video.setAttribute("autoplay", true);
  video.setAttribute("playsinline", true);
  video.style.width = "100%";
  video.style.height = "100%";

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
        facingMode: { ideal: "environment" },

        width: { ideal: 1920 },
        height: { ideal: 1080 },

        focusMode: "continuous", // 🔥 автофокус
      },
    });

    video.srcObject = currentStream;
    await video.play();

    const track = currentStream.getVideoTracks()[0];
    const capabilities = track.getCapabilities();

    const constraints = {};

    // 🔍 ЗУМ
    if (capabilities.zoom) {
      constraints.zoom = capabilities.zoom.max > 2 ? 2 : capabilities.zoom.max;
    }

    // 🔦 ФОНАРИК (если есть)
    if (capabilities.torch) {
      constraints.torch = true;
    }

    // 🎯 ФОКУС
    if (capabilities.focusMode) {
      constraints.focusMode = "continuous";
    }

    // ⚙️ применяем
    if (Object.keys(constraints).length > 0) {
      track.applyConstraints({ advanced: [constraints] });
    }

    codeReader = new ZXing.BrowserMultiFormatReader(undefined, {
      delayBetweenScanAttempts: 80,
    });

    codeReader.decodeFromVideoDevice(null, video, (result, err) => {
      if (result) {
        const text = result.getText();

        if (!scannedCodes.has(text)) {
          scannedCodes.add(text);
          playBeep("scan"); // ✔ звук успешного сканирования
          textareaRef.value += (textareaRef.value ? "\n" : "") + text;
          flashOverlay("success");
        } else {
          playBeep("error"); // ✔ если дубликат
          flashOverlay("error");
        }
      }
    });
  } catch (e) {
    console.error(e);
    alert("Нет доступа к камере");
    stopScanner();
  }

  stopBtn.addEventListener("click", stopScanner);
}

function stopScanner() {
  document.body.classList.remove("scanner-active");
  document.removeEventListener("dblclick", stopScanner);

  if (codeReader) {
    codeReader.reset();
    codeReader = null;
  }

  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
    currentStream = null;
  }

  qrReader.innerHTML = ""; // убираем видео

  if (stopBtn) stopBtn.remove();
  scannerBtn.style.display = "block";
}

// --- Вспышка ---
function flashOverlay(type) {
  const overlay = qrReader.querySelector(".scanner-overlay");
  if (!overlay) return;

  overlay.classList.remove("success", "error");

  if (type === "success") {
    overlay.classList.add("success");
  } else {
    overlay.classList.add("error");
  }

  setTimeout(() => {
    overlay.classList.remove("success", "error");
  }, 150);
}
