import { createSlice } from '@reduxjs/toolkit';
import { getShapeBounds } from '../../core/spatial/BoundingBox.js';
import { routeOrthogonal } from '../../core/routing/orthogonalRouter.js';
import { getShapeAnchorPorts } from '../../core/geometry/hitTest.js';

const initialState = {
  shapes: [
    {
      id: 'node-client-web',
      type: 'rect',
      x: 80,
      y: 180,
      width: 170,
      height: 70,
      rx: 8,
      text: 'Web Client\n(Next.js App)',
      stroke: '#0ea5e9',
      fill: 'rgba(14, 165, 233, 0.15)',
      strokeWidth: 2,
      opacity: 1,
    },
    {
      id: 'node-client-mobile',
      type: 'rect',
      x: 80,
      y: 310,
      width: 170,
      height: 70,
      rx: 8,
      text: 'Mobile Client\n(React Native iOS/Android)',
      stroke: '#0ea5e9',
      fill: 'rgba(14, 165, 233, 0.15)',
      strokeWidth: 2,
      opacity: 1,
    },
    {
      id: 'node-edge',
      type: 'rect',
      x: 340,
      y: 240,
      width: 170,
      height: 80,
      rx: 8,
      text: 'Cloudflare Edge\n(DDoS & TLS WAF)',
      stroke: '#f59e0b',
      fill: 'rgba(245, 158, 11, 0.15)',
      strokeWidth: 2,
      opacity: 1,
    },
    {
      id: 'node-gateway',
      type: 'rect',
      x: 590,
      y: 240,
      width: 180,
      height: 80,
      rx: 8,
      text: 'API Gateway\n(Envoy / JWT Auth)',
      stroke: '#6366f1',
      fill: 'rgba(99, 102, 241, 0.15)',
      strokeWidth: 2,
      opacity: 1,
    },
    {
      id: 'node-auth',
      type: 'rect',
      x: 860,
      y: 120,
      width: 190,
      height: 75,
      rx: 8,
      text: 'Auth Service\n(OAuth2 / Sessions)',
      stroke: '#10b981',
      fill: 'rgba(16, 185, 129, 0.15)',
      strokeWidth: 2,
      opacity: 1,
    },
    {
      id: 'node-rag',
      type: 'rect',
      x: 860,
      y: 240,
      width: 190,
      height: 80,
      rx: 8,
      text: 'Vector & RAG Engine\n(Embeddings Search)',
      stroke: '#38bdf8',
      fill: 'rgba(56, 189, 248, 0.15)',
      strokeWidth: 2,
      opacity: 1,
    },
    {
      id: 'node-worker',
      type: 'rect',
      x: 860,
      y: 370,
      width: 190,
      height: 75,
      rx: 8,
      text: 'Async Worker Queue\n(BullMQ / Jobs)',
      stroke: '#ec4899',
      fill: 'rgba(236, 72, 153, 0.15)',
      strokeWidth: 2,
      opacity: 1,
    },
    {
      id: 'node-db-postgres',
      type: 'ellipse',
      x: 1140,
      y: 120,
      width: 160,
      height: 75,
      radiusX: 80,
      radiusY: 37.5,
      text: 'PostgreSQL DB\n(Primary Store)',
      stroke: '#10b981',
      fill: 'rgba(16, 185, 129, 0.15)',
      strokeWidth: 2,
      opacity: 1,
    },
    {
      id: 'node-db-vector',
      type: 'ellipse',
      x: 1140,
      y: 240,
      width: 160,
      height: 80,
      radiusX: 80,
      radiusY: 40,
      text: 'Pinecone Vector DB\n(Embeddings Index)',
      stroke: '#38bdf8',
      fill: 'rgba(56, 189, 248, 0.15)',
      strokeWidth: 2,
      opacity: 1,
    },
    {
      id: 'node-db-redis',
      type: 'ellipse',
      x: 1140,
      y: 370,
      width: 160,
      height: 75,
      radiusX: 80,
      radiusY: 37.5,
      text: 'Redis Cluster\n(Distributed Cache)',
      stroke: '#ec4899',
      fill: 'rgba(236, 72, 153, 0.15)',
      strokeWidth: 2,
      opacity: 1,
    },
    {
      id: 'node-note',
      type: 'rect',
      x: 340,
      y: 410,
      width: 430,
      height: 90,
      rx: 6,
      text: '💡 Interactive Diagram Instructions:\n• Drag any service card to test real-time orthogonal re-routing\n• Double-click any shape to edit its text label directly\n• Press 5K Benchmark above to test 5,000 shapes at 60 FPS',
      textColor: '#92400e',
      stroke: '#f59e0b',
      fill: '#fef3c7',
      strokeWidth: 1.5,
      opacity: 0.95,
    },
    
    {
      id: 'conn-web-edge',
      type: 'connector',
      stroke: '#0ea5e9',
      strokeWidth: 2,
      startBinding: { shapeId: 'node-client-web', portId: 'right' },
      endBinding: { shapeId: 'node-edge', portId: 'left' },
      points: [{ x: 250, y: 215 }, { x: 340, y: 280 }],
    },
    {
      id: 'conn-mobile-edge',
      type: 'connector',
      stroke: '#0ea5e9',
      strokeWidth: 2,
      startBinding: { shapeId: 'node-client-mobile', portId: 'right' },
      endBinding: { shapeId: 'node-edge', portId: 'left' },
      points: [{ x: 250, y: 345 }, { x: 340, y: 280 }],
    },
    {
      id: 'conn-edge-gateway',
      type: 'connector',
      stroke: '#f59e0b',
      strokeWidth: 2,
      startBinding: { shapeId: 'node-edge', portId: 'right' },
      endBinding: { shapeId: 'node-gateway', portId: 'left' },
      points: [{ x: 510, y: 280 }, { x: 590, y: 280 }],
    },
    {
      id: 'conn-gateway-auth',
      type: 'connector',
      stroke: '#6366f1',
      strokeWidth: 2,
      startBinding: { shapeId: 'node-gateway', portId: 'right' },
      endBinding: { shapeId: 'node-auth', portId: 'left' },
      points: [{ x: 770, y: 280 }, { x: 860, y: 157 }],
    },
    {
      id: 'conn-gateway-rag',
      type: 'connector',
      stroke: '#6366f1',
      strokeWidth: 2,
      startBinding: { shapeId: 'node-gateway', portId: 'right' },
      endBinding: { shapeId: 'node-rag', portId: 'left' },
      points: [{ x: 770, y: 280 }, { x: 860, y: 280 }],
    },
    {
      id: 'conn-gateway-worker',
      type: 'connector',
      stroke: '#6366f1',
      strokeWidth: 2,
      startBinding: { shapeId: 'node-gateway', portId: 'right' },
      endBinding: { shapeId: 'node-worker', portId: 'left' },
      points: [{ x: 770, y: 280 }, { x: 860, y: 407 }],
    },
    {
      id: 'conn-auth-db',
      type: 'connector',
      stroke: '#10b981',
      strokeWidth: 2,
      startBinding: { shapeId: 'node-auth', portId: 'right' },
      endBinding: { shapeId: 'node-db-postgres', portId: 'left' },
      points: [{ x: 1050, y: 157 }, { x: 1140, y: 157 }],
    },
    {
      id: 'conn-rag-db',
      type: 'connector',
      stroke: '#38bdf8',
      strokeWidth: 2,
      startBinding: { shapeId: 'node-rag', portId: 'right' },
      endBinding: { shapeId: 'node-db-vector', portId: 'left' },
      points: [{ x: 1050, y: 280 }, { x: 1140, y: 280 }],
    },
    {
      id: 'conn-worker-redis',
      type: 'connector',
      stroke: '#ec4899',
      strokeWidth: 2,
      startBinding: { shapeId: 'node-worker', portId: 'right' },
      endBinding: { shapeId: 'node-db-redis', portId: 'left' },
      points: [{ x: 1050, y: 407 }, { x: 1140, y: 407 }],
    },
  ],
  selectedIds: [],
  activeTool: 'select',
  pan: { x: 50, y: 40 },
  zoom: 0.9,
  gridEnabled: true,
  gridSize: 20,
  snapEnabled: true,
  clipboard: [],
  activeColor: '#38bdf8',
  activeFill: 'rgba(56, 189, 248, 0.15)',
  activeStrokeWidth: 2,
  announcement: 'Canvas initialized',
  fps: 60,
};

