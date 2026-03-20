const VALID_USER = "teste";
const VALID_PASS = "teste";

// Views
const loginView = document.getElementById("loginView");
const homeView = document.getElementById("homeView");
const guideView = document.getElementById("guideView");
const captureView = document.getElementById("captureView");
const blurView = document.getElementById("blurView");
const successView = document.getElementById("successView");

// Login
const loginForm = document.getElementById("loginForm");
const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");
const loginError = document.getElementById("loginError");

// Home UI
const startFlowBtn = document.getElementById("startFlowBtn");
const homeStatus = document.getElementById("homeStatus");
const logoutBtnHome = document.getElementById("logoutBtnHome");

// Checklist UI
const docRearBtn = document.getElementById("docRearBtn");
const docRearBadge = document.getElementById("docRearBadge");
const docRearMeta = document.getElementById("docRearMeta");
const docRearThumb = document.getElementById("docRearThumb");

const docPlateBtn = document.getElementById("docPlateBtn");
const docPlateBadge = document.getElementById("docPlateBadge");
const docPlateMeta = document.getElementById("docPlateMeta");
const docPlateThumb = document.getElementById("docPlateThumb");

// Guide UI
const guideTitle = document.getElementById("guideTitle");
const guideDesc = document.getElementById("guideDesc");
const guideImage = document.getElementById("guideImage");
const guideContinueBtn = document.getElementById("guideContinueBtn");
const guideStatus = document.getElementById("guideStatus");
const backToHomeBtn = document.getElementById("backToHomeBtn");

// Capture UI
const backBtn = document.getElementById("backBtn");
const logoutBtnCap = document.getElementById("logoutBtnCap");
const capStatus = document.getElementById("capStatus");

const capTitle = document.getElementById("capTitle");
const capSubtitle = document.getElementById("capSubtitle");
const cameraHint = document.getElementById("cameraHint");

const cameraBox = document.getElementById("cameraBox");
const cropBox = document.getElementById("cropBox");

const video = document.getElementById("video");
const takePhotoBtn = document.getElementById("takePhotoBtn");

const cropCanvas = document.getElementById("cropCanvas");
const cropModeBtn = document.getElementById("cropModeBtn");
const confirmCropBtn = document.getElementById("confirmCropBtn");

// Freeze + loading
const freezeFrame = document.getElementById("freezeFrame");
const validateOverlay = document.getElementById("validateOverlay");
const validateSub = document.getElementById("validateSub");

// Actions
const previewActions = document.getElementById("previewActions");
const retakeBtn = document.getElementById("retakeBtn");
const useBtn = document.getElementById("useBtn");

// Toast
const toast = document.getElementById("toast");
const toastText = document.getElementById("toastText");

// Issue view (blur / conteúdo)
const blurPreview = document.getElementById("blurPreview");
const blurScore = document.getElementById("blurScore");
const tryAgainBtn = document.getElementById("tryAgainBtn");
const logoutBtnBlur = document.getElementById("logoutBtnBlur");
const issueTitle = document.getElementById("issueTitle");
const issueDesc = document.getElementById("issueDesc");

// Success
const rearThumb = document.getElementById("rearThumb");
const plateThumb = document.getElementById("plateThumb");
const successRearBtn = document.getElementById("successRearBtn");
const successPlateBtn = document.getElementById("successPlateBtn");
const goFormalizationBtn = document.getElementById("goFormalizationBtn");
const logoutBtnSuccess = document.getElementById("logoutBtnSuccess");

