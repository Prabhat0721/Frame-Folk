
'use strict';

/* =========================================
   FRAME FOLK - PHOTO EDITOR ENGINE
   ========================================= */

const $ = (id) => document.getElementById(id);

const canvas = $('imageCanvas');
const ctx = canvas?.getContext('2d', { willReadFrequently: true });
const uploadInput = $('imageUpload');
const dropZone = $('dropZone');
const canvasHint = $('canvasHint');

if (!canvas || !ctx) {
  console.error('Frame Folk: imageCanvas not found.');
}

/* ---------- EDITOR STATE ---------- */

const defaults = {
  exposure: 0,
  brightness: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,

  temp: 0,
  tint: 0,
  saturation: 0,
  vibrance: 0,

  hue: 0,
  hslSaturation: 0,
  luminance: 0,

  gradeRange: 'shadows',
  gradeColor: '#000000',
  gradeStrength: 0,
  gradeBlend: 50,
  gradeBalance: 0,

  texture: 0,
  clarity: 0,
  dehaze: 0,
  vignette: 0,
  grain: 0,
  sharpen: 0,
  noiseReduction: 0,

  rotation: 0,
  flipH: false,
  flipV: false,
  cropRatio: 'free',
  cropApplied: false
};

let settings = { ...defaults };
let originalImage = null;
let imageLoaded = false;
let history = [];
let historyIndex = -1;
let isShowingOriginal = false;
let renderTimer = null;

const MAX_PREVIEW_SIZE = 1600;

/* ---------- HELPERS ---------- */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cloneSettings() {
  return JSON.parse(JSON.stringify(settings));
}

function hexToRgb(hex) {
  const value = String(hex || '#000000').replace('#', '');
  const full = value.length === 3
    ? value.split('').map(x => x + x).join('')
    : value;

  const number = parseInt(full, 16);

  if (!Number.isFinite(number)) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255
  };
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));

    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
    }

    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, l };
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 1);
  l = clamp(l, 0, 1);

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255
  };
}

function colorDistance(a, b) {
  let d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

/* ---------- HISTORY ---------- */

function saveHistory() {
  if (!imageLoaded) return;

  history = history.slice(0, historyIndex + 1);
  history.push(cloneSettings());

  if (history.length > 40) {
    history.shift();
  }

  historyIndex = history.length - 1;
  updateHistoryButtons();
}

function updateHistoryButtons() {
  const undo = $('undoBtn');
  const redo = $('redoBtn');

  if (undo) undo.disabled = historyIndex <= 0;
  if (redo) redo.disabled = historyIndex >= history.length - 1;
}

function undo() {
  if (historyIndex <= 0) return;

  historyIndex--;
  settings = cloneHistory(historyIndex);
  syncControls();
  render();
  updateHistoryButtons();
}

function redo() {
  if (historyIndex >= history.length - 1) return;

  historyIndex++;
  settings = cloneHistory(historyIndex);
  syncControls();
  render();
  updateHistoryButtons();
}

function cloneHistory(index) {
  return JSON.parse(JSON.stringify(history[index]));
}

/* ---------- IMAGE UPLOAD ---------- */

function loadImage(file) {
  if (!file || !file.type.startsWith('image/')) {
    alert('Please select a valid image file.');
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const img = new Image();

    img.onload = () => {
      originalImage = img;
      imageLoaded = true;
      settings = { ...defaults };

      history = [];
      historyIndex = -1;

      saveHistory();
      render();

      if (canvasHint) canvasHint.style.display = 'none';
      if (dropZone) dropZone.classList.add('has-image');

      const exportBtn = $('exportBtn');
      if (exportBtn) exportBtn.disabled = false;
    };

    img.onerror = () => alert('Image could not be opened.');
    img.src = reader.result;
  };

  reader.readAsDataURL(file);
}

if (uploadInput) {
  uploadInput.addEventListener('change', (event) => {
    loadImage(event.target.files?.[0]);
    event.target.value = '';
  });
}

if (dropZone) {
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('drag-over');
    loadImage(event.dataTransfer.files?.[0]);
  });
}

/* ---------- CROP ---------- */

