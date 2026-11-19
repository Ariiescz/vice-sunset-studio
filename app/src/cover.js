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
  }
};

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
}

// Title band with bold lettering and an orange subtitle.
export function drawTitleBlock(ctx, title, subtitle, W, H) {
  const bandY = 0.78 * H;
  ctx.save();
  ctx.fillStyle = 'rgba(10,10,16,0.82)';
  ctx.fillRect(0, bandY, W, H - bandY);
  ctx.restore();

  const family = '"Arial Black", "Impact", "Helvetica Neue", sans-serif';
  const text = (title && String(title).trim()) ? title : 'VICE SUNSET';

  ctx.save();
  ctx.translate(W / 2, 0.885 * H);
  ctx.rotate(-0.035);
  try { ctx.letterSpacing = '2px'; } catch (e) { /* unsupported */ }
  ctx.font = 'bold ' + Math.round(H * 0.11) + 'px ' + family;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, H * 0.008);
  ctx.strokeStyle = 'rgba(8,8,12,0.9)';
  ctx.shadowColor = 'black';
  ctx.shadowBlur = H * 0.02;
  ctx.shadowOffsetY = H * 0.004;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 0, 0);
  ctx.restore();

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

  applyGradeOverlay(ctx, s.grade, W, H);
  drawTitleBlock(ctx, s.title, s.subtitle, W, H);
  ctx.restore();
}