// Modal
const photoModal = document.getElementById("photoModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalImg = document.getElementById("modalImg");
const modalTitle = document.getElementById("modalTitle");

// Estado
let stream = null;
let permissionsReady = false;

// Wizard steps
const STEP_REAR = "rear";
const STEP_PLATE = "plate";
let currentStep = STEP_REAR;

// Payload final
const payload = {
  location: null,
  rearPhotoBase64: null,
  platePhotoBase64: null,
};

// Foto
let capturedImage = null;
let finalPhotoBase64 = null;

// ====== BLUR THRESHOLD ======
function getBlurThreshold() {
  return currentStep === STEP_PLATE ? 220 : 150;
}

// ====== CONTENT CHECK ======
let cocoModel = null;
const CAR_MIN_SCORE = 0.4;
const PLATE_REGEX = /[A-Z]{3}\d[A-Z0-9]\d{2}|[A-Z]{3}\d{4}/i;

// Crop settings
const CROP_INIT_W_RATIO = 0.8;
const CROP_INIT_H_RATIO = 0.4;
const CROP_MIN_SIZE = 140;
const HANDLE_SIZE = 28;

// Crop state
let cropEnabled = false;
let cropRect = { x: 0, y: 0, w: 200, h: 200 };
let activePointerId = null;
let dragMode = null;
let start = { px: 0, py: 0, x: 0, y: 0, w: 0, h: 0 };

function show(el) {
  el?.classList.remove("hidden");
}
function hide(el) {
  el?.classList.add("hidden");
}

function setHomeStatus(msg) {
  homeStatus.textContent = msg || "";
}
function setGuideStatus(msg) {
  guideStatus.textContent = msg || "";
}
function setCapStatus(msg) {
  capStatus.textContent = msg || "";
}

function showToast(message) {
  toastText.textContent = message;
  show(toast);
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => hide(toast), 1400);
}

function safePlayVideo() {
  return new Promise((resolve) => {
    const done = () => resolve();

    if (video.readyState >= 2 && video.videoWidth > 0) {
      video
        .play()
        .catch(() => {})
        .finally(done);
      return;
    }

    const onMeta = () => {
      video.removeEventListener("loadedmetadata", onMeta);
      video
        .play()
        .catch(() => {})
        .finally(done);
    };

    video.addEventListener("loadedmetadata", onMeta, { once: true });
    setTimeout(done, 700);
  });
}

// ========= GUIDE IMAGENS =========
const rearImg = "rear.png";
const rearFallbackUrl =
  "https://cdn.gazetasp.com.br/upload/dn_arquivo/2022/08/novo-porsche-911-gt3-r-traseira.jpg";
const plateSvg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='560' height='360' viewBox='0 0 560 360'%3E%3Crect width='560' height='360' rx='28' fill='%23F3F4F6'/%3E%3Crect x='150' y='120' width='260' height='150' rx='18' fill='%23111827' opacity='0.85'/%3E%3Crect x='175' y='150' width='210' height='55' rx='10' fill='%23F3F4F6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='22' fill='%23111827'%3EABC1D23%3C/text%3E%3Ctext x='50%25' y='78%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='14' fill='%23111827' opacity='0.55'%3EPlaca do ve%C3%ADculo%3C/text%3E%3C/svg%3E";

// ================= MODAL =================
function openModal(title, imgSrc) {
  if (!imgSrc) return;
  modalTitle.textContent = title || "Foto";
  modalImg.src = imgSrc;
  show(photoModal);
}
function closeModal() {
  hide(photoModal);
  modalImg.src = "";
}
modalBackdrop.addEventListener("click", closeModal);
closeModalBtn.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !photoModal.classList.contains("hidden"))
    closeModal();
});

// ================= FREEZE + LOADING =================
function startValidationUI(dataUrl, subText) {
  // trava botões
  takePhotoBtn.disabled = true;
  backBtn.disabled = true;
  logoutBtnCap.disabled = true;

  // congela vídeo na foto
  freezeFrame.src = dataUrl;
  show(freezeFrame);
  hide(video);

  // overlay loading
  validateSub.textContent = subText || "Aguarde";
  show(validateOverlay);
}

function stopValidationUI() {
  hide(validateOverlay);

  // volta pro vídeo (caso continue na captura)
  hide(freezeFrame);
  freezeFrame.src = "";

  show(video);

  // destrava botões
  takePhotoBtn.disabled = false;
  backBtn.disabled = false;
  logoutBtnCap.disabled = false;
}

// ================= ISSUE VIEW =================
function showIssueScreen({ title, desc, dataUrl, metaText }) {
  hide(loginView);
  hide(homeView);
  hide(guideView);
  hide(captureView);
  hide(successView);
  show(blurView);

  issueTitle.textContent = title || "Houve um problema";
  issueDesc.textContent = desc || "Tente novamente.";
  blurPreview.src = dataUrl || "";
  blurScore.textContent = metaText || "";
}

// ================= HOME / CHECKLIST =================
function computeNextStep() {
  if (!payload.rearPhotoBase64) return STEP_REAR;
  if (!payload.platePhotoBase64) return STEP_PLATE;
  return null;
}