function getCropRect(width, height, ratio) {
  if (!ratio || ratio === 'free') {
    return { x: 0, y: 0, width, height };
  }

  const parts = ratio.split(':').map(Number);
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { x: 0, y: 0, width, height };
  }

  const target = parts[0] / parts[1];
  const current = width / height;

  if (current > target) {
    const newWidth = height * target;
    return {
      x: (width - newWidth) / 2,
      y: 0,
      width: newWidth,
      height
    };
  }

  const newHeight = width / target;
  return {
    x: 0,
    y: (height - newHeight) / 2,
    width,
    height: newHeight
  };
}

/* ---------- IMAGE DRAWING ---------- */

function drawOriginal(targetCtx, width, height) {
  const imgWidth = originalImage.naturalWidth;
  const imgHeight = originalImage.naturalHeight;

  const crop = settings.cropApplied
    ? getCropRect(imgWidth, imgHeight, settings.cropRatio)
    : { x: 0, y: 0, width: imgWidth, height: imgHeight };

  targetCtx.save();
  targetCtx.translate(width / 2, height / 2);

  targetCtx.rotate(settings.rotation * Math.PI / 180);

  targetCtx.scale(
    settings.flipH ? -1 : 1,
    settings.flipV ? -1 : 1
  );

  const rotated = Math.abs(settings.rotation % 180) === 90;
  const drawWidth = rotated ? height : width;
  const drawHeight = rotated ? width : height;

  targetCtx.drawImage(
    originalImage,
    crop.x, crop.y, crop.width, crop.height,
    -drawWidth / 2, -drawHeight / 2,
    drawWidth, drawHeight
  );

  targetCtx.restore();
}

/* ---------- COLOR ENGINE ---------- */

function applyColorAdjustments(imageData) {
  const data = imageData.data;

  const exposure = Math.pow(2, settings.exposure / 100);
  const brightness = settings.brightness * 1.8;
  const contrast = (settings.contrast + 100) / 100;
  const temperature = settings.temp * 0.55;
  const tint = settings.tint * 0.35;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    r *= exposure;
    g *= exposure;
    b *= exposure;

    r += brightness;
    g += brightness;
    b += brightness;

    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;

    r += temperature + tint * 0.3;
    g += tint;
    b -= temperature + tint * 0.3;

    let hsl = rgbToHsl(r, g, b);

    const light = hsl.l;
    const highlightWeight = clamp((light - 0.45) * 2, 0, 1);
    const shadowWeight = clamp((0.55 - light) * 2, 0, 1);

    hsl.l +=
      settings.highlights / 250 * highlightWeight +
      settings.shadows / 250 * shadowWeight;

    hsl.l += settings.whites / 500 * clamp((light - 0.65) * 3, 0, 1);
    hsl.l += settings.blacks / 500 * clamp((0.35 - light) * 3, 0, 1);

    hsl.l = clamp(hsl.l, 0, 1);

    hsl.s *= 1 + settings.saturation / 100;

    const vibrance = settings.vibrance / 100;
    hsl.s *= 1 + vibrance * (1 - hsl.s);

    hsl.s = clamp(hsl.s, 0, 1);

    const originalHue = hsl.h;
    const hueWeight = clamp(1 - colorDistance(originalHue, 30) / 45, 0, 1);

    hsl.h += settings.hue * hueWeight;
    hsl.s += settings.hslSaturation / 100 * hueWeight;
    hsl.l += settings.luminance / 200 * hueWeight;

    const adjusted = hslToRgb(hsl.h, hsl.s, hsl.l);

    r = adjusted.r;
    g = adjusted.g;
    b = adjusted.b;

    /* Color grading */
    if (settings.gradeStrength > 0) {
      const grade = hexToRgb(settings.gradeColor);
      const gradeHsl = rgbToHsl(grade.r, grade.g, grade.b);

      let weight = 0;

      if (settings.gradeRange === 'shadows') {
        weight = clamp((0.5 - hsl.l) * 2, 0, 1);
      } else if (settings.gradeRange === 'midtones') {
        weight = clamp(1 - Math.abs(hsl.l - 0.5) * 3, 0, 1);
      } else {
        weight = clamp((hsl.l - 0.5) * 2, 0, 1);
      }

      const amount =
        settings.gradeStrength / 100 *
        weight *
        (settings.gradeBlend / 100);

      const gradeColor = hslToRgb(
        gradeHsl.h,
        gradeHsl.s,
        0.5
      );

      r += (gradeColor.r - 128) * amount;
      g += (gradeColor.g - 128) * amount;
      b += (gradeColor.b - 128) * amount;
    }

    /* Approximate clarity and dehaze */
    const detail = settings.clarity / 100;
    const haze = settings.dehaze / 100;

    r = (r - 128) * (1 + detail * 0.35 + haze * 0.5) + 128;
    g = (g - 128) * (1 + detail * 0.35 + haze * 0.5) + 128;
    b = (b - 128) * (1 + detail * 0.35 + haze * 0.5) + 128;

    data[i] = clamp(r, 0, 255);
    data[i + 1] = clamp(g, 0, 255);
    data[i + 2] = clamp(b, 0, 255);
  }

  return imageData;
}

