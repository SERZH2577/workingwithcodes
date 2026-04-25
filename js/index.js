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
      } else {
        playBeep("error");
      }
    });
  } catch (e) {
    alert("Нет доступа к камере");
    stopScanner();
  }
}

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
