const VALID_USER = "teste";
const VALID_PASS = "teste";

// Views
const loginView = document.getElementById("loginView");
const introView = document.getElementById("introView");
const captureView = document.getElementById("captureView");
const blurView = document.getElementById("blurView");
const successView = document.getElementById("successView");

// Login
const loginForm = document.getElementById("loginForm");
const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");
const loginError = document.getElementById("loginError");

// Intro UI
const enableAllBtn = document.getElementById("enableAllBtn");
const introStatus = document.getElementById("introStatus");
const logoutBtnIntro = document.getElementById("logoutBtnIntro");

// Checklist UI
const docRearBtn = document.getElementById("docRearBtn");
const docRearBadge = document.getElementById("docRearBadge");
const docRearMeta = document.getElementById("docRearMeta");
const docRearThumb = document.getElementById("docRearThumb");

const docPlateBtn = document.getElementById("docPlateBtn");
const docPlateBadge = document.getElementById("docPlateBadge");
const docPlateMeta = document.getElementById("docPlateMeta");
const docPlateThumb = document.getElementById("docPlateThumb");

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

// Actions
const previewActions = document.getElementById("previewActions");
const retakeBtn = document.getElementById("retakeBtn");
const useBtn = document.getElementById("useBtn");

// Toast
const toast = document.getElementById("toast");
const toastText = document.getElementById("toastText");

// Blur view
const blurPreview = document.getElementById("blurPreview");
const blurScore = document.getElementById("blurScore");
const tryAgainBtn = document.getElementById("tryAgainBtn");
const logoutBtnBlur = document.getElementById("logoutBtnBlur");

// Success
const rearThumb = document.getElementById("rearThumb");
const plateThumb = document.getElementById("plateThumb");
const goFormalizationBtn = document.getElementById("goFormalizationBtn");
const logoutBtnSuccess = document.getElementById("logoutBtnSuccess");

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

// ====== BLUR CHECK ======
function getBlurThreshold(){
  return currentStep === STEP_PLATE ? 220 : 150;
}

// Crop settings
const CROP_INIT_W_RATIO = 0.80;
const CROP_INIT_H_RATIO = 0.40;
const CROP_MIN_SIZE = 140;
const HANDLE_SIZE = 28;

// Crop state
let cropEnabled = false;
let cropRect = { x: 0, y: 0, w: 200, h: 200 };
let activePointerId = null;
let dragMode = null;
let start = { px: 0, py: 0, x: 0, y: 0, w: 0, h: 0 };

function show(el){ el?.classList.remove("hidden"); }
function hide(el){ el?.classList.add("hidden"); }
function setIntroStatus(msg){ introStatus.textContent = msg || ""; }
function setCapStatus(msg){ capStatus.textContent = msg || ""; }

function showToast(message){
  toastText.textContent = message;
  show(toast);
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> hide(toast), 1400);
}

function safePlayVideo(){
  return new Promise((resolve)=>{
    const done = () => resolve();

    if (video.readyState >= 2 && video.videoWidth > 0) {
      video.play().catch(()=>{}).finally(done);
      return;
    }

    const onMeta = () => {
      video.removeEventListener("loadedmetadata", onMeta);
      video.play().catch(()=>{}).finally(done);
    };

    video.addEventListener("loadedmetadata", onMeta, { once: true });
    setTimeout(done, 700);
  });
}

// ================= CHECKLIST (HOME) =================
function computeNextStep(){
  if (!payload.rearPhotoBase64) return STEP_REAR;
  if (!payload.platePhotoBase64) return STEP_PLATE;
  return null;
}

function refreshChecklistUI(){
  // traseira
  const rearDone = !!payload.rearPhotoBase64;
  docRearMeta.textContent = rearDone ? "Concluído" : "Pendente";
  docRearBadge.textContent = rearDone ? "✓" : "•";
  docRearBadge.classList.toggle("docCheck--pending", !rearDone);
  docRearThumb.src = rearDone ? payload.rearPhotoBase64 : "";

  // placa
  const plateDone = !!payload.platePhotoBase64;
  docPlateMeta.textContent = plateDone ? "Concluído" : "Pendente";
  docPlateBadge.textContent = plateDone ? "✓" : "•";
  docPlateBadge.classList.toggle("docCheck--pending", !plateDone);
  docPlateThumb.src = plateDone ? payload.platePhotoBase64 : "";

  const next = computeNextStep();
  if (!next){
    enableAllBtn.textContent = "Tudo concluído";
    enableAllBtn.disabled = true;
    setIntroStatus("Você já capturou todos os documentos.");
    return;
  }

  enableAllBtn.disabled = false;
  enableAllBtn.textContent = permissionsReady ? "Continuar captura" : "Iniciar captura";
  setIntroStatus(permissionsReady ? "Permissões já concedidas." : "");
}

