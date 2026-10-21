import React, { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setTool,
  deleteSelected,
  duplicateSelected,
  generateStressShapes,
  setAnnouncement,
  loadProjectData,
} from '../../features/editor/editorSlice.js';
import { exportToJson, exportToSvg, exportToPng, importFromJsonFile } from '../../core/storage/fileExport.js';
import { saveProjectToDB, loadProjectFromDB } from '../../core/storage/indexedDB.js';

import NearMeIcon from '@mui/icons-material/NearMe';
import PanToolIcon from '@mui/icons-material/PanTool';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import EastIcon from '@mui/icons-material/East';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import CreateIcon from '@mui/icons-material/Create';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

export default function Toolbar({ onUndo, onRedo, canUndo, canRedo, onOpenShortcuts }) {
  const dispatch = useDispatch();
  const activeTool = useSelector(state => state.editor.activeTool);
  const selectedIds = useSelector(state => state.editor.selectedIds);
  const shapes = useSelector(state => state.editor.shapes);
  const pan = useSelector(state => state.editor.pan);
  const zoom = useSelector(state => state.editor.zoom);

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  React.useEffect(() => {
    const handleGlobalClick = e => {
      if (!e.target.closest('.dropdown-wrapper')) {
        setExportMenuOpen(false);
        setFileMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', handleGlobalClick);
    return () => window.removeEventListener('pointerdown', handleGlobalClick);
  }, []);

  const tools = [
    { id: 'select', label: 'Select', shortcut: 'V', icon: <NearMeIcon fontSize="small" /> },
    { id: 'hand', label: 'Hand', shortcut: 'H', icon: <PanToolIcon fontSize="small" /> },
    { id: 'rect', label: 'Rectangle', shortcut: 'R', icon: <CropSquareIcon fontSize="small" /> },
    { id: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: <RadioButtonUncheckedIcon fontSize="small" /> },
    { id: 'line', label: 'Line', shortcut: 'L', icon: <HorizontalRuleIcon fontSize="small" /> },
    { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: <EastIcon fontSize="small" /> },
    { id: 'connector', label: 'Connector', shortcut: 'C', icon: <AltRouteIcon fontSize="small" /> },
    { id: 'text', label: 'Text', shortcut: 'T', icon: <TextFieldsIcon fontSize="small" /> },
    { id: 'path', label: 'Draw', shortcut: 'P', icon: <CreateIcon fontSize="small" /> },
  ];

  const handleExportJson = () => {
    exportToJson({ shapes, pan, zoom, version: '1.0' });
    setExportMenuOpen(false);
    dispatch(setAnnouncement('Exported diagram as JSON'));
  };

  const handleExportSvg = () => {
    exportToSvg(shapes, { filename: 'vectorcraft-diagram.svg' });
    setExportMenuOpen(false);
    dispatch(setAnnouncement('Exported diagram as SVG'));
  };

  const handleExportPng = () => {
    exportToPng(shapes, { filename: 'vectorcraft-diagram.png' });
    setExportMenuOpen(false);
    dispatch(setAnnouncement('Exported diagram as PNG'));
  };

  const handleManualSave = async () => {
    await saveProjectToDB('active-diagram', { shapes, pan, zoom });
    dispatch(setAnnouncement('Project saved to IndexedDB'));
    setFileMenuOpen(false);
  };

  const handleManualLoad = async () => {
    const project = await loadProjectFromDB('active-diagram');
    if (project) {
      dispatch(loadProjectData(project));
      dispatch(setAnnouncement('Project restored from IndexedDB'));
    }
    setFileMenuOpen(false);
  };

  const handleFileImport = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importFromJsonFile(file);
      dispatch(loadProjectData(data));
      dispatch(setAnnouncement('Imported diagram from JSON file'));
    } catch {
      dispatch(setAnnouncement('Failed to parse JSON file'));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFileMenuOpen(false);
  };

  return (
    <header className="app-header" role="banner">
      
      <div className="header-left">
        <div className="app-brand">
          <div className="brand-gem">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#6366f1" />
              <path d="M2 17L12 22L22 17" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12L12 17L22 12" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="brand-meta">
            <div className="brand-title-row">
              <span className="brand-name">VectorCraft</span>
              <span className="doc-pill">Diagram 1</span>
            </div>
            <div className="save-status">
              <CheckCircleOutlineIcon fontSize="inherit" style={{ color: '#10b981' }} />
              <span>Autosaved</span>
            </div>
          </div>
        </div>

        <div className="dropdown-wrapper">
          <button
            className="menu-trigger-btn"
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
          >
            <span>File</span>
            <KeyboardArrowDownIcon fontSize="inherit" />
          </button>

          {fileMenuOpen && (
            <div className="dropdown-popover">
              <button className="dropdown-item" onClick={handleManualSave}>
                <CloudUploadIcon fontSize="small" />
                <span>Save to IndexedDB</span>
              </button>
              <button className="dropdown-item" onClick={handleManualLoad}>
                <CloudDownloadIcon fontSize="small" />
                <span>Restore from IndexedDB</span>
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileDownloadIcon fontSize="small" />
                <span>Open JSON File...</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <nav className="header-center" role="navigation" aria-label="Main Drawing Tools">
        <div className="tool-dock">
          {tools.map(tool => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                className={`dock-btn ${isActive ? 'active' : ''}`}
                onClick={() => dispatch(setTool(tool.id))}
                title={`${tool.label} (${tool.shortcut})`}
                aria-label={`${tool.label} tool`}
                aria-pressed={isActive}
              >
                {tool.icon}
                <span className="hotkey-badge">{tool.shortcut}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="header-right">
        
        <div className="btn-segmented">
          <button
            className="seg-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <UndoIcon fontSize="small" />
          </button>
          <button
            className="seg-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <RedoIcon fontSize="small" />
          </button>
          <button
            className="seg-btn"
            onClick={() => dispatch(deleteSelected())}
            disabled={selectedIds.length === 0}
            title="Delete Selected (Del)"
            aria-label="Delete"
          >
            <DeleteOutlineIcon fontSize="small" />
          </button>
        </div>

        <button
          className="benchmark-chip"
          onClick={() => dispatch(generateStressShapes(5000))}
          title="Stress test with 5,000 shapes at 60 FPS"
          aria-label="Generate 5000 shapes benchmark"
        >
          <FlashOnIcon fontSize="small" />
          <span>5K Stress Test</span>
        </button>

        <div className="dropdown-wrapper">
          <button
            className="primary-export-btn"
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
          >
            <span>Export</span>
            <KeyboardArrowDownIcon fontSize="inherit" />
          </button>

          {exportMenuOpen && (
            <div className="dropdown-popover right-align">
              <button className="dropdown-item" onClick={handleExportSvg}>
                <PictureAsPdfIcon fontSize="small" />
                <span>Vector SVG</span>
              </button>
              <button className="dropdown-item" onClick={handleExportPng}>
                <ImageIcon fontSize="small" />
                <span>High-Res PNG (Retina 2x)</span>
              </button>
              <button className="dropdown-item" onClick={handleExportJson}>
                <FileDownloadIcon fontSize="small" />
                <span>Diagram JSON</span>
              </button>
            </div>
          )}
        </div>

        <button
          className="icon-circle-btn"
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts (?)"
          aria-label="Shortcuts"
        >
          <HelpOutlineIcon fontSize="small" />
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleFileImport}
      />
    </header>
  );
}
