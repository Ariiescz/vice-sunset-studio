// Vice Sunset Studio - offline GTA 6-style cover art render engine.
// Pure canvas drawing helpers; no network, no libraries, system fonts only.

export const LAYOUTS = {
  trio: [
    { x: 0, y: 0, w: 0.333, h: 0.78 },
    { x: 0.333, y: 0, w: 0.334, h: 0.78 },
    { x: 0.667, y: 0, w: 0.333, h: 0.78 }
  ],
  duo: [
    { x: 0, y: 0, w: 0.62, h: 0.78 },
    { x: 0.62, y: 0, w: 0.38, h: 0.78 }
  ],
  solo: [{ x: 0, y: 0, w: 1, h: 0.78 }],
  quad: [
    { x: 0, y: 0, w: 0.5, h: 0.39 },
    { x: 0.5, y: 0, w: 0.5, h: 0.39 },
    { x: 0, y: 0.39, w: 0.5, h: 0.39 },
    { x: 0.5, y: 0.39, w: 0.5, h: 0.39 }
  ],
  // Three-act story montage: one tall Act I panel on the left, two stacked Acts II and III on the right.
  story: [
    { x: 0, y: 0, w: 0.5, h: 0.78 },
    { x: 0.5, y: 0, w: 0.5, h: 0.39 },
    { x: 0.5, y: 0.39, w: 0.5, h: 0.39 }
  ]
};

export const GRADES = {
  sunset: {
    filter: 'saturate(1.25) contrast(1.05) brightness(1.02)',
    stops: [
      [0, 'rgba(255,122,24,0.20)'],
      [1, 'rgba(255,46,136,0.28)']
    ],
    blend: 'soft-light',
    alpha: 0.85,
    glow: { x: 0.5, y: 0.2, color: 'rgba(255,190,80,0.25)' }
  },
  neon: {
    filter: 'saturate(1.4) contrast(1.12)',
    stops: [
      [0, 'rgba(255,0,128,0.22)'],
      [1, 'rgba(0,229,255,0.22)']
    ],
    blend: 'overlay',
    alpha: 0.9,
    glow: { x: 0.5, y: 0.15, color: 'rgba(255,0,160,0.22)' }
  },
  golden: {
    filter: 'sepia(0.25) saturate(1.3) contrast(1.05)',
    stops: [
      [0, 'rgba(255,190,60,0.18)'],
      [1, 'rgba(255,140,40,0.12)']
    ],
    blend: 'soft-light',
    alpha: 0.8,
    glow: null
  },
  noir: {
    filter: 'grayscale(1) contrast(1.25) brightness(1.05)',
    stops: [],
    blend: 'soft-light',
    alpha: 0,
    glow: null
  },
  // Comic Ink: high-contrast print look; halftone dots are drawn by applyGradeOverlay.
  comic: {
    filter: 'contrast(1.6) saturate(1.8) brightness(1.05)',
    stops: [],
    blend: 'soft-light',
    alpha: 0,
    glow: null,
    halftone: true
  }
};

export const STORY_PRESETS = {
  heist: {
    grade: 'golden',
    layout: 'trio',
    tagline: 'ONE LAST JOB',
    titleStyle: 'gold',
    stickers: ['money', 'car']
  },
  neon: {
    grade: 'neon',
    layout: 'quad',
    tagline: 'ALL NIGHT LONG',
    titleStyle: 'neon',
    stickers: ['palm', 'cocktail', 'sign']
  },
  getaway: {
    grade: 'sunset',
    layout: 'duo',
    tagline: 'NO TURNING BACK',
    titleStyle: 'chase',
    stickers: ['police', 'road', 'sun']
  }
};

// Default placement for sticker kinds when a preset only names the kind.
// x/y are fractions of W/H; size is a fraction of min(W, H).
export const STICKER_DEFAULTS = {
  palm: { x: 0.08, y: 0.14, size: 0.13 },
  flamingo: { x: 0.9, y: 0.2, size: 0.11 },
  sunglasses: { x: 0.5, y: 0.1, size: 0.1 },
  money: { x: 0.85, y: 0.6, size: 0.11 },
  police: { x: 0.12, y: 0.62, size: 0.12 },
  car: { x: 0.8, y: 0.62, size: 0.14 },
  sun: { x: 0.88, y: 0.1, size: 0.11 },
  cocktail: { x: 0.12, y: 0.3, size: 0.1 },
  sign: { x: 0.84, y: 0.72, size: 0.12 }
};

