import { describe, it, expect } from 'vitest';
import {
  getPortNormal,
  lineIntersectsBox,
  pathIntersectsObstacles,
  simplifyOrthogonalPath,
  routeOrthogonal,
} from '../core/routing/orthogonalRouter.js';

describe('Smart Connector Routing', () => {
  it('returns proper port normal vectors', () => {
    expect(getPortNormal('top')).toEqual({ x: 0, y: -1 });
    expect(getPortNormal('bottom')).toEqual({ x: 0, y: 1 });
    expect(getPortNormal('left')).toEqual({ x: -1, y: 0 });
    expect(getPortNormal('right')).toEqual({ x: 1, y: 0 });
  });

  it('checks if line segment intersects a bounding box', () => {
    const box = { x: 50, y: 50, width: 100, height: 100 };
    expect(lineIntersectsBox({ x: 0, y: 100 }, { x: 200, y: 100 }, box)).toBe(true);
    expect(lineIntersectsBox({ x: 0, y: 20 }, { x: 200, y: 20 }, box)).toBe(false);
  });

  it('simplifies colinear segments in orthogonal paths', () => {
    const points = [
      { x: 10, y: 20 },
      { x: 30, y: 20 },
      { x: 50, y: 20 },
      { x: 50, y: 80 },
    ];
    const simplified = simplifyOrthogonalPath(points);
    expect(simplified.length).toBe(3);
    expect(simplified[0]).toEqual({ x: 10, y: 20 });
    expect(simplified[1]).toEqual({ x: 50, y: 20 });
    expect(simplified[2]).toEqual({ x: 50, y: 80 });
  });

  it('generates an orthogonal route between two points without obstacles', () => {
    const start = { x: 100, y: 100, portId: 'right' };
    const end = { x: 300, y: 250, portId: 'left' };

    const path = routeOrthogonal(start, end, []);
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(path[0]).toEqual({ x: 100, y: 100 });
    expect(path[path.length - 1]).toEqual({ x: 300, y: 250 });

    for (let i = 0; i < path.length - 1; i++) {
      const isOrthogonal = path[i].x === path[i + 1].x || path[i].y === path[i + 1].y;
      expect(isOrthogonal).toBe(true);
    }
  });

  it('re-routes around obstacles in the direct path', () => {
    const start = { x: 50, y: 100, portId: 'right' };
    const end = { x: 350, y: 100, portId: 'left' };
    const obstacle = { x: 150, y: 60, width: 100, height: 80 }; 

    const path = routeOrthogonal(start, end, [obstacle]);
    
    const centerCut = { x: 200, y: 100 };
    const hasDirectCut = path.some(p => p.x === centerCut.x && p.y === centerCut.y);
    expect(hasDirectCut).toBe(false);
  });
});
