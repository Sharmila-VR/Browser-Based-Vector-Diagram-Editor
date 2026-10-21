import React, { useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setPan } from '../../features/editor/editorSlice.js';
import { getEnclosingBounds } from '../../core/spatial/BoundingBox.js';

export default function Minimap() {
  const dispatch = useDispatch();
  const canvasRef = useRef(null);

  const shapes = useSelector(state => state.editor.shapes);
  const pan = useSelector(state => state.editor.pan);
  const zoom = useSelector(state => state.editor.zoom);

  const isDraggingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, width, height);

    if (shapes.length === 0) return;

    const totalBounds = getEnclosingBounds(shapes) || { x: 0, y: 0, width: 1000, height: 1000 };
    const pad = 100;
    const sceneX = totalBounds.x - pad;
    const sceneY = totalBounds.y - pad;
    const sceneW = Math.max(100, totalBounds.width + pad * 2);
    const sceneH = Math.max(100, totalBounds.height + pad * 2);

    const scale = Math.min(width / sceneW, height / sceneH);
    const offsetX = (width - sceneW * scale) / 2;
    const offsetY = (height - sceneH * scale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.translate(-sceneX, -sceneY);

    for (let i = 0; i < shapes.length; i++) {
      const s = shapes[i];
      ctx.fillStyle = s.stroke || '#38bdf8';
      ctx.fillRect(s.x || 0, s.y || 0, Math.max(4, s.width || 4), Math.max(4, s.height || 4));
    }

    const parentW = window.innerWidth;
    const parentH = window.innerHeight;

    const vpX = -pan.x / zoom;
    const vpY = -pan.y / zoom;
    const vpW = parentW / zoom;
    const vpH = parentH / zoom;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2 / scale;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.fillRect(vpX, vpY, vpW, vpH);
    ctx.strokeRect(vpX, vpY, vpW, vpH);

    ctx.restore();
  }, [shapes, pan, zoom]);

  const handleMinimapPointer = e => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const totalBounds = getEnclosingBounds(shapes) || { x: 0, y: 0, width: 1000, height: 1000 };
    const pad = 100;
    const sceneX = totalBounds.x - pad;
    const sceneY = totalBounds.y - pad;
    const sceneW = Math.max(100, totalBounds.width + pad * 2);
    const sceneH = Math.max(100, totalBounds.height + pad * 2);

    const scale = Math.min(canvas.width / sceneW, canvas.height / sceneH);
    const offsetX = (canvas.width - sceneW * scale) / 2;
    const offsetY = (canvas.height - sceneH * scale) / 2;

    const worldX = (mx - offsetX) / scale + sceneX;
    const worldY = (my - offsetY) / scale + sceneY;

    const targetPanX = window.innerWidth / 2 - worldX * zoom;
    const targetPanY = window.innerHeight / 2 - worldY * zoom;

    dispatch(setPan({ x: targetPanX, y: targetPanY }));
  };

  return (
    <div className="minimap-container" aria-label="Canvas Minimap">
      <canvas
        ref={canvasRef}
        width={180}
        height={120}
        className="minimap-canvas"
        onPointerDown={e => {
          isDraggingRef.current = true;
          handleMinimapPointer(e);
        }}
        onPointerMove={e => {
          if (isDraggingRef.current) handleMinimapPointer(e);
        }}
        onPointerUp={() => {
          isDraggingRef.current = false;
        }}
      />
    </div>
  );
}
