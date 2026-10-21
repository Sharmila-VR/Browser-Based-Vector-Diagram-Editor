import { getEnclosingBounds } from '../spatial/BoundingBox.js';
import { pointsToSvgPath } from '../geometry/smoothing.js';

export function exportToJson(data, filename = 'diagram.json') {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function exportToSvg(shapes, options = {}) {
  const padding = options.padding || 30;
  const bounds = getEnclosingBounds(shapes) || { x: 0, y: 0, width: 800, height: 600 };

  const vx = bounds.x - padding;
  const vy = bounds.y - padding;
  const vw = Math.max(100, bounds.width + padding * 2);
  const vh = Math.max(100, bounds.height + padding * 2);

  let svgElements = '';

  for (let i = 0; i < shapes.length; i++) {
    const s = shapes[i];
    const stroke = s.stroke || '#ffffff';
    const strokeWidth = s.strokeWidth || 2;
    const fill = s.fill || 'transparent';
    const opacity = s.opacity ?? 1;
    const rot = s.rotation || 0;
    const cx = s.x + (s.width || 0) / 2;
    const cy = s.y + (s.height || 0) / 2;
    const transformAttr = rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : '';

    switch (s.type) {
      case 'rect': {
        const rx = s.rx || 0;
        svgElements += `  <rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"${transformAttr} />\n`;
        if (s.text) {
          const textColor = s.textColor || '#ffffff';
          const fs = s.fontSize || 13;
          svgElements += `  <text x="${cx}" y="${cy}" fill="${textColor}" font-size="${fs}" font-family="Inter, sans-serif" font-weight="600" text-anchor="middle" dominant-baseline="middle" opacity="${opacity}"${transformAttr}>${s.text}</text>\n`;
        }
        break;
      }
      case 'ellipse': {
        const rx = s.radiusX || s.width / 2;
        const ry = s.radiusY || s.height / 2;
        svgElements += `  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"${transformAttr} />\n`;
        if (s.text) {
          const textColor = s.textColor || '#ffffff';
          const fs = s.fontSize || 13;
          svgElements += `  <text x="${cx}" y="${cy}" fill="${textColor}" font-size="${fs}" font-family="Inter, sans-serif" font-weight="600" text-anchor="middle" dominant-baseline="middle" opacity="${opacity}"${transformAttr}>${s.text}</text>\n`;
        }
        break;
      }
      case 'line': {
        const x1 = s.x1 ?? s.x;
        const y1 = s.y1 ?? s.y;
        const x2 = s.x2 ?? (s.x + s.width);
        const y2 = s.y2 ?? (s.y + s.height);
        svgElements += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />\n`;
        break;
      }
      case 'arrow':
      case 'connector': {
        let pathD = '';
        if (s.points && s.points.length >= 2) {
          pathD = `M ${s.points[0].x} ${s.points[0].y}`;
          for (let p = 1; p < s.points.length; p++) {
            pathD += ` L ${s.points[p].x} ${s.points[p].y}`;
          }
        } else {
          const x1 = s.x1 ?? s.x;
          const y1 = s.y1 ?? s.y;
          const x2 = s.x2 ?? (s.x + (s.width || 0));
          const y2 = s.y2 ?? (s.y + (s.height || 0));
          pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
        }
        svgElements += `  <path d="${pathD}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" marker-end="url(#arrowhead)" opacity="${opacity}" />\n`;
        break;
      }
      case 'path': {
        const pathD = pointsToSvgPath(s.points);
        svgElements += `  <path d="${pathD}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" />\n`;
        break;
      }
      case 'text': {
        const fontSize = s.fontSize || 16;
        const fontFamily = s.fontFamily || 'Inter, sans-serif';
        svgElements += `  <text x="${s.x}" y="${s.y + fontSize}" fill="${fill === 'transparent' ? stroke : fill}" font-size="${fontSize}" font-family="${fontFamily}" opacity="${opacity}"${transformAttr}>${s.text || ''}</text>\n`;
        break;
      }
      default:
        break;
    }
  }

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" width="${vw}" height="${vh}">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#ffffff" />
    </marker>
  </defs>
  <rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="#18181b" />
${svgElements}</svg>`;

  if (options.download !== false) {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = options.filename || 'diagram.svg';
    a.click();
    URL.revokeObjectURL(url);
  }

  return svgContent;
}

export function exportToPng(shapes, options = {}) {
  const padding = options.padding || 30;
  const bounds = getEnclosingBounds(shapes) || { x: 0, y: 0, width: 800, height: 600 };
  const dpr = window.devicePixelRatio || 2;

  const w = Math.max(100, bounds.width + padding * 2);
  const h = Math.max(100, bounds.height + padding * 2);

  const canvas = document.createElement('canvas');
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  ctx.fillStyle = options.backgroundColor || '#18181b';
  ctx.fillRect(0, 0, w, h);

  ctx.translate(-bounds.x + padding, -bounds.y + padding);

  const svgString = exportToSvg(shapes, { download: false, padding });
  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = w * dpr;
    renderCanvas.height = h * dpr;
    const rCtx = renderCanvas.getContext('2d');
    rCtx.drawImage(img, 0, 0, w * dpr, h * dpr);

    renderCanvas.toBlob(pngBlob => {
      if (pngBlob) {
        const pngUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = options.filename || 'diagram.png';
        a.click();
        URL.revokeObjectURL(pngUrl);
      }
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  img.src = url;
}
