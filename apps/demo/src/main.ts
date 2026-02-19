import { CadViewer } from '@cadview/core';
import type { Tool } from '@cadview/core';

const app = document.getElementById('app')!;
app.innerHTML = `
  <div id="container" style="display: flex; flex-direction: column; height: 100vh; width: 100vw;">
    <div style="padding: 8px; background: #1a1a2e; color: white; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; flex-shrink: 0;">
      <input type="file" id="file-input" accept=".dxf" />
      <button id="fit-btn">Fit to View</button>
      <button id="theme-btn">Toggle Theme</button>
      <select id="tool-select">
        <option value="pan">Pan</option>
        <option value="select">Select</option>
        <option value="measure">Measure</option>
      </select>
      <span id="info" style="margin-left: auto; font-size: 13px; opacity: 0.8;"></span>
    </div>
    <div id="canvas-wrapper" style="flex: 1; position: relative; overflow: hidden;">
      <canvas id="canvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></canvas>
    </div>
  </div>
`;

// Grab DOM elements
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const fitBtn = document.getElementById('fit-btn') as HTMLButtonElement;
const themeBtn = document.getElementById('theme-btn') as HTMLButtonElement;
const toolSelect = document.getElementById('tool-select') as HTMLSelectElement;
const info = document.getElementById('info') as HTMLSpanElement;

// Create viewer
const viewer = new CadViewer(canvas, {
  theme: 'dark',
  initialTool: 'pan',
});

// File loading
fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  info.textContent = `Loading ${file.name}...`;
  try {
    await viewer.loadFile(file);
    const doc = viewer.getDocument();
    const entityCount = doc?.entities.length ?? 0;
    const layerCount = viewer.getLayers().length;
    info.textContent = `${file.name} — ${entityCount} entities, ${layerCount} layers`;
  } catch (err) {
    info.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
    console.error('Failed to load DXF:', err);
  }
});

// Fit to view
fitBtn.addEventListener('click', () => {
  viewer.fitToView();
});

// Theme toggle
themeBtn.addEventListener('click', () => {
  const current = viewer.getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  viewer.setTheme(next);
  themeBtn.textContent = `Theme: ${next}`;
});

// Tool select
toolSelect.addEventListener('change', () => {
  const tool = toolSelect.value as Tool;
  viewer.setTool(tool);
});

// Selection events
viewer.on('select', (e) => {
  info.textContent = `Selected: ${e.entity.type} (layer: ${e.entity.layer}) at (${e.worldPoint.x.toFixed(2)}, ${e.worldPoint.y.toFixed(2)})`;
});

// Measurement events
viewer.on('measure', (e) => {
  info.textContent = `Distance: ${e.distance.toFixed(4)} | ΔX: ${e.deltaX.toFixed(4)} | ΔY: ${e.deltaY.toFixed(4)} | Angle: ${e.angle.toFixed(2)}°`;
});

// View change events (update info bar on zoom for debugging)
viewer.on('viewchange', (vt) => {
  // Only log when no file loaded yet
  if (!viewer.getDocument()) {
    info.textContent = `Zoom: ${vt.scale.toFixed(4)}`;
  }
});
