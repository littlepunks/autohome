// ui-handlers.js (revised with DOMContentLoaded safety)

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById('homeCanvas');
  const contextMenu = document.getElementById('contextMenu');

  // Start with drawing the dashboard (home screen)
  window.drawDash();

  // Menu item click handler
  window.handleItemClick = function (action) {

    function showOnlyCanvas(canvasId) {
      //console.log(`Showing canvas: ${canvasId}`);
      const allCanvases = document.querySelectorAll('.canvas-container canvas');
      allCanvases.forEach(c => {
        c.style.display = (c.id === canvasId) ? 'block' : 'none';
      });
    }

    switch (action) {
      case 'homeCanvas':
        showOnlyCanvas(action);
        //window.drawDash();
        break;
      case 'graphCanvas':
        window.redrawWeatherGraphs();
        showOnlyCanvas(action);
        break;
      case 'switchesCanvas':
          showOnlyCanvas(action);
        break;
      case 'weatherCanvas':
        showOnlyCanvas(action);
        break;
      case 'weatherHistoryCanvas':
        showOnlyCanvas(action);
        break;
      case 'Toggle Grid':
        window.showGrid = !window.showGrid;
        console.log(`Grid visibility toggled to: ${window.showGrid}`);
        window.drawDash();
        break;
      case 'Show All Items':
        //window.dash.forEach(item => item.enabled = true);
        window.drawDash();
        break;
      case 'Grid Code':
        console.log('Grid code toggle requested (not implemented)');
        break;
      default:
        console.log(`Unhandled menu action: ${action}`);
    }
  };

  //Context menu handling
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
