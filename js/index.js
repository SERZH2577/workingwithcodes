import { sound, unlockAudio } from "./sound.js";

const nameInputRef = document.getElementById("nameInput");
const textareaRef = document.getElementById("myTextarea");
const statisticTextRef = document.querySelector(".js-statistic__text");

const clearBtn = document.getElementById("clearBtn");
const checkBtn = document.getElementById("checkBtn");
const scannerBtn = document.getElementById("scanner-btn");
const qrReader = document.getElementById("qr-reader");

const clearModal = document.getElementById("clearModal");
const confirmBtn = document.getElementById("confirmBtn");
const cancelBtn = document.getElementById("cancelBtn");

const copyModal = document.getElementById("copyModal");
const okBtn = document.getElementById("okBtn");

const typeBtn = document.getElementById("typeBtn");
const typeMenu = document.getElementById("typeMenu");

const statTitle = document.querySelector(".js-statistic__title");
const statValue = document.querySelector(".js-statistic__value");

const copyBtn = document.getElementById("copyBtn");
const shareBtn = document.getElementById("shareBtn");
const deleteBtn = document.getElementById("deleteBtn");

let codeReader;
let currentStream = null;
let scannedCodes = new Set();
let stopBtn = null;
let isScanning = false;
let torchEnabled = false;
let videoTrack = null;
let selectedType = null;
let liveBox = null;
let isValidatedNoDuplicates = false;

// =====================
// LOCAL STORAGE
// =====================

const STORAGE_KEY = "wwc_data_v1";

let saveTimeout = null;

function saveToStorageDebounced() {
  clearTimeout(saveTimeout);

  saveTimeout = setTimeout(() => {
    saveToStorage();
  }, 300);
}

function saveToStorage() {
  const data = {
    name: nameInputRef.value,
    text: textareaRef.value,
    type: selectedType,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);

    nameInputRef.value = data.name || "";
    textareaRef.value = data.text || "";
    selectedType = data.type || null;

    // восстановление чекбоксов
    if (selectedType) {
      checkboxes.forEach((cb) => {
        cb.checked = cb.value === selectedType;
      });
    }

    updateTypeButton();

    // обновляем счетчик
    const values = textareaRef.value.split(/\s+/).filter(Boolean);

    statValue.textContent = values.length;
  } catch (e) {
    console.error("Storage parse error", e);
  }
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

copyBtn.classList.add("hidden");

document.body.addEventListener(
  "click",
  () => {
    unlockAudio();
  },
  { once: true },
);

/* ===================== */
/* CLEAR */
/* ===================== */

clearBtn.addEventListener("click", () => {
  if (!textareaRef.value && !nameInputRef.value) return;
  clearModal.classList.add("show");
});

confirmBtn.addEventListener("click", () => {
  sound.playSweepSound();

  textareaRef.value = "";
  nameInputRef.value = "";

  scannedCodes.clear();
  clearModal.classList.remove("show");

  statTitle.textContent = "";
  statValue.textContent = 0;

  isValidatedNoDuplicates = false;
  copyBtn.classList.add("hidden");
  shareBtn.classList.add("hidden");
  deleteBtn.classList.add("hidden");

  statValue.style.color = "#00ff88";

  // ✔️ СБРОС ЧЕКБОКСОВ
  checkboxes.forEach((cb) => {
    cb.checked = false;
  });

  selectedType = null;
  updateTypeButton();

  clearStorage();
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

  const nameWithType =
    name && selectedType ? `${name} (${selectedType})` : name;

  const combined = nameWithType ? nameWithType + "\n\n" + text : text;

  navigator.clipboard.writeText(combined).then(() => {
    copyModal.classList.add("show");
  });

  sound.playCopyTick();
});

okBtn.addEventListener("click", () => {
  copyModal.classList.remove("show");
});

/* ===================== */
/* CHECK DUPLICATES + SHARE BUTTON */
/* ===================== */

checkBtn.addEventListener("click", checkDuplicates);

function checkDuplicates() {
  if (isValidatedNoDuplicates) return;

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

  // reset UI
  copyBtn.classList.add("hidden");
  shareBtn.classList.add("hidden");
  deleteBtn.classList.add("hidden");

  statValue.textContent = total;

  if (total === 0) {
    statTitle.textContent = "";
    return;
  }

  // ❌ duplicates
  if (duplicates > 0) {
    statTitle.textContent = "Есть повторы!";
    statTitle.style.color = "#cc3333";

    statValue.textContent = duplicates;
    statValue.style.color = "#cc3333";

    sound.playFailBzzt();

    deleteBtn.classList.remove("hidden");

    deleteBtn.onclick = () => {
      textareaRef.value = [...new Set(values)].join("\n");
      textareaRef.dispatchEvent(new Event("input"));
      saveToStorage();
      checkDuplicates();
    };

    return;
  }

  // ✅ clean
  statTitle.textContent = "Повторов нет";
  statTitle.style.color = "#00ff88";

  statValue.style.color = "#00ff88";

  sound.uiSuccess();

  isValidatedNoDuplicates = true;

  copyBtn.classList.remove("hidden");
  shareBtn.classList.remove("hidden");
}

shareBtn.addEventListener("click", () => {
  const name = nameInputRef.value.trim();
  const text = textareaRef.value.trim();

  const nameWithType =
    name && selectedType ? `${name} (${selectedType})` : name;

  const combined = nameWithType ? nameWithType + "\n\n" + text : text;

  if (!combined) return;

  if (navigator.share) {
    navigator.share({ text: combined });
  } else {
    navigator.clipboard.writeText(combined);
  }
});

/* ===================== */
/* Отслеживание изменений textarea */
/* ===================== */

textareaRef.addEventListener("input", () => {
  if (isValidatedNoDuplicates) {
    statTitle.textContent = "";

    isValidatedNoDuplicates = false;
  }

  copyBtn.classList.add("hidden");
  shareBtn.classList.add("hidden");
  deleteBtn.classList.add("hidden");

  saveToStorageDebounced();
});

nameInputRef.addEventListener("input", saveToStorageDebounced);

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

      sound.playClick();

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

        sound.playBeep("scan");
        flash(overlay, "success");
      } else {
        sound.playBeep("error");
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

const checkboxes = typeMenu.querySelectorAll('input[type="checkbox"]');

checkboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      // выключаем остальные
      checkboxes.forEach((cb) => {
        if (cb !== checkbox) cb.checked = false;
      });

      selectedType = checkbox.value;
    } else {
      // если сняли галочку
      selectedType = null;

      typeBtn.textContent = "Категория";
      typeBtn.style.color = "";
      typeBtn.style.borderColor = "";
    }
    updateTypeButton();
    saveToStorageDebounced();

    setTimeout(() => {
      typeMenu.classList.add("hidden");
    }, 0);
  });
});

document.addEventListener("click", (e) => {
  if (!typeMenu.contains(e.target) && e.target !== typeBtn) {
    typeMenu.classList.add("hidden");
  }
});

function updateTypeButton() {
  if (!selectedType) {
    typeBtn.textContent = "Категория";
    typeBtn.style.color = "";
    typeBtn.style.borderColor = "";
    return;
  }

  typeBtn.textContent = selectedType;
  typeBtn.style.color = "#00ff88";
  typeBtn.style.borderColor = "#00ff88";
}

loadFromStorage();
