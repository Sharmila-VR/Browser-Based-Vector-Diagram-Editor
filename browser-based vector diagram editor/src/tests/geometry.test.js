import { describe, it, expect, vi } from 'vitest';
import {
  rotatePoint,
  screenToWorld,
  worldToScreen,
  getShapeCenter,
  getSelectionHandles,
  computeResize,
} from '../core/geometry/transforms.js';
import {
  distSq,
  distToSegment,
  isPointInShape,
  hitTestHandle,
  getShapeAnchorPorts,
  hitTestAnchorPort,
} from '../core/geometry/hitTest.js';
import {
  chaikinSmooth,
  pointsToSvgPath,
  renderSmoothPathToCanvas,
} from '../core/geometry/smoothing.js';
import {
  getShapeBounds,
  getRotatedBounds,
  boxesIntersect,
  pointInBox,
  getEnclosingBounds,
} from '../core/spatial/BoundingBox.js';

describe('Geometry Transforms', () => {
  it('rotates a point around a center correctly', () => {
    const pt = rotatePoint(100, 50, 50, 50, 90);
    expect(pt.x).toBeCloseTo(50, 1);
    expect(pt.y).toBeCloseTo(100, 1);
  });

  it('handles 0 degree rotation as identity', () => {
    const pt = rotatePoint(120, 80, 50, 50, 0);
    expect(pt.x).toBe(120);
    expect(pt.y).toBe(80);
  });

  it('converts screen to world coordinates and back', () => {
    const pan = { x: 100, y: 50 };
    const zoom = 2;
    const world = screenToWorld(300, 250, pan.x, pan.y, zoom);
    expect(world.x).toBe(100);
    expect(world.y).toBe(100);

    const screen = worldToScreen(world.x, world.y, pan.x, pan.y, zoom);
    expect(screen.x).toBe(300);
    expect(screen.y).toBe(250);
  });

  it('computes shape center for standard, linear, and arrow shapes', () => {
    const rect = { x: 100, y: 100, width: 200, height: 100 };
    expect(getShapeCenter(rect)).toEqual({ x: 200, y: 150 });

    const line = { type: 'line', x: 0, y: 0, width: 100, height: 100 };
    expect(getShapeCenter(line)).toEqual({ x: 50, y: 50 });

    const arrow = { type: 'arrow', x1: 20, y1: 30, x2: 80, y2: 70 };
    expect(getShapeCenter(arrow)).toEqual({ x: 50, y: 50 });

    const connector = {
      type: 'connector',
      points: [{ x: 10, y: 20 }, { x: 50, y: 80 }],
    };
    expect(getShapeCenter(connector)).toEqual({ x: 30, y: 50 });
  });

  it('generates 8 selection handles plus rotation handle, with and without rotation', () => {
    const bounds = { x: 0, y: 0, width: 100, height: 100 };
    const handles = getSelectionHandles(bounds, 0);
    expect(handles.nw).toEqual({ x: 0, y: 0 });
    expect(handles.se).toEqual({ x: 100, y: 100 });
    expect(handles.rot).toEqual({ x: 50, y: -24 });

    const rotatedHandles = getSelectionHandles(bounds, 90);
    expect(rotatedHandles.rot.x).toBeCloseTo(124, 0);
    expect(rotatedHandles.rot.y).toBeCloseTo(50, 0);
  });

  it('resizes shape correctly for various handles (nw, ne, sw, n, s, e, w)', () => {
    const initial = { x: 50, y: 50, width: 100, height: 100, rotation: 0 };

    const nw = computeResize({
      handle: 'nw',
      initialShape: initial,
      currentMouse: { x: 30, y: 40 },
      startMouse: { x: 50, y: 50 },
    });
    expect(nw.x).toBe(30);
    expect(nw.width).toBe(120);

    const eH = computeResize({
      handle: 'e',
      initialShape: initial,
      currentMouse: { x: 170, y: 100 },
      startMouse: { x: 150, y: 100 },
    });
    expect(eH.width).toBe(120);

    const sH = computeResize({
      handle: 's',
      initialShape: initial,
      currentMouse: { x: 100, y: 180 },
      startMouse: { x: 100, y: 150 },
    });
    expect(sH.height).toBe(130);

    const wH = computeResize({
      handle: 'w',
      initialShape: initial,
      currentMouse: { x: 40, y: 100 },
      startMouse: { x: 50, y: 100 },
    });
    expect(wH.x).toBe(40);
    expect(wH.width).toBe(110);

    const nH = computeResize({
      handle: 'n',
      initialShape: initial,
      currentMouse: { x: 100, y: 30 },
      startMouse: { x: 100, y: 50 },
    });
    expect(nH.y).toBe(30);
    expect(nH.height).toBe(120);

    const neH = computeResize({
      handle: 'ne',
      initialShape: initial,
      currentMouse: { x: 170, y: 30 },
      startMouse: { x: 150, y: 50 },
    });
    expect(neH.width).toBe(120);
    expect(neH.height).toBe(120);

    const swH = computeResize({
      handle: 'sw',
      initialShape: initial,
      currentMouse: { x: 30, y: 170 },
      startMouse: { x: 50, y: 150 },
    });
    expect(swH.width).toBe(120);
    expect(swH.height).toBe(120);
  });

  it('handles negative width and height flipping and rotated center compensation', () => {
    const initial = { x: 100, y: 100, width: 80, height: 80, rotation: 45 };
    const flipped = computeResize({
      handle: 'se',
      initialShape: initial,
      currentMouse: { x: 50, y: 50 },
      startMouse: { x: 180, y: 180 },
    });
    expect(flipped.width).toBeGreaterThanOrEqual(5);
    expect(flipped.height).toBeGreaterThanOrEqual(5);
  });
});

