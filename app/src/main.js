import { renderCover, LAYOUTS, applyPreset, STORY_PRESETS } from './cover.js';
import { stageShot } from './shots.js';

const state = {
  photos: [],
  layout: 'trio',
  grade: 'sunset',
  title: 'SUNSET HEIST',
  subtitle: 'VICE CITY \u2022 2026',
  zoom: 1,
  fitFill: 'fill',
  preset: '', titleStyle: '', tagline: '', starring: '', story: '', bubble: '',
  stickers: [], letterbox: false
};

const STICKER_SPOTS = {
  palm: { x: 0.08, y: 0.14, size: 0.13 },
  flamingo: { x: 0.9, y: 0.2, size: 0.11 },
  sunglasses: { x: 0.5, y: 0.1, size: 0.1 },
  money: { x: 0.85, y: 0.6, size: 0.11 },
  police: { x: 0.12, y: 0.62, size: 0.12 },
  car: { x: 0.8, y: 0.62, size: 0.14 },
  sun: { x: 0.88, y: 0.1, size: 0.11 },
  cocktail: { x: 0.12, y: 0.3, size: 0.1 },
  sign: { x: 0.5, y: 0.06, size: 0.12 }
};

const PREVIEW_W = 960;
const PREVIEW_H = 640;
const MAX_PHOTOS = 4;

function getScene() {
  return {
    photos: state.photos,
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    titleStyle: state.titleStyle,
    tagline: state.tagline,
    starring: state.starring,
    story: state.story,
    bubble: state.bubble,
    stickers: state.stickers,
    letterbox: state.letterbox
  };
}

function setScene(patch) {
  if (patch && typeof patch === 'object') Object.assign(state, patch);
  syncControls();
  render();
}

function sceneForRender() {
  const scene = getScene();
  if (state.fitFill === 'fit') {
    scene.photos = state.photos.map(function (p) {
      return { img: p.img, panX: p.panX, panY: p.panY, zoom: p.zoom * 0.7 };
    });
  }
  return scene;
}

function syncControls() {
  document.querySelectorAll('.layout-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.layout === state.layout);
  });
  document.querySelectorAll('.grade-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.grade === state.grade);
  });
  const titleInput = document.getElementById('titleInput');
  if (titleInput && titleInput.value !== state.title) titleInput.value = state.title;
  const subtitleInput = document.getElementById('subtitleInput');
  if (subtitleInput && subtitleInput.value !== state.subtitle) subtitleInput.value = state.subtitle;
  document.querySelectorAll('.preset-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.preset === state.preset);
  });
  const taglineInput = document.getElementById('taglineInput');
  if (taglineInput && taglineInput.value !== state.tagline) taglineInput.value = state.tagline;
  const starringInput = document.getElementById('starringInput');
  if (starringInput && starringInput.value !== state.starring) starringInput.value = state.starring;
  const letterboxToggle = document.getElementById('letterboxToggle');
  if (letterboxToggle) letterboxToggle.classList.toggle('active', state.letterbox);
  document.querySelectorAll('.sticker-toggle').forEach(function (btn) {
    btn.checked = state.stickers.some(function (s) { return s && s.kind === btn.dataset.sticker; });
  });
}

function applyStoryPreset(key) {
  if (!STORY_PRESETS[key]) return;
  const next = applyPreset(getScene(), key);
  next.preset = key;
  setScene(next);
}

function shuffleStory() {
  const keys = Object.keys(STORY_PRESETS);
  const captions = ['SUNSET HEIST', 'NEON NIGHTS', 'OCEAN DRIVE', 'MIDNIGHT RUN', 'PALM DREAMS', 'VICE CITY'];
  const key = keys[Math.floor(Math.random() * keys.length)];
  applyStoryPreset(key);
  state.title = captions[Math.floor(Math.random() * captions.length)];
  render();
}

function toggleSticker(kind, on) {
  if (on) {
    const spot = STICKER_SPOTS[kind];
    const has = state.stickers.some(function (s) { return s && s.kind === kind; });
    if (spot && !has) state.stickers.push({ kind: kind, x: spot.x, y: spot.y, size: spot.size });
  } else {
    state.stickers = state.stickers.filter(function (s) { return !s || s.kind !== kind; });
  }
  render();
}

function render() {
  const canvas = document.getElementById('preview');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  renderCover(ctx, sceneForRender(), canvas.width, canvas.height);
  syncControls();
}