// ================= PERMISSÕES =================
function getLocationOnce(){
  return new Promise((resolve, reject)=>{
    if (!navigator.geolocation) return reject(new Error("geo_not_supported"));
    navigator.geolocation.getCurrentPosition(
      pos => resolve(pos),
      err => reject(err),
      { enableHighAccuracy:true, timeout:12000, maximumAge:0 }
    );
  });
}

async function startCameraWithGesture(){
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("camera_not_supported");

  if (!stream){
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
  }

  video.srcObject = stream;
  await safePlayVideo();
}

async function ensurePermissions(){
  if (permissionsReady) return;

  const pos = await getLocationOnce();
  payload.location = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    timestamp: pos.timestamp
  };
  sessionStorage.setItem("poc_location", JSON.stringify(payload.location));

  await startCameraWithGesture();
  permissionsReady = true;
}

// ================= NAV/UI =================
function resetCaptureUI(){
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
}

function applyStepUI(){
  if (capTitle){
    capTitle.textContent = currentStep === STEP_REAR ? "Captura 1/2" : "Captura 2/2";
  }

  if (useBtn){
    useBtn.textContent = currentStep === STEP_REAR ? "Continuar" : "Finalizar";
  }

  if (currentStep === STEP_REAR){
    capSubtitle.textContent = "Traseira do veículo";
    cameraHint.textContent = "Enquadre a traseira do veículo";
  } else {
    capSubtitle.textContent = "Placa do veículo";
    cameraHint.textContent = "Enquadre a placa do veículo";
  }
}

function goToIntro(){
  hide(loginView);
  hide(captureView);
  hide(blurView);
  hide(successView);
  show(introView);

  // define step "natural" (primeiro pendente)
  const next = computeNextStep();
  if (next) currentStep = next;

  refreshChecklistUI();
  try{ video.pause(); }catch(_){}
}

function goToCapture(){
  hide(loginView);
  hide(introView);
  hide(blurView);
  hide(successView);
  show(captureView);

  applyStepUI();
  resetCaptureUI();
  safePlayVideo();
  setCapStatus("Câmera pronta.");
}

function goToBlurScreen(dataUrl, score){
  hide(loginView);
  hide(introView);
  hide(captureView);
  hide(successView);
  show(blurView);

  blurPreview.src = dataUrl;
  if (blurScore){
    blurScore.textContent = (score != null)
      ? `Score de nitidez: ${score.toFixed(1)} (mín.: ${getBlurThreshold()})`
      : "";
  }
}

function goToSuccess(){
  hide(loginView);
  hide(introView);
  hide(captureView);
  hide(blurView);
  show(successView);

  rearThumb.src = payload.rearPhotoBase64 || "";
  plateThumb.src = payload.platePhotoBase64 || "";

  console.log("PAYLOAD FINAL:", payload);
}

// ================= BLUR DETECTOR =================
function computeSharpnessScoreFromCanvas(canvas){
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const w = canvas.width;
  const h = canvas.height;

  const img = ctx.getImageData(0, 0, w, h).data;

  const stride = Math.max(1, Math.floor(Math.min(w, h) / 240));
  const gw = Math.floor(w / stride);
  const gh = Math.floor(h / stride);

  const gray = new Float32Array(gw * gh);
  let idx = 0;
  for (let y = 0; y < gh; y++){
    const sy = y * stride;
    for (let x = 0; x < gw; x++){
      const sx = x * stride;
      const p = (sy * w + sx) * 4;
      const r = img[p], g = img[p+1], b = img[p+2];
      gray[idx++] = 0.2126*r + 0.7152*g + 0.0722*b;
    }
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < gh-1; y++){
    for (let x = 1; x < gw-1; x++){
      const c = gray[y*gw + x];
      const up = gray[(y-1)*gw + x];
      const dn = gray[(y+1)*gw + x];
      const lf = gray[y*gw + (x-1)];
      const rt = gray[y*gw + (x+1)];

      const lap = (up + dn + lf + rt) - 4*c;
      sum += lap;
      sumSq += lap*lap;
      count++;
    }
  }

  const mean = sum / Math.max(1, count);
  const variance = (sumSq / Math.max(1, count)) - mean*mean;
  return variance;
}