describe('Hit Testing', () => {
  it('detects point in rectangle and text', () => {
    const rect = { type: 'rect', x: 50, y: 50, width: 100, height: 100 };
    expect(isPointInShape(75, 75, rect)).toBe(true);
    expect(isPointInShape(10, 10, rect)).toBe(false);

    const text = { type: 'text', x: 50, y: 50, width: 100, height: 30 };
    expect(isPointInShape(70, 60, text)).toBe(true);
    expect(isPointInShape(70, 95, text)).toBe(false);
  });

  it('detects point in ellipse', () => {
    const ellipse = { type: 'ellipse', x: 50, y: 50, width: 100, height: 100 };
    expect(isPointInShape(100, 100, ellipse)).toBe(true);
    expect(isPointInShape(52, 52, ellipse)).toBe(false);

    const zeroEllipse = { type: 'ellipse', x: 50, y: 50, width: 0, height: 0 };
    expect(isPointInShape(50, 50, zeroEllipse, 0)).toBe(false);
  });

  it('detects point near line, arrow, and connector', () => {
    const line = { type: 'line', x: 0, y: 0, width: 100, height: 0, strokeWidth: 2 };
    expect(isPointInShape(50, 2, line, 5)).toBe(true);
    expect(isPointInShape(50, 25, line, 5)).toBe(false);

    const arrow = { type: 'arrow', x1: 0, y1: 0, x2: 100, y2: 0, strokeWidth: 2 };
    expect(isPointInShape(50, 2, arrow, 5)).toBe(true);

    const conn = {
      type: 'connector',
      points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 100 }],
      strokeWidth: 2,
    };
    expect(isPointInShape(25, 0, conn, 5)).toBe(true);
    expect(isPointInShape(50, 50, conn, 5)).toBe(true);
    expect(isPointInShape(80, 50, conn, 5)).toBe(false);

    const emptyConn = { type: 'connector', points: [] };
    expect(isPointInShape(10, 10, emptyConn)).toBe(false);
  });

  it('detects point in group and group hierarchy', () => {
    const group = {
      type: 'group',
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      children: [
        { type: 'rect', x: 10, y: 10, width: 50, height: 50 },
        { type: 'rect', x: 100, y: 100, width: 50, height: 50 },
      ],
    };
    expect(isPointInShape(20, 20, group)).toBe(true);
    expect(isPointInShape(120, 120, group)).toBe(true);
    expect(isPointInShape(80, 80, group)).toBe(false);

    const emptyGroup = { type: 'group', x: 10, y: 10, width: 50, height: 50, children: [] };
    expect(isPointInShape(20, 20, emptyGroup)).toBe(true);
    expect(isPointInShape(80, 80, emptyGroup)).toBe(false);
  });

  it('handles null shape and unknown types safely', () => {
    expect(isPointInShape(0, 0, null)).toBe(false);
    expect(isPointInShape(0, 0, { type: 'unknown' })).toBe(false);
  });

  it('calculates distToSegment correctly for point-segment cases', () => {
    
    expect(distToSegment(10, 10, 10, 10, 10, 10)).toBe(0);
    expect(distToSegment(13, 14, 10, 10, 10, 10)).toBe(5);
  });

  it('hit tests selection handles and anchor ports', () => {
    const bounds = { x: 0, y: 0, width: 100, height: 100 };
    expect(hitTestHandle(0, 0, bounds, 0, 8)).toBe('nw');
    expect(hitTestHandle(100, 100, bounds, 0, 8)).toBe('se');
    expect(hitTestHandle(50, -24, bounds, 0, 8)).toBe('rot');
    expect(hitTestHandle(50, 50, bounds, 0, 8)).toBe(null);

    const rect = { type: 'rect', x: 0, y: 0, width: 100, height: 100 };
    const snap = hitTestAnchorPort(98, 51, rect, 10);
    expect(snap?.portId).toBe('right');
    expect(hitTestAnchorPort(200, 200, rect, 10)).toBe(null);
  });
});

