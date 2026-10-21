import { getShapeBounds } from '../spatial/BoundingBox.js';

export function snapToGrid(val, gridSize = 20) {
  return Math.round(val / gridSize) * gridSize;
}

export function computeSnapping({
  draggedBounds,
  otherShapes,
  threshold = 6,
  gridEnabled = false,
  gridSize = 20,
}) {
  const result = {
    dx: 0,
    dy: 0,
    guides: [],
  };

  if (!draggedBounds) return result;

  let gridDx = 0;
  let gridDy = 0;
  if (gridEnabled) {
    const targetX = snapToGrid(draggedBounds.x, gridSize);
    const targetY = snapToGrid(draggedBounds.y, gridSize);
    gridDx = targetX - draggedBounds.x;
    gridDy = targetY - draggedBounds.y;
  }

  if (!otherShapes || otherShapes.length === 0) {
    if (gridEnabled) {
      result.dx = gridDx;
      result.dy = gridDy;
    }
    return result;
  }

  const dragLeft = draggedBounds.x;
  const dragCenter = draggedBounds.x + draggedBounds.width / 2;
  const dragRight = draggedBounds.x + draggedBounds.width;

  const dragTop = draggedBounds.y;
  const dragMiddle = draggedBounds.y + draggedBounds.height / 2;
  const dragBottom = draggedBounds.y + draggedBounds.height;

  let bestDiffX = Infinity;
  let bestSnapX = null;
  let guideLineX = null;

  let bestDiffY = Infinity;
  let bestSnapY = null;
  let guideLineY = null;

  const otherBoundsList = otherShapes.map(s => getShapeBounds(s));

  for (let i = 0; i < otherBoundsList.length; i++) {
    const target = otherBoundsList[i];
    const targetLeft = target.x;
    const targetCenter = target.x + target.width / 2;
    const targetRight = target.x + target.width;

    const targetTop = target.y;
    const targetMiddle = target.y + target.height / 2;
    const targetBottom = target.y + target.height;

    const xChecks = [
      { diff: targetLeft - dragLeft, guideX: targetLeft },
      { diff: targetRight - dragLeft, guideX: targetRight },
      { diff: targetCenter - dragCenter, guideX: targetCenter },
      { diff: targetLeft - dragRight, guideX: targetLeft },
      { diff: targetRight - dragRight, guideX: targetRight },
    ];

    for (let j = 0; j < xChecks.length; j++) {
      const { diff, guideX } = xChecks[j];
      const absDiff = Math.abs(diff);
      if (absDiff <= threshold && absDiff < Math.abs(bestDiffX)) {
        bestDiffX = diff;
        bestSnapX = diff;
        guideLineX = {
          type: 'vertical',
          x: guideX,
          startY: Math.min(dragTop, targetTop) - 20,
          endY: Math.max(dragBottom, targetBottom) + 20,
        };
      }
    }

    const yChecks = [
      { diff: targetTop - dragTop, guideY: targetTop },
      { diff: targetBottom - dragTop, guideY: targetBottom },
      { diff: targetMiddle - dragMiddle, guideY: targetMiddle },
      { diff: targetTop - dragBottom, guideY: targetTop },
      { diff: targetBottom - dragBottom, guideY: targetBottom },
    ];

    for (let k = 0; k < yChecks.length; k++) {
      const { diff, guideY } = yChecks[k];
      const absDiff = Math.abs(diff);
      if (absDiff <= threshold && absDiff < Math.abs(bestDiffY)) {
        bestDiffY = diff;
        bestSnapY = diff;
        guideLineY = {
          type: 'horizontal',
          y: guideY,
          startX: Math.min(dragLeft, targetLeft) - 20,
          endX: Math.max(dragRight, targetRight) + 20,
        };
      }
    }
  }

  if (otherBoundsList.length >= 2) {
    for (let i = 0; i < otherBoundsList.length; i++) {
      for (let j = i + 1; j < otherBoundsList.length; j++) {
        const b1 = otherBoundsList[i];
        const b2 = otherBoundsList[j];

        if (b1.x + b1.width < b2.x) {
          const gap = (b2.x - b1.x - b1.width - draggedBounds.width) / 2;
          if (gap > 0) {
            const idealX = b1.x + b1.width + gap;
            const diff = idealX - dragLeft;
            if (Math.abs(diff) <= threshold && Math.abs(diff) < Math.abs(bestDiffX)) {
              bestDiffX = diff;
              bestSnapX = diff;
              guideLineX = {
                type: 'spacing-horizontal',
                gap: Math.round(gap),
                x: idealX,
                startX: b1.x + b1.width,
                endX: b2.x,
                y: dragMiddle,
              };
            }
          }
        }

        if (b1.y + b1.height < b2.y) {
          const gap = (b2.y - b1.y - b1.height - draggedBounds.height) / 2;
          if (gap > 0) {
            const idealY = b1.y + b1.height + gap;
            const diff = idealY - dragTop;
            if (Math.abs(diff) <= threshold && Math.abs(diff) < Math.abs(bestDiffY)) {
              bestDiffY = diff;
              bestSnapY = diff;
              guideLineY = {
                type: 'spacing-vertical',
                gap: Math.round(gap),
                y: idealY,
                startY: b1.y + b1.height,
                endY: b2.y,
                x: dragCenter,
              };
            }
          }
        }
      }
    }
  }

  if (bestSnapX !== null) {
    result.dx = bestSnapX;
    if (guideLineX) result.guides.push(guideLineX);
  } else if (gridEnabled) {
    result.dx = gridDx;
  }

  if (bestSnapY !== null) {
    result.dy = bestSnapY;
    if (guideLineY) result.guides.push(guideLineY);
  } else if (gridEnabled) {
    result.dy = gridDy;
  }

  return result;
}