function isBlurryFromDataUrl(dataUrl){
  const img = new Image();
  img.src = dataUrl;

  return new Promise((resolve)=>{
    img.onload = () => {
      const maxSide = 420;
      const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * ratio));
      const h = Math.max(1, Math.round(img.naturalHeight * ratio));

      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);

      const score = computeSharpnessScoreFromCanvas(c);
      resolve({ blurry: score < getBlurThreshold(), score });
    };

    img.onerror = () => resolve({ blurry: true, score: 0 });
  });
}

// ================= CROP =================
function getPointerPos(evt, canvasEl){
  const rect = canvasEl.getBoundingClientRect();
  const x = (evt.clientX - rect.left) * (canvasEl.width / rect.width);
  const y = (evt.clientY - rect.top) * (canvasEl.height / rect.height);
  return { x, y };
}

function initCropRect(){
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

function clampCrop(){
  if (!capturedImage) return;

  cropRect.w = Math.max(CROP_MIN_SIZE, Math.min(cropRect.w, cropCanvas.width));
  cropRect.h = Math.max(CROP_MIN_SIZE, Math.min(cropRect.h, cropCanvas.height));

  const maxX = cropCanvas.width - cropRect.w;
  const maxY = cropCanvas.height - cropRect.h;
  cropRect.x = Math.max(0, Math.min(cropRect.x, maxX));
  cropRect.y = Math.max(0, Math.min(cropRect.y, maxY));
}

function drawPlainImage(imgEl){
  const ctx = cropCanvas.getContext("2d");
  cropCanvas.width = imgEl.naturalWidth;
  cropCanvas.height = imgEl.naturalHeight;
  ctx.clearRect(0,0,cropCanvas.width,cropCanvas.height);
  ctx.drawImage(imgEl, 0, 0, cropCanvas.width, cropCanvas.height);
}

function drawCropOverlay(){
  if (!capturedImage) return;

  const ctx = cropCanvas.getContext("2d");
  const cw = cropCanvas.width;
  const ch = cropCanvas.height;

  ctx.clearRect(0,0,cw,ch);
  ctx.drawImage(capturedImage, 0, 0, cw, ch);

  ctx.fillStyle = "rgba(0,0,0,0.40)";
  ctx.fillRect(0,0,cw,ch);

  ctx.clearRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
  ctx.drawImage(
    capturedImage,
    cropRect.x, cropRect.y, cropRect.w, cropRect.h,
    cropRect.x, cropRect.y, cropRect.w, cropRect.h
  );

  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 3;
  ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);

  const hs = 10;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillRect(cropRect.x - 1, cropRect.y - 1, hs, hs);
  ctx.fillRect(cropRect.x + cropRect.w - hs + 1, cropRect.y - 1, hs, hs);
  ctx.fillRect(cropRect.x - 1, cropRect.y + cropRect.h - hs + 1, hs, hs);
  ctx.fillRect(cropRect.x + cropRect.w - hs + 1, cropRect.y + cropRect.h - hs + 1, hs, hs);
}

