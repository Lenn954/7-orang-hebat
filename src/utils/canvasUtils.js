/**
 * canvasUtils.js
 * Utility functions for canvas operations: exporting edited photos with frames, stickers, and text.
 * Supports multi-photo layouts (single, strip, grid).
 */

/**
 * Combine photos from multiple people into a single composite image.
 * 2 people = side by side, 3-4 = 2x2 grid, 5+ = flexible grid.
 * Returns a data URL of the composite.
 * @param {string[]} photoSrcs - Array of data URL strings (one per person)
 * @returns {Promise<string>} Data URL of composite image
 */
export async function combinePhotosToComposite(photoSrcs) {
  if (photoSrcs.length === 0) throw new Error('No photos to combine');
  if (photoSrcs.length === 1) return photoSrcs[0];

  const images = await loadAllImages(photoSrcs);
  const count = images.length;

  // Layout: determine columns and rows
  let cols, rows;
  if (count === 2) { cols = 2; rows = 1; }
  else if (count <= 4) { cols = 2; rows = 2; }
  else if (count <= 6) { cols = 3; rows = 2; }
  else { cols = 3; rows = Math.ceil(count / 3); }

  const cellWidth = 600;
  const cellHeight = 450;
  const gap = 6;
  const padding = 12;
  const canvasW = padding * 2 + cols * cellWidth + (cols - 1) * gap;
  const canvasH = padding * 2 + rows * cellHeight + (rows - 1) * gap;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasW, canvasH);

  images.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = padding + col * (cellWidth + gap);
    const y = padding + row * (cellHeight + gap);

    // Crop to fill cell (center-crop)
    const imgAspect = img.width / img.height;
    const cellAspect = cellWidth / cellHeight;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (imgAspect > cellAspect) {
      sw = img.height * cellAspect;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / cellAspect;
      sy = (img.height - sh) / 2;
    }

    // Rounded corners via clipping
    ctx.save();
    roundedRect(ctx, x, y, cellWidth, cellHeight, 12);
    ctx.clip();
    ctx.drawImage(img, sx, sy, sw, sh, x, y, cellWidth, cellHeight);
    ctx.restore();
  });

  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Helper: draw a rounded rectangle path
 */
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Render the final edited photo to a canvas and return as a blob.
 */
export async function renderEditedPhoto({
  imageSrc,
  allPhotos = [],
  layout = 'single',
  filter = 'none',
  frame = null,
  stickers = [],
  texts = [],
  canvasWidth = 800,
  canvasHeight = 800,
}) {
  const photos = allPhotos.length > 0 ? allPhotos : [imageSrc];

  if (layout === 'strip' && photos.length > 1) {
    return renderPhotoStrip({ photos, filter, frame, stickers, texts, canvasWidth, canvasHeight });
  }
  if (layout === 'grid' && photos.length > 1) {
    return renderPhotoGrid({ photos, filter, frame, stickers, texts, canvasWidth, canvasHeight });
  }

  // Single photo
  return renderSinglePhoto({ imageSrc: photos[0], filter, frame, stickers, texts, canvasWidth, canvasHeight });
}

/**
 * Render a single photo
 */
function renderSinglePhoto({ imageSrc, filter, frame, stickers, texts, canvasWidth, canvasHeight }) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const exportSize = 1200;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = exportSize;
      canvas.height = exportSize;

      const scale = exportSize / canvasWidth;

      ctx.filter = mapFilter(filter);
      ctx.fillStyle = '#FDFBF7';
      ctx.fillRect(0, 0, exportSize, exportSize);

      const padding = frame ? getFramePadding(frame.type, exportSize) : 0;
      const imgSize = Math.min(img.width, img.height);
      const sx = (img.width - imgSize) / 2;
      const sy = (img.height - imgSize) / 2;

      ctx.drawImage(img, sx, sy, imgSize, imgSize, padding, padding, exportSize - padding * 2, exportSize - padding * 2);
      ctx.filter = 'none';

      if (frame) drawFrame(ctx, frame, exportSize);
      drawStickers(ctx, stickers, scale);
      drawTexts(ctx, texts, scale);

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to export canvas'));
      }, 'image/png', 1.0);
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

/**
 * Render photos in a vertical strip layout
 */