function recomputeAllConnectors(shapes) {
  const shapeMap = new Map();
  for (let i = 0; i < shapes.length; i++) {
    shapeMap.set(shapes[i].id, shapes[i]);
  }

  const nonConnectors = shapes.filter(s => s.type !== 'connector');
  const obstacles = nonConnectors.map(s => getShapeBounds(s));

  for (let i = 0; i < shapes.length; i++) {
    const conn = shapes[i];
    if (conn.type !== 'connector') continue;
    if (!conn.startBinding || !conn.endBinding) continue;

    const startShape = shapeMap.get(conn.startBinding.shapeId);
    const endShape = shapeMap.get(conn.endBinding.shapeId);

    if (startShape && endShape) {
      const startPorts = getShapeAnchorPorts(startShape);
      const endPorts = getShapeAnchorPorts(endShape);
      const startPt = startPorts[conn.startBinding.portId] || { x: startShape.x, y: startShape.y };
      const endPt = endPorts[conn.endBinding.portId] || { x: endShape.x, y: endShape.y };

      conn.points = routeOrthogonal(
        { x: startPt.x, y: startPt.y, portId: conn.startBinding.portId },
        { x: endPt.x, y: endPt.y, portId: conn.endBinding.portId },
        obstacles.filter(obs => obs !== getShapeBounds(startShape) && obs !== getShapeBounds(endShape))
      );
    }
  }
}