function addPhoto(img) {
  state.photos.push({ img: img, panX: 0, panY: 0, zoom: 1 });
  while (state.photos.length > MAX_PHOTOS) state.photos.shift();
  render();
}

function readFile(file) {
  return new Promise(function (resolve) {
    const reader = new FileReader();
    reader.onload = function () {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = reader.result;
    };
    reader.onerror = function () { resolve(null); };
    reader.readAsDataURL(file);
  });
}

function ingestFiles(files) {
  if (!files || !files.length) return;
  const list = Array.prototype.slice.call(files).filter(function (f) {
    return f && f.type && f.type.indexOf('image/') === 0;
  });
  if (!list.length) return;
  list.forEach(function (file) {
    readFile(file).then(function (img) {
      if (img) addPhoto(img);
    });
  });
}

function loadSample(name) {
  return new Promise(function (resolve) {
    const img = new Image();
    img.onload = function () {
      state.photos = [{ img: img, panX: 0, panY: 0, zoom: 1 }];
      render();
      resolve(img);
    };
    img.onerror = function () {
      state.photos = [];
      render();
      resolve(null);
    };
    img.src = './samples/' + name + '.jpg';
  });
}

const EXPORT_SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  wide: [1920, 1080]
};

function exportCover(size) {
  const dims = EXPORT_SIZES[size];
  if (!dims) return;
  const W = dims[0];
  const H = dims[1];
  const off = document.createElement('canvas');
  off.width = W;
  off.height = H;
  const offCtx = off.getContext('2d');
  if (!offCtx) return;
  renderCover(offCtx, getScene(), W, H);
  off.toBlob(function (blob) {
    if (!blob) return;
    const link = document.getElementById('downloadLink');
    if (link) {
      link.href = URL.createObjectURL(blob);
      link.download = 'vice-sunset-cover-' + size + '.png';
      link.click();
    }
    const hint = document.querySelector('.hint');
    if (hint) {
      hint.textContent = 'Exported ' + W + '\u00d7' + H + ' PNG \u2014 check your downloads.';
    }
  }, 'image/png');
}

function setActive(selector, node) {
  const all = document.querySelectorAll(selector);
  Array.prototype.forEach.call(all, function (el) {
    el.classList.remove('active');
  });
  if (node) node.classList.add('active');
}

function panelAt(x, y) {
  const panels = LAYOUTS[state.layout] || LAYOUTS.trio;
  for (let i = 0; i < panels.length; i += 1) {
    const p = panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}

const drag = {
  active: false,
  index: -1,
  startX: 0,
  startY: 0,
  panX: 0,
  panY: 0,
  w: 1,
  h: 1
};

function pointerPos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  const nx = rect.width ? (evt.clientX - rect.left) / rect.width : 0;
  const ny = rect.height ? (evt.clientY - rect.top) / rect.height : 0;
  return { nx: nx, ny: ny };
}

function onPointerDown(evt) {
  const canvas = evt.currentTarget;
  const pos = pointerPos(canvas, evt);
  const index = panelAt(pos.nx, pos.ny);
  if (index < 0) return;
  const entry = state.photos[index];
  if (!entry) return;
  const panels = LAYOUTS[state.layout] || LAYOUTS.trio;
  const panel = panels[index];
  drag.active = true;
  drag.index = index;
  drag.startX = pos.nx;
  drag.startY = pos.ny;
  drag.panX = entry.panX;
  drag.panY = entry.panY;
  drag.w = panel.w;
  drag.h = panel.h;
  if (canvas.setPointerCapture) {
    try { canvas.setPointerCapture(evt.pointerId); } catch (e) { /* ignore */ }
  }
}

function onPointerMove(evt) {
  if (!drag.active) return;
  const canvas = evt.currentTarget;
  const pos = pointerPos(canvas, evt);
  const entry = state.photos[drag.index];
  if (!entry) { drag.active = false; return; }
  const dx = pos.nx - drag.startX;
  const dy = pos.ny - drag.startY;
  let panX = drag.panX + (dx / drag.w) * 2;
  let panY = drag.panY + (dy / drag.h) * 2;
  panX = Math.max(-1, Math.min(1, panX));
  panY = Math.max(-1, Math.min(1, panY));
  entry.panX = panX;
  entry.panY = panY;
  render();
}