// Re-theme a whole cover: returns a NEW scene with the preset applied (never mutates input).
export function applyPreset(scene, presetKey) {
  const base = scene || {};
  const next = Object.assign({}, base);
  const preset = STORY_PRESETS[presetKey];
  if (!preset) return next;
  next.grade = preset.grade;
  next.layout = preset.layout;
  next.tagline = preset.tagline;
  next.titleStyle = preset.titleStyle;
  next.stickers = (preset.stickers || []).reduce(function (list, entry) {
    if (entry && typeof entry === 'object' && entry.kind) { list.push(entry); return list; }
    const spot = STICKER_DEFAULTS[entry];
    if (spot) list.push({ kind: entry, x: spot.x, y: spot.y, size: spot.size });
    return list;
  }, []);
  return next;
}

// Deterministic PRNG (mulberry32). Returns a function yielding values in [0,1).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Module-level cache for the deterministic grain tile.
let grainTile = null;

function getGrainTile() {
  if (grainTile) return grainTile;
  if (typeof document === 'undefined') return null;
  const tile = document.createElement('canvas');
  tile.width = 128;
  tile.height = 128;
  const tctx = tile.getContext('2d');
  const image = tctx.createImageData(128, 128);
  const rand = mulberry32(1337);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.floor(rand() * 256);
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  tctx.putImageData(image, 0, 0);
  grainTile = tile;
  return grainTile;
}

function drawPlaceholder(ctx, rect) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  grad.addColorStop(0, '#1a1a24');
  grad.addColorStop(1, '#08080c');
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '600 ' + Math.max(10, Math.round(Math.min(rect.w, rect.h) * 0.09)) + 'px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ADD PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.restore();
}