function refreshChecklistUI() {
  const rearDone = !!payload.rearPhotoBase64;
  docRearMeta.textContent = rearDone
    ? "Concluído (toque para ver)"
    : "Pendente";
  docRearBadge.textContent = rearDone ? "✓" : "•";
  docRearBadge.classList.toggle("docCheck--pending", !rearDone);
  docRearThumb.src = rearDone ? payload.rearPhotoBase64 : "";

  const plateDone = !!payload.platePhotoBase64;
  docPlateMeta.textContent = plateDone
    ? "Concluído (toque para ver)"
    : "Pendente";
  docPlateBadge.textContent = plateDone ? "✓" : "•";
  docPlateBadge.classList.toggle("docCheck--pending", !plateDone);
  docPlateThumb.src = plateDone ? payload.platePhotoBase64 : "";

  const next = computeNextStep();
  if (!next) {
    startFlowBtn.textContent = "Tudo concluído";
    startFlowBtn.disabled = true;
    setHomeStatus("Você já capturou todos os documentos.");
  } else {
    startFlowBtn.disabled = false;
    startFlowBtn.textContent = "Iniciar captura";
    setHomeStatus("");
  }
}

function goToHome() {
  hide(loginView);
  hide(guideView);
  hide(captureView);
  hide(blurView);
  hide(successView);
  show(homeView);

  const next = computeNextStep();
  if (next) currentStep = next;

  refreshChecklistUI();
  try {
    video.pause();
  } catch (_) {}
}

// ================= GUIDE =================
function applyGuideUI() {
  guideContinueBtn.disabled = false;
  guideTitle.textContent = "É hora da captura de fotos";

  if (currentStep === STEP_REAR) {
    guideDesc.innerHTML =
      "Para fotografar a <strong>traseira do veículo</strong>, permita o uso da <strong>localização</strong> e da <strong>câmera</strong>.";
    guideImage.src = rearImg;
    guideImage.onerror = () => {
      guideImage.src = rearFallbackUrl;
    };
  } else {
    guideDesc.innerHTML =
      "Agora vamos fotografar a <strong>placa do veículo</strong>. Mantenha a placa bem legível e com boa iluminação.";
    guideImage.src =
      "https://s2-autoesporte.glbimg.com/nfnDyg9J06LgT7WTtr_GGQxQbAo=/1200x/smart/filters:cover():strip_icc()/i.s3.glbimg.com/v1/AUTH_cf9d035bf26b4646b105bd958f32089d/internal_photos/bs/2020/h/q/sc8A5kQLCrkoBheEg7xA/2020-06-17-placa-mercosul-1.jpg";
  }

  guideContinueBtn.textContent = permissionsReady
    ? "Abrir câmera"
    : "Permitir localização e câmera";
  setGuideStatus("");
}

function goToGuide() {
  hide(loginView);
  hide(homeView);
  hide(captureView);
  hide(blurView);
  hide(successView);
  show(guideView);
  applyGuideUI();
}

// ================= PERMISSÕES =================
function getLocationOnce() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("geo_not_supported"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}

async function startCameraWithGesture() {
  if (!navigator.mediaDevices?.getUserMedia)
    throw new Error("camera_not_supported");

  if (!stream) {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
  }

  video.srcObject = stream;
  await safePlayVideo();
}

async function ensurePermissions() {
  if (permissionsReady) return;

  const pos = await getLocationOnce();
  payload.location = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    timestamp: pos.timestamp,
  };
  sessionStorage.setItem("poc_location", JSON.stringify(payload.location));

  await startCameraWithGesture();
  permissionsReady = true;
}

// ================= CAPTURE UI =================
function resetCaptureUI() {
  show(cameraBox);
  hide(cropBox);

  show(takePhotoBtn);
  hide(previewActions);

  capturedImage = null;
  finalPhotoBase64 = null;

  cropEnabled = false;
  cropCanvas.classList.remove("is-cropping");
  activePointerId = null;
  dragMode = null;

  cropModeBtn.disabled = true;
  cropModeBtn.textContent = "Ajustar recorte";
  confirmCropBtn.disabled = true;

  // limpa estado de validação
  hide(validateOverlay);
  hide(freezeFrame);
  freezeFrame.src = "";
  show(video);

  // destrava
  takePhotoBtn.disabled = false;
  backBtn.disabled = false;
  logoutBtnCap.disabled = false;
}

