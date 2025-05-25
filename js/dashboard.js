// dashboard.js

// Set up canvas and context
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const contextMenu = document.getElementById('contextMenu');
contextMenu.style.display = 'none';

const menuObj = document.getElementById('menubar');
canvas.height = window.innerHeight - menuObj.offsetHeight - 10;
canvas.width = Math.min(window.innerWidth, 500);

// Grid setup
const cols = 4;
const rows = 5;
let margin = canvas.width / (cols * 2);
let colWidth = canvas.width / cols;
let rowHeight = canvas.height / rows;

let showGrid = true;

const colGaugeBkgnd = '#907010';
const colGaugeColor = '#d0b020';
const colGrid = '#808080';
const colBackground = '#204060';

const PI = Math.PI;
const PI2 = 2 * Math.PI;

let dash = [];
let resizeTimer = null;

// ... existing dashboard.js content above ...

// Listen for sensor data from the server
const socket = io();

socket.on("sensors", (data) => {
  const parsed = JSON.parse(data);
  dash = parsed;
  drawDash();

  // For each member of parsed add to chart
  parsed.forEach(sensor => {
    if (window.updateChartFromJSON) {
      window.updateChartFromJSON(sensor);
    }
  });
});

socket.on("SMv2", (data) => {
  const obj = JSON.parse(data);
  updateSensorLocation(dash, obj.name, obj.col, obj.row, obj.enabled);
  drawDash();

  // Update the chart too, if applicable
  if (window.updateChartFromJSON) {
    window.updateChartFromJSON(obj);
  }
});

// Request initial data
socket.emit("ClientMsg", "init");



// Coordinate conversion
function xy2rc(xy) {
  return (xy < 0) ? 1 : (Math.floor(xy / colWidth) + 1);
}

function rc2xy(rc) {
  return (rc <= 0) ? 0 : ((rc - 1) * colWidth);
}

// Grid drawing
function drawGrid() {
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;
  ctx.strokeStyle = colGrid;
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let i = 1; i < cols; i++) {
    ctx.moveTo(colWidth * i, 0);
    ctx.lineTo(colWidth * i, canvas.height);
  }

  for (let j = 1; j < rows; j++) {
    ctx.moveTo(0, rowHeight * j);
    ctx.lineTo(canvas.width, rowHeight * j);
  }

  ctx.stroke();

  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;
  ctx.shadowBlur = 10;
}

// Set background
function setBackgroundColor(color) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Draw dashboard elements
function drawDash() {
  // Delete this later when not testing charts
  return;
  
  setBackgroundColor(colBackground);
  if (showGrid) drawGrid();
  dash.forEach(obj => {
    if (obj.enabled) drawDashObj(obj);
  });
}

// Update sensor location
function updateSensorLocation(data, name, col, row, enabled) {
  const item = data.find(i => i.name === name);
  if (item) {
    Object.assign(item, {
      col,
      row,
      enabled,
      x: (col - 1) * colWidth,
      y: (row - 1) * colWidth
    });
  }
}

// Resize handler
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    canvas.height = window.innerHeight - menuObj.offsetHeight - 10;
    canvas.width = Math.min(window.innerWidth, 500);
    margin = canvas.width / (cols * 2);
    colWidth = canvas.width / cols;
    rowHeight = canvas.height / rows;
    drawDash();
  }, 200);
});

// dashboard.js (continued)

// Drawing logic
function drawDashObj(dashObj, overrides = {}) {
  if (!dashObj.enabled) return;

  const drawFunctions = {
    'GAU': drawGauge,
    'STA': drawStatus,
    'bar-v': drawBarV,
    'bar-h': drawBarH
  };
  const drawFunction = drawFunctions[dashObj.control];

  if (drawFunction) {
    if (overrides.shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 1)';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 10;
      ctx.shadowOffsetY = 10;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 20, 0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;
    }
    drawFunction(dashObj, overrides);
  }
}

function drawArc(x, y, radius, style, isStroke = false, lineWidth = 1) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, PI2);
  if (isStroke) {
    ctx.strokeStyle = style;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  } else {
    ctx.fillStyle = style;
    ctx.fill();
  }
}

