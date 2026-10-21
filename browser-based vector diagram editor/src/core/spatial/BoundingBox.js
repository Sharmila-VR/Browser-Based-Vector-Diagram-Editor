export function getShapeBounds(shape) {
  if (!shape) return { x: 0, y: 0, width: 0, height: 0 };

  switch (shape.type) {
    case 'rect':
    case 'text': {
      const x = Math.min(shape.x, shape.x + shape.width);
      const y = Math.min(shape.y, shape.y + shape.height);
      const width = Math.abs(shape.width);
      const height = Math.abs(shape.height);
      return { x, y, width, height };
    }

    case 'ellipse': {
      const rx = Math.abs(shape.radiusX || shape.width / 2);
      const ry = Math.abs(shape.radiusY || shape.height / 2);
      const cx = shape.x + (shape.width ? shape.width / 2 : 0);
      const cy = shape.y + (shape.height ? shape.height / 2 : 0);
      return {
        x: cx - rx,
        y: cy - ry,
        width: rx * 2,
        height: ry * 2,
      };
    }

    case 'line':
    case 'arrow':
    case 'connector': {
      if (shape.points && shape.points.length >= 2) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (let i = 0; i < shape.points.length; i++) {
          const pt = shape.points[i];
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        }
        return {
          x: minX,
          y: minY,
          width: Math.max(1, maxX - minX),
          height: Math.max(1, maxY - minY),
        };
      }
      const x1 = shape.x1 ?? shape.x;
      const y1 = shape.y1 ?? shape.y;
      const x2 = shape.x2 ?? (shape.x + (shape.width || 0));
      const y2 = shape.y2 ?? (shape.y + (shape.height || 0));
      const minX = Math.min(x1, x2);
      const minY = Math.min(y1, y2);
      return {
        x: minX,
        y: minY,
        width: Math.max(1, Math.abs(x2 - x1)),
        height: Math.max(1, Math.abs(y2 - y1)),
      };
    }

    case 'path': {
      if (!shape.points || shape.points.length === 0) {
        return { x: shape.x || 0, y: shape.y || 0, width: 0, height: 0 };
      }
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < shape.points.length; i++) {
        const pt = shape.points[i];
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
      return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
      };
    }

    case 'group': {
      if (!shape.children || shape.children.length === 0) {
        return { x: shape.x || 0, y: shape.y || 0, width: shape.width || 0, height: shape.height || 0 };
      }
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < shape.children.length; i++) {
        const childBounds = getShapeBounds(shape.children[i]);
        if (childBounds.x < minX) minX = childBounds.x;
        if (childBounds.y < minY) minY = childBounds.y;
        if (childBounds.x + childBounds.width > maxX) maxX = childBounds.x + childBounds.width;
        if (childBounds.y + childBounds.height > maxY) maxY = childBounds.y + childBounds.height;
      }
      return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
      };
    }

    default:
      return { x: shape.x || 0, y: shape.y || 0, width: shape.width || 0, height: shape.height || 0 };
  }
}

export function getRotatedBounds(shape) {
  const b = getShapeBounds(shape);
  const rot = shape.rotation || 0;
  if (!rot) return b;

  const rad = (rot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;

  const corners = [
    { x: b.x, y: b.y },
    { x: b.x + b.width, y: b.y },
    { x: b.x + b.width, y: b.y + b.height },
    { x: b.x, y: b.y + b.height },
  ];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < corners.length; i++) {
    const dx = corners[i].x - cx;
    const dy = corners[i].y - cy;
    const rx = cx + dx * cos - dy * sin;
    const ry = cy + dx * sin + dy * cos;
    if (rx < minX) minX = rx;
    if (rx > maxX) maxX = rx;
    if (ry < minY) minY = ry;
    if (ry > maxY) maxY = ry;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function boxesIntersect(a, b) {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

export function pointInBox(px, py, box) {
  return px >= box.x && px <= box.x + box.width && py >= box.y && py <= box.y + box.height;
}

export function getEnclosingBounds(shapes) {
  if (!shapes || shapes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < shapes.length; i++) {
    const b = getRotatedBounds(shapes[i]);
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
