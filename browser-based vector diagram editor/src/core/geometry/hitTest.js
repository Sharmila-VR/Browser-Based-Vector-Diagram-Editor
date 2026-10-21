import { rotatePoint, getSelectionHandles } from './transforms.js';
import { getShapeBounds } from '../spatial/BoundingBox.js';

export function distSq(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

export function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = distSq(x1, y1, x2, y2);
  if (l2 === 0) return Math.sqrt(distSq(px, py, x1, y1));

  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return Math.sqrt(distSq(px, py, projX, projY));
}

export function isPointInShape(px, py, shape, tolerance = 6) {
  if (!shape) return false;

  const rot = shape.rotation || 0;
  const b = getShapeBounds(shape);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;

  const localPt = rotatePoint(px, py, cx, cy, -rot);
  const lx = localPt.x;
  const ly = localPt.y;

  switch (shape.type) {
    case 'rect':
    case 'text': {
      return (
        lx >= b.x - tolerance &&
        lx <= b.x + b.width + tolerance &&
        ly >= b.y - tolerance &&
        ly <= b.y + b.height + tolerance
      );
    }

    case 'ellipse': {
      const rx = b.width / 2 + tolerance;
      const ry = b.height / 2 + tolerance;
      if (rx <= 0 || ry <= 0) return false;
      const normX = (lx - cx) / rx;
      const normY = (ly - cy) / ry;
      return normX * normX + normY * normY <= 1;
    }

    case 'line':
    case 'arrow': {
      const x1 = shape.x1 ?? shape.x;
      const y1 = shape.y1 ?? shape.y;
      const x2 = shape.x2 ?? (shape.x + (shape.width || 0));
      const y2 = shape.y2 ?? (shape.y + (shape.height || 0));
      return distToSegment(px, py, x1, y1, x2, y2) <= Math.max(tolerance, (shape.strokeWidth || 2) / 2 + 4);
    }

    case 'connector': {
      if (shape.points && shape.points.length >= 2) {
        const threshold = Math.max(tolerance, (shape.strokeWidth || 2) / 2 + 4);
        for (let i = 0; i < shape.points.length - 1; i++) {
          const p1 = shape.points[i];
          const p2 = shape.points[i + 1];
          if (distToSegment(px, py, p1.x, p1.y, p2.x, p2.y) <= threshold) {
            return true;
          }
        }
        return false;
      }
      return false;
    }

    case 'path': {
      if (!shape.points || shape.points.length < 2) return false;
      const threshold = Math.max(tolerance, (shape.strokeWidth || 2) / 2 + 4);
      for (let i = 0; i < shape.points.length - 1; i++) {
        const p1 = shape.points[i];
        const p2 = shape.points[i + 1];
        if (distToSegment(px, py, p1.x, p1.y, p2.x, p2.y) <= threshold) {
          return true;
        }
      }
      return false;
    }

    case 'group': {
      if (!shape.children || shape.children.length === 0) {
        return (
          lx >= b.x && lx <= b.x + b.width && ly >= b.y && ly <= b.y + b.height
        );
      }
      for (let i = 0; i < shape.children.length; i++) {
        if (isPointInShape(px, py, shape.children[i], tolerance)) {
          return true;
        }
      }
      return false;
    }

    default:
      return false;
  }
}

export function hitTestHandle(px, py, bounds, rotation = 0, handleRadius = 8) {
  const handles = getSelectionHandles(bounds, rotation);
  const rSq = handleRadius * handleRadius;

  for (const [name, pt] of Object.entries(handles)) {
    if (distSq(px, py, pt.x, pt.y) <= rSq) {
      return name;
    }
  }

  return null;
}

export function getShapeAnchorPorts(shape) {
  const b = getShapeBounds(shape);
  const rot = shape.rotation || 0;
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;

  const rawPorts = {
    top: { x: cx, y: b.y },
    right: { x: b.x + b.width, y: cy },
    bottom: { x: cx, y: b.y + b.height },
    left: { x: b.x, y: cy },
  };

  const ports = {};
  for (const [id, pt] of Object.entries(rawPorts)) {
    ports[id] = rotatePoint(pt.x, pt.y, cx, cy, rot);
  }
  return ports;
}

export function hitTestAnchorPort(px, py, shape, threshold = 14) {
  const ports = getShapeAnchorPorts(shape);
  const tSq = threshold * threshold;

  for (const [portId, pt] of Object.entries(ports)) {
    if (distSq(px, py, pt.x, pt.y) <= tSq) {
      return { portId, point: pt };
    }
  }
  return null;
}
