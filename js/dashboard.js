// dashboard.js

//const { isNumber } = require("util");

// Set up canvas and context

let currentCanvasName = 'homeCanvas'; // Default canvas
document.currentCanvasName = currentCanvasName; // Store current canvas globally
document.currentCanvas = document.getElementById(currentCanvasName); // Store current canvas globally
document.currentCtx = document.currentCanvas.getContext('2d'); // Store current canvas context globally

// Get the menu height and calculate the standard canvas size.
const menuObj = document.getElementById('menubar');
const canvasHeight = window.innerHeight - menuObj.offsetHeight - 10;
const canvasWidth = Math.min(window.innerWidth, 500);


// Show only the first (home) canvas and hide the others, also set size
document.querySelectorAll('.canvas-container canvas').forEach(canvas => {
  canvas.style.display = (canvas.id === currentCanvasName) ? 'block' : 'none';
  canvas.height = canvasHeight;
  canvas.width = canvasWidth;
});


const canvas = document.currentCanvas;
const ctx = document.currentCtx;
//const contextMenu = document.getElementById('contextMenu');
//contextMenu.style.display = 'none';


// Grid setup
const cols = 4;
const rows = 5;
let margin = canvas.width / (cols * 2);
let colWidth = canvas.width / cols;
let rowHeight = colWidth; //canvas.height / rows;

// Don't show grid by default
//let showGrid = false;
window.showGrid = true;

const colGaugeBkgnd = '#907010';
const colGaugeColor = '#d0b020';
const colGrid = '#808080';
const colBackground = '#204060';

const PI = Math.PI;
const PI2 = 2 * Math.PI;

let dash = [];
let resizeTimer = null;


// Listen for sensor data from the server
const socket = io();

