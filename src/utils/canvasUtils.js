/**
 * canvasUtils.js
 * Utility functions for canvas operations: exporting edited photos with frames, stickers, and text.
 */

/**
 * Render the final edited photo to a canvas and return as a blob.
 * @param {Object} options
 * @param {string} options.imageSrc - Base photo data URL
 * @param {string} options.filter - CSS filter string
 * @param {Object|null} options.frame - Frame config { type, color, ... }
 * @param {Array} options.stickers - Array of sticker objects { emoji, x, y, size }
 * @param {Array} options.texts - Array of text objects { text, x, y, fontSize, color, fontFamily, bold, italic }
 * @param {number} options.canvasWidth - Display width of the editor canvas
 * @param {number} options.canvasHeight - Display height of the editor canvas
 * @returns {Promise<Blob>}
 */
export async function renderEditedPhoto({
  imageSrc,
  filter = 'none',
  frame = null,
  stickers = [],
  texts = [],
  canvasWidth = 800,
  canvasHeight = 800,
}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const exportSize = 1200;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = exportSize;
      canvas.height = exportSize;

      const scale = exportSize / canvasWidth;

      // Apply filter
      ctx.filter = mapFilter(filter);

      // Draw background
      ctx.fillStyle = '#FDFBF7';
      ctx.fillRect(0, 0, exportSize, exportSize);

      // Calculate frame padding
      const padding = frame ? getFramePadding(frame.type, exportSize) : 0;

      // Draw image (crop to square, centered)
      const imgSize = Math.min(img.width, img.height);
      const sx = (img.width - imgSize) / 2;
      const sy = (img.height - imgSize) / 2;

      ctx.drawImage(
        img,
        sx, sy, imgSize, imgSize,
        padding, padding,
        exportSize - padding * 2,
        exportSize - padding * 2
      );

      // Reset filter for overlays
      ctx.filter = 'none';

      // Draw frame
      if (frame) {
        drawFrame(ctx, frame, exportSize);
      }

      // Draw stickers
      stickers.forEach((sticker) => {
        ctx.font = `${sticker.size * scale}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sticker.emoji, sticker.x * scale, sticker.y * scale);
      });

      // Draw texts
      texts.forEach((t) => {
        const fontStyle = `${t.italic ? 'italic' : ''} ${t.bold ? 'bold' : ''} ${t.fontSize * scale}px ${t.fontFamily || 'Inter'}`.trim();
        ctx.font = fontStyle;
        ctx.fillStyle = t.color || '#2D2D2D';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw text shadow for readability
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4 * scale;
        ctx.fillText(t.text, t.x * scale, t.y * scale);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      });

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to export canvas'));
        },
        'image/png',
        1.0
      );
    };
    img.onerror = reject;
    img.src = imageSrc;
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
      // White border with thicker bottom
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = size * 0.02;
      ctx.strokeRect(
        size * 0.03, size * 0.03,
        size * 0.94, size * 0.82
      );
      // Bottom white space
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(size * 0.03, size * 0.82, size * 0.94, size * 0.15);
      // Label text
      ctx.font = `italic ${size * 0.03}px 'Playfair Display', serif`;
      ctx.fillStyle = '#7A7A7A';
      ctx.textAlign = 'center';
      ctx.fillText('memories ♥', size * 0.5, size * 0.92);
      break;
    }
    case 'vintage': {
      // Double border effect
      ctx.strokeStyle = '#C4956A';
      ctx.lineWidth = size * 0.008;
      ctx.strokeRect(
        size * 0.02, size * 0.02,
        size * 0.96, size * 0.96
      );
      ctx.strokeStyle = '#D4AD85';
      ctx.lineWidth = size * 0.004;
      ctx.strokeRect(
        size * 0.04, size * 0.04,
        size * 0.92, size * 0.92
      );
      // Corner decorations
      drawCornerDecoration(ctx, size);
      break;
    }
    case 'floral': {
      ctx.strokeStyle = '#E8B4B8';
      ctx.lineWidth = size * 0.012;
      ctx.strokeRect(
        size * 0.04, size * 0.04,
        size * 0.92, size * 0.92
      );
      // Floral corner dots
      const corners = [
        [size * 0.06, size * 0.06],
        [size * 0.94, size * 0.06],
        [size * 0.06, size * 0.94],
        [size * 0.94, size * 0.94],
      ];
      corners.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, size * 0.015, 0, Math.PI * 2);
        ctx.fillStyle = '#E8B4B8';
        ctx.fill();
        // Petals
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
      ctx.strokeRect(
        size * 0.02, size * 0.02,
        size * 0.96, size * 0.96
      );
      break;
    }
    case 'scrapbook': {
      // Washi tape strips on corners
      const tapeWidth = size * 0.08;
      const tapeHeight = size * 0.025;
      ctx.fillStyle = 'rgba(196, 149, 106, 0.6)';

      // Top-left tape (angled)
      ctx.save();
      ctx.translate(size * 0.05, size * 0.05);
      ctx.rotate(-0.4);
      ctx.fillRect(-tapeWidth / 2, -tapeHeight / 2, tapeWidth, tapeHeight);
      ctx.restore();

      // Top-right tape
      ctx.save();
      ctx.translate(size * 0.95, size * 0.05);
      ctx.rotate(0.4);
      ctx.fillRect(-tapeWidth / 2, -tapeHeight / 2, tapeWidth, tapeHeight);
      ctx.restore();

      // Bottom-left tape
      ctx.save();
      ctx.translate(size * 0.05, size * 0.95);
      ctx.rotate(0.4);
      ctx.fillStyle = 'rgba(232, 180, 184, 0.6)';
      ctx.fillRect(-tapeWidth / 2, -tapeHeight / 2, tapeWidth, tapeHeight);
      ctx.restore();

      // Bottom-right tape
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
    { x: size * 0.04, y: size * 0.04, rotations: [0, Math.PI / 2] },
    { x: size * 0.96, y: size * 0.04, rotations: [Math.PI / 2, Math.PI] },
    { x: size * 0.04, y: size * 0.96, rotations: [-Math.PI / 2, 0] },
    { x: size * 0.96, y: size * 0.96, rotations: [Math.PI, -Math.PI / 2] },
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
 * @param {Blob} blob
 * @param {string} filename
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
 * @param {string} dataUrl
 * @param {string} filename
 */
export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