function drawGauge(g, opts) {
  const thickness = 14;
  let cx = opts?.x ?? margin + (g.col - 1) * colWidth;
  let cy = opts?.y ?? margin + (g.row - 1) * colWidth;

  if (opts && Object.keys(opts).length > 0 && showGrid) drawGrid();

  const colorMap = { 1: 'darkorange', 2: 'red' };
  const fillColor = colorMap[g.contact_status] || 'darkgreen';
  drawArc(cx, cy, canvas.width / (cols * 2.8), fillColor);
  drawArc(cx, cy, canvas.width / (cols * 2.6), colGaugeBkgnd, true, canvas.width / (thickness * cols));

  const angle = (2 * (g.value - g.min) / (g.max - g.min)) * PI;
  ctx.beginPath();
  ctx.arc(cx, cy, canvas.width / (cols * 2.6), -PI / 2, -PI / 2 + angle);
  ctx.strokeStyle = colGaugeColor;
  ctx.lineWidth = canvas.width / (thickness * cols);
  ctx.stroke();

  ctx.fillStyle = g.alarmState === 1 ? 'orange' : g.alarmState === 2 ? 'red' : 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${canvas.width / (11 * cols)}px Arial`;
  ctx.fillText(g.name, cx, cy - margin * 0.3);
  const gaugeText = `${g.value}${g.suffix ?? ''}`;
  ctx.font = `${Math.max(12, canvas.width / (cols * (gaugeText.length * 5)))}px Arial`;
  ctx.fillText(gaugeText, cx, cy + margin * 0.25);
}

function drawStatus(g, opts) {
  const thickness = 14;
  let cx = opts?.x ?? margin + (g.col - 1) * colWidth;
  let cy = opts?.y ?? margin + (g.row - 1) * colWidth;

  if (opts && Object.keys(opts).length > 0 && showGrid) drawGrid();

  const colorMap = { 1: 'darkorange', 2: 'red' };
  const fillColor = colorMap[g.contact_status] || 'darkgreen';

  drawArc(cx, cy, canvas.width / (cols * 2.8), fillColor);
  drawArc(cx, cy, canvas.width / (cols * 2.6), colGaugeBkgnd, true, canvas.width / (thickness * cols));
  drawArc(cx, cy + margin * 0.25, canvas.width / (cols * 6), colGaugeColor, true, canvas.width / (thickness * cols * 1.8));
  drawArc(cx, cy + margin * 0.25, canvas.width / (cols * 8), g.status == '1' ? 'green' : 'red');

  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${canvas.width / (11 * cols)}px Arial`;
  ctx.fillText(g.name, cx, cy - margin * 0.3);
}

function drawLine(x1, y1, x2, y2, style, width) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawBarV(b, opts) {
  let bx = opts?.x ?? margin + (b.col - 1) * colWidth;
  let by = opts?.y ?? margin + (b.row - 1) * colWidth;

  if (opts && Object.keys(opts).length > 0 && showGrid) drawGrid();

  const lineWidth = canvas.width / (8 * cols);
  drawLine(bx, by - (0.8 * margin), bx, by + (0.8 * margin), colGaugeBkgnd, lineWidth);

  const valueHeight = (0.8 * colWidth * (b.value - b.min) / (b.max - b.min));
  drawLine(bx, by + (0.8 * margin), bx, by + (0.8 * margin) - valueHeight, colGaugeColor, lineWidth);

  ctx.font = `${canvas.width / (6 * cols)}px Arial`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'right';
  ctx.fillText(b.value, bx - 15, by + 8);

  ctx.font = `${canvas.width / (12 * cols)}px Arial`;
  ctx.textAlign = 'left';
  ctx.fillText(b.max, bx + 15, by - (0.8 * margin) + 10);
  ctx.fillText(b.min, bx + 15, by + (0.8 * margin) - 2);
}

function drawBarH(b, opts) {
  let bx = opts?.x ?? margin + (b.col - 1) * colWidth;
  let by = opts?.y ?? margin + (b.row - 1) * colWidth;

  if (opts && Object.keys(opts).length > 0 && showGrid) drawGrid();

  const lineWidth = canvas.width / (8 * cols);
  drawLine(bx - (0.8 * margin), by, bx + (0.8 * margin), by, colGaugeBkgnd, lineWidth);

  const valueWidth = (0.8 * colWidth * (b.value - b.min) / (b.max - b.min));
  drawLine(bx - (0.8 * margin), by, bx - (0.8 * margin) + valueWidth, by, colGaugeColor, lineWidth);

  ctx.font = `${canvas.width / (6 * cols)}px Arial`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.fillText(b.value, bx, by - 18);

  ctx.font = `${canvas.width / (12 * cols)}px Arial`;
  ctx.textAlign = 'left';
  ctx.fillText(b.min, bx - (0.8 * margin), by + 22);
  ctx.textAlign = 'right';
  ctx.fillText(b.max, bx + (0.8 * margin), by + 22);
}

// Canvas click handler (move to ui-handlers.js if you prefer UI logic separation)
canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const col = Math.floor(x / colWidth) + 1;
  const row = Math.floor(y / rowHeight) + 1;
  const ctrl = dash.find(obj => obj.col === col && obj.row === row);

  if (ctrl) {
    const time = new Date(ctrl.updated).toLocaleString('en-NZ');
    const info = `ID: ${ctrl.id}\nName: ${ctrl.name}\nValue: ${ctrl.value}${ctrl.suffix ?? ''}\nContact Status: ${ctrl.contact_status}\nLast Contact: ${time}\nAlarmState: ${ctrl.alarmState}\nMin: ${ctrl.min}\nMax: ${ctrl.max}\nCol: ${ctrl.col}\nRow: ${ctrl.row}\nEnabled: ${ctrl.enabled}\nControl: ${ctrl.control}`;
    createPopup(info, event.clientX, event.clientY);
  }
});

function createPopup(content, x, y) {
  const popup = document.createElement("div");
  popup.innerText = content;
  Object.assign(popup.style, {
    position: "absolute",
    backgroundColor: "rgba(0,0,10,0.9)",
    color: "white",
    border: "1px solid white",
    padding: "10px",
    zIndex: "1000",
    top: `${y}px`,
    left: `${x}px`,
    fontSize: "12px"
  });
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 10000);
} 