describe('Stroke Smoothing & Canvas Rendering', () => {
  it('smooths points using Chaikin algorithm for small and large arrays', () => {
    expect(chaikinSmooth(null)).toEqual([]);
    expect(chaikinSmooth([{ x: 0, y: 0 }])).toEqual([{ x: 0, y: 0 }]);

    const raw = [{ x: 0, y: 0 }, { x: 50, y: 100 }, { x: 100, y: 0 }];
    const smoothed = chaikinSmooth(raw, 2);
    expect(smoothed.length).toBeGreaterThan(raw.length);
  });

  it('converts points to smooth SVG path strings for 0, 1, 2, and N points', () => {
    expect(pointsToSvgPath([])).toBe('');
    expect(pointsToSvgPath([{ x: 10, y: 10 }])).toBe('M 10 10 L 10 10');
    expect(pointsToSvgPath([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBe('M 0 0 L 10 10');

    const pts = [{ x: 10, y: 10 }, { x: 20, y: 30 }, { x: 40, y: 50 }];
    expect(pointsToSvgPath(pts)).toContain('Q');
  });

  it('renders smooth path to canvas context', () => {
    const mockCtx = {
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
    };

    renderSmoothPathToCanvas(mockCtx, []);
    expect(mockCtx.moveTo).not.toHaveBeenCalled();

    renderSmoothPathToCanvas(mockCtx, [{ x: 5, y: 5 }]);
    expect(mockCtx.moveTo).toHaveBeenCalledWith(5, 5);

    renderSmoothPathToCanvas(mockCtx, [{ x: 0, y: 0 }, { x: 10, y: 10 }]);
    expect(mockCtx.lineTo).toHaveBeenCalledWith(10, 10);

    renderSmoothPathToCanvas(mockCtx, [{ x: 0, y: 0 }, { x: 20, y: 20 }, { x: 40, y: 40 }]);
    expect(mockCtx.quadraticCurveTo).toHaveBeenCalled();
  });
});

describe('Bounding Box & Rotated Bounds', () => {
  it('calculates bounds for shapes of all types', () => {
    expect(getShapeBounds(null)).toEqual({ x: 0, y: 0, width: 0, height: 0 });

    const ellipse = { type: 'ellipse', x: 20, y: 30, width: 80, height: 60 };
    const eb = getShapeBounds(ellipse);
    expect(eb.width).toBe(80);
    expect(eb.height).toBe(60);

    const path = { type: 'path', points: [{ x: 10, y: 20 }, { x: 50, y: 60 }] };
    expect(getShapeBounds(path)).toEqual({ x: 10, y: 20, width: 40, height: 40 });

    const emptyPath = { type: 'path', points: [] };
    expect(getShapeBounds(emptyPath).width).toBe(0);

    const emptyGroup = { type: 'group', children: [] };
    expect(getShapeBounds(emptyGroup).width).toBe(0);

    const fallback = { type: 'other', x: 5, y: 10, width: 20, height: 30 };
    expect(getShapeBounds(fallback)).toEqual({ x: 5, y: 10, width: 20, height: 30 });
  });

  it('computes rotated bounds accurately', () => {
    const shape = { type: 'rect', x: 0, y: 0, width: 100, height: 100, rotation: 45 };
    const rb = getRotatedBounds(shape);
    expect(rb.width).toBeCloseTo(141.42, 1);
    expect(rb.height).toBeCloseTo(141.42, 1);

    const unrotated = { type: 'rect', x: 10, y: 10, width: 50, height: 50, rotation: 0 };
    expect(getRotatedBounds(unrotated)).toEqual({ x: 10, y: 10, width: 50, height: 50 });
  });

  it('calculates enclosing bounds for multiple shapes including empty array', () => {
    expect(getEnclosingBounds([])).toBe(null);
    expect(getEnclosingBounds(null)).toBe(null);

    const shapes = [
      { type: 'rect', x: 10, y: 20, width: 30, height: 40 },
      { type: 'rect', x: 100, y: 80, width: 50, height: 20 },
    ];
    const enc = getEnclosingBounds(shapes);
    expect(enc).toEqual({ x: 10, y: 20, width: 140, height: 80 });
  });
});