function onPointerUp(evt) {
  if (!drag.active) return;
  drag.active = false;
  drag.index = -1;
  const canvas = evt.currentTarget;
  if (canvas.releasePointerCapture) {
    try { canvas.releasePointerCapture(evt.pointerId); } catch (e) { /* ignore */ }
  }
}

function init() {
  const photoInput = document.getElementById('photoInput');
  if (photoInput) {
    photoInput.addEventListener('change', function () {
      ingestFiles(photoInput.files);
      photoInput.value = '';
    });
  }

  const canvas = document.getElementById('preview');
  if (canvas) {
    canvas.addEventListener('dragover', function (evt) { evt.preventDefault(); });
    canvas.addEventListener('drop', function (evt) {
      evt.preventDefault();
      if (evt.dataTransfer) ingestFiles(evt.dataTransfer.files);
    });
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
  }

  document.querySelectorAll('.sample').forEach(function (btn) {
    btn.addEventListener('click', function () { loadSample(btn.dataset.sample); });
  });

  document.querySelectorAll('.layout-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.layout = btn.dataset.layout;
      setActive('.layout-btn', btn);
      render();
    });
  });

  document.querySelectorAll('.grade-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.grade = btn.dataset.grade;
      setActive('.grade-btn', btn);
      render();
    });
  });

  const titleInput = document.getElementById('titleInput');
  if (titleInput) {
    titleInput.addEventListener('input', function () {
      state.title = titleInput.value;
      render();
    });
  }

  const subtitleInput = document.getElementById('subtitleInput');
  if (subtitleInput) {
    subtitleInput.addEventListener('input', function () {
      state.subtitle = subtitleInput.value;
      render();
    });
  }

  document.querySelectorAll('.preset-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { applyStoryPreset(btn.dataset.preset); });
  });

  [['taglineInput', 'tagline'], ['starringInput', 'starring'], ['storyInput', 'story'], ['bubbleInput', 'bubble']].forEach(function (pair) {
    const el = document.getElementById(pair[0]);
    if (el) el.addEventListener('input', function () { state[pair[1]] = el.value; render(); });
  });

  const letterboxToggle = document.getElementById('letterboxToggle');
  if (letterboxToggle) {
    letterboxToggle.addEventListener('click', function () { state.letterbox = !state.letterbox; render(); });
  }

  document.querySelectorAll('.sticker-toggle').forEach(function (btn) {
    btn.addEventListener('change', function () { toggleSticker(btn.dataset.sticker, btn.checked); });
  });

  const shuffleBtn = document.getElementById('shuffleBtn');
  if (shuffleBtn) shuffleBtn.addEventListener('click', function () { shuffleStory(); });

  const zoomSlider = document.getElementById('zoomSlider');
  if (zoomSlider) {
    zoomSlider.addEventListener('input', function () {
      state.zoom = parseFloat(zoomSlider.value);
      if (state.photos[0]) state.photos[0].zoom = state.zoom;
      render();
    });
  }

  const fitFillToggle = document.getElementById('fitFillToggle');
  if (fitFillToggle) {
    fitFillToggle.textContent = state.fitFill === 'fill' ? 'Fill' : 'Fit';
    fitFillToggle.addEventListener('click', function () {
      state.fitFill = state.fitFill === 'fill' ? 'fit' : 'fill';
      fitFillToggle.textContent = state.fitFill === 'fill' ? 'Fill' : 'Fit';
      render();
    });
  }

  const exportSquare = document.getElementById('exportSquare');
  if (exportSquare) exportSquare.addEventListener('click', function () { exportCover('square'); });
  const exportPortrait = document.getElementById('exportPortrait');
  if (exportPortrait) exportPortrait.addEventListener('click', function () { exportCover('portrait'); });
  const exportWide = document.getElementById('exportWide');
  if (exportWide) exportWide.addEventListener('click', function () { exportCover('wide'); });

  const trioBtn = document.querySelector('.layout-btn[data-layout="trio"]');
  if (trioBtn) setActive('.layout-btn', trioBtn);
  const sunsetBtn = document.querySelector('.grade-btn[data-grade="sunset"]');
  if (sunsetBtn) setActive('.grade-btn', sunsetBtn);

  if (!new URLSearchParams(location.search).has('shot')) {
    loadSample('pier');
  }

  stageShot({ getScene: getScene, setScene: setScene, render: render, loadSample: loadSample, exportCover: exportCover });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

export { getScene, setScene, render, loadSample, exportCover };
