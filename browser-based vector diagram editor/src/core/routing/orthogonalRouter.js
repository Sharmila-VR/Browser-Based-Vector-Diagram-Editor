import { boxesIntersect } from '../spatial/BoundingBox.js';

export function getPortNormal(portId) {
  switch (portId) {
    case 'top':
      return { x: 0, y: -1 };
    case 'bottom':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

export function lineIntersectsBox(p1, p2, box) {
  
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);

  const lineBox = {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };

  if (!boxesIntersect(lineBox, box)) return false;

  if (p1.y === p2.y) {
    return p1.y >= box.y && p1.y <= box.y + box.height && !(maxX < box.x || minX > box.x + box.width);
  }

  if (p1.x === p2.x) {
    return p1.x >= box.x && p1.x <= box.x + box.width && !(maxY < box.y || minY > box.y + box.height);
  }

  return true;
}

export function pathIntersectsObstacles(points, obstacles) {
  if (!obstacles || obstacles.length === 0) return false;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    for (let j = 0; j < obstacles.length; j++) {
      if (lineIntersectsBox(p1, p2, obstacles[j])) {
        return true;
      }
    }
  }
  return false;
}

export function simplifyOrthogonalPath(points) {
  if (!points || points.length <= 2) return points || [];
  const result = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const next = points[i + 1];

    const isColinearH = prev.y === curr.y && curr.y === next.y;
    
    const isColinearV = prev.x === curr.x && curr.x === next.x;

    if (!isColinearH && !isColinearV) {
      
      if (curr.x !== prev.x || curr.y !== prev.y) {
        result.push(curr);
      }
    }
  }

  const last = points[points.length - 1];
  if (result[result.length - 1].x !== last.x || result[result.length - 1].y !== last.y) {
    result.push(last);
  }

  return result;
}

export function routeOrthogonal(start, end, rawObstacles = [], margin = 16) {
  const p1 = { x: start.x, y: start.y };
  const p2 = { x: end.x, y: end.y };

  const norm1 = getPortNormal(start.portId);
  const norm2 = getPortNormal(end.portId);

  const obstacles = rawObstacles.map(obs => ({
    x: obs.x - margin,
    y: obs.y - margin,
    width: obs.width + margin * 2,
    height: obs.height + margin * 2,
  }));

  const stub = 20;
  const p1Stub = {
    x: p1.x + norm1.x * stub,
    y: p1.y + norm1.y * stub,
  };
  const p2Stub = {
    x: p2.x + norm2.x * stub,
    y: p2.y + norm2.y * stub,
  };

  const candidatePaths = [];

  const midX = (p1Stub.x + p2Stub.x) / 2;
  candidatePaths.push([
    p1,
    p1Stub,
    { x: midX, y: p1Stub.y },
    { x: midX, y: p2Stub.y },
    p2Stub,
    p2,
  ]);

  const midY = (p1Stub.y + p2Stub.y) / 2;
  candidatePaths.push([
    p1,
    p1Stub,
    { x: p1Stub.x, y: midY },
    { x: p2Stub.x, y: midY },
    p2Stub,
    p2,
  ]);

  candidatePaths.push([
    p1,
    p1Stub,
    { x: p2Stub.x, y: p1Stub.y },
    p2Stub,
    p2,
  ]);

  candidatePaths.push([
    p1,
    p1Stub,
    { x: p1Stub.x, y: p2Stub.y },
    p2Stub,
    p2,
  ]);

  for (let i = 0; i < candidatePaths.length; i++) {
    const rawPath = candidatePaths[i];
    
    const middleSegments = rawPath.slice(1, rawPath.length - 1);
    if (!pathIntersectsObstacles(middleSegments, obstacles)) {
      return simplifyOrthogonalPath(rawPath);
    }
  }

  let detourPath = null;
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    if (lineIntersectsBox(p1Stub, p2Stub, obs)) {
      
      const goTopY = obs.y - 10;
      const goBottomY = obs.y + obs.height + 10;
      const goLeftX = obs.x - 10;
      const goRightX = obs.x + obs.width + 10;

      const altPaths = [
        [p1, p1Stub, { x: p1Stub.x, y: goTopY }, { x: p2Stub.x, y: goTopY }, p2Stub, p2],
        [p1, p1Stub, { x: p1Stub.x, y: goBottomY }, { x: p2Stub.x, y: goBottomY }, p2Stub, p2],
        [p1, p1Stub, { x: goLeftX, y: p1Stub.y }, { x: goLeftX, y: p2Stub.y }, p2Stub, p2],
        [p1, p1Stub, { x: goRightX, y: p1Stub.y }, { x: goRightX, y: p2Stub.y }, p2Stub, p2],
      ];

      for (let j = 0; j < altPaths.length; j++) {
        const testPath = altPaths[j];
        if (!pathIntersectsObstacles(testPath.slice(1, testPath.length - 1), obstacles)) {
          detourPath = testPath;
          break;
        }
      }
      if (detourPath) break;
    }
  }

  if (detourPath) {
    return simplifyOrthogonalPath(detourPath);
  }

  return simplifyOrthogonalPath(candidatePaths[0]);
}