function pointInRect(px, py, rx, ry, rw, rh){
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

function getHandleAtPoint(p){
  const hs = HANDLE_SIZE;

  const nw = { x: cropRect.x - hs/2, y: cropRect.y - hs/2, w: hs, h: hs };
  const ne = { x: cropRect.x + cropRect.w - hs/2, y: cropRect.y - hs/2, w: hs, h: hs };
  const sw = { x: cropRect.x - hs/2, y: cropRect.y + cropRect.h - hs/2, w: hs, h: hs };
  const se = { x: cropRect.x + cropRect.w - hs/2, y: cropRect.y + cropRect.h - hs/2, w: hs, h: hs };

  if (pointInRect(p.x, p.y, nw.x, nw.y, nw.w, nw.h)) return "nw";
  if (pointInRect(p.x, p.y, ne.x, ne.y, ne.w, ne.h)) return "ne";
  if (pointInRect(p.x, p.y, sw.x, sw.y, sw.w, sw.h)) return "sw";
  if (pointInRect(p.x, p.y, se.x, se.y, se.w, se.h)) return "se";
  return null;
}

function onPointerDown(evt){
  if (!capturedImage || !cropEnabled) return;

  const p = getPointerPos(evt, cropCanvas);
  const handle = getHandleAtPoint(p);

  if (handle) dragMode = handle;
  else if (pointInRect(p.x, p.y, cropRect.x, cropRect.y, cropRect.w, cropRect.h)) dragMode = "move";
  else { dragMode = null; return; }

  activePointerId = evt.pointerId;
  cropCanvas.setPointerCapture(activePointerId);

  start.px = p.x; start.py = p.y;
  start.x = cropRect.x; start.y = cropRect.y;
  start.w = cropRect.w; start.h = cropRect.h;

  evt.preventDefault();
}

function onPointerMove(evt){
  if (!capturedImage || !cropEnabled) return;
  if (activePointerId === null || evt.pointerId !== activePointerId) return;
  if (!dragMode) return;

  const p = getPointerPos(evt, cropCanvas);
  const dx = p.x - start.px;
  const dy = p.y - start.py;

  if (dragMode === "move"){
    cropRect.x = start.x + dx;
    cropRect.y = start.y + dy;
    clampCrop();
    drawCropOverlay();
    evt.preventDefault();
    return;
  }

  let x = start.x, y = start.y, w = start.w, h = start.h;

  if (dragMode === "nw"){ x = start.x + dx; y = start.y + dy; w = start.w - dx; h = start.h - dy; }
  if (dragMode === "ne"){ y = start.y + dy; w = start.w + dx; h = start.h - dy; }
  if (dragMode === "sw"){ x = start.x + dx; w = start.w - dx; h = start.h + dy; }
  if (dragMode === "se"){ w = start.w + dx; h = start.h + dy; }

  if (w < CROP_MIN_SIZE){
    if (dragMode === "nw" || dragMode === "sw") x = start.x + (start.w - CROP_MIN_SIZE);
    w = CROP_MIN_SIZE;
  }
  if (h < CROP_MIN_SIZE){
    if (dragMode === "nw" || dragMode === "ne") y = start.y + (start.h - CROP_MIN_SIZE);
    h = CROP_MIN_SIZE;
  }

  cropRect.x = x; cropRect.y = y; cropRect.w = w; cropRect.h = h;
  clampCrop();
  drawCropOverlay();
  evt.preventDefault();
}

function onPointerUp(evt){
  if (activePointerId === null || evt.pointerId !== activePointerId) return;
  try{ cropCanvas.releasePointerCapture(activePointerId); }catch(_){}
  activePointerId = null;
  dragMode = null;
}

cropCanvas.addEventListener("pointerdown", onPointerDown);
cropCanvas.addEventListener("pointermove", onPointerMove);
cropCanvas.addEventListener("pointerup", onPointerUp);
cropCanvas.addEventListener("pointercancel", onPointerUp);

// ================= EVENTS =================

// Login
loginForm.addEventListener("submit",(e)=>{
  e.preventDefault();
  const u = (usernameEl.value||"").trim();
  const p = (passwordEl.value||"").trim();

  if (u === VALID_USER && p === VALID_PASS){
    hide(loginError);
    currentStep = STEP_REAR;
    goToIntro();
  } else {
    loginError.textContent = "Usuário ou senha inválidos.";
    show(loginError);
  }
});

// Home: iniciar/continuar captura
enableAllBtn.addEventListener("click", async ()=>{
  // escolhe sempre o próximo pendente
  const next = computeNextStep();
  if (!next){
    goToSuccess();
    return;
  }
  currentStep = next;

  if (permissionsReady){
    goToCapture();
    return;
  }

  enableAllBtn.disabled = true;
  enableAllBtn.textContent = "Aguarde...";
  setIntroStatus("Solicitando permissões...");

  try{
    await ensurePermissions();
    goToCapture();
  }catch{
    setIntroStatus("Permissão negada ou indisponível.");
    enableAllBtn.disabled = false;
    enableAllBtn.textContent = "Iniciar captura";
  }
});

// Clique direto nos cards
docRearBtn.addEventListener("click", async ()=>{
  currentStep = STEP_REAR;
  if (!permissionsReady){
    enableAllBtn.click();
    return;
  }
  goToCapture();
});

docPlateBtn.addEventListener("click", async ()=>{
  currentStep = STEP_PLATE;
  if (!permissionsReady){
    enableAllBtn.click();
    return;
  }
  goToCapture();
});

// Voltar
backBtn.addEventListener("click", goToIntro);

// Tirar foto
takePhotoBtn.addEventListener("click", async ()=>{
  if (!video.videoWidth || !video.videoHeight){
    setCapStatus("Carregando câmera...");
    await safePlayVideo();
  }
  if (!video.videoWidth || !video.videoHeight){
    setCapStatus("A câmera ainda não ficou pronta. Tente novamente.");
    return;
  }

  takePhotoBtn.disabled = true;
  setCapStatus("Capturando...");

  const c = document.createElement("canvas");
  c.width = video.videoWidth;
  c.height = video.videoHeight;
  c.getContext("2d").drawImage(video, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL("image/jpeg", 0.92);

  const { blurry, score } = await isBlurryFromDataUrl(dataUrl);

  if (blurry){
    capturedImage = null;
    finalPhotoBase64 = null;
    cropEnabled = false;

    takePhotoBtn.disabled = false;
    setCapStatus(`Imagem sem nitidez (score ${score.toFixed(1)}).`);
    goToBlurScreen(dataUrl, score);
    return;
  }

  const img = new Image();
  img.onload = () => {
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
    setCapStatus("Foto capturada. Ajuste o recorte se quiser, ou use a foto.");
    takePhotoBtn.disabled = false;
  };
  img.src = dataUrl;
});

// Tela blur: tentar novamente
tryAgainBtn.addEventListener("click", ()=>{
  goToCapture();
  showToast("Vamos tentar de novo");
});

// Ajustar recorte
cropModeBtn.addEventListener("click", ()=>{
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
confirmCropBtn.addEventListener("click", ()=>{
  if (!capturedImage) return;

  const out = document.createElement("canvas");
  out.width = Math.round(cropRect.w);
  out.height = Math.round(cropRect.h);

  out.getContext("2d").drawImage(
    capturedImage,
    cropRect.x, cropRect.y, cropRect.w, cropRect.h,
    0, 0, out.width, out.height
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
retakeBtn.addEventListener("click", ()=>{
  resetCaptureUI();
  safePlayVideo();
  setCapStatus("Ok. Pode tirar outra foto.");
});

// Usar foto
useBtn.addEventListener("click", ()=>{
  if (!finalPhotoBase64){
    setCapStatus("Nenhuma foto disponível.");
    return;
  }

  if (currentStep === STEP_REAR){
    payload.rearPhotoBase64 = finalPhotoBase64;
    showToast("Traseira capturada");
    goToIntro(); // volta pro checklist
    return;
  }

  if (currentStep === STEP_PLATE){
    payload.platePhotoBase64 = finalPhotoBase64;
    showToast("Placa capturada");

    // se ainda falta algo, volta pro checklist
    const next = computeNextStep();
    if (next){
      goToIntro();
      return;
    }

    goToSuccess();
    return;
  }
});

// botão formalização
goFormalizationBtn.addEventListener("click", ()=>{
  console.log("Seguir para formalização (mock). Payload:", payload);
});

// Logout
function logout(){
  try{ if(stream) stream.getTracks().forEach(t=>t.stop()); }catch(_){}
  stream = null;
  permissionsReady = false;

  payload.location = null;
  payload.rearPhotoBase64 = null;
  payload.platePhotoBase64 = null;
  sessionStorage.removeItem("poc_location");

  hide(introView);
  hide(captureView);
  hide(blurView);
  hide(successView);
  show(loginView);

  loginForm.reset();
  hide(loginError);
  setIntroStatus("");
  setCapStatus("");

  currentStep = STEP_REAR;
  resetCaptureUI();
  enableAllBtn.disabled = false;
  enableAllBtn.textContent = "Iniciar captura";
}

logoutBtnIntro.addEventListener("click", logout);
logoutBtnCap.addEventListener("click", logout);
logoutBtnSuccess.addEventListener("click", logout);
logoutBtnBlur.addEventListener("click", logout);

// INIT
(function init(){
  hide(introView);
  hide(captureView);
  hide(blurView);
  hide(successView);
  show(loginView);

  resetCaptureUI();
})();