import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  updateShape,
  updateShapes,
  setActiveColor,
  setActiveFill,
  setActiveStrokeWidth,
  bringForward,
  sendBackward,
  bringToFront,
  sendToBack,
  groupSelected,
  ungroupSelected,
  setGridEnabled,
  setSnapEnabled,
  setGridSize,
} from '../../features/editor/editorSlice.js';
import { getShapeBounds } from '../../core/spatial/BoundingBox.js';

import AlignHorizontalLeftIcon from '@mui/icons-material/AlignHorizontalLeft';
import AlignHorizontalCenterIcon from '@mui/icons-material/AlignHorizontalCenter';
import AlignHorizontalRightIcon from '@mui/icons-material/AlignHorizontalRight';
import AlignVerticalTopIcon from '@mui/icons-material/AlignVerticalTop';
import AlignVerticalCenterIcon from '@mui/icons-material/AlignVerticalCenter';
import AlignVerticalBottomIcon from '@mui/icons-material/AlignVerticalBottom';
import FlipToFrontIcon from '@mui/icons-material/FlipToFront';
import FlipToBackIcon from '@mui/icons-material/FlipToBack';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import TuneIcon from '@mui/icons-material/Tune';
import GridOnIcon from '@mui/icons-material/GridOn';
import MagnetIcon from '@mui/icons-material/LinearScale';

const CURATED_PALETTE = [
  { name: 'Indigo', val: '#6366f1' },
  { name: 'Sky', val: '#0ea5e9' },
  { name: 'Cyan', val: '#06b6d4' },
  { name: 'Emerald', val: '#10b981' },
  { name: 'Amber', val: '#f59e0b' },
  { name: 'Rose', val: '#f43f5e' },
  { name: 'White', val: '#ffffff' },
  { name: 'Slate', val: '#475569' },
];