// Handle the full set of sensor data from the server
socket.on("AllSensors", (data) => {
  console.log('Received full set of sensor data (', new Date().toLocaleString(), ')');

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

// Handle individual sensor updates from the server
socket.on("Sensor", (data) => {
  const obj = JSON.parse(data);
  // or use Date().isostring() for ISO format
  console.log('Received (', new Date().toLocaleString(), '):', obj);

  // Update sensor value
  const sensor = dash.find(s => s.name === obj.name);
  if (sensor) {
    Object.assign(sensor, {
      value: obj.value,
      updated: obj.updated,
      contact_status: obj.contact_status,
      alarmState: obj.alarmState,
      min: obj.min,
      max: obj.max,
      control: obj.control,
      suffix: obj.suffix,
      enabled: obj.enabled
    });

    // Then draw the dashboard
    drawDash();

    // Update the chart too, if applicable
    if (window.updateChartFromJSON) {
      window.updateChartFromJSON(obj);
    }
  }
});

// Request initial data
socket.emit("ClientMsg", "init");

// Show first canvas only (home page)
function showHomeCanvas() {
  const canvases = document.querySelectorAll('.canvas-container canvas');
  canvases.forEach((canvas, index) => {
    canvas.style.display = (index === 0) ? 'block' : 'none';
  });
}

showHomeCanvas(); // Show the home canvas on initial load

// A function that takes a canvas id and a file name and draws a scaled image on the canvas
function drawScaledImage(canvasId, fileName, position) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.src = fileName;
  img.onload = () => {
    // const scale = canvas.width / img.width;
    const scale = 0.92;

    const x = (canvas.width / 2) - (img.width * scale / 2);
    let y=0;
    //const y = (canvas.height / 2) - (img.height * scale / 2);
    switch (position.toLowerCase()) {
      case 'top':
        y = 0; // Align to top
        break;
      case 'bottom':
        y = canvas.height - (img.height * scale); // Align to bottom
        break;
      case 'middle':
        y = (canvas.height / 2) - (img.height * scale / 2); // Center vertically
        break;
    }

    //ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  };
}

// Redraw weather graphs on the weather canvas
window.redrawWeatherGraphs = function() {
  drawScaledImage('weatherCanvas', 'images/temp_graph_1d.png', 'top');
  drawScaledImage('weatherCanvas', 'images/pressure_1d.png', 'middle');
  drawScaledImage('weatherCanvas', 'images/humidity_1d.png', 'bottom');
}

window.redrawWeatherGraphs(); // Initial draw of weather graphs


// Grid drawing
function drawGrid() {
  ctx.save();
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
  ctx.restore();

  // ctx.shadowOffsetX = 5;
  // ctx.shadowOffsetY = 5;
  // ctx.shadowBlur = 10;
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
  setBackgroundColor(colBackground);
  if (window.showGrid) drawGrid();
  dash.forEach(obj => {
    if (obj.enabled) drawDashObj(obj, { shadow: true });
  });
}

// Maybe not needed, but kept for reference
// Update sensor location
// function updateSensorLocation(data, name, col, row, enabled) {
//   const item = data.find(i => i.name === name);
//   if (item) {
//     Object.assign(item, {
//       col,
//       row,
//       enabled,
//       x: (col - 1) * colWidth,
//       y: (row - 1) * colWidth
//     });
//   }
// }

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


// Drawing dashboard objects
function drawDashObj(dashObj, overrides = {}) {

  const drawFunctions = {
    'BUT': drawSwitch,
    'GAU': drawGauge,
    'STA': drawStatus,
    'bar-v': drawBarV,
    'bar-h': drawBarH
  };
  const drawFunction = drawFunctions[dashObj.control];

  if (drawFunction) {

    if (overrides.shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 1)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 20, 0.5)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
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

  if (opts && Object.keys(opts).length > 0 && window.showGrid) drawGrid();

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
  ctx.font = `${canvas.width / (10 * cols)}px Arial`;
  ctx.fillText(g.name, cx, cy - margin * 0.3);
  const gaugeText = `${g.value}${g.suffix ?? ''}`;
  ctx.font = `${Math.max(12, canvas.width / (cols * (gaugeText.length * 5)))}px Arial`;
  ctx.fillText(gaugeText, cx, cy + margin * 0.25);
}

// Draw a switch
function drawSwitch(g, opts) {
  const width = 50;
  const height = 25;
  const radius = height / 2;
  let cx = opts?.x ?? margin + (g.col - 1) * colWidth;
  let cy = opts?.y ?? margin + (g.row - 1) * colWidth;

  const isOn = g.value === "1";
  const bgColor = isOn ? 'green' : 'red';
  const circleX = isOn ? cx + width/2 - radius : cx-width/2 + radius;

  // Draw background (rounded rectangle)
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(cx-width/2, cy, width, height, radius);
  ctx.fill();

  // Draw toggle circle
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(circleX, cy + radius, radius * 0.8, 0, 2 * Math.PI);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${canvas.width / (9 * cols)}px Arial`;
  ctx.fillText(g.name, cx, cy - margin * 0.3);
}

function drawStatus(g, opts) {
  const thickness = 14;
  let cx = opts?.x ?? margin + (g.col - 1) * colWidth;
  let cy = opts?.y ?? margin + (g.row - 1) * colWidth;

  if (opts && Object.keys(opts).length > 0 && window.showGrid) drawGrid();

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

  if (opts && Object.keys(opts).length > 0 && window.showGrid) drawGrid();

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

  if (opts && Object.keys(opts).length > 0 && window.showGrid) drawGrid();

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

  // console.log(`x: ${x}, y: ${y}, colWidth: ${colWidth}, rowHeight: ${rowHeight}`);
  //console.log(`Clicked on col: ${col}, row: ${row}, control: ${ctrl ? ctrl.name : 'none'}`);

  if (ctrl) {
    const time = new Date(ctrl.updated).toLocaleString('en-NZ');
    const info = `Name: ${ctrl.name} (${ctrl.id}) [${ctrl.control}]\nValue: ${ctrl.value}${ctrl.suffix ?? ''}, Min: ${ctrl.min}, Max: ${ctrl.max}\nContact Status: ${ctrl.contact_status}, Last Contact: ${time}\n${(typeof ctrl.alarmState === 'number')?'AlarmState: '+ctrl.alarmState:''}${(ctrl.warningThreshold)?', Warning: '+ctrl.warningThreshold:''}${(ctrl.alarmThreshold)?', Alarm: '+ctrl.alarmThreshold:''}`;
    console.log(info);

    // Need to act depending on the control clicked.
    if (ctrl.control === 'BUT') {
      // Buttons
      // if (ctrl.id === '105') { // Special case for the '105' button
      //   console.log('Sky light clicked, performing special action');
      //   // Call TPLINK on the sky light
      //   socket.emit('ClientMsg', 'BUT;105');
      // } else {
      //   console.log(`Button ${ctrl.name} pressed');'}`);
      // }
      socket.emit('ClientMsg', `BUT;${ctrl.id}`);
    } else {
      console.log(`No action set for clicking on: ${ctrl.name} (${ctrl.id}) [${ctrl.control}]`);
    }
    // createPopup(info, event.clientX, event.clientY);  *** temporarily disabled.
  }
});

// Create a popup ready to display sensor information
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
  setTimeout(() => popup.remove(), 10000);  // Remove after 10 seconds
  popup.addEventListener("click", () => popup.remove()); // Remove on click
} 

window.drawDash = drawDash; // Expose drawDash for external use
