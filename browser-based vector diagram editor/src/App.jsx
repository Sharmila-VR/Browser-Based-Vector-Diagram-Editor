import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setTool,
  deleteSelected,
  duplicateSelected,
  copySelected,
  paste,
  groupSelected,
  ungroupSelected,
  resetZoom,
  updateShapes,
  setSelectedIds,
  loadProjectData,
  setAnnouncement,
} from './features/editor/editorSlice.js';
import { HistoryManager } from './features/editor/historyManager.js';
import { saveProjectToDB, loadProjectFromDB } from './core/storage/indexedDB.js';

import Toolbar from './components/Toolbar/Toolbar.jsx';
import LayersPanel from './components/Sidebar/LayersPanel.jsx';
import PropertyPanel from './components/PropertyPanel/PropertyPanel.jsx';
import Canvas from './components/Canvas/Canvas.jsx';
import Minimap from './components/Minimap/Minimap.jsx';
import StatusBar from './components/StatusBar/StatusBar.jsx';
import ShortcutsModal from './components/ShortcutsModal/ShortcutsModal.jsx';
import AccessibilityLive from './components/Accessibility/AccessibilityLive.jsx';

export default function App() {
  const dispatch = useDispatch();

  const shapes = useSelector(state => state.editor.shapes);
  const selectedIds = useSelector(state => state.editor.selectedIds);
  const pan = useSelector(state => state.editor.pan);
  const zoom = useSelector(state => state.editor.zoom);

  const historyManager = useMemo(() => new HistoryManager(50), []);
  const [, setHistoryVersion] = useState(0);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [layersCollapsed, setLayersCollapsed] = useState(false);

  const handleUndo = () => {
    if (historyManager.canUndo()) {
      const cmd = historyManager.undo();
      setHistoryVersion(v => v + 1);
      dispatch(setAnnouncement(`Undid: ${cmd?.name || 'action'}`));
    }
  };

  const handleRedo = () => {
    if (historyManager.canRedo()) {
      const cmd = historyManager.redo();
      setHistoryVersion(v => v + 1);
      dispatch(setAnnouncement(`Redid: ${cmd?.name || 'action'}`));
    }
  };

  const autosaveTimeoutRef = useRef(null);
  useEffect(() => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    autosaveTimeoutRef.current = setTimeout(() => {
      saveProjectToDB('active-diagram', { shapes, pan, zoom });
    }, 1500);

    return () => clearTimeout(autosaveTimeoutRef.current);
  }, [shapes, pan, zoom]);

  useEffect(() => {
    async function restore() {
      const saved = await loadProjectFromDB('active-diagram');
      if (saved && saved.shapes && saved.shapes.length > 0) {
        const isOldSimpleDemo = saved.shapes.some(s => s.id === 'demo-rect-1');
        if (!isOldSimpleDemo) {
          dispatch(loadProjectData(saved));
        }
      }
    }
    restore();
  }, [dispatch]);

  useEffect(() => {
    const handleKeyDown = e => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        dispatch(copySelected());
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        dispatch(paste());
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        dispatch(duplicateSelected());
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          dispatch(ungroupSelected());
        } else {
          dispatch(groupSelected());
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        dispatch(resetZoom());
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        dispatch(deleteSelected());
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        setLayersCollapsed(c => !c);
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          dispatch(setTool('select'));
          break;
        case 'h':
          dispatch(setTool('hand'));
          break;
        case 'r':
          dispatch(setTool('rect'));
          break;
        case 'o':
          dispatch(setTool('ellipse'));
          break;
        case 'l':
          dispatch(setTool('line'));
          break;
        case 'a':
          dispatch(setTool('arrow'));
          break;
        case 'c':
          dispatch(setTool('connector'));
          break;
        case 't':
          dispatch(setTool('text'));
          break;
        case 'p':
          dispatch(setTool('path'));
          break;
        default:
          break;
      }

      if (e.key === 'Tab' && shapes.length > 0) {
        e.preventDefault();
        const currentIdx = shapes.findIndex(s => s.id === selectedIds[0]);
        let nextIdx = 0;
        if (e.shiftKey) {
          nextIdx = currentIdx <= 0 ? shapes.length - 1 : currentIdx - 1;
        } else {
          nextIdx = currentIdx >= shapes.length - 1 ? 0 : currentIdx + 1;
        }
        dispatch(setSelectedIds([shapes[nextIdx].id]));
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;

        const updates = shapes
          .filter(s => selectedIds.includes(s.id))
          .map(s => ({
            id: s.id,
            x: (s.x || 0) + dx,
            y: (s.y || 0) + dy,
          }));
        dispatch(updateShapes(updates));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, shapes, selectedIds]);

  return (
    <div className="editor-root">
      <AccessibilityLive />

      <Toolbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyManager.canUndo()}
        canRedo={historyManager.canRedo()}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      <div className="editor-workspace">
        <LayersPanel
          collapsed={layersCollapsed}
          onToggleCollapse={() => setLayersCollapsed(c => !c)}
        />

        <main className="editor-canvas-container" role="main">
          <Canvas historyManager={historyManager} />
          <Minimap />
          <StatusBar />
        </main>

        <PropertyPanel />
      </div>

      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
    </div>
  );
}