function applyCaptureUI() {
  document.body.classList.toggle("step-plate", currentStep === STEP_PLATE);

  if (capTitle)
    capTitle.textContent =
      currentStep === STEP_REAR ? "Captura 1/2" : "Captura 2/2";
  useBtn.textContent = currentStep === STEP_REAR ? "Continuar" : "Finalizar";

  if (currentStep === STEP_REAR) {
    capSubtitle.textContent = "Traseira do veículo";
    cameraHint.textContent = "Enquadre a traseira do veículo";
  } else {
    capSubtitle.textContent = "Placa do veículo";
    cameraHint.textContent = "Centralize a placa no quadrado";
  }
}

function goToCapture() {
  hide(loginView);
  hide(homeView);
  hide(guideView);
  hide(blurView);
  hide(successView);
  show(captureView);

  applyCaptureUI();
  resetCaptureUI();
  safePlayVideo();
  setCapStatus("Câmera pronta.");
}

function goToSuccess() {
  hide(loginView);
  hide(homeView);
  hide(guideView);
  hide(captureView);
  hide(blurView);
  show(successView);

  rearThumb.src = payload.rearPhotoBase64 || "";
  plateThumb.src = payload.platePhotoBase64 || "";

  console.log("PAYLOAD FINAL:", payload);
}

