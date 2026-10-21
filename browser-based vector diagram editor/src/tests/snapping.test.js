import { describe, it, expect } from 'vitest';
import { snapToGrid, computeSnapping } from '../core/geometry/snapping.js';

describe('Snapping System', () => {
  it('snaps coordinates to grid step', () => {
    expect(snapToGrid(23, 20)).toBe(20);
    expect(snapToGrid(35, 20)).toBe(40);
    expect(snapToGrid(10, 20)).toBe(20);
    expect(snapToGrid(0, 20)).toBe(0);
  });

  it('handles null draggedBounds safely', () => {
    const res = computeSnapping({ draggedBounds: null });
    expect(res.dx).toBe(0);
    expect(res.dy).toBe(0);
    expect(res.guides).toEqual([]);
  });

  it('snaps dragged shape to align with left edge of target shape', () => {
    const dragged = { x: 104, y: 50, width: 60, height: 40 };
    const target = { type: 'rect', x: 100, y: 150, width: 80, height: 60 };

    const result = computeSnapping({
      draggedBounds: dragged,
      otherShapes: [target],
      threshold: 8,
    });

    expect(result.dx).toBe(-4);
    expect(result.guides.length).toBeGreaterThan(0);
    expect(result.guides[0].type).toBe('vertical');
    expect(result.guides[0].x).toBe(100);
  });

  it('snaps dragged shape to center of target shape', () => {
    const target = { type: 'rect', x: 100, y: 100, width: 100, height: 100 }; 
    const dragged = { x: 122, y: 250, width: 60, height: 60 }; 

    const result = computeSnapping({
      draggedBounds: dragged,
      otherShapes: [target],
      threshold: 6,
    });

    expect(result.dx).toBe(-2);
    expect(result.guides.some(g => g.type === 'vertical' && g.x === 150)).toBe(true);
  });

  it('snaps dragged shape to top, middle, and bottom alignments', () => {
    const target = { type: 'rect', x: 200, y: 100, width: 80, height: 80 }; 

    const resTop = computeSnapping({
      draggedBounds: { x: 50, y: 103, width: 60, height: 40 },
      otherShapes: [target],
      threshold: 5,
    });
    expect(resTop.dy).toBe(-3);
    expect(resTop.guides.some(g => g.type === 'horizontal' && g.y === 100)).toBe(true);

    const resMid = computeSnapping({
      draggedBounds: { x: 50, y: 122, width: 60, height: 40 },
      otherShapes: [target],
      threshold: 5,
    });
    expect(resMid.dy).toBe(-2);

    const resBottom = computeSnapping({
      draggedBounds: { x: 50, y: 143, width: 60, height: 40 },
      otherShapes: [target],
      threshold: 5,
    });
    expect(resBottom.dy).toBe(-3);
  });

  it('detects equal horizontal and vertical spacing between shapes', () => {
    
    const s1 = { type: 'rect', x: 0, y: 50, width: 100, height: 50 };
    const s2 = { type: 'rect', x: 300, y: 50, width: 100, height: 50 };
    const draggedH = { x: 172, y: 50, width: 60, height: 50 };

    const resH = computeSnapping({
      draggedBounds: draggedH,
      otherShapes: [s1, s2],
      threshold: 6,
    });
    expect(resH.dx).toBe(-2);
    expect(resH.guides.some(g => g.type === 'spacing-horizontal')).toBe(true);

    const sV1 = { type: 'rect', x: 50, y: 0, width: 50, height: 100 };
    const sV2 = { type: 'rect', x: 50, y: 300, width: 50, height: 100 };
    const draggedV = { x: 50, y: 168, width: 50, height: 60 };

    const resV = computeSnapping({
      draggedBounds: draggedV,
      otherShapes: [sV1, sV2],
      threshold: 6,
    });
    expect(resV.dy).toBe(2);
    expect(resV.guides.some(g => g.type === 'spacing-vertical')).toBe(true);
  });

  it('applies grid snap when no guide snap matches', () => {
    const dragged = { x: 23, y: 47, width: 50, height: 50 };
    const result = computeSnapping({
      draggedBounds: dragged,
      otherShapes: [],
      threshold: 6,
      gridEnabled: true,
      gridSize: 20,
    });

    expect(result.dx).toBe(-3); 
    expect(result.dy).toBe(-7); 
  });
});