// Cover-fit an image into a pixel rect, honoring pan (-1..1) and zoom (>=1).
export function drawPhotoCover(ctx, img, rect, panX, panY, zoom) {
  const px = Number.isFinite(panX) ? panX : 0;
  const py = Number.isFinite(panY) ? panY : 0;
  const z = Number.isFinite(zoom) && zoom >= 1 ? zoom : 1;

  if (!img || !img.naturalWidth || !img.naturalHeight) {
    drawPlaceholder(ctx, rect);
    return;
  }

  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * z;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + px * Math.max(0, (dw - rect.w) / 2);
  const dy = rect.y + (rect.h - dh) / 2 + py * Math.max(0, (dh - rect.h) / 2);

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// Apply the grade overlay: gradient tint, optional glow, vignette and grain.
export function applyGradeOverlay(ctx, grade, W, H) {
  const g = typeof grade === 'string' ? GRADES[grade] : grade;
  const stops = (g && g.stops) || [];

  if (stops.length) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    for (const s of stops) grad.addColorStop(s[0], s[1]);
    ctx.save();
    ctx.globalCompositeOperation = g.blend || 'soft-light';
    ctx.globalAlpha = typeof g.alpha === 'number' ? g.alpha : 1;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  if (g && g.glow) {
    const gx = g.glow.x * W;
    const gy = g.glow.y * H;
    const rad = Math.max(W, H) * 0.6;
    const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad);
    rg.addColorStop(0, g.glow.color);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Vignette.
  const vg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.5);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(0.55, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Deterministic grain.
  const tile = getGrainTile();
  if (tile) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.globalCompositeOperation = 'overlay';
    const pattern = ctx.createPattern(tile, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  // Comic Ink halftone: deterministic grid of dark dots (checkerboard offset).
  if (g && g.halftone) {
    const spacing = 7 * (W / 1080);
    const band = spacing * (Math.sqrt(3) / 2);
    const rand = mulberry32(2026);
    const s = W / 1080;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const rows = Math.ceil(H / band) + 1;
    const cols = Math.ceil(W / spacing) + 1;
    for (let r = 0; r < rows; r++) {
      const cy = r * band;
      const xOff = (r % 2) * (spacing / 2);
      for (let c = 0; c < cols; c++) {
        const cx = c * spacing + xOff;
        const rnd = 0.5 + rand() * 1.3;
        ctx.beginPath();
        ctx.arc(cx, cy, rnd * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

// Title band with bold lettering and an orange subtitle.
export function drawTitleBlock(ctx, title, subtitle, W, H, opts = {}) {
  const bandY = 0.78 * H;
  ctx.save();
  ctx.fillStyle = 'rgba(10,10,16,0.82)';
  ctx.fillRect(0, bandY, W, H - bandY);
  ctx.restore();

  const family = '"Arial Black", "Impact", "Helvetica Neue", sans-serif';
  const text = (title && String(title).trim()) ? title : 'VICE SUNSET';

  const hasTagline = !!(opts.tagline && String(opts.tagline).trim());

  ctx.save();
  ctx.translate(W / 2, 0.885 * H);
  ctx.rotate(-0.035);
  try { ctx.letterSpacing = '2px'; } catch (e) { /* unsupported */ }
  const titleSize = Math.round(H * (hasTagline ? 0.13 : 0.16));
  ctx.font = 'bold ' + titleSize + 'px ' + family;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, H * 0.012);
  ctx.strokeStyle = 'rgba(8,8,12,0.9)';
  const chase = opts.titleStyle === 'chase';
  ctx.shadowColor = opts.titleStyle === 'neon' ? '#ff00a0' : 'black';
  ctx.shadowBlur = opts.titleStyle === 'neon' ? H * 0.03 : 0;
  ctx.shadowOffsetY = opts.titleStyle === 'neon' ? 0 : H * 0.008;
  // Auto-fit: shrink oversized titles so they stay inside the cover width.
  const fitWidth = ctx.measureText(text).width;
  if (fitWidth > 0.94 * W) {
    const fitted = Math.floor(titleSize * (0.94 * W / fitWidth));
    ctx.font = 'bold ' + fitted + 'px ' + family;
  }
  if (chase) { ctx.save(); ctx.transform(1, 0, -0.12, 1, 0, 0); }
  ctx.strokeText(text, 0, 0);
  if (opts.titleStyle === 'gold') {
    const grad = ctx.createLinearGradient(0, 0.78 * H, 0, H);
    grad.addColorStop(0, '#ffe259');
    grad.addColorStop(0.5, '#ff7e1f');
    grad.addColorStop(1, '#ff2e88');
    ctx.fillStyle = grad;
  } else if (opts.titleStyle === 'neon') {
    const grad = ctx.createLinearGradient(0, 0.78 * H, 0, H);
    grad.addColorStop(0, '#ff5df2');
    grad.addColorStop(1, '#00e5ff');
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = '#ffffff';
  }
  ctx.fillText(text, 0, 0);
  if (chase) { ctx.restore(); }
  if (chase) {
    ctx.save();
    ctx.fillStyle = '#ff2e2e';
    ctx.fillRect(W * 0.2, 0.935 * H, W * 0.6, H * 0.012);
    ctx.restore();
  }
  ctx.restore();

  if (hasTagline) {
    const tagline = String(opts.tagline).toUpperCase();
    ctx.save();
    ctx.font = 'bold ' + Math.round(H * 0.026) + 'px ' + family;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(tagline).width;
    const pw = tw + H * 0.03, ph = H * 0.045, cx = W / 2, cy = 0.80 * H;
    ctx.fillStyle = 'rgba(8,8,12,0.85)';
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, ph / 2);
      ctx.fill();
    } else {
      ctx.fillRect(cx - pw / 2, cy - ph / 2, pw, ph);
    }
    ctx.fillStyle = '#ffd166';
    try { ctx.letterSpacing = '2px'; } catch (e) { /* unsupported */ }
    ctx.fillText(tagline, cx, cy);
    ctx.restore();
  }

  if (subtitle && String(subtitle).trim()) {
    ctx.save();
    try { ctx.letterSpacing = '4px'; } catch (e) { /* unsupported */ }
    ctx.font = Math.round(H * 0.032) + 'px ' + family;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffb347';
    ctx.fillText(String(subtitle).toUpperCase(), W / 2, 0.955 * H);
    ctx.restore();
  }

  if (opts.starring && String(opts.starring).trim() && subtitle && String(subtitle).trim()) {
    ctx.save();
    ctx.font = Math.round(H * 0.024) + 'px ' + family;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd166';
    ctx.fillText('STARRING ' + String(opts.starring).toUpperCase(), W / 2, 0.985 * H);
    ctx.restore();
  }
}

export function drawSticker(ctx, kind, x, y, size) {
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
  const dark = '#0d0d12';
  if (kind === 'palm') {
    ctx.strokeStyle = ctx.fillStyle = '#101018';
    ctx.lineWidth = size * 0.06;
    ctx.beginPath(); ctx.moveTo(0, size * 0.45);
    ctx.quadraticCurveTo(-size * 0.12, size * 0.05, size * 0.05, -size * 0.35);
    ctx.stroke();
    ctx.lineWidth = size * 0.045;
    const tx = size * 0.05, ty = -size * 0.35;
    for (const d of [-160, -120, -90, -60, -20]) {
      const a = d * Math.PI / 180;
      ctx.beginPath(); ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + Math.cos(a) * size * 0.22, ty + Math.sin(a) * size * 0.32 + size * 0.08, tx + Math.cos(a) * size * 0.45, ty + Math.sin(a) * size * 0.45);
      ctx.stroke();
    }
  } else if (kind === 'flamingo') {
    ctx.strokeStyle = ctx.fillStyle = '#ff6fa5';
    ctx.beginPath(); ctx.ellipse(0, size * 0.08, size * 0.28, size * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = size * 0.07;
    ctx.beginPath(); ctx.moveTo(size * 0.06, size * 0.02);
    ctx.bezierCurveTo(-size * 0.12, -size * 0.12, size * 0.22, -size * 0.2, size * 0.15, -size * 0.35);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(size * 0.15, -size * 0.35, size * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(size * 0.21, -size * 0.37); ctx.lineTo(size * 0.34, -size * 0.33); ctx.lineTo(size * 0.21, -size * 0.31); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = size * 0.025;
    ctx.beginPath(); ctx.moveTo(-size * 0.05, size * 0.22); ctx.lineTo(0, size * 0.45); ctx.stroke();
  } else if (kind === 'sunglasses') {
    ctx.fillStyle = dark;
    const w = size * 0.36, h = size * 0.26, r = size * 0.08;
    const lens = (cx) => {
      ctx.beginPath(); ctx.moveTo(cx - w / 2 + r, -h / 2);
      ctx.arcTo(cx + w / 2, -h / 2, cx + w / 2, h / 2, r);
      ctx.arcTo(cx + w / 2, h / 2, cx - w / 2, h / 2, r);
      ctx.arcTo(cx - w / 2, h / 2, cx - w / 2, -h / 2, r);
      ctx.arcTo(cx - w / 2, -h / 2, cx + w / 2, -h / 2, r);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = size * 0.012;
      ctx.beginPath(); ctx.moveTo(cx - w * 0.25, h * 0.22); ctx.lineTo(cx + w * 0.1, -h * 0.22); ctx.stroke();
    };
    lens(-size * 0.22); lens(size * 0.22);
    ctx.strokeStyle = dark; ctx.lineWidth = size * 0.03;
    ctx.beginPath(); ctx.moveTo(-size * 0.06, -size * 0.05); ctx.lineTo(size * 0.06, -size * 0.05); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.4, -size * 0.02); ctx.lineTo(-size * 0.5, -size * 0.1);
    ctx.moveTo(size * 0.4, -size * 0.02); ctx.lineTo(size * 0.5, -size * 0.1); ctx.stroke();
  } else if (kind === 'money') {
    ctx.fillStyle = '#2fae5f';
    ctx.beginPath(); ctx.arc(0, size * 0.08, size * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-size * 0.1, -size * 0.22); ctx.lineTo(0, -size * 0.06); ctx.lineTo(-size * 0.02, -size * 0.3); ctx.closePath();
    ctx.moveTo(size * 0.1, -size * 0.22); ctx.lineTo(0, -size * 0.06); ctx.lineTo(size * 0.02, -size * 0.3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold ' + size * 0.42 + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, size * 0.08);
  } else if (kind === 'sun') {
    ctx.fillStyle = ctx.strokeStyle = '#ffb347';
    ctx.beginPath(); ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = size * 0.05;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * size * 0.34, Math.sin(a) * size * 0.34);
      ctx.lineTo(Math.cos(a) * size * 0.48, Math.sin(a) * size * 0.48);
      ctx.stroke();
    }
  } else if (kind === 'police') {
    const w = size * 0.9, h = size * 0.32, r = h * 0.35;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-w / 2 + r, -h / 2);
    ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
    ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
    ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
    ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);
    ctx.closePath(); ctx.clip();
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = size * 0.15;
    ctx.fillStyle = '#ff2e2e'; ctx.fillRect(-w / 2, -h / 2, w / 2, h);
    ctx.fillStyle = '#2e7dff'; ctx.fillRect(0, -h / 2, w / 2, h);
    ctx.restore();
  } else if (kind === 'car') {
    ctx.fillStyle = '#101018';
    ctx.beginPath();
    ctx.moveTo(-size * 0.45, size * 0.1);
    ctx.quadraticCurveTo(-size * 0.4, -size * 0.02, -size * 0.2, -size * 0.02);
    ctx.quadraticCurveTo(-size * 0.05, -size * 0.26, size * 0.08, -size * 0.24);
    ctx.quadraticCurveTo(size * 0.3, -size * 0.02, size * 0.45, size * 0.02);
    ctx.lineTo(size * 0.45, size * 0.1);
    ctx.closePath(); ctx.fill();
    for (const wx of [-size * 0.25, size * 0.25]) {
      ctx.fillStyle = '#101018';
      ctx.beginPath(); ctx.arc(wx, size * 0.12, size * 0.11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a8a96';
      ctx.beginPath(); ctx.arc(wx, size * 0.12, size * 0.04, 0, Math.PI * 2); ctx.fill();
    }
  } else if (kind === 'cocktail') {
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = size * 0.04;
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, -size * 0.3); ctx.lineTo(size * 0.3, -size * 0.3); ctx.lineTo(0, size * 0.05);
    ctx.closePath(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, size * 0.05); ctx.lineTo(0, size * 0.35);
    ctx.moveTo(-size * 0.15, size * 0.35); ctx.lineTo(size * 0.15, size * 0.35);
    ctx.stroke();
    ctx.strokeStyle = '#ff6fa5';
    ctx.beginPath(); ctx.moveTo(size * 0.1, -size * 0.25); ctx.lineTo(size * 0.28, -size * 0.45); ctx.stroke();
    ctx.fillStyle = '#7fb069';
    ctx.beginPath(); ctx.arc(size * 0.05, -size * 0.15, size * 0.05, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'sign') {
    const w = size * 0.8, h = size * 0.5, r = size * 0.1;
    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = size * 0.12;
    ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = size * 0.05;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + r, -h / 2);
    ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
    ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
    ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
    ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);
    ctx.closePath(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffe259';
    ctx.beginPath();
    ctx.moveTo(-size * 0.05, -size * 0.18);
    ctx.lineTo(size * 0.12, -size * 0.18);
    ctx.lineTo(0, size * 0.02);
    ctx.lineTo(size * 0.1, size * 0.02);
    ctx.lineTo(-size * 0.1, size * 0.2);
    ctx.lineTo(size * 0.0, size * 0.0);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// Render a full cover for a scene onto a W x H canvas context.
export function renderCover(ctx, scene, W, H) {
  const s = scene || {};
  const panels = LAYOUTS[s.layout] || LAYOUTS.trio;

  ctx.save();
  ctx.fillStyle = '#0d0d12';
  ctx.fillRect(0, 0, W, H);

  const grade = typeof s.grade === 'string' ? GRADES[s.grade] : s.grade;
  ctx.filter = (grade && grade.filter) || 'none';

  const gutter = 0.008 * Math.min(W, H);
  const photos = Array.isArray(s.photos) ? s.photos : [];

  panels.forEach(function (panel, i) {
    const rect = {
      x: panel.x * W + gutter / 2,
      y: panel.y * H + gutter / 2,
      w: panel.w * W - gutter,
      h: panel.h * H - gutter
    };
    let entry = null;
    if (photos.length) {
      entry = photos[i % photos.length];
    }
    let img = null;
    let panX = 0;
    let panY = 0;
    let zoom = 1;
    if (entry) {
      const isImgEl = typeof HTMLImageElement !== 'undefined' && entry instanceof HTMLImageElement;
      if (entry.naturalWidth || entry.tagName === 'IMG' || isImgEl) {
        img = entry;
      } else {
        img = entry.img || null;
        panX = entry.panX || 0;
        panY = entry.panY || 0;
        zoom = entry.zoom || 1;
      }
    }
    drawPhotoCover(ctx, img, rect, panX, panY, zoom);
  });

  ctx.filter = 'none';

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2;
  panels.forEach(function (panel, i) {
    const rect = {
      x: panel.x * W + gutter / 2,
      y: panel.y * H + gutter / 2,
      w: panel.w * W - gutter,
      h: panel.h * H - gutter
    };
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
  ctx.restore();

  if (s.layout === 'story') {
    ctx.save();
    panels.forEach(function (panel, i) {
      const side = H * 0.045, bx = panel.x * W + gutter * 1.5, by = panel.y * H + gutter * 1.5;
      ctx.fillStyle = 'rgba(8,8,12,0.85)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(bx, by, side, side, side * 0.22);
      else ctx.rect(bx, by, side, side);
      ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + Math.round(H * 0.026) + 'px "Arial Black", sans-serif';
      ctx.fillText(String(i + 1).padStart(2, '0'), bx + side / 2, by + side / 2);
    });
    if (typeof s.story === 'string' && s.story.trim()) {
      const sy = 0.74 * H, sh = 0.04 * H;
      ctx.fillStyle = 'rgba(8,8,12,0.8)'; ctx.fillRect(0, sy, W, sh);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'italic ' + Math.round(H * 0.022) + 'px "Helvetica Neue", sans-serif';
      try { ctx.letterSpacing = '3px'; } catch (e) { /* unsupported */ }
      ctx.fillText(s.story, W / 2, sy + sh / 2);
      try { ctx.letterSpacing = '0px'; } catch (e) { /* unsupported */ }
    }
    ctx.restore();
  }

  applyGradeOverlay(ctx, s.grade, W, H);
  if (Array.isArray(s.stickers) && s.stickers.length) {
    s.stickers.forEach(function (st) {
      if (!st || !st.kind) return;
      drawSticker(ctx, st.kind, st.x * W, st.y * H, (st.size || 0.09) * Math.min(W, H));
    });
  }
  if (s.letterbox === true) {
    ctx.save(); ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, 0.06 * H); ctx.fillRect(0, 0.72 * H, W, 0.06 * H);
    ctx.restore();
  }
  if (typeof s.bubble === 'string' && s.bubble.trim()) {
    const fp = panels[0], px = fp.x * W + gutter / 2, pw = fp.w * W - gutter;
    const bw = 0.8 * pw, bh = H * 0.09;
    const bx = Math.max(px, Math.min(px + 0.1 * pw, px + pw - bw));
    const by = Math.max(fp.y * H, 0.62 * H - bh / 2);
    ctx.save(); ctx.fillStyle = '#fff'; ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(bx, by, bw, bh, H * 0.018);
    else ctx.rect(bx, by, bw, bh);
    ctx.fill(); ctx.beginPath();
    ctx.moveTo(bx + bw * 0.18, by + bh); ctx.lineTo(bx + bw * 0.1, by + bh + H * 0.03); ctx.lineTo(bx + bw * 0.34, by + bh);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(H * 0.022) + 'px "Helvetica Neue", sans-serif';
    const words = String(s.bubble).split(/\s+/).filter(Boolean);
    let l1 = '', l2 = '';
    for (let wi = 0; wi < words.length; wi++) {
      const cand = l1 ? l1 + ' ' + words[wi] : words[wi];
      if (!l2 && ctx.measureText(cand).width <= bw * 0.9) l1 = cand; else if (l2) l2 += ' ' + words[wi]; else l2 = words[wi];
    }
    let t2 = l2; while (t2 && ctx.measureText(t2).width > bw * 0.9) t2 = t2.slice(0, -1);
    if (l2 && t2 !== l2) t2 = t2.replace(/\s+$/, '') + '\u2026';
    const cx = bx + bw / 2;
    if (t2) { ctx.fillText(l1, cx, by + bh * 0.32); ctx.fillText(t2, cx, by + bh * 0.68); }
    else ctx.fillText(l1, cx, by + bh / 2);
    ctx.restore();
  }
  drawTitleBlock(ctx, s.title, s.subtitle, W, H, { titleStyle: s.titleStyle, tagline: s.tagline, starring: s.starring });
  ctx.restore();
}
