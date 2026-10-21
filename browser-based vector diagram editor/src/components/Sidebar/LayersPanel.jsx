import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setSelectedIds,
  addShape,
  deleteSelected,
  bringForward,
  sendBackward,
} from '../../features/editor/editorSlice.js';

import LayersIcon from '@mui/icons-material/Layers';
import WidgetsIcon from '@mui/icons-material/Widgets';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import CreateIcon from '@mui/icons-material/Create';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import EastIcon from '@mui/icons-material/East';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import StorageIcon from '@mui/icons-material/Storage';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';

export default function LayersPanel({ collapsed, onToggleCollapse }) {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('layers'); 

  const shapes = useSelector(state => state.editor.shapes);
  const selectedIds = useSelector(state => state.editor.selectedIds);
  const pan = useSelector(state => state.editor.pan);
  const zoom = useSelector(state => state.editor.zoom);

  const getShapeIcon = type => {
    switch (type) {
      case 'rect':
        return <CropSquareIcon fontSize="inherit" />;
      case 'ellipse':
        return <RadioButtonUncheckedIcon fontSize="inherit" />;
      case 'line':
        return <HorizontalRuleIcon fontSize="inherit" />;
      case 'arrow':
        return <EastIcon fontSize="inherit" />;
      case 'connector':
        return <AltRouteIcon fontSize="inherit" />;
      case 'text':
        return <TextFieldsIcon fontSize="inherit" />;
      case 'path':
        return <CreateIcon fontSize="inherit" />;
      default:
        return <CropSquareIcon fontSize="inherit" />;
    }
  };

  const getShapeName = (shape, index) => {
    if (shape.text) return shape.text;
    if (shape.type === 'rect') return `Rectangle ${shapes.length - index}`;
    if (shape.type === 'ellipse') return `Ellipse ${shapes.length - index}`;
    if (shape.type === 'connector') return `Connector ${shapes.length - index}`;
    if (shape.type === 'path') return `Freehand ${shapes.length - index}`;
    if (shape.type === 'arrow') return `Arrow ${shapes.length - index}`;
    if (shape.type === 'line') return `Line ${shapes.length - index}`;
    return `Shape ${shapes.length - index}`;
  };

  const handleAddStencil = stencilType => {
    
    const viewCenterX = (window.innerWidth / 2 - pan.x) / zoom;
    const viewCenterY = (window.innerHeight / 2 - pan.y) / zoom;

    let newShape = null;

    if (stencilType === 'process') {
      newShape = {
        id: `process-${Date.now()}`,
        type: 'rect',
        x: viewCenterX - 80,
        y: viewCenterY - 40,
        width: 160,
        height: 80,
        rx: 8,
        stroke: '#6366f1',
        fill: 'rgba(99, 102, 241, 0.12)',
        strokeWidth: 2,
        opacity: 1,
      };
    } else if (stencilType === 'decision') {
      newShape = {
        id: `decision-${Date.now()}`,
        type: 'rect',
        x: viewCenterX - 60,
        y: viewCenterY - 60,
        width: 120,
        height: 120,
        rotation: 45,
        rx: 4,
        stroke: '#f59e0b',
        fill: 'rgba(245, 158, 11, 0.12)',
        strokeWidth: 2,
        opacity: 1,
      };
    } else if (stencilType === 'note') {
      newShape = {
        id: `note-${Date.now()}`,
        type: 'rect',
        x: viewCenterX - 80,
        y: viewCenterY - 60,
        width: 160,
        height: 120,
        rx: 4,
        stroke: '#fbbf24',
        fill: '#fef3c7',
        strokeWidth: 1,
        opacity: 0.95,
      };
    } else if (stencilType === 'database') {
      newShape = {
        id: `db-${Date.now()}`,
        type: 'ellipse',
        x: viewCenterX - 70,
        y: viewCenterY - 45,
        width: 140,
        height: 90,
        radiusX: 70,
        radiusY: 45,
        stroke: '#10b981',
        fill: 'rgba(16, 185, 129, 0.12)',
        strokeWidth: 2,
        opacity: 1,
      };
    }

    if (newShape) {
      dispatch(addShape(newShape));
    }
  };

  if (collapsed) {
    return (
      <button
        className="sidebar-toggle-btn collapsed"
        onClick={onToggleCollapse}
        title="Expand Layers Panel"
        aria-label="Expand Layers Panel"
      >
        <ChevronRightIcon fontSize="small" />
      </button>
    );
  }

  return (
    <aside className="sidebar-panel" aria-label="Layers and Stencils Panel">
      <div className="sidebar-header">
        <div className="tab-group">
          <button
            className={`tab-btn ${activeTab === 'layers' ? 'active' : ''}`}
            onClick={() => setActiveTab('layers')}
          >
            <LayersIcon fontSize="inherit" />
            <span>Layers</span>
            <span className="badge">{shapes.length}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'stencils' ? 'active' : ''}`}
            onClick={() => setActiveTab('stencils')}
          >
            <WidgetsIcon fontSize="inherit" />
            <span>Stencils</span>
          </button>
        </div>

        <button
          className="sidebar-close-btn"
          onClick={onToggleCollapse}
          title="Collapse Panel"
          aria-label="Collapse Panel"
        >
          <ChevronLeftIcon fontSize="small" />
        </button>
      </div>

      <div className="sidebar-content">
        {activeTab === 'layers' ? (
          <div className="layers-tree">
            {shapes.length === 0 ? (
              <div className="empty-state">
                <span>No shapes yet</span>
                <span className="sub-text">Use drawing tools to create</span>
              </div>
            ) : (
              
              [...shapes].reverse().map((shape, revIdx) => {
                const isSelected = selectedIds.includes(shape.id);
                return (
                  <div
                    key={shape.id}
                    className={`layer-item ${isSelected ? 'selected' : ''}`}
                    onClick={e => {
                      if (e.shiftKey) {
                        dispatch(setSelectedIds([...selectedIds, shape.id]));
                      } else {
                        dispatch(setSelectedIds([shape.id]));
                      }
                    }}
                  >
                    <span className="layer-icon" style={{ color: shape.stroke || '#94a3b8' }}>
                      {getShapeIcon(shape.type)}
                    </span>
                    <span className="layer-title">{getShapeName(shape, revIdx)}</span>
                    <span className="layer-type">{shape.type}</span>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="stencils-palette">
            <div className="stencil-grid">
              <button
                className="stencil-card"
                onClick={() => handleAddStencil('process')}
                title="Add Process Block"
              >
                <div className="stencil-preview rect-preview" />
                <span>Process Step</span>
              </button>

              <button
                className="stencil-card"
                onClick={() => handleAddStencil('decision')}
                title="Add Decision Diamond"
              >
                <div className="stencil-preview diamond-preview" />
                <span>Decision</span>
              </button>

              <button
                className="stencil-card"
                onClick={() => handleAddStencil('database')}
                title="Add Database Cylinder"
              >
                <StorageIcon fontSize="medium" style={{ color: '#10b981' }} />
                <span>Database</span>
              </button>

              <button
                className="stencil-card"
                onClick={() => handleAddStencil('note')}
                title="Add Sticky Note"
              >
                <NoteAltIcon fontSize="medium" style={{ color: '#fbbf24' }} />
                <span>Sticky Note</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
