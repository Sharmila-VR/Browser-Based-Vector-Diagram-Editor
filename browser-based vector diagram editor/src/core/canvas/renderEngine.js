import { renderSmoothPathToCanvas } from '../geometry/smoothing.js';
import { getSelectionHandles, getShapeCenter } from '../geometry/transforms.js';
import { getShapeAnchorPorts } from '../geometry/hitTest.js';
import { getShapeBounds } from '../spatial/BoundingBox.js';

export function renderGrid(ctx, panX, panY, zoom, width, height, gridSize = 20) {
  ctx.save();
  ctx.fillStyle = '#0f1117';
  ctx.fillRect(0, 0, width, height);

  const scaledGrid = gridSize * zoom;
  if (scaledGrid < 8) {
    ctx.restore();
    return; 
  }

  const startX = ((panX % scaledGrid) + scaledGrid) % scaledGrid;
  const startY = ((panY % scaledGrid) + scaledGrid) % scaledGrid;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let x = startX; x < width; x += scaledGrid) {
    for (let y = startY; y < height; y += scaledGrid) {
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
  }

  ctx.restore();
}

export function drawArrowhead(ctx, fromX, fromY, toX, toY, color, size = 12) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - size * Math.cos(angle - Math.PI / 6),
    toY - size * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - size * Math.cos(angle + Math.PI / 6),
    toY - size * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function renderShapeCenteredText(ctx, shape) {
  if (!shape.text) return;
  const fontSize = shape.fontSize || 13;
  const fontFamily = shape.fontFamily || 'Inter, sans-serif';
  const lineHeight = fontSize * 1.35;
  const lines = String(shape.text).split('\n');

  ctx.save();
  ctx.font = `600 ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = shape.textColor || '#ffffff';

  const cx = shape.x + shape.width / 2;
  const totalHeight = lines.length * lineHeight;
  const startY = shape.y + shape.height / 2 - totalHeight / 2 + lineHeight / 2;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], cx, startY + i * lineHeight);
  }
  ctx.restore();
}

export function renderShape(ctx, shape) {
  ctx.save();
  const opacity = shape.opacity ?? 1;
  ctx.globalAlpha = opacity;

  const rot = shape.rotation || 0;
  if (rot) {
    const center = getShapeCenter(shape);
    ctx.translate(center.x, center.y);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.translate(-center.x, -center.y);
  }

  ctx.strokeStyle = shape.stroke || '#60a5fa';
  ctx.lineWidth = shape.strokeWidth || 2;
  ctx.fillStyle = shape.fill || 'transparent';

  switch (shape.type) {
    case 'rect': {
      const rx = shape.rx || 0;
      ctx.beginPath();
      if (rx > 0 && ctx.roundRect) {
        ctx.roundRect(shape.x, shape.y, shape.width, shape.height, rx);
      } else {
        ctx.rect(shape.x, shape.y, shape.width, shape.height);
      }
      if (shape.fill && shape.fill !== 'transparent') {
        ctx.fill();
      }
      if (shape.stroke && shape.stroke !== 'transparent' && shape.strokeWidth > 0) {
        ctx.stroke();
      }

      if (shape.text) {
        renderShapeCenteredText(ctx, shape);
      }
      break;
    }

    case 'ellipse': {
      const cx = shape.x + shape.width / 2;
      const cy = shape.y + shape.height / 2;
      const rx = Math.abs(shape.radiusX || shape.width / 2);
      const ry = Math.abs(shape.radiusY || shape.height / 2);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (shape.fill && shape.fill !== 'transparent') {
        ctx.fill();
      }
      if (shape.stroke && shape.stroke !== 'transparent' && shape.strokeWidth > 0) {
        ctx.stroke();
      }

      if (shape.text) {
        renderShapeCenteredText(ctx, shape);
      }
      break;
    }

    case 'line': {
      const x1 = shape.x1 ?? shape.x;
      const y1 = shape.y1 ?? shape.y;
      const x2 = shape.x2 ?? (shape.x + (shape.width || 0));
      const y2 = shape.y2 ?? (shape.y + (shape.height || 0));
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      break;
    }

    case 'arrow': {
      const x1 = shape.x1 ?? shape.x;
      const y1 = shape.y1 ?? shape.y;
      const x2 = shape.x2 ?? (shape.x + (shape.width || 0));
      const y2 = shape.y2 ?? (shape.y + (shape.height || 0));
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      drawArrowhead(ctx, x1, y1, x2, y2, shape.stroke || '#60a5fa', (shape.strokeWidth || 2) * 4);
      break;
    }

    case 'connector': {
      if (shape.points && shape.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
          ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        ctx.stroke();

        const pPrev = shape.points[shape.points.length - 2];
        const pLast = shape.points[shape.points.length - 1];
        drawArrowhead(ctx, pPrev.x, pPrev.y, pLast.x, pLast.y, shape.stroke || '#60a5fa', (shape.strokeWidth || 2) * 4);
      }
      break;
    }

    case 'path': {
      if (shape.points && shape.points.length > 0) {
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        renderSmoothPathToCanvas(ctx, shape.points);
        ctx.stroke();
      }
      break;
    }

    case 'text': {
      const fontSize = shape.fontSize || 16;
      const fontFamily = shape.fontFamily || 'Inter, sans-serif';
      const lineHeight = fontSize * 1.35;
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textBaseline = 'top';
      ctx.fillStyle = shape.textColor || (shape.fill && shape.fill !== 'transparent' ? shape.fill : (shape.stroke || '#ffffff'));

      const lines = String(shape.text || '').split('\n');
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], shape.x, shape.y + i * lineHeight);
      }
      break;
    }

    case 'group': {
      if (shape.children) {
        for (let i = 0; i < shape.children.length; i++) {
          renderShape(ctx, shape.children[i]);
        }
      }
      break;
    }

    default:
      break;
  }

  ctx.restore();
}

export function renderSelectionOverlay(ctx, selectedShapes, zoom) {
  if (!selectedShapes || selectedShapes.length === 0) return;

  for (let s = 0; s < selectedShapes.length; s++) {
    const shape = selectedShapes[s];
    const b = getShapeBounds(shape);
    const rot = shape.rotation || 0;
    const handles = getSelectionHandles(b, rot);

    ctx.save();
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;

    ctx.translate(cx, cy);
    if (rot) ctx.rotate((rot * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.strokeRect(b.x - 2 / zoom, b.y - 2 / zoom, b.width + 4 / zoom, b.height + 4 / zoom);
    ctx.restore();

    if (handles.rot && handles.n) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      ctx.moveTo(handles.n.x, handles.n.y);
      ctx.lineTo(handles.rot.x, handles.rot.y);
      ctx.stroke();
      ctx.restore();
    }

    const handleSize = 7 / zoom;
    for (const [key, pt] of Object.entries(handles)) {
      ctx.save();
      if (key === 'rot') {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, handleSize / 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 / zoom;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5 / zoom;
        ctx.fillRect(pt.x - handleSize / 2, pt.y - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(pt.x - handleSize / 2, pt.y - handleSize / 2, handleSize, handleSize);
      }
      ctx.restore();
    }
  }
}

export function renderSnapGuides(ctx, guides, zoom) {
  if (!guides || guides.length === 0) return;

  ctx.save();
  ctx.strokeStyle = '#ec4899';
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([4 / zoom, 4 / zoom]);

  for (let i = 0; i < guides.length; i++) {
    const g = guides[i];
    ctx.beginPath();
    if (g.type === 'vertical') {
      ctx.moveTo(g.x, g.startY);
      ctx.lineTo(g.x, g.endY);
    } else if (g.type === 'horizontal') {
      ctx.moveTo(g.startX, g.y);
      ctx.lineTo(g.endX, g.y);
    } else if (g.type === 'spacing-horizontal') {
      ctx.moveTo(g.startX, g.y);
      ctx.lineTo(g.endX, g.y);
    } else if (g.type === 'spacing-vertical') {
      ctx.moveTo(g.x, g.startY);
      ctx.lineTo(g.x, g.endY);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function renderConnectionPorts(ctx, shape, zoom) {
  if (!shape) return;
  const ports = getShapeAnchorPorts(shape);
  const radius = 5 / zoom;

  ctx.save();
  for (const [, pt] of Object.entries(ports)) {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 / zoom;
    ctx.stroke();
  }
  ctx.restore();
}