function renderPhotoStrip({ photos, filter, frame, stickers, texts, canvasWidth, canvasHeight }) {
  return new Promise(async (resolve, reject) => {
    try {
      const images = await loadAllImages(photos);
      const stripWidth = 600;
      const gap = 8;
      const padding = 16;
      const photoHeight = Math.floor((stripWidth - padding * 2) * 0.75);
      const totalHeight = padding * 2 + images.length * photoHeight + (images.length - 1) * gap;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = stripWidth;
      canvas.height = totalHeight;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, stripWidth, totalHeight);
      ctx.filter = mapFilter(filter);

      images.forEach((img, i) => {
        const y = padding + i * (photoHeight + gap);
        const drawWidth = stripWidth - padding * 2;
        const imgAspect = img.width / img.height;
        const drawAspect = drawWidth / photoHeight;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgAspect > drawAspect) {
          sw = img.height * drawAspect;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / drawAspect;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, padding, y, drawWidth, photoHeight);
      });

      ctx.filter = 'none';

      const scale = stripWidth / canvasWidth;
      drawStickers(ctx, stickers, scale);
      drawTexts(ctx, texts, scale);

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to export strip'));
      }, 'image/png', 1.0);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Render photos in a 2x2 grid layout
 */
function renderPhotoGrid({ photos, filter, frame, stickers, texts, canvasWidth, canvasHeight }) {
  return new Promise(async (resolve, reject) => {
    try {
      const images = await loadAllImages(photos.slice(0, 4));
      const gridSize = 1200;
      const gap = 8;
      const padding = 16;
      const cellSize = Math.floor((gridSize - padding * 2 - gap) / 2);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = gridSize;
      canvas.height = gridSize;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, gridSize, gridSize);
      ctx.filter = mapFilter(filter);

      images.forEach((img, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = padding + col * (cellSize + gap);
        const y = padding + row * (cellSize + gap);
        const imgSize = Math.min(img.width, img.height);
        const sx = (img.width - imgSize) / 2;
        const sy = (img.height - imgSize) / 2;
        ctx.drawImage(img, sx, sy, imgSize, imgSize, x, y, cellSize, cellSize);
      });

      ctx.filter = 'none';

      if (frame) drawFrame(ctx, frame, gridSize);
      const scale = gridSize / canvasWidth;
      drawStickers(ctx, stickers, scale);
      drawTexts(ctx, texts, scale);

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to export grid'));
      }, 'image/png', 1.0);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Load multiple images from data URLs
 */
function loadAllImages(srcs) {
  return Promise.all(srcs.map((src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  })));
}

/**
 * Draw stickers on canvas
 */
