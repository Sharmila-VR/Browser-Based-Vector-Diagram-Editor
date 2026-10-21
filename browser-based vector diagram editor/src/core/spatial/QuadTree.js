import { boxesIntersect, pointInBox } from './BoundingBox.js';

export class QuadTree {
  constructor(boundary, maxItems = 16, maxDepth = 8, depth = 0) {
    this.boundary = boundary; 
    this.maxItems = maxItems;
    this.maxDepth = maxDepth;
    this.depth = depth;
    this.items = [];
    this.divided = false;
    this.children = [];
  }

  subdivide() {
    const { x, y, width, height } = this.boundary;
    const halfW = width / 2;
    const halfH = height / 2;
    const nextDepth = this.depth + 1;

    this.children = [
      new QuadTree({ x, y, width: halfW, height: halfH }, this.maxItems, this.maxDepth, nextDepth),
      new QuadTree({ x: x + halfW, y, width: halfW, height: halfH }, this.maxItems, this.maxDepth, nextDepth),
      new QuadTree({ x, y: y + halfH, width: halfW, height: halfH }, this.maxItems, this.maxDepth, nextDepth),
      new QuadTree({ x: x + halfW, y: y + halfH, width: halfW, height: halfH }, this.maxItems, this.maxDepth, nextDepth),
    ];

    this.divided = true;

    const existingItems = this.items;
    this.items = [];
    for (let i = 0; i < existingItems.length; i++) {
      this.insert(existingItems[i]);
    }
  }

  insert(item) {
    if (!item) return false;
    const itemBox = item.bounds || item;

    if (!boxesIntersect(this.boundary, itemBox)) {
      return false;
    }

    if (!this.divided) {
      if (this.items.length < this.maxItems || this.depth >= this.maxDepth) {
        this.items.push(item);
        return true;
      }
      this.subdivide();
    }

    let inserted = false;
    for (let i = 0; i < this.children.length; i++) {
      if (boxesIntersect(this.children[i].boundary, itemBox)) {
        if (this.children[i].insert(item)) {
          inserted = true;
        }
      }
    }

    return inserted;
  }

  query(box, result = new Set()) {
    if (!boxesIntersect(this.boundary, box)) {
      return result;
    }

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const itemBox = item.bounds || item;
      if (boxesIntersect(itemBox, box)) {
        result.add(item);
      }
    }

    if (this.divided) {
      for (let i = 0; i < this.children.length; i++) {
        this.children[i].query(box, result);
      }
    }

    return result;
  }

  queryPoint(px, py, result = new Set()) {
    if (!pointInBox(px, py, this.boundary)) {
      return result;
    }

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const itemBox = item.bounds || item;
      if (pointInBox(px, py, itemBox)) {
        result.add(item);
      }
    }

    if (this.divided) {
      for (let i = 0; i < this.children.length; i++) {
        this.children[i].queryPoint(px, py, result);
      }
    }

    return result;
  }

  clear() {
    this.items = [];
    this.divided = false;
    this.children = [];
  }

  rebuild(items) {
    this.clear();
    if (!items || items.length === 0) return;

    for (let i = 0; i < items.length; i++) {
      this.insert(items[i]);
    }
  }

  remove(itemId) {
    let removed = false;
    const idx = this.items.findIndex(it => it.id === itemId);
    if (idx !== -1) {
      this.items.splice(idx, 1);
      removed = true;
    }

    if (this.divided) {
      for (let i = 0; i < this.children.length; i++) {
        if (this.children[i].remove(itemId)) {
          removed = true;
        }
      }
    }

    return removed;
  }
}
