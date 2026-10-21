import React from 'react';
import CloseIcon from '@mui/icons-material/Close';

export default function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'V', desc: 'Select Tool' },
    { key: 'H', desc: 'Hand / Pan Tool' },
    { key: 'R', desc: 'Rectangle' },
    { key: 'O', desc: 'Ellipse' },
    { key: 'L', desc: 'Line' },
    { key: 'A', desc: 'Arrow' },
    { key: 'C', desc: 'Smart Connector' },
    { key: 'T', desc: 'Text Tool' },
    { key: 'P', desc: 'Pencil / Freehand' },
    { key: 'Ctrl + Z', desc: 'Undo' },
    { key: 'Ctrl + Y', desc: 'Redo' },
    { key: 'Ctrl + C', desc: 'Copy' },
    { key: 'Ctrl + V', desc: 'Paste' },
    { key: 'Ctrl + D', desc: 'Duplicate' },
    { key: 'Ctrl + G', desc: 'Group' },
    { key: 'Ctrl + Shift + G', desc: 'Ungroup' },
    { key: 'Del / Backspace', desc: 'Delete Selected' },
    { key: 'Arrow Keys', desc: 'Nudge 1px (Shift + Arrow for 10px)' },
    { key: 'Tab / Shift + Tab', desc: 'Cycle shape focus' },
    { key: 'Ctrl + 0', desc: 'Reset Zoom to 100%' },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Keyboard Shortcuts</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close shortcuts modal">
            <CloseIcon fontSize="small" />
          </button>
        </div>
        <div className="modal-body">
          <div className="shortcuts-grid">
            {shortcuts.map((sc, i) => (
              <div key={i} className="shortcut-row">
                <kbd className="shortcut-key">{sc.key}</kbd>
                <span className="shortcut-desc">{sc.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
