import React from 'react';
import { useSelector } from 'react-redux';

export default function AccessibilityLive() {
  const announcement = useSelector(state => state.editor.announcement);

  return (
    <div
      className="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {announcement}
    </div>
  );
}