export const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setTool: (state, action) => {
      state.activeTool = action.payload;
      state.announcement = `Selected tool: ${action.payload}`;
    },
    setPan: (state, action) => {
      state.pan = action.payload;
    },
    setZoom: (state, action) => {
      state.zoom = Math.max(0.05, Math.min(10, action.payload));
      state.announcement = `Zoom: ${Math.round(state.zoom * 100)}%`;
    },
    zoomIn: state => {
      state.zoom = Math.min(10, state.zoom * 1.25);
      state.announcement = `Zoom: ${Math.round(state.zoom * 100)}%`;
    },
    zoomOut: state => {
      state.zoom = Math.max(0.05, state.zoom / 1.25);
      state.announcement = `Zoom: ${Math.round(state.zoom * 100)}%`;
    },
    resetZoom: state => {
      state.zoom = 1;
      state.pan = { x: 80, y: 60 };
      state.announcement = 'Zoom reset to 100%';
    },
    setShapes: (state, action) => {
      state.shapes = action.payload;
      recomputeAllConnectors(state.shapes);
    },
    addShape: (state, action) => {
      state.shapes.push(action.payload);
      recomputeAllConnectors(state.shapes);
      state.selectedIds = [action.payload.id];
      state.announcement = `Added ${action.payload.type}`;
    },
    updateShape: (state, action) => {
      const { id, changes } = action.payload;
      const idx = state.shapes.findIndex(s => s.id === id);
      if (idx !== -1) {
        state.shapes[idx] = { ...state.shapes[idx], ...changes };
        recomputeAllConnectors(state.shapes);
      }
    },
    updateShapes: (state, action) => {
      const updates = action.payload; 
      const updateMap = new Map();
      for (let i = 0; i < updates.length; i++) {
        updateMap.set(updates[i].id, updates[i]);
      }
      for (let i = 0; i < state.shapes.length; i++) {
        const u = updateMap.get(state.shapes[i].id);
        if (u) {
          state.shapes[i] = { ...state.shapes[i], ...u };
        }
      }
      recomputeAllConnectors(state.shapes);
    },
    setSelectedIds: (state, action) => {
      state.selectedIds = action.payload;
      if (action.payload.length > 0) {
        state.announcement = `Selected ${action.payload.length} shape${action.payload.length > 1 ? 's' : ''}`;
      } else {
        state.announcement = 'Selection cleared';
      }
    },
    toggleSelectShape: (state, action) => {
      const id = action.payload;
      if (state.selectedIds.includes(id)) {
        state.selectedIds = state.selectedIds.filter(item => item !== id);
      } else {
        state.selectedIds.push(id);
      }
      state.announcement = `Selected ${state.selectedIds.length} shape(s)`;
    },
    selectAll: state => {
      state.selectedIds = state.shapes.map(s => s.id);
      state.announcement = `Selected all ${state.shapes.length} shapes`;
    },
    clearSelection: state => {
      state.selectedIds = [];
      state.announcement = 'Cleared selection';
    },
    deleteSelected: state => {
      if (state.selectedIds.length === 0) return;
      const count = state.selectedIds.length;
      state.shapes = state.shapes.filter(s => !state.selectedIds.includes(s.id));
      
      state.shapes = state.shapes.filter(s => {
        if (s.type === 'connector' && (s.startBinding || s.endBinding)) {
          const hasStart = !s.startBinding || state.shapes.some(other => other.id === s.startBinding.shapeId);
          const hasEnd = !s.endBinding || state.shapes.some(other => other.id === s.endBinding.shapeId);
          return hasStart && hasEnd;
        }
        return true;
      });
      state.selectedIds = [];
      recomputeAllConnectors(state.shapes);
      state.announcement = `Deleted ${count} shape(s)`;
    },
    bringForward: state => {
      if (state.selectedIds.length === 0) return;
      for (let i = state.shapes.length - 2; i >= 0; i--) {
        if (state.selectedIds.includes(state.shapes[i].id) && !state.selectedIds.includes(state.shapes[i + 1].id)) {
          const temp = state.shapes[i];
          state.shapes[i] = state.shapes[i + 1];
          state.shapes[i + 1] = temp;
        }
      }
      state.announcement = 'Moved forward';
    },
    sendBackward: state => {
      if (state.selectedIds.length === 0) return;
      for (let i = 1; i < state.shapes.length; i++) {
        if (state.selectedIds.includes(state.shapes[i].id) && !state.selectedIds.includes(state.shapes[i - 1].id)) {
          const temp = state.shapes[i];
          state.shapes[i] = state.shapes[i - 1];
          state.shapes[i - 1] = temp;
        }
      }
      state.announcement = 'Moved backward';
    },
    bringToFront: state => {
      if (state.selectedIds.length === 0) return;
      const selected = state.shapes.filter(s => state.selectedIds.includes(s.id));
      const unselected = state.shapes.filter(s => !state.selectedIds.includes(s.id));
      state.shapes = [...unselected, ...selected];
      state.announcement = 'Brought to front';
    },
    sendToBack: state => {
      if (state.selectedIds.length === 0) return;
      const selected = state.shapes.filter(s => state.selectedIds.includes(s.id));
      const unselected = state.shapes.filter(s => !state.selectedIds.includes(s.id));
      state.shapes = [...selected, ...unselected];
      state.announcement = 'Sent to back';
    },
    groupSelected: state => {
      if (state.selectedIds.length <= 1) return;
      const selected = state.shapes.filter(s => state.selectedIds.includes(s.id));
      const unselected = state.shapes.filter(s => !state.selectedIds.includes(s.id));

      const groupId = `group-${Date.now()}`;
      const groupShape = {
        id: groupId,
        type: 'group',
        children: selected,
        x: 0,
        y: 0,
        rotation: 0,
      };

      state.shapes = [...unselected, groupShape];
      state.selectedIds = [groupId];
      state.announcement = 'Grouped shapes';
    },
    ungroupSelected: state => {
      if (state.selectedIds.length === 0) return;
      const newShapes = [];
      const newSelectedIds = [];

      for (let i = 0; i < state.shapes.length; i++) {
        const s = state.shapes[i];
        if (state.selectedIds.includes(s.id) && s.type === 'group' && s.children) {
          for (let j = 0; j < s.children.length; j++) {
            newShapes.push(s.children[j]);
            newSelectedIds.push(s.children[j].id);
          }
        } else {
          newShapes.push(s);
        }
      }

      state.shapes = newShapes;
      state.selectedIds = newSelectedIds;
      state.announcement = 'Ungrouped shapes';
    },
    copySelected: state => {
      const selected = state.shapes.filter(s => state.selectedIds.includes(s.id));
      state.clipboard = JSON.parse(JSON.stringify(selected));
      state.announcement = `Copied ${selected.length} shape(s)`;
    },
    paste: state => {
      if (!state.clipboard || state.clipboard.length === 0) return;
      const newShapes = state.clipboard.map(s => ({
        ...s,
        id: `shape-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        x: (s.x || 0) + 20,
        y: (s.y || 0) + 20,
      }));
      state.shapes.push(...newShapes);
      state.selectedIds = newShapes.map(s => s.id);
      recomputeAllConnectors(state.shapes);
      state.announcement = `Pasted ${newShapes.length} shape(s)`;
    },
    duplicateSelected: state => {
      const selected = state.shapes.filter(s => state.selectedIds.includes(s.id));
      if (selected.length === 0) return;
      const duplicates = selected.map(s => ({
        ...s,
        id: `shape-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        x: (s.x || 0) + 25,
        y: (s.y || 0) + 25,
      }));
      state.shapes.push(...duplicates);
      state.selectedIds = duplicates.map(s => s.id);
      recomputeAllConnectors(state.shapes);
      state.announcement = `Duplicated ${duplicates.length} shape(s)`;
    },
    setGridEnabled: (state, action) => {
      state.gridEnabled = action.payload;
    },
    setSnapEnabled: (state, action) => {
      state.snapEnabled = action.payload;
    },
    setGridSize: (state, action) => {
      state.gridSize = action.payload;
    },
    setActiveColor: (state, action) => {
      state.activeColor = action.payload;
      for (let i = 0; i < state.shapes.length; i++) {
        if (state.selectedIds.includes(state.shapes[i].id)) {
          state.shapes[i].stroke = action.payload;
        }
      }
    },
    setActiveFill: (state, action) => {
      state.activeFill = action.payload;
      for (let i = 0; i < state.shapes.length; i++) {
        if (state.selectedIds.includes(state.shapes[i].id)) {
          state.shapes[i].fill = action.payload;
        }
      }
    },
    setActiveStrokeWidth: (state, action) => {
      state.activeStrokeWidth = action.payload;
      for (let i = 0; i < state.shapes.length; i++) {
        if (state.selectedIds.includes(state.shapes[i].id)) {
          state.shapes[i].strokeWidth = action.payload;
        }
      }
    },
    setAnnouncement: (state, action) => {
      state.announcement = action.payload;
    },
    setFps: (state, action) => {
      state.fps = action.payload;
    },
    loadProjectData: (state, action) => {
      const data = action.payload;
      if (data.shapes) state.shapes = data.shapes;
      if (data.pan) state.pan = data.pan;
      if (data.zoom) state.zoom = data.zoom;
      state.selectedIds = [];
      recomputeAllConnectors(state.shapes);
      state.announcement = 'Project loaded';
    },
    generateStressShapes: (state, action) => {
      const count = action.payload || 5000;
      const newShapes = [];
      const cols = Math.ceil(Math.sqrt(count));
      const spacing = 120;
      const types = ['rect', 'ellipse'];
      const colors = ['#38bdf8', '#818cf8', '#ec4899', '#34d399', '#f59e0b'];

      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const type = types[i % types.length];
        const color = colors[i % colors.length];

        newShapes.push({
          id: `stress-${i}`,
          type,
          x: col * spacing,
          y: row * spacing,
          width: 70,
          height: 45,
          radiusX: 35,
          radiusY: 22.5,
          stroke: color,
          fill: `${color}15`,
          strokeWidth: 1.5,
          rotation: (i * 15) % 360,
          opacity: 0.9,
        });
      }

      state.shapes = newShapes;
      state.selectedIds = [];
      state.announcement = `Generated ${count} shapes for stress test`;
    },
  },
});

export const {
  setTool,
  setPan,
  setZoom,
  zoomIn,
  zoomOut,
  resetZoom,
  setShapes,
  addShape,
  updateShape,
  updateShapes,
  setSelectedIds,
  toggleSelectShape,
  selectAll,
  clearSelection,
  deleteSelected,
  bringForward,
  sendBackward,
  bringToFront,
  sendToBack,
  groupSelected,
  ungroupSelected,
  copySelected,
  paste,
  duplicateSelected,
  setGridEnabled,
  setSnapEnabled,
  setGridSize,
  setActiveColor,
  setActiveFill,
  setActiveStrokeWidth,
  setAnnouncement,
  setFps,
  loadProjectData,
  generateStressShapes,
} = editorSlice.actions;

export default editorSlice.reducer;
