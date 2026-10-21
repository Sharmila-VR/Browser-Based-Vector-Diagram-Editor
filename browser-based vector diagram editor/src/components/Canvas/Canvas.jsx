import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setPan,
  setZoom,
  setShapes,
  addShape,
  updateShape,
  updateShapes,
  setSelectedIds,
  toggleSelectShape,
  clearSelection,
  setFps,
} from '../../features/editor/editorSlice.js';
import { QuadTree } from '../../core/spatial/QuadTree.js';
import { getShapeBounds, boxesIntersect, getEnclosingBounds } from '../../core/spatial/BoundingBox.js';
import { screenToWorld, computeResize, rotatePoint } from '../../core/geometry/transforms.js';
import { isPointInShape, hitTestHandle, hitTestAnchorPort } from '../../core/geometry/hitTest.js';
import { computeSnapping } from '../../core/geometry/snapping.js';
import { chaikinSmooth } from '../../core/geometry/smoothing.js';
import {
  renderGrid,
  renderShape,
  renderSelectionOverlay,
  renderSnapGuides,
  renderConnectionPorts,
} from '../../core/canvas/renderEngine.js';
import { TransformShapesCommand, CreateShapesCommand } from '../../features/editor/historyManager.js';

export default function Canvas({ historyManager }) {
  const dispatch = useDispatch();
  const canvasRef = useRef(null);

  const shapes = useSelector(state => state.editor.shapes);
  const selectedIds = useSelector(state => state.editor.selectedIds);
  const activeTool = useSelector(state => state.editor.activeTool);
  const pan = useSelector(state => state.editor.pan);
  const zoom = useSelector(state => state.editor.zoom);
  const gridEnabled = useSelector(state => state.editor.gridEnabled);
  const gridSize = useSelector(state => state.editor.gridSize);
  const snapEnabled = useSelector(state => state.editor.snapEnabled);
  const activeColor = useSelector(state => state.editor.activeColor);
  const activeFill = useSelector(state => state.editor.activeFill);
  const activeStrokeWidth = useSelector(state => state.editor.activeStrokeWidth);

  const quadTreeRef = useRef(new QuadTree({ x: -20000, y: -20000, width: 40000, height: 40000 }));

  const interactionRef = useRef({
    mode: 'none', 
    startScreen: { x: 0, y: 0 },
    startWorld: { x: 0, y: 0 },
    lastScreen: { x: 0, y: 0 },
    activeHandle: null,
    dragStartShapes: [],
    marqueeBox: null,
    activeGuides: [],
    drawingPoints: [],
    tempShape: null,
    connectorTargetPort: null,
    connectorTargetShape: null,
  });

  const [editingText, setEditingText] = useState(null); 
  const textareaRef = useRef(null);

  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(performance.now());

  useEffect(() => {
    const items = shapes.map(s => ({
      id: s.id,
      shape: s,
      bounds: getShapeBounds(s),
    }));
    quadTreeRef.current.rebuild(items);
  }, [shapes]);

  useEffect(() => {
    let animId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const dpr = window.devicePixelRatio || 1;

      ctx.clearRect(0, 0, width, height);

      if (gridEnabled) {
        renderGrid(ctx, pan.x * dpr, pan.y * dpr, zoom, width, height, gridSize);
      } else {
        ctx.fillStyle = '#0f1117';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      const viewportWorld = {
        x: -pan.x / zoom,
        y: -pan.y / zoom,
        width: (width / dpr) / zoom,
        height: (height / dpr) / zoom,
      };

      const visibleCandidates = quadTreeRef.current.query(viewportWorld);
      const visibleIdSet = new Set();
      visibleCandidates.forEach(item => visibleIdSet.add(item.id));

      for (let i = 0; i < shapes.length; i++) {
        const s = shapes[i];
        if (s.type === 'connector' || visibleIdSet.has(s.id)) {
          renderShape(ctx, s);
        }
      }

      const inter = interactionRef.current;
      if (inter.tempShape) {
        renderShape(ctx, inter.tempShape);
      }
      if (inter.drawingPoints && inter.drawingPoints.length > 0) {
        renderShape(ctx, {
          type: 'path',
          points: inter.drawingPoints,
          stroke: activeColor,
          strokeWidth: activeStrokeWidth,
        });
      }

      const selectedShapes = shapes.filter(s => selectedIds.includes(s.id));
      renderSelectionOverlay(ctx, selectedShapes, zoom);

      if (inter.activeGuides && inter.activeGuides.length > 0) {
        renderSnapGuides(ctx, inter.activeGuides, zoom);
      }

      if (activeTool === 'connector' && inter.connectorTargetShape) {
        renderConnectionPorts(ctx, inter.connectorTargetShape, zoom);
      }

      if (inter.mode === 'marquee' && inter.marqueeBox) {
        const mb = inter.marqueeBox;
        ctx.save();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1 / zoom;
        ctx.setLineDash([4 / zoom, 4 / zoom]);
        ctx.fillRect(mb.x, mb.y, mb.width, mb.height);
        ctx.strokeRect(mb.x, mb.y, mb.width, mb.height);
        ctx.restore();
      }

      ctx.restore();

      frameCountRef.current++;
      const now = performance.now();
      if (now - lastFpsUpdateRef.current >= 1000) {
        const currentFps = Math.round((frameCountRef.current * 1000) / (now - lastFpsUpdateRef.current));
        dispatch(setFps(currentFps));
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = now;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [shapes, selectedIds, activeTool, pan, zoom, gridEnabled, gridSize, activeColor, activeStrokeWidth, dispatch]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleWheel = useCallback(
    e => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        
        const zoomFactor = Math.pow(0.992, e.deltaY);
        const newZoom = Math.max(0.05, Math.min(10, zoom * zoomFactor));

        const worldX = (cursorX - pan.x) / zoom;
        const worldY = (cursorY - pan.y) / zoom;

        const newPanX = cursorX - worldX * newZoom;
        const newPanY = cursorY - worldY * newZoom;

        dispatch(setZoom(newZoom));
        dispatch(setPan({ x: newPanX, y: newPanY }));
      } else {
        
        dispatch(
          setPan({
            x: pan.x - e.deltaX,
            y: pan.y - e.deltaY,
          })
        );
      }
    },
    [dispatch, pan, zoom]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handlePointerDown = e => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldPt = screenToWorld(sx, sy, pan.x, zoom ? pan.y : 0, zoom);

    const inter = interactionRef.current;
    inter.startScreen = { x: sx, y: sy };
    inter.lastScreen = { x: sx, y: sy };
    inter.startWorld = worldPt;
    inter.activeGuides = [];

    if (e.button === 1 || activeTool === 'hand' || e.spaceKey) {
      inter.mode = 'pan';
      return;
    }

    if (e.button !== 0) return;

    if (selectedIds.length === 1) {
      const selectedShape = shapes.find(s => s.id === selectedIds[0]);
      if (selectedShape) {
        const bounds = getShapeBounds(selectedShape);
        const handle = hitTestHandle(worldPt.x, worldPt.y, bounds, selectedShape.rotation || 0, 10 / zoom);
        if (handle) {
          inter.mode = handle === 'rot' ? 'rotate' : 'resize';
          inter.activeHandle = handle;
          inter.dragStartShapes = [JSON.parse(JSON.stringify(selectedShape))];
          return;
        }
      }
    }

    if (activeTool === 'connector') {
      inter.mode = 'connector';
      
      const candidateItem = [...shapes].reverse().find(s => isPointInShape(worldPt.x, worldPt.y, s, 10));
      let startBinding = null;
      let startPoint = worldPt;

      if (candidateItem) {
        const portSnap = hitTestAnchorPort(worldPt.x, worldPt.y, candidateItem, 20);
        if (portSnap) {
          startBinding = { shapeId: candidateItem.id, portId: portSnap.portId };
          startPoint = portSnap.point;
        }
      }

      inter.tempShape = {
        id: `connector-${Date.now()}`,
        type: 'connector',
        stroke: activeColor,
        strokeWidth: activeStrokeWidth,
        startBinding,
        endBinding: null,
        points: [startPoint, worldPt],
      };
      return;
    }

    if (['rect', 'ellipse', 'line', 'arrow'].includes(activeTool)) {
      inter.mode = 'create-shape';
      inter.tempShape = {
        id: `shape-${Date.now()}`,
        type: activeTool,
        x: worldPt.x,
        y: worldPt.y,
        width: 1,
        height: 1,
        stroke: activeColor,
        fill: activeFill,
        strokeWidth: activeStrokeWidth,
        rotation: 0,
        opacity: 1,
      };
      return;
    }

    if (activeTool === 'path') {
      inter.mode = 'draw-path';
      inter.drawingPoints = [worldPt];
      return;
    }

    if (activeTool === 'text') {
      const newTextShape = {
        id: `text-${Date.now()}`,
        type: 'text',
        x: worldPt.x,
        y: worldPt.y,
        width: 140,
        height: 30,
        text: '',
        stroke: '#ffffff',
        fill: '#ffffff',
        fontSize: 16,
        fontFamily: 'Inter, sans-serif',
      };
      dispatch(addShape(newTextShape));
      dispatch(setSelectedIds([newTextShape.id]));
      setEditingText(newTextShape);
      dispatch(setTool('select'));
      return;
    }

    const queryBox = { x: worldPt.x - 10, y: worldPt.y - 10, width: 20, height: 20 };
    const candidates = Array.from(quadTreeRef.current.query(queryBox)).map(it => it.shape);

    const reversed = [...candidates].reverse();
    const hit = reversed.find(s => isPointInShape(worldPt.x, worldPt.y, s, 6 / zoom));

    if (hit) {
      if (e.shiftKey) {
        dispatch(toggleSelectShape(hit.id));
      } else {
        if (!selectedIds.includes(hit.id)) {
          dispatch(setSelectedIds([hit.id]));
        }
      }
      inter.mode = 'drag-shape';
      const toDrag = shapes.filter(s => selectedIds.includes(s.id) || s.id === hit.id);
      inter.dragStartShapes = JSON.parse(JSON.stringify(toDrag));
    } else {
      if (!e.shiftKey) {
        dispatch(clearSelection());
      }
      inter.mode = 'marquee';
      inter.marqueeBox = { x: worldPt.x, y: worldPt.y, width: 0, height: 0 };
    }
  };

  const handlePointerMove = e => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldPt = screenToWorld(sx, sy, pan.x, pan.y, zoom);

    const inter = interactionRef.current;
    const dxScreen = sx - inter.lastScreen.x;
    const dyScreen = sy - inter.lastScreen.y;
    inter.lastScreen = { x: sx, y: sy };

    if (inter.mode === 'pan') {
      dispatch(setPan({ x: pan.x + dxScreen, y: pan.y + dyScreen }));
      return;
    }

    if (inter.mode === 'draw-path') {
      inter.drawingPoints.push(worldPt);
      return;
    }

    if (inter.mode === 'create-shape' && inter.tempShape) {
      const sw = inter.startWorld;
      const x = Math.min(sw.x, worldPt.x);
      const y = Math.min(sw.y, worldPt.y);
      const w = Math.abs(worldPt.x - sw.x);
      const h = Math.abs(worldPt.y - sw.y);

      inter.tempShape = {
        ...inter.tempShape,
        x,
        y,
        width: Math.max(5, w),
        height: Math.max(5, h),
        radiusX: w / 2,
        radiusY: h / 2,
      };
      return;
    }

    if (inter.mode === 'connector' && inter.tempShape) {
      
      const candidateShape = [...shapes].reverse().find(s => isPointInShape(worldPt.x, worldPt.y, s, 14));
      let endBinding = null;
      let endPoint = worldPt;

      if (candidateShape && candidateShape.id !== inter.tempShape.startBinding?.shapeId) {
        inter.connectorTargetShape = candidateShape;
        const portSnap = hitTestAnchorPort(worldPt.x, worldPt.y, candidateShape, 20);
        if (portSnap) {
          endBinding = { shapeId: candidateShape.id, portId: portSnap.portId };
          endPoint = portSnap.point;
        }
      } else {
        inter.connectorTargetShape = null;
      }

      const pStart = inter.tempShape.points[0];
      inter.tempShape = {
        ...inter.tempShape,
        endBinding,
        points: [pStart, endPoint],
      };
      return;
    }

    if (inter.mode === 'marquee') {
      const x = Math.min(inter.startWorld.x, worldPt.x);
      const y = Math.min(inter.startWorld.y, worldPt.y);
      const width = Math.abs(worldPt.x - inter.startWorld.x);
      const height = Math.abs(worldPt.y - inter.startWorld.y);

      inter.marqueeBox = { x, y, width, height };

      const candidates = Array.from(quadTreeRef.current.query(inter.marqueeBox)).map(it => it.shape);
      const selected = candidates
        .filter(s => boxesIntersect(inter.marqueeBox, getShapeBounds(s)))
        .map(s => s.id);

      dispatch(setSelectedIds(selected));
      return;
    }

    if (inter.mode === 'drag-shape' && inter.dragStartShapes.length > 0) {
      const rawDx = worldPt.x - inter.startWorld.x;
      const rawDy = worldPt.y - inter.startWorld.y;

      const groupBounds = getEnclosingBounds(inter.dragStartShapes);
      const proposedBounds = groupBounds
        ? {
            ...groupBounds,
            x: groupBounds.x + rawDx,
            y: groupBounds.y + rawDy,
          }
        : null;

      let finalDx = rawDx;
      let finalDy = rawDy;

      if (snapEnabled && proposedBounds) {
        const otherShapes = shapes.filter(s => !selectedIds.includes(s.id));
        const snap = computeSnapping({
          draggedBounds: proposedBounds,
          otherShapes,
          threshold: 8 / zoom,
          gridEnabled,
          gridSize,
        });

        finalDx += snap.dx;
        finalDy += snap.dy;
        inter.activeGuides = snap.guides;
      }

      const updates = inter.dragStartShapes.map(s => ({
        id: s.id,
        x: s.x + finalDx,
        y: s.y + finalDy,
      }));
      dispatch(updateShapes(updates));
      return;
    }

    if (inter.mode === 'resize' && inter.dragStartShapes.length === 1) {
      const initialShape = inter.dragStartShapes[0];
      const newGeom = computeResize({
        handle: inter.activeHandle,
        initialShape,
        currentMouse: worldPt,
        startMouse: inter.startWorld,
        aspectRatioLocked: e.shiftKey,
      });

      dispatch(updateShape({ id: initialShape.id, changes: newGeom }));
      return;
    }

    if (inter.mode === 'rotate' && inter.dragStartShapes.length === 1) {
      const initialShape = inter.dragStartShapes[0];
      const b = getShapeBounds(initialShape);
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;

      let angleDeg = (Math.atan2(worldPt.y - cy, worldPt.x - cx) * 180) / Math.PI + 90;
      if (angleDeg < 0) angleDeg += 360;

      if (e.shiftKey) {
        angleDeg = Math.round(angleDeg / 15) * 15;
      }

      dispatch(updateShape({ id: initialShape.id, changes: { rotation: Math.round(angleDeg) } }));
      return;
    }
  };

  const handlePointerUp = e => {
    const inter = interactionRef.current;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (inter.mode === 'draw-path' && inter.drawingPoints.length > 1) {
      const smoothed = chaikinSmooth(inter.drawingPoints, 2);
      const pathShape = {
        id: `path-${Date.now()}`,
        type: 'path',
        points: smoothed,
        stroke: activeColor,
        strokeWidth: activeStrokeWidth,
      };
      dispatch(addShape(pathShape));
      historyManager?.push(
        new CreateShapesCommand(
          [pathShape],
          s => dispatch(addShape(s[0])),
          ids => dispatch(setShapes(shapes.filter(s => !ids.includes(s.id))))
        )
      );
    }

    if (inter.mode === 'create-shape' && inter.tempShape) {
      if (inter.tempShape.width > 5 || inter.tempShape.height > 5) {
        dispatch(addShape(inter.tempShape));
        historyManager?.push(
          new CreateShapesCommand(
            [inter.tempShape],
            s => dispatch(addShape(s[0])),
            ids => dispatch(setShapes(shapes.filter(s => !ids.includes(s.id))))
          )
        );
      }
    }

    if (inter.mode === 'connector' && inter.tempShape) {
      const newConnector = inter.tempShape;
      dispatch(addShape(newConnector));
    }

    if (['drag-shape', 'resize', 'rotate'].includes(inter.mode) && inter.dragStartShapes.length > 0) {
      const beforeStates = inter.dragStartShapes;
      const afterStates = shapes.filter(s => beforeStates.some(b => b.id === s.id));
      historyManager?.push(
        new TransformShapesCommand(
          inter.mode === 'drag-shape' ? 'Move Shapes' : inter.mode === 'resize' ? 'Resize' : 'Rotate',
          beforeStates,
          afterStates,
          states => dispatch(updateShapes(states))
        )
      );
    }

    inter.mode = 'none';
    inter.activeHandle = null;
    inter.dragStartShapes = [];
    inter.marqueeBox = null;
    inter.activeGuides = [];
    inter.tempShape = null;
    inter.drawingPoints = [];
    inter.connectorTargetShape = null;
  };

  const handleDoubleClick = e => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldPt = screenToWorld(sx, sy, pan.x, pan.y, zoom);

    const hit = [...shapes].reverse().find(s => isPointInShape(worldPt.x, worldPt.y, s, 8 / zoom));
    if (hit) {
      dispatch(setSelectedIds([hit.id]));
      setEditingText({
        id: hit.id,
        x: hit.x,
        y: hit.y,
        width: hit.width || 120,
        height: hit.height || 40,
        text: hit.text || '',
        type: hit.type,
        fontSize: hit.fontSize || (hit.type === 'text' ? 16 : 14),
        fontFamily: hit.fontFamily || 'Inter, sans-serif',
        textColor: hit.textColor || '#ffffff',
      });
    } else {
      
      const newTextShape = {
        id: `text-${Date.now()}`,
        type: 'text',
        x: worldPt.x,
        y: worldPt.y,
        width: 140,
        height: 30,
        text: '',
        stroke: '#ffffff',
        fill: '#ffffff',
        fontSize: 16,
        fontFamily: 'Inter, sans-serif',
      };
      dispatch(addShape(newTextShape));
      dispatch(setSelectedIds([newTextShape.id]));
      setEditingText(newTextShape);
    }
  };

  const handleTextChange = e => {
    if (!editingText) return;
    const updated = { ...editingText, text: e.target.value };
    setEditingText(updated);
    dispatch(updateShape({ id: updated.id, changes: { text: e.target.value } }));
  };

  const handleTextKeyDown = e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setEditingText(null);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setEditingText(null);
    }
  };

  const handleTextBlur = () => {
    if (editingText) {
      if (editingText.type === 'text' && (!editingText.text || !editingText.text.trim())) {
        dispatch(deleteSelected());
      }
      setEditingText(null);
    }
  };

  useEffect(() => {
    if (editingText && textareaRef.current) {
      textareaRef.current.focus();
      if (editingText.text) {
        textareaRef.current.select();
      }
    }
  }, [editingText]);

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        className="diagram-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        tabIndex={0}
        role="region"
        aria-label="Vector Diagram Infinite Canvas"
      />

      {editingText && (
        <div
          className="inline-text-overlay-wrapper"
          style={{
            position: 'absolute',
            left: editingText.type === 'text'
              ? editingText.x * zoom + pan.x
              : (editingText.x + (editingText.width || 0) / 2) * zoom + pan.x,
            top: editingText.type === 'text'
              ? editingText.y * zoom + pan.y
              : (editingText.y + (editingText.height || 0) / 2) * zoom + pan.y,
            transform: editingText.type === 'text' ? 'none' : 'translate(-50%, -50%)',
            zIndex: 300,
          }}
          onPointerDown={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          <textarea
            ref={textareaRef}
            className="inline-text-editor"
            value={editingText.text}
            placeholder="Type text..."
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            onKeyDown={handleTextKeyDown}
            rows={Math.max(1, (editingText.text || '').split('\n').length)}
            style={{
              fontSize: `${(editingText.fontSize || 14) * zoom}px`,
              fontFamily: editingText.fontFamily || 'Inter, sans-serif',
              color: editingText.textColor || '#ffffff',
            }}
          />
        </div>
      )}
    </div>
  );
}