function drawStickers(ctx, stickers, scale) {
  stickers.forEach((sticker) => {
    if (sticker.stickerType === 'image' && sticker.imageSrc) {
      // Image stickers are drawn asynchronously - for now skip in export
      // TODO: preload image stickers
    } else {
      ctx.font = `${sticker.size * scale}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sticker.emoji || '', sticker.x * scale, sticker.y * scale);
    }
  });
}

/**
 * Draw text overlays on canvas
 */
function drawTexts(ctx, texts, scale) {
  texts.forEach((t) => {
    const fontStyle = `${t.italic ? 'italic' : ''} ${t.bold ? 'bold' : ''} ${t.fontSize * scale}px ${t.fontFamily || 'Inter'}`.trim();
    ctx.font = fontStyle;
    ctx.fillStyle = t.color || '#2D2D2D';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4 * scale;
    ctx.fillText(t.text, t.x * scale, t.y * scale);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  });
}

/**
 * Map filter name to CSS filter string for canvas.
 */
function mapFilter(filterName) {
  const filters = {
    none: 'none',
    sepia: 'sepia(0.7) saturate(1.2)',
    bw: 'grayscale(1)',
    vintage: 'sepia(0.3) saturate(1.4) contrast(1.1) brightness(1.05)',
    cool: 'saturate(0.8) hue-rotate(15deg) brightness(1.05)',
    dreamy: 'blur(0.5px) brightness(1.1) saturate(1.3) contrast(0.9)',
  };
  return filters[filterName] || 'none';
}

/**
 * Get frame padding based on type
 */
function getFramePadding(type, size) {
  const paddings = {
    polaroid: size * 0.05,
    vintage: size * 0.04,
    floral: size * 0.06,
    minimal: size * 0.02,
    scrapbook: size * 0.03,
  };
  return paddings[type] || 0;
}

/**
 * Draw frame decoration on canvas
 */
function drawFrame(ctx, frame, size) {
  const { type } = frame;

  switch (type) {
    case 'polaroid': {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = size * 0.02;
      ctx.strokeRect(size * 0.03, size * 0.03, size * 0.94, size * 0.82);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(size * 0.03, size * 0.82, size * 0.94, size * 0.15);
      ctx.font = `italic ${size * 0.03}px 'Playfair Display', serif`;
      ctx.fillStyle = '#7A7A7A';
      ctx.textAlign = 'center';
      ctx.fillText('memories ♥', size * 0.5, size * 0.92);
      break;
    }
    case 'vintage': {
      ctx.strokeStyle = '#C4956A';
      ctx.lineWidth = size * 0.008;
      ctx.strokeRect(size * 0.02, size * 0.02, size * 0.96, size * 0.96);
      ctx.strokeStyle = '#D4AD85';
      ctx.lineWidth = size * 0.004;
      ctx.strokeRect(size * 0.04, size * 0.04, size * 0.92, size * 0.92);
      drawCornerDecoration(ctx, size);
      break;
    }
    case 'floral': {
      ctx.strokeStyle = '#E8B4B8';
      ctx.lineWidth = size * 0.012;
      ctx.strokeRect(size * 0.04, size * 0.04, size * 0.92, size * 0.92);
      const corners = [
        [size * 0.06, size * 0.06], [size * 0.94, size * 0.06],
        [size * 0.06, size * 0.94], [size * 0.94, size * 0.94],
      ];
      corners.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, size * 0.015, 0, Math.PI * 2);
        ctx.fillStyle = '#E8B4B8';
        ctx.fill();
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5;
          const px = x + Math.cos(angle) * size * 0.025;
          const py = y + Math.sin(angle) * size * 0.025;
          ctx.beginPath();
          ctx.arc(px, py, size * 0.008, 0, Math.PI * 2);
          ctx.fillStyle = '#F0CDD0';
          ctx.fill();
        }
      });
      break;
    }
    case 'minimal': {
      ctx.strokeStyle = '#2D2D2D';
      ctx.lineWidth = size * 0.003;
      ctx.strokeRect(size * 0.02, size * 0.02, size * 0.96, size * 0.96);
      break;
    }
    case 'scrapbook': {
      const tapeWidth = size * 0.08;
      const tapeHeight = size * 0.025;
      ctx.fillStyle = 'rgba(196, 149, 106, 0.6)';
      ctx.save();
      ctx.translate(size * 0.05, size * 0.05);
      ctx.rotate(-0.4);
      ctx.fillRect(-tapeWidth / 2, -tapeHeight / 2, tapeWidth, tapeHeight);
      ctx.restore();
      ctx.save();
      ctx.translate(size * 0.95, size * 0.05);
      ctx.rotate(0.4);
      ctx.fillRect(-tapeWidth / 2, -tapeHeight / 2, tapeWidth, tapeHeight);
      ctx.restore();
      ctx.save();
      ctx.translate(size * 0.05, size * 0.95);
      ctx.rotate(0.4);
      ctx.fillStyle = 'rgba(232, 180, 184, 0.6)';
      ctx.fillRect(-tapeWidth / 2, -tapeHeight / 2, tapeWidth, tapeHeight);
      ctx.restore();
      ctx.save();
      ctx.translate(size * 0.95, size * 0.95);
      ctx.rotate(-0.4);
      ctx.fillRect(-tapeWidth / 2, -tapeHeight / 2, tapeWidth, tapeHeight);
      ctx.restore();
      break;
    }
    default:
      break;
  }
}

function drawCornerDecoration(ctx, size) {
  const cornerSize = size * 0.04;
  const positions = [
    { x: size * 0.04, y: size * 0.04 },
    { x: size * 0.96, y: size * 0.04 },
    { x: size * 0.04, y: size * 0.96 },
    { x: size * 0.96, y: size * 0.96 },
  ];

  positions.forEach(({ x, y }) => {
    ctx.beginPath();
    ctx.arc(x, y, cornerSize * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#C4956A';
    ctx.fill();
  });
}

/**
 * Download a blob as a file.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download from data URL directly
 */
export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