/* ---------- EFFECTS ENGINE ---------- */

function applyVignette(imageData, width, height) {
  const amount = settings.vignette / 100;
  if (!amount) return imageData;

  const data = imageData.data;
  const cx = width / 2;
  const cy = height / 2;
  const maxDistance = Math.sqrt(cx * cx + cy * cy);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const distance = Math.sqrt(
        (x - cx) ** 2 + (y - cy) ** 2
      ) / maxDistance;

      const factor = 1 - amount * Math.pow(distance, 2) * 0.75;
      const i = (y * width + x) * 4;

      data[i] *= factor;
      data[i + 1] *= factor;
      data[i + 2] *= factor;
    }
  }

  return imageData;
}

function applyGrain(imageData) {
  const amount = settings.grain / 100;
  if (!amount) return imageData;

  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * amount * 65;

    data[i] = clamp(data[i] + noise, 0, 255);
    data[i + 1] = clamp(data[i + 1] + noise, 0, 255);
    data[i + 2] = clamp(data[i + 2] + noise, 0, 255);
  }

  return imageData;
}

function applySharpen(imageData, width, height) {
  const amount = settings.sharpen / 100;
  if (!amount || width < 3 || height < 3) return imageData;

  const source = new Uint8ClampedArray(imageData.data);
  const data = imageData.data;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        const center = source[i + c];
        const top = source[i - width * 4 + c];
        const bottom = source[i + width * 4 + c];
        const left = source[i - 4 + c];
        const right = source[i + 4 + c];

        const blur = (top + bottom + left + right) / 4;

        data[i + c] = clamp(
          center + (center - blur) * amount * 1.5,
          0,
          255
        );
      }
    }
  }

  return imageData;
}

/* ---------- RENDER ENGINE ---------- */

