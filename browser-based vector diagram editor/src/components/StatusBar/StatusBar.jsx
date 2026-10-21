import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  zoomIn,
  zoomOut,
  resetZoom,
  setGridEnabled,
  setSnapEnabled,
} from '../../features/editor/editorSlice.js';

import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import GridOnIcon from '@mui/icons-material/GridOn';
import GridOffIcon from '@mui/icons-material/GridOff';
import MagnetIcon from '@mui/icons-material/LinearScale';

export default function StatusBar() {
  const dispatch = useDispatch();
  const fps = useSelector(state => state.editor.fps);
  const shapes = useSelector(state => state.editor.shapes);
  const zoom = useSelector(state => state.editor.zoom);
  const gridEnabled = useSelector(state => state.editor.gridEnabled);
  const snapEnabled = useSelector(state => state.editor.snapEnabled);

  return (
    <>
      
      <div className="floating-hud bottom-left" role="status" aria-label="Performance Stats">
        <div className="hud-pill">
          <span className="pulse-indicator" />
          <span className="hud-metric">{fps} FPS</span>
          <span className="hud-divider" />
          <span className="hud-text">
            <strong>{shapes.length.toLocaleString()}</strong> shapes
          </span>
        </div>
      </div>

      <div className="floating-hud bottom-center" role="toolbar" aria-label="Canvas Zoom and Grid Controls">
        <div className="hud-pill zoom-dock">
          <button
            className="hud-btn"
            onClick={() => dispatch(zoomOut())}
            title="Zoom Out (Ctrl+-)"
            aria-label="Zoom Out"
          >
            <ZoomOutIcon fontSize="small" />
          </button>

          <button
            className="hud-btn zoom-value-btn"
            onClick={() => dispatch(resetZoom())}
            title="Reset Zoom to 100% (Ctrl+0)"
            aria-label="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            className="hud-btn"
            onClick={() => dispatch(zoomIn())}
            title="Zoom In (Ctrl++)"
            aria-label="Zoom In"
          >
            <ZoomInIcon fontSize="small" />
          </button>

          <span className="hud-divider" />

          <button
            className={`hud-btn ${gridEnabled ? 'active' : ''}`}
            onClick={() => dispatch(setGridEnabled(!gridEnabled))}
            title="Toggle Background Grid (G)"
            aria-label="Toggle Grid"
          >
            {gridEnabled ? <GridOnIcon fontSize="small" /> : <GridOffIcon fontSize="small" />}
          </button>

          <button
            className={`hud-btn ${snapEnabled ? 'active' : ''}`}
            onClick={() => dispatch(setSnapEnabled(!snapEnabled))}
            title="Toggle Magnetic Snapping (S)"
            aria-label="Toggle Snapping"
          >
            <MagnetIcon fontSize="small" />
          </button>

          <button
            className="hud-btn"
            onClick={() => dispatch(resetZoom())}
            title="Fit to Screen"
            aria-label="Fit to Screen"
          >
            <RestartAltIcon fontSize="small" />
          </button>
        </div>
      </div>
    </>
  );
}
