const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const captureBtn = document.getElementById("captureBtn");
const loading = document.getElementById("loading");
const instruction = document.getElementById("instruction");

let lastFrame = null;
let movementDetected = false;

// 🎥 Abrir câmera
async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" }
  });
  video.srcObject = stream;
}

startCamera();

// 🎯 Detectar movimento (liveness simples)
setInterval(() => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.drawImage(video, 0, 0);

  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);

  if (lastFrame) {
    let diff = 0;

    for (let i = 0; i < frame.data.length; i += 4) {
      diff += Math.abs(frame.data[i] - lastFrame.data[i]);
    }

    if (diff > 5000000) {
      movementDetected = true;
      instruction.innerText = "Movimento detectado ✔";
    }
  }

  lastFrame = frame;
}, 1000);

// 📸 Capturar foto
captureBtn.addEventListener("click", () => {
  canvas.style.display = "block";
  video.style.display = "none";

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  validateImage();
});

// 🔍 Validação geral
function validateImage() {
  loading.classList.remove("hidden");

  setTimeout(() => {
    const blur = detectBlur();
    const screen = detectScreenPattern();

    loading.classList.add("hidden");

    if (!movementDetected) {
      alert("❌ Nenhum movimento detectado. Possível fraude.");
      reset();
      return;
    }

    if (blur) {
      alert("❌ Imagem desfocada. Tente novamente.");
      reset();
      return;
    }

    if (screen) {
      alert("❌ Detectamos que pode ser uma foto de tela.");
      reset();
      return;
    }

    alert("✅ Foto válida!");
  }, 1500);
}

// 🔍 Detectar blur (nitidez)
function detectBlur() {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let total = 0;

  for (let i = 0; i < imageData.data.length; i += 4) {
    total += imageData.data[i];
  }

  const avg = total / (imageData.data.length / 4);

  return avg < 50; // heurística simples
}

// 🔍 Detectar padrão de tela
function detectScreenPattern() {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  let pattern = 0;

  for (let i = 0; i < imageData.data.length - 4; i += 4) {
    const diff = Math.abs(imageData.data[i] - imageData.data[i + 4]);

    if (diff < 2) pattern++;
  }

  return pattern > 10000; // padrão muito uniforme
}

// 🔄 Resetar
function reset() {
  canvas.style.display = "none";
  video.style.display = "block";
}