function renderTo(targetCanvas, fullSize = false, originalOnly = false) {
  if (!imageLoaded) return;

  const targetCtx = targetCanvas.getContext('2d', {
    willReadFrequently: true
  });

  const sourceWidth = originalImage.naturalWidth;
  const sourceHeight = originalImage.naturalHeight;

  let width = sourceWidth;
  let height = sourceHeight;

  if (!fullSize) {
    const scale = Math.min(
      1,
      MAX_PREVIEW_SIZE / Math.max(sourceWidth, sourceHeight)
    );

    width = Math.round(sourceWidth * scale);
    height = Math.round(sourceHeight * scale);
  }

  const rotated = Math.abs(settings.rotation % 180) === 90;

  targetCanvas.width = rotated ? height : width;
  targetCanvas.height = rotated ? width : height;

  targetCtx.clearRect(
    0, 0, targetCanvas.width, targetCanvas.height
  );

  if (originalOnly) {
    const saved = cloneSettings();
    settings = { ...defaults };
    drawOriginal(targetCtx, targetCanvas.width, targetCanvas.height);
    settings = saved;
    return;
  }

  drawOriginal(targetCtx, targetCanvas.width, targetCanvas.height);

  try {
    let imageData = targetCtx.getImageData(
      0, 0, targetCanvas.width, targetCanvas.height
    );

    imageData = applyColorAdjustments(imageData);
    imageData = applyVignette(
      imageData,
      targetCanvas.width,
      targetCanvas.height
    );
    imageData = applySharpen(
      imageData,
      targetCanvas.width,
      targetCanvas.height
    );
    imageData = applyGrain(imageData);

    targetCtx.putImageData(imageData, 0, 0);

    /* Noise reduction approximation */
    if (settings.noiseReduction > 0) {
      const temp = document.createElement('canvas');
      temp.width = targetCanvas.width;
      temp.height = targetCanvas.height;

      const tempCtx = temp.getContext('2d');
      tempCtx.filter = 'blur(1px)';
      tempCtx.drawImage(targetCanvas, 0, 0);

      targetCtx.globalAlpha = settings.noiseReduction / 200;
      targetCtx.drawImage(temp, 0, 0);
      targetCtx.globalAlpha = 1;
    }

    /* Texture approximation */
    if (settings.texture !== 0) {
      targetCtx.globalAlpha = Math.abs(settings.texture) / 300;
      targetCtx.globalCompositeOperation =
        settings.texture > 0 ? 'overlay' : 'soft-light';

      targetCtx.fillStyle = settings.texture > 0
        ? '#ffffff'
        : '#777777';

      targetCtx.fillRect(
        0, 0, targetCanvas.width, targetCanvas.height
      );

      targetCtx.globalAlpha = 1;
      targetCtx.globalCompositeOperation = 'source-over';
    }

  } catch (error) {
    console.error('Rendering error:', error);
  }
}

function render() {
  if (!imageLoaded) return;

  clearTimeout(renderTimer);

  renderTimer = setTimeout(() => {
    renderTo(canvas, false, isShowingOriginal);
  }, 15);
}

/* ---------- SLIDER CONNECTIONS ---------- */

const sliderIds = [
  'exposure', 'brightness', 'contrast',
  'highlights', 'shadows', 'whites', 'blacks',
  'temp', 'tint', 'saturation', 'vibrance',
  'hue', 'hslSaturation', 'luminance',
  'gradeStrength', 'gradeBlend', 'gradeBalance',
  'texture', 'clarity', 'dehaze',
  'vignette', 'grain', 'sharpen', 'noiseReduction'
];

function connectSlider(id) {
  const element = $(id);
  if (!element) return;

  let previousValue = element.value;

  element.addEventListener('pointerdown', () => {
    previousValue = element.value;
  });

  element.addEventListener('change', () => {
    if (String(previousValue) !== String(element.value)) {
      saveHistory();
    }
  });

  element.addEventListener('input', () => {
    const value = Number(element.value);
    if (Number.isFinite(value)) {
      settings[id] = value;
      render();
    }
  });
}

sliderIds.forEach(connectSlider);

/* ---------- HSL CHANNELS ---------- */

const hslChannel = $('hslChannel');

const hslControls = {
  hue: 'hue',
  saturation: 'hslSaturation',
  luminance: 'luminance'
};

if (hslChannel) {
  hslChannel.addEventListener('change', () => {
    const channel = hslChannel.value;
    settings.activeHslChannel = channel || 'red';
  });
}

/* ---------- COLOR GRADING ---------- */

const gradeRange = $('gradeRange');
const gradeColor = $('gradeColor');

if (gradeRange) {
  gradeRange.addEventListener('change', () => {
    saveHistory();
    settings.gradeRange = gradeRange.value;
    render();
  });
}

if (gradeColor) {
  gradeColor.addEventListener('pointerdown', () => {
    saveHistory();
  });

  gradeColor.addEventListener('input', () => {
    settings.gradeColor = gradeColor.value;
    render();
  });
}

/* ---------- CONTROL SYNC ---------- */

function syncControls() {
  sliderIds.forEach(id => {
    const element = $(id);
    if (element && settings[id] !== undefined) {
      element.value = settings[id];
    }
  });

  if (gradeRange) gradeRange.value = settings.gradeRange;
  if (gradeColor) gradeColor.value = settings.gradeColor;

  const ratio = $('cropRatio');
  if (ratio) ratio.value = settings.cropRatio;
}