// ================= BLUR DETECTOR =================
function computeSharpnessScoreFromCanvas(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const w = canvas.width;
  const h = canvas.height;

  const img = ctx.getImageData(0, 0, w, h).data;

  const stride = Math.max(1, Math.floor(Math.min(w, h) / 240));
  const gw = Math.floor(w / stride);
  const gh = Math.floor(h / stride);

  const gray = new Float32Array(gw * gh);
  let idx = 0;
  for (let y = 0; y < gh; y++) {
    const sy = y * stride;
    for (let x = 0; x < gw; x++) {
      const sx = x * stride;
      const p = (sy * w + sx) * 4;
      const r = img[p],
        g = img[p + 1],
        b = img[p + 2];
      gray[idx++] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < gh - 1; y++) {
    for (let x = 1; x < gw - 1; x++) {
      const c = gray[y * gw + x];
      const up = gray[(y - 1) * gw + x];
      const dn = gray[(y + 1) * gw + x];
      const lf = gray[y * gw + (x - 1)];
      const rt = gray[y * gw + (x + 1)];
      const lap = up + dn + lf + rt - 4 * c;
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  const mean = sum / Math.max(1, count);
  const variance = sumSq / Math.max(1, count) - mean * mean;
  return variance;
}

function isBlurryFromDataUrl(dataUrl) {
  const img = new Image();
  img.src = dataUrl;

  return new Promise((resolve) => {
    img.onload = () => {
      const maxSide = 420;
      const ratio = Math.min(
        1,
        maxSide / Math.max(img.naturalWidth, img.naturalHeight),
      );
      const w = Math.max(1, Math.round(img.naturalWidth * ratio));
      const h = Math.max(1, Math.round(img.naturalHeight * ratio));

      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);

      const score = computeSharpnessScoreFromCanvas(c);
      resolve({ blurry: score < getBlurThreshold(), score });
    };

    img.onerror = () => resolve({ blurry: false, score: 9999 });
  });
}

// ================= CONTENT DETECTORS =================
function dataUrlToImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function ensureCocoModel() {
  if (cocoModel) return cocoModel;
  cocoModel = await cocoSsd.load();
  return cocoModel;
}

async function detectCarFromDataUrl(dataUrl) {
  const model = await ensureCocoModel();
  const img = await dataUrlToImage(dataUrl);

  const predictions = await model.detect(img);
  const best = predictions
    .filter((p) => ["car", "truck", "bus", "motorcycle"].includes(p.class))
    .sort((a, b) => b.score - a.score)[0];

  return { hasCar: !!best && best.score >= CAR_MIN_SCORE, best: best || null };
}

function drawCenterCropForPlate(img, outSize = 640) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");

  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const cropW = Math.round(w * 0.72);
  const cropH = Math.round(h * 0.42);

  const sx = Math.round((w - cropW) / 2);
  const sy = Math.round((h - cropH) / 2);

  c.width = outSize;
  c.height = Math.round((outSize * cropH) / cropW);

  ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, c.width, c.height);

  // binarização simples
  const imgData = ctx.getImageData(0, 0, c.width, c.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i],
      g = d[i + 1],
      b = d[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const v = lum > 140 ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(imgData, 0, 0);

  return c;
}

async function detectPlateFromDataUrl(dataUrl) {
  const img = await dataUrlToImage(dataUrl);
  const plateCanvas = drawCenterCropForPlate(img, 640);

  const { data } = await Tesseract.recognize(plateCanvas, "eng", {
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  });

  const raw = (data?.text || "").toUpperCase();
  const compact = raw.replace(/[^A-Z0-9]/g, "");
  const match = compact.match(PLATE_REGEX);

  return { hasPlate: !!match, plateLike: match ? match[0] : null };
}

// ================= CROP =================
function getPointerPos(evt, canvasEl) {
  const rect = canvasEl.getBoundingClientRect();
  const x = (evt.clientX - rect.left) * (canvasEl.width / rect.width);
  const y = (evt.clientY - rect.top) * (canvasEl.height / rect.height);
  return { x, y };
}

function initCropRect() {
  const cw = cropCanvas.width;
  const ch = cropCanvas.height;

  const w = Math.round(cw * CROP_INIT_W_RATIO);
  const h = Math.round(ch * CROP_INIT_H_RATIO);

  cropRect.w = Math.max(CROP_MIN_SIZE, w);
  cropRect.h = Math.max(CROP_MIN_SIZE, h);
  cropRect.x = Math.round((cw - cropRect.w) / 2);
  cropRect.y = Math.round((ch - cropRect.h) / 2);

  clampCrop();
}

function clampCrop() {
  if (!capturedImage) return;

  cropRect.w = Math.max(CROP_MIN_SIZE, Math.min(cropRect.w, cropCanvas.width));
  cropRect.h = Math.max(CROP_MIN_SIZE, Math.min(cropRect.h, cropCanvas.height));

  const maxX = cropCanvas.width - cropRect.w;
  const maxY = cropCanvas.height - cropRect.h;
  cropRect.x = Math.max(0, Math.min(cropRect.x, maxX));
  cropRect.y = Math.max(0, Math.min(cropRect.y, maxY));
}

function drawPlainImage(imgEl) {
  const ctx = cropCanvas.getContext("2d");
  cropCanvas.width = imgEl.naturalWidth;
  cropCanvas.height = imgEl.naturalHeight;
  ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  ctx.drawImage(imgEl, 0, 0, cropCanvas.width, cropCanvas.height);
}

function drawCropOverlay() {
  if (!capturedImage) return;

  const ctx = cropCanvas.getContext("2d");
  const cw = cropCanvas.width;
  const ch = cropCanvas.height;

  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(capturedImage, 0, 0, cw, ch);

  ctx.fillStyle = "rgba(0,0,0,0.40)";
  ctx.fillRect(0, 0, cw, ch);

  ctx.clearRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
  ctx.drawImage(
    capturedImage,
    cropRect.x,
    cropRect.y,
    cropRect.w,
    cropRect.h,
    cropRect.x,
    cropRect.y,
    cropRect.w,
    cropRect.h,
  );

  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 3;
  ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);

  const hs = 10;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillRect(cropRect.x - 1, cropRect.y - 1, hs, hs);
  ctx.fillRect(cropRect.x + cropRect.w - hs + 1, cropRect.y - 1, hs, hs);
  ctx.fillRect(cropRect.x - 1, cropRect.y + cropRect.h - hs + 1, hs, hs);
  ctx.fillRect(
    cropRect.x + cropRect.w - hs + 1,
    cropRect.y + cropRect.h - hs + 1,
    hs,
    hs,
  );
}

function pointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

function getHandleAtPoint(p) {
  const hs = HANDLE_SIZE;

  const nw = { x: cropRect.x - hs / 2, y: cropRect.y - hs / 2, w: hs, h: hs };
  const ne = {
    x: cropRect.x + cropRect.w - hs / 2,
    y: cropRect.y - hs / 2,
    w: hs,
    h: hs,
  };
  const sw = {
    x: cropRect.x - hs / 2,
    y: cropRect.y + cropRect.h - hs / 2,
    w: hs,
    h: hs,
  };
  const se = {
    x: cropRect.x + cropRect.w - hs / 2,
    y: cropRect.y + cropRect.h - hs / 2,
    w: hs,
    h: hs,
  };

  if (pointInRect(p.x, p.y, nw.x, nw.y, nw.w, nw.h)) return "nw";
  if (pointInRect(p.x, p.y, ne.x, ne.y, ne.w, ne.h)) return "ne";
  if (pointInRect(p.x, p.y, sw.x, sw.y, sw.w, sw.h)) return "sw";
  if (pointInRect(p.x, p.y, se.x, se.y, se.w, se.h)) return "se";
  return null;
}

