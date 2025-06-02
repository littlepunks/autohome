// ui-handlers.js (revised with DOMContentLoaded safety)

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById('mainCanvas');
  const contextMenu = document.getElementById('contextMenu');

  // Menu item click handler
  window.handleItemClick = function (action) {
    switch (action) {
      case 'Home':
        window.destroyChart();
        window.drawDash();
        break;
      case 'TempGraphs':
        window.drawInitialChart();
        break;
      case 'TempHistoryGraphs':
        window.location.href = '/graphs';
        break;
      case 'Toggle Grid':
        showGrid = !showGrid;
        drawDash();
        break;
      case 'Show All Items':
        dash.forEach(item => item.enabled = true);
        drawDash();
        break;
      case 'Grid Code':
        console.log('Grid code toggle requested (not implemented)');
        break;
      default:
        console.log(`Unhandled menu action: ${action}`);
    }
  };

  // Context menu handling
  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest('.context-menu')) {
      contextMenu.style.display = 'none';
    }
  });

  window.handleContextMenuClick = function (action) {
    console.log(`Context menu action: ${action}`);
    contextMenu.style.display = 'none';
  };
});