/* ---------- BUTTONS ---------- */

function connectButton(id, callback) {
  const element = $(id);
  if (element) {
    element.addEventListener('click', callback);
  }
}

connectButton('undoBtn', undo);
connectButton('redoBtn', redo);

connectButton('resetBtn', () => {
  if (!imageLoaded) return;

  saveHistory();
  settings = { ...defaults };
  syncControls();
  render();
});

connectButton('rotateLeft', () => {
  if (!imageLoaded) return;
  saveHistory();
  settings.rotation = (settings.rotation - 90 + 360) % 360;
  render();
});

connectButton('rotateRight', () => {
  if (!imageLoaded) return;
  saveHistory();
  settings.rotation = (settings.rotation + 90) % 360;
  render();
});

connectButton('flipH', () => {
  if (!imageLoaded) return;
  saveHistory();
  settings.flipH = !settings.flipH;
  render();
});

connectButton('flipV', () => {
  if (!imageLoaded) return;
  saveHistory();
  settings.flipV = !settings.flipV;
  render();
});

connectButton('applyCrop', () => {
  if (!imageLoaded) return;

  saveHistory();
  const selector = $('cropRatio');

  settings.cropRatio = selector?.value || 'free';
  settings.cropApplied = true;
  render();
});

connectButton('resetCrop', () => {
  if (!imageLoaded) return;

  saveHistory();
  settings.cropRatio = 'free';
  settings.cropApplied = false;
  syncControls();
  render();
});

/* ---------- CROP RATIO ---------- */

const cropSelector = $('cropRatio');

if (cropSelector) {
  cropSelector.addEventListener('change', () => {
    settings.cropRatio = cropSelector.value;
  });
}

/* ---------- BEFORE / AFTER ---------- */

const beforeAfter = $('beforeAfterBtn');

if (beforeAfter) {
  beforeAfter.addEventListener('pointerdown', (event) => {
    if (!imageLoaded) return;

    event.preventDefault();
    isShowingOriginal = true;
    renderTo(canvas, false, true);
  });

  const releaseBeforeAfter = () => {
    if (!isShowingOriginal) return;

    isShowingOriginal = false;
    render();
  };

  beforeAfter.addEventListener('pointerup', releaseBeforeAfter);
  beforeAfter.addEventListener('pointerleave', releaseBeforeAfter);

  window.addEventListener('pointerup', releaseBeforeAfter);
}

/* ---------- TABS ---------- */

document.querySelectorAll('[data-tab]').forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.dataset.tab;

    document.querySelectorAll('[data-tab]').forEach(item => {
      item.classList.toggle('active', item === button);
    });

    document.querySelectorAll('[data-panel]').forEach(panel => {
      panel.hidden = panel.dataset.panel !== tabName;
    });
  });
});

/* ---------- EXPORT JPEG ---------- */

async function exportJPEG() {
  if (!imageLoaded) {
    alert('Please upload a photo first.');
    return;
  }

  const button = $('exportBtn');

  try {
    if (button) {
      button.disabled = true;
      button.textContent = 'Exporting...';
    }

    await new Promise(resolve => setTimeout(resolve, 50));

    const output = document.createElement('canvas');

    
    renderTo(output, true, false);

    const blob = await new Promise(resolve => {
      output.toBlob(resolve, 'image/jpeg', 0.95);
    });

    if (!blob) throw new Error('JPEG export failed.');

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'Frame-Folk-Edited.jpg';
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 3000);

  } catch (error) {
    console.error(error);
    alert('Export failed. Try a smaller image.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Export JPG';
    }
  }
}

connectButton('exportBtn', exportJPEG);

document.addEventListener('keydown', (event) => {
  if (
    event.target.matches('input, textarea, select') ||
    event.target.isContentEditable
  ) return;

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    undo();
  }

  if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === 'y'
  ) {
    event.preventDefault();
    redo();
  }
});

syncControls();
updateHistoryButtons();

const exportButton = $('exportBtn');
if (exportButton) exportButton.disabled = true;

console.log('Frame Folk Photo Editor Engine loaded.');