function onPointerDown(evt) {
  if (!capturedImage || !cropEnabled) return;

  const p = getPointerPos(evt, cropCanvas);
  const handle = getHandleAtPoint(p);

  if (handle) dragMode = handle;
  else if (
    pointInRect(p.x, p.y, cropRect.x, cropRect.y, cropRect.w, cropRect.h)
  )
    dragMode = "move";
  else {
    dragMode = null;
    return;
  }

  activePointerId = evt.pointerId;
  cropCanvas.setPointerCapture(activePointerId);

  start.px = p.x;
  start.py = p.y;
  start.x = cropRect.x;
  start.y = cropRect.y;
  start.w = cropRect.w;
  start.h = cropRect.h;

  evt.preventDefault();
}

function onPointerMove(evt) {
  if (!capturedImage || !cropEnabled) return;
  if (activePointerId === null || evt.pointerId !== activePointerId) return;
  if (!dragMode) return;

  const p = getPointerPos(evt, cropCanvas);
  const dx = p.x - start.px;
  const dy = p.y - start.py;

  if (dragMode === "move") {
    cropRect.x = start.x + dx;
    cropRect.y = start.y + dy;
    clampCrop();
    drawCropOverlay();
    evt.preventDefault();
    return;
  }

  let x = start.x,
    y = start.y,
    w = start.w,
    h = start.h;

  if (dragMode === "nw") {
    x = start.x + dx;
    y = start.y + dy;
    w = start.w - dx;
    h = start.h - dy;
  }
  if (dragMode === "ne") {
    y = start.y + dy;
    w = start.w + dx;
    h = start.h - dy;
  }
  if (dragMode === "sw") {
    x = start.x + dx;
    w = start.w - dx;
    h = start.h + dy;
  }
  if (dragMode === "se") {
    w = start.w + dx;
    h = start.h + dy;
  }

  if (w < CROP_MIN_SIZE) {
    if (dragMode === "nw" || dragMode === "sw")
      x = start.x + (start.w - CROP_MIN_SIZE);
    w = CROP_MIN_SIZE;
  }
  if (h < CROP_MIN_SIZE) {
    if (dragMode === "nw" || dragMode === "ne")
      y = start.y + (start.h - CROP_MIN_SIZE);
    h = CROP_MIN_SIZE;
  }

  cropRect.x = x;
  cropRect.y = y;
  cropRect.w = w;
  cropRect.h = h;
  clampCrop();
  drawCropOverlay();
  evt.preventDefault();
}

function onPointerUp(evt) {
  if (activePointerId === null || evt.pointerId !== activePointerId) return;
  try {
    cropCanvas.releasePointerCapture(activePointerId);
  } catch (_) {}
  activePointerId = null;
  dragMode = null;
}

cropCanvas.addEventListener("pointerdown", onPointerDown);
cropCanvas.addEventListener("pointermove", onPointerMove);
cropCanvas.addEventListener("pointerup", onPointerUp);
cropCanvas.addEventListener("pointercancel", onPointerUp);

// ================= EVENTS =================

// Login
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const u = (usernameEl.value || "").trim();
  const p = (passwordEl.value || "").trim();

  if (u === VALID_USER && p === VALID_PASS) {
    hide(loginError);
    currentStep = STEP_REAR;
    goToHome();
  } else {
    loginError.textContent = "Usuário ou senha inválidos.";
    show(loginError);
  }
});

// Home: fluxo guiado
startFlowBtn.addEventListener("click", () => {
  const next = computeNextStep();
  if (!next) {
    goToSuccess();
    return;
  }
  currentStep = next;
  goToGuide();
});

// Home: clicar no item
docRearBtn.addEventListener("click", () => {
  if (payload.rearPhotoBase64) {
    openModal("Traseira do veículo", payload.rearPhotoBase64);
    return;
  }
  currentStep = STEP_REAR;
  goToGuide();
});

