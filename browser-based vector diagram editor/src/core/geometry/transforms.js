export function rotatePoint(px, py, cx, cy, angleDeg) {
  if (!angleDeg) return { x: px, y: py };
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

export function screenToWorld(sx, sy, panX, panY, zoom) {
  return {
    x: (sx - panX) / zoom,
    y: (sy - panY) / zoom,
  };
}

export function worldToScreen(wx, wy, panX, panY, zoom) {
  return {
    x: wx * zoom + panX,
    y: wy * zoom + panY,
  };
}

export function getShapeCenter(shape) {
  if (shape.type === 'line' || shape.type === 'arrow' || shape.type === 'connector') {
    if (shape.points && shape.points.length >= 2) {
      const p1 = shape.points[0];
      const p2 = shape.points[shape.points.length - 1];
      return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    }
    const x1 = shape.x1 ?? shape.x;
    const y1 = shape.y1 ?? shape.y;
    const x2 = shape.x2 ?? (shape.x + (shape.width || 0));
    const y2 = shape.y2 ?? (shape.y + (shape.height || 0));
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  }
  return {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2,
  };
}

export function getSelectionHandles(bounds, rotation = 0) {
  const { x, y, width, height } = bounds;
  const cx = x + width / 2;
  const cy = y + height / 2;

  const rawHandles = {
    nw: { x, y },
    n: { x: cx, y },
    ne: { x: x + width, y },
    e: { x: x + width, y: cy },
    se: { x: x + width, y: y + height },
    s: { x: cx, y: y + height },
    sw: { x, y: y + height },
    w: { x, y: cy },
    rot: { x: cx, y: y - 24 }, 
  };

  if (!rotation) return rawHandles;

  const rotatedHandles = {};
  for (const [key, pt] of Object.entries(rawHandles)) {
    rotatedHandles[key] = rotatePoint(pt.x, pt.y, cx, cy, rotation);
  }

  return rotatedHandles;
}

export function computeResize({
  handle,
  initialShape,
  currentMouse,
  startMouse,
  aspectRatioLocked = false,
}) {
  const rot = initialShape.rotation || 0;
  const cx = initialShape.x + initialShape.width / 2;
  const cy = initialShape.y + initialShape.height / 2;

  const localCurrent = rotatePoint(currentMouse.x, currentMouse.y, cx, cy, -rot);
  const localStart = rotatePoint(startMouse.x, startMouse.y, cx, cy, -rot);

  const dx = localCurrent.x - localStart.x;
  const dy = localCurrent.y - localStart.y;

  let newX = initialShape.x;
  let newY = initialShape.y;
  let newW = initialShape.width;
  let newH = initialShape.height;

  switch (handle) {
    case 'se':
      newW += dx;
      newH += dy;
      break;
    case 'e':
      newW += dx;
      break;
    case 's':
      newH += dy;
      break;
    case 'nw':
      newX += dx;
      newY += dy;
      newW -= dx;
      newH -= dy;
      break;
    case 'w':
      newX += dx;
      newW -= dx;
      break;
    case 'n':
      newY += dy;
      newH -= dy;
      break;
    case 'ne':
      newY += dy;
      newW += dx;
      newH -= dy;
      break;
    case 'sw':
      newX += dx;
      newW -= dx;
      newH += dy;
      break;
    default:
      break;
  }

  if (aspectRatioLocked && initialShape.width && initialShape.height) {
    const ratio = initialShape.width / initialShape.height;
    if (Math.abs(newW) / ratio > Math.abs(newH)) {
      newH = (newW / ratio) * Math.sign(newH);
    } else {
      newW = newH * ratio * Math.sign(newW);
    }
  }

  let finalX = newX;
  let finalY = newY;
  let finalW = newW;
  let finalH = newH;

  if (newW < 0) {
    finalX = newX + newW;
    finalW = Math.abs(newW);
  }
  if (newH < 0) {
    finalY = newY + newH;
    finalH = Math.abs(newH);
  }

  if (rot !== 0) {
    const oldCenter = { x: cx, y: cy };
    const newLocalCenter = { x: finalX + finalW / 2, y: finalY + finalH / 2 };
    const rotatedCenter = rotatePoint(newLocalCenter.x, newLocalCenter.y, oldCenter.x, oldCenter.y, rot);
    finalX = rotatedCenter.x - finalW / 2;
    finalY = rotatedCenter.y - finalH / 2;
  }

  return {
    x: finalX,
    y: finalY,
    width: Math.max(5, finalW),
    height: Math.max(5, finalH),
  };
}