export default function PropertyPanel() {
  const dispatch = useDispatch();
  const selectedIds = useSelector(state => state.editor.selectedIds);
  const shapes = useSelector(state => state.editor.shapes);
  const activeColor = useSelector(state => state.editor.activeColor);
  const activeFill = useSelector(state => state.editor.activeFill);
  const activeStrokeWidth = useSelector(state => state.editor.activeStrokeWidth);
  const gridEnabled = useSelector(state => state.editor.gridEnabled);
  const snapEnabled = useSelector(state => state.editor.snapEnabled);
  const gridSize = useSelector(state => state.editor.gridSize);

  const selectedShapes = shapes.filter(s => selectedIds.includes(s.id));
  const primaryShape = selectedShapes[0];
  const primaryBounds = primaryShape ? getShapeBounds(primaryShape) : null;

  const handleStrokeChange = color => {
    dispatch(setActiveColor(color));
    selectedShapes.forEach(s => {
      dispatch(updateShape({ id: s.id, changes: { stroke: color } }));
    });
  };

  const handleFillChange = color => {
    dispatch(setActiveFill(color));
    selectedShapes.forEach(s => {
      dispatch(updateShape({ id: s.id, changes: { fill: color } }));
    });
  };

  const handleWidthChange = width => {
    dispatch(setActiveStrokeWidth(width));
    selectedShapes.forEach(s => {
      dispatch(updateShape({ id: s.id, changes: { strokeWidth: width } }));
    });
  };

  const handlePositionChange = (axis, val) => {
    if (!primaryShape) return;
    const num = parseFloat(val) || 0;
    dispatch(updateShape({ id: primaryShape.id, changes: { [axis]: num } }));
  };

  const handleDimensionChange = (dim, val) => {
    if (!primaryShape) return;
    const num = Math.max(5, parseFloat(val) || 5);
    dispatch(updateShape({ id: primaryShape.id, changes: { [dim]: num } }));
  };

  const handleRotationChange = deg => {
    if (!primaryShape) return;
    dispatch(updateShape({ id: primaryShape.id, changes: { rotation: Number(deg) || 0 } }));
  };

  const handleRadiusChange = rx => {
    if (!primaryShape || primaryShape.type !== 'rect') return;
    dispatch(updateShape({ id: primaryShape.id, changes: { rx: Number(rx) || 0 } }));
  };

  const handleOpacityChange = op => {
    const val = parseFloat(op);
    selectedShapes.forEach(s => {
      dispatch(updateShape({ id: s.id, changes: { opacity: val } }));
    });
  };

  const handleAlign = direction => {
    if (selectedShapes.length < 2) return;
    const boundsList = selectedShapes.map(s => ({
      shape: s,
      b: getShapeBounds(s),
    }));

    const updates = [];

    if (direction === 'left') {
      const minLeft = Math.min(...boundsList.map(item => item.b.x));
      boundsList.forEach(item => updates.push({ id: item.shape.id, x: minLeft }));
    } else if (direction === 'center') {
      const minLeft = Math.min(...boundsList.map(item => item.b.x));
      const maxRight = Math.max(...boundsList.map(item => item.b.x + item.b.width));
      const center = (minLeft + maxRight) / 2;
      boundsList.forEach(item => updates.push({ id: item.shape.id, x: center - item.b.width / 2 }));
    } else if (direction === 'right') {
      const maxRight = Math.max(...boundsList.map(item => item.b.x + item.b.width));
      boundsList.forEach(item => updates.push({ id: item.shape.id, x: maxRight - item.b.width }));
    } else if (direction === 'top') {
      const minTop = Math.min(...boundsList.map(item => item.b.y));
      boundsList.forEach(item => updates.push({ id: item.shape.id, y: minTop }));
    } else if (direction === 'middle') {
      const minTop = Math.min(...boundsList.map(item => item.b.y));
      const maxBottom = Math.max(...boundsList.map(item => item.b.y + item.b.height));
      const middle = (minTop + maxBottom) / 2;
      boundsList.forEach(item => updates.push({ id: item.shape.id, y: middle - item.b.height / 2 }));
    } else if (direction === 'bottom') {
      const maxBottom = Math.max(...boundsList.map(item => item.b.y + item.b.height));
      boundsList.forEach(item => updates.push({ id: item.shape.id, y: maxBottom - item.b.height }));
    }

    if (updates.length > 0) {
      dispatch(updateShapes(updates));
    }
  };

  return (
    <aside className="inspector-panel" aria-label="Design Inspector">
      <div className="inspector-header">
        <div className="inspector-title-row">
          <TuneIcon fontSize="small" style={{ color: '#818cf8' }} />
          <span className="inspector-title">
            {selectedShapes.length === 0
              ? 'Canvas Settings'
              : selectedShapes.length === 1
              ? `${primaryShape.type.toUpperCase()}`
              : `${selectedShapes.length} Shapes Selected`}
          </span>
        </div>
      </div>

      <div className="inspector-content">
        
        {selectedShapes.length === 0 && (
          <div className="inspector-group">
            <span className="group-heading">Canvas Preferences</span>
            <div className="control-toggle-row">
              <span className="label">Snap to Guides</span>
              <button
                className={`switch-btn ${snapEnabled ? 'on' : ''}`}
                onClick={() => dispatch(setSnapEnabled(!snapEnabled))}
              >
                <div className="switch-knob" />
              </button>
            </div>

            <div className="control-toggle-row">
              <span className="label">Background Grid</span>
              <button
                className={`switch-btn ${gridEnabled ? 'on' : ''}`}
                onClick={() => dispatch(setGridEnabled(!gridEnabled))}
              >
                <div className="switch-knob" />
              </button>
            </div>

            <div className="control-row">
              <span className="label">Grid Pitch</span>
              <div className="input-with-badge">
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={gridSize}
                  onChange={e => dispatch(setGridSize(Number(e.target.value) || 20))}
                  className="modern-input"
                />
                <span className="badge">px</span>
              </div>
            </div>
          </div>
        )}

        {selectedShapes.length >= 2 && (
          <div className="inspector-group">
            <span className="group-heading">Alignment</span>
            <div className="icon-grid">
              <button
                className="grid-icon-btn"
                onClick={() => handleAlign('left')}
                title="Align Left"
              >
                <AlignHorizontalLeftIcon fontSize="small" />
              </button>
              <button
                className="grid-icon-btn"
                onClick={() => handleAlign('center')}
                title="Align Center"
              >
                <AlignHorizontalCenterIcon fontSize="small" />
              </button>
              <button
                className="grid-icon-btn"
                onClick={() => handleAlign('right')}
                title="Align Right"
              >
                <AlignHorizontalRightIcon fontSize="small" />
              </button>
              <button
                className="grid-icon-btn"
                onClick={() => handleAlign('top')}
                title="Align Top"
              >
                <AlignVerticalTopIcon fontSize="small" />
              </button>
              <button
                className="grid-icon-btn"
                onClick={() => handleAlign('middle')}
                title="Align Middle"
              >
                <AlignVerticalCenterIcon fontSize="small" />
              </button>
              <button
                className="grid-icon-btn"
                onClick={() => handleAlign('bottom')}
                title="Align Bottom"
              >
                <AlignVerticalBottomIcon fontSize="small" />
              </button>
            </div>

            <div className="button-group-row">
              <button
                className="action-pill-btn"
                onClick={() => dispatch(groupSelected())}
              >
                <FolderIcon fontSize="small" />
                <span>Group Shapes</span>
              </button>
            </div>
          </div>
        )}

        {primaryShape && primaryBounds && (
          <div className="inspector-group">
            <span className="group-heading">Transform</span>
            <div className="two-col-grid">
              <div className="field-group">
                <span className="field-label">X</span>
                <input
                  type="number"
                  value={Math.round(primaryShape.x || 0)}
                  onChange={e => handlePositionChange('x', e.target.value)}
                  className="modern-input"
                />
              </div>
              <div className="field-group">
                <span className="field-label">Y</span>
                <input
                  type="number"
                  value={Math.round(primaryShape.y || 0)}
                  onChange={e => handlePositionChange('y', e.target.value)}
                  className="modern-input"
                />
              </div>
              <div className="field-group">
                <span className="field-label">W</span>
                <input
                  type="number"
                  value={Math.round(primaryShape.width || 0)}
                  onChange={e => handleDimensionChange('width', e.target.value)}
                  className="modern-input"
                />
              </div>
              <div className="field-group">
                <span className="field-label">H</span>
                <input
                  type="number"
                  value={Math.round(primaryShape.height || 0)}
                  onChange={e => handleDimensionChange('height', e.target.value)}
                  className="modern-input"
                />
              </div>
            </div>

            <div className="two-col-grid mt-2">
              <div className="field-group">
                <span className="field-label">∠</span>
                <input
                  type="number"
                  value={Math.round(primaryShape.rotation || 0)}
                  onChange={e => handleRotationChange(e.target.value)}
                  className="modern-input"
                />
              </div>
              {primaryShape.type === 'rect' ? (
                <div className="field-group">
                  <span className="field-label">R</span>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={primaryShape.rx || 0}
                    onChange={e => handleRadiusChange(e.target.value)}
                    className="modern-input"
                  />
                </div>
              ) : (
                <div className="field-group">
                  <span className="field-label">α</span>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={Math.round((primaryShape.opacity ?? 1) * 100)}
                    onChange={e => handleOpacityChange(Number(e.target.value) / 100)}
                    className="modern-input"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {primaryShape && (
          <div className="inspector-group">
            <span className="group-heading">Text & Label</span>
            <textarea
              className="modern-textarea"
              placeholder="Type label or text content..."
              value={primaryShape.text || ''}
              onChange={e => dispatch(updateShape({ id: primaryShape.id, changes: { text: e.target.value } }))}
              rows={2}
            />
            <div className="two-col-grid mt-2">
              <div className="field-group">
                <span className="field-label">Size</span>
                <input
                  type="number"
                  min="10"
                  max="64"
                  value={primaryShape.fontSize || (primaryShape.type === 'text' ? 16 : 13)}
                  onChange={e => dispatch(updateShape({ id: primaryShape.id, changes: { fontSize: Number(e.target.value) || 14 } }))}
                  className="modern-input"
                />
              </div>
              <div className="color-row">
                <input
                  type="color"
                  className="native-color-picker"
                  value={primaryShape.textColor || '#ffffff'}
                  onChange={e => dispatch(updateShape({ id: primaryShape.id, changes: { textColor: e.target.value } }))}
                />
                <span className="hex-label">Text Color</span>
              </div>
            </div>
          </div>
        )}

        <div className="inspector-group">
          <span className="group-heading">Fill</span>
          <div className="color-row">
            <input
              type="color"
              className="native-color-picker"
              value={primaryShape?.fill && primaryShape.fill !== 'transparent' ? primaryShape.fill : '#1e1b4b'}
              onChange={e => handleFillChange(e.target.value)}
            />
            <button
              className={`chip-preset ${primaryShape?.fill === 'transparent' ? 'active' : ''}`}
              onClick={() => handleFillChange('transparent')}
            >
              None
            </button>
            <button
              className="chip-preset"
              onClick={() => handleFillChange('rgba(99, 102, 241, 0.15)')}
            >
              Tint
            </button>
          </div>
          <div className="swatches-grid">
            {CURATED_PALETTE.map(c => (
              <button
                key={c.name}
                className="swatch-btn"
                style={{ backgroundColor: c.val }}
                onClick={() => handleFillChange(c.val)}
                title={c.name}
              />
            ))}
          </div>
        </div>

        <div className="inspector-group">
          <span className="group-heading">Stroke</span>
          <div className="color-row">
            <input
              type="color"
              className="native-color-picker"
              value={primaryShape?.stroke || activeColor}
              onChange={e => handleStrokeChange(e.target.value)}
            />
            <span className="hex-label">{primaryShape?.stroke || activeColor}</span>
          </div>

          <div className="stroke-width-pills">
            {[1, 2, 3, 4, 6].map(w => (
              <button
                key={w}
                className={`w-pill ${
                  (primaryShape ? primaryShape.strokeWidth : activeStrokeWidth) === w ? 'active' : ''
                }`}
                onClick={() => handleWidthChange(w)}
              >
                {w}px
              </button>
            ))}
          </div>
        </div>

        {selectedShapes.length > 0 && (
          <div className="inspector-group">
            <span className="group-heading">Layer Order</span>
            <div className="icon-grid four-col">
              <button
                className="grid-icon-btn"
                onClick={() => dispatch(bringToFront())}
                title="Bring to Front"
              >
                <FlipToFrontIcon fontSize="small" />
              </button>
              <button
                className="grid-icon-btn"
                onClick={() => dispatch(bringForward())}
                title="Bring Forward"
              >
                <ArrowUpwardIcon fontSize="small" />
              </button>
              <button
                className="grid-icon-btn"
                onClick={() => dispatch(sendBackward())}
                title="Send Backward"
              >
                <ArrowDownwardIcon fontSize="small" />
              </button>
              <button
                className="grid-icon-btn"
                onClick={() => dispatch(sendToBack())}
                title="Send to Back"
              >
                <FlipToBackIcon fontSize="small" />
              </button>
            </div>

            {primaryShape?.type === 'group' && (
              <div className="mt-2">
                <button
                  className="action-pill-btn secondary"
                  onClick={() => dispatch(ungroupSelected())}
                >
                  <FolderOpenIcon fontSize="small" />
                  <span>Ungroup</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