docPlateBtn.addEventListener("click", () => {
  if (payload.platePhotoBase64) {
    openModal("Placa do veículo", payload.platePhotoBase64);
    return;
  }
  currentStep = STEP_PLATE;
  goToGuide();
});

// Guide: continuar
guideContinueBtn.addEventListener("click", async () => {
  if (permissionsReady) {
    goToCapture();
    return;
  }

  guideContinueBtn.disabled = true;
  guideContinueBtn.textContent = "Aguarde...";
  setGuideStatus("Solicitando permissões...");

  try {
    await ensurePermissions();
    goToCapture();
  } catch {
    setGuideStatus("Permissão negada ou indisponível.");
    guideContinueBtn.disabled = false;
    guideContinueBtn.textContent = "Permitir localização e câmera";
  }
});

// Guide: voltar
backToHomeBtn.addEventListener("click", goToHome);

// Capture: voltar
backBtn.addEventListener("click", () => {
  // se estiver validando, ignora
  if (!validateOverlay.classList.contains("hidden")) return;
  goToGuide();
});

// Tirar foto (com freeze + loading)
takePhotoBtn.addEventListener("click", async () => {
  if (!video.videoWidth || !video.videoHeight) {
    setCapStatus("Carregando câmera...");
    await safePlayVideo();
  }

  if (!video.videoWidth || !video.videoHeight) {
    setCapStatus("A câmera ainda não ficou pronta. Tente novamente.");
    return;
  }

  setCapStatus("Capturando...");

  const c = document.createElement("canvas");
  c.width = video.videoWidth;
  c.height = video.videoHeight;
  c.getContext("2d").drawImage(video, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL("image/jpeg", 0.92);

  // freeze + loading
  startValidationUI(dataUrl, "Checando nitidez...");

  try {
    // 🔍 SOMENTE NITIDEZ
    const { blurry, score } = await isBlurryFromDataUrl(dataUrl);

    if (blurry) {
      stopValidationUI();
      showIssueScreen({
        title: "A imagem não ficou nítida",
        desc: "Tente novamente aproximando, estabilizando a câmera e garantindo boa iluminação.",
        dataUrl,
        metaText: `Score de nitidez: ${score.toFixed(1)}`,
      });
      return;
    }

    validateSub.textContent = "Verificando autenticidade...";

    const fraudCheck = await detectPhotoOfPhoto(dataUrl);

    if (fraudCheck.isFraud) {
      stopValidationUI();

      showIssueScreen({
        title: "Detectamos possível uso de foto ou tela",
        desc: "Por favor, capture a imagem diretamente do objeto real.",
        dataUrl,
        metaText: `Brilho: ${(fraudCheck.brightRatio * 100).toFixed(0)}% | Variação: ${fraudCheck.avgVariation.toFixed(1)}`,
      });

      return;
    }

    // ✅ SEM validação de carro ou placa
    validateSub.textContent = "Preparando prévia...";

    const img = new Image();
    img.onload = () => {
      stopValidationUI();

      capturedImage = img;
      finalPhotoBase64 = dataUrl;

      hide(cameraBox);
      show(cropBox);

      cropCanvas.classList.remove("is-cropping");
      drawPlainImage(img);

      hide(takePhotoBtn);
      show(previewActions);

      cropModeBtn.disabled = false;
      cropModeBtn.textContent = "Ajustar recorte";
      confirmCropBtn.disabled = true;

      cropEnabled = false;

      setCapStatus(
        "Foto capturada. Ajuste o recorte se quiser, ou use a foto.",
      );
    };

    img.src = dataUrl;
  } catch (e) {
    console.warn("Erro:", e);

    stopValidationUI();

    showIssueScreen({
      title: "Erro ao processar imagem",
      desc: "Tente novamente.",
      dataUrl,
    });
  }
});

// Tela erro: tentar novamente
tryAgainBtn.addEventListener("click", () => {
  goToCapture();
  showToast("Vamos tentar de novo");
});

// Ajustar recorte
cropModeBtn.addEventListener("click", () => {
  if (!capturedImage) return;

  cropEnabled = true;
  cropCanvas.classList.add("is-cropping");

  cropCanvas.width = capturedImage.naturalWidth;
  cropCanvas.height = capturedImage.naturalHeight;

  initCropRect();
  drawCropOverlay();

  cropModeBtn.disabled = true;
  confirmCropBtn.disabled = false;

  setCapStatus("Ajuste o recorte e clique em Confirmar recorte.");
});

// Confirmar recorte
confirmCropBtn.addEventListener("click", () => {
  if (!capturedImage) return;

  const out = document.createElement("canvas");
  out.width = Math.round(cropRect.w);
  out.height = Math.round(cropRect.h);

  out
    .getContext("2d")
    .drawImage(
      capturedImage,
      cropRect.x,
      cropRect.y,
      cropRect.w,
      cropRect.h,
      0,
      0,
      out.width,
      out.height,
    );

  const croppedBase64 = out.toDataURL("image/jpeg", 0.92);
  finalPhotoBase64 = croppedBase64;

  const img2 = new Image();
  img2.onload = () => {
    cropEnabled = false;
    cropCanvas.classList.remove("is-cropping");
    drawPlainImage(img2);

    cropModeBtn.disabled = false;
    cropModeBtn.textContent = "Ajustar recorte";
    confirmCropBtn.disabled = true;

    setCapStatus("Recorte aplicado! Agora você está vendo a imagem recortada.");
  };
  img2.src = croppedBase64;
});

// Refazer
retakeBtn.addEventListener("click", () => {
  resetCaptureUI();
  safePlayVideo();
  setCapStatus("Ok. Pode tirar outra foto.");
});

// Usar foto
useBtn.addEventListener("click", () => {
  if (!finalPhotoBase64) {
    setCapStatus("Nenhuma foto disponível.");
    return;
  }

  if (currentStep === STEP_REAR) {
    payload.rearPhotoBase64 = finalPhotoBase64;
    showToast("Traseira capturada");
    goToHome();
    return;
  }

  if (currentStep === STEP_PLATE) {
    payload.platePhotoBase64 = finalPhotoBase64;
    showToast("Placa capturada");

    const next = computeNextStep();
    if (next) {
      goToHome();
      return;
    }

    goToSuccess();
  }
});

// Success: visualizar fotos
successRearBtn.addEventListener("click", () =>
  openModal("Traseira do veículo", payload.rearPhotoBase64),
);
successPlateBtn.addEventListener("click", () =>
  openModal("Placa do veículo", payload.platePhotoBase64),
);

// Botão formalização
goFormalizationBtn.addEventListener("click", () => {
  console.log("Seguir para formalização (mock). Payload:", payload);
});

// Logout
function logout() {
  try {
    if (stream) stream.getTracks().forEach((t) => t.stop());
  } catch (_) {}
  stream = null;
  permissionsReady = false;

  payload.location = null;
  payload.rearPhotoBase64 = null;
  payload.platePhotoBase64 = null;
  sessionStorage.removeItem("poc_location");

  document.body.classList.remove("step-plate");

  hide(homeView);
  hide(guideView);
  hide(captureView);
  hide(blurView);
  hide(successView);
  hide(photoModal);
  show(loginView);

  loginForm.reset();
  hide(loginError);
  setHomeStatus("");
  setGuideStatus("");
  setCapStatus("");

  currentStep = STEP_REAR;
  resetCaptureUI();
}

logoutBtnHome.addEventListener("click", logout);
logoutBtnCap.addEventListener("click", logout);
logoutBtnSuccess.addEventListener("click", logout);
logoutBtnBlur.addEventListener("click", logout);

// INIT
(function init() {
  hide(homeView);
  hide(guideView);
  hide(captureView);
  hide(blurView);
  hide(successView);
  hide(photoModal);
  show(loginView);

  document.body.classList.remove("step-plate");
  resetCaptureUI();
})();

function detectPhotoOfPhoto(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let brightPixels = 0;
      let lowVariancePixels = 0;

      let total = data.length / 4;

      let prevLum = null;
      let variationSum = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        // 🔆 brilho muito alto (tela)
        if (r > 240 && g > 240 && b > 240) {
          brightPixels++;
        }

        // 📉 pouca variação (imagem de imagem)
        if (prevLum !== null) {
          variationSum += Math.abs(lum - prevLum);
        }

        prevLum = lum;
      }

      const brightRatio = brightPixels / total;
      const avgVariation = variationSum / total;

      // 🚨 heurística
      const isScreenLike = brightRatio > 0.25;
      const lowVariation = avgVariation < 8;

      resolve({
        isFraud: isScreenLike || lowVariation,
        brightRatio,
        avgVariation,
      });
    };

    img.src = dataUrl;
  });
}
