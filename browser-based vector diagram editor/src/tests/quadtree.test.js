import { describe, it, expect } from 'vitest';
import { QuadTree } from '../core/spatial/QuadTree.js';

describe('QuadTree Spatial Index', () => {
  it('inserts items and queries bounding boxes', () => {
    const qt = new QuadTree({ x: 0, y: 0, width: 1000, height: 1000 }, 4);

    const item1 = { id: '1', bounds: { x: 50, y: 50, width: 20, height: 20 } };
    const item2 = { id: '2', bounds: { x: 800, y: 800, width: 50, height: 50 } };

    qt.insert(item1);
    qt.insert(item2);

    const res1 = Array.from(qt.query({ x: 40, y: 40, width: 50, height: 50 }));
    expect(res1.length).toBe(1);
    expect(res1[0].id).toBe('1');

    const resOutside = Array.from(qt.query({ x: -200, y: -200, width: 50, height: 50 }));
    expect(resOutside.length).toBe(0);

    const resAll = Array.from(qt.query({ x: 0, y: 0, width: 1000, height: 1000 }));
    expect(resAll.length).toBe(2);
  });

  it('subdivides when maxItems is exceeded', () => {
    const qt = new QuadTree({ x: 0, y: 0, width: 100, height: 100 }, 2, 4);

    qt.insert({ id: '1', bounds: { x: 10, y: 10, width: 5, height: 5 } });
    qt.insert({ id: '2', bounds: { x: 20, y: 20, width: 5, height: 5 } });
    expect(qt.divided).toBe(false);

    qt.insert({ id: '3', bounds: { x: 80, y: 80, width: 5, height: 5 } });
    expect(qt.divided).toBe(true);
    expect(qt.children.length).toBe(4);

    expect(qt.insert(null)).toBe(false);
    expect(qt.insert({ id: 'outside', bounds: { x: 500, y: 500, width: 10, height: 10 } })).toBe(false);
  });

  it('queries point hits', () => {
    const qt = new QuadTree({ x: 0, y: 0, width: 200, height: 200 }, 2);
    const item = { id: 'target', bounds: { x: 40, y: 40, width: 20, height: 20 } };
    qt.insert(item);

    const hits = Array.from(qt.queryPoint(50, 50));
    expect(hits.length).toBe(1);
    expect(hits[0].id).toBe('target');

    const misses = Array.from(qt.queryPoint(100, 100));
    expect(misses.length).toBe(0);

    const outside = Array.from(qt.queryPoint(-50, -50));
    expect(outside.length).toBe(0);
  });

  it('removes items and rebuilds tree', () => {
    const qt = new QuadTree({ x: 0, y: 0, width: 500, height: 500 });
    const item1 = { id: '1', bounds: { x: 10, y: 10, width: 10, height: 10 } };
    const item2 = { id: '2', bounds: { x: 20, y: 20, width: 10, height: 10 } };

    qt.insert(item1);
    qt.insert(item2);
    expect(Array.from(qt.query({ x: 0, y: 0, width: 100, height: 100 })).length).toBe(2);

    expect(qt.remove('1')).toBe(true);
    expect(qt.remove('non-existent')).toBe(false);
    expect(Array.from(qt.query({ x: 0, y: 0, width: 100, height: 100 })).length).toBe(1);

    qt.rebuild([item1]);
    expect(Array.from(qt.query({ x: 0, y: 0, width: 100, height: 100 })).length).toBe(1);

    qt.rebuild([]);
    expect(Array.from(qt.query({ x: 0, y: 0, width: 100, height: 100 })).length).toBe(0);

    qt.rebuild(null);
    expect(Array.from(qt.query({ x: 0, y: 0, width: 100, height: 100 })).length).toBe(0);
  });
});
