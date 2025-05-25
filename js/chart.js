// charts.js

document.addEventListener("DOMContentLoaded", () => {
  const ctx = document.getElementById('mainCanvas')?.getContext('2d');
  if (!ctx) {
    console.error('Canvas context not found. Chart cannot be rendered.');
    return;
  }

  let temperatureGraph;
  let temperatureChartData = {
    labels: [],
    datasets: []
  };

  const dataColors = [
    'rgba(255, 0, 0, 0.5)',
    'rgba(0, 255, 0, 0.5)',
    'rgba(0, 0, 255, 0.5)',
    'rgba(128, 128, 0, 0.5)',
    'rgba(0, 128, 128, 0.5)',
    'rgba(224, 0, 224, 0.5)',
    'rgba(255, 128, 0, 0.5)',
    'rgba(0, 255, 128, 0.5)',
    'rgba(128, 0, 255, 0.5)'
  ];

  function epochToISO(epochMs) {
    return new Date(epochMs).toISOString();
  }

  function addChartDataset(label, data) {
    temperatureChartData.datasets.push({ label, data, tension: 0.4 });
  }

  function addChartDataPoint(sensorLabel, isoTime, value) {
    if (!temperatureChartData.labels.includes(isoTime)) {
      temperatureChartData.labels.push(isoTime);
    }

    let dataset = temperatureChartData.datasets.find(ds => ds.label === sensorLabel);
    if (!dataset) {
      dataset = {
        label: sensorLabel,
        data: [],
        backgroundColor: dataColors[temperatureChartData.datasets.length % dataColors.length],
        borderColor: dataColors[temperatureChartData.datasets.length % dataColors.length],
        tension: 0.4
      };
      temperatureChartData.datasets.push(dataset);
    }

    dataset.data.push(value);
  }

  function updateChartFromJSON(jsonObj) {
    const { name, value, updated, control } = jsonObj;
    const includeList = ['Bedroom', 'Balcony', 'Tom'];
    const timeISO = epochToISO(updated);
    const numericValue = parseFloat(value);

    if (isNaN(numericValue) || !includeList.includes(name) || control !== 'GAU') return;

    addChartDataPoint(name, timeISO, numericValue);
    if (temperatureGraph) temperatureGraph.update();
  }

  function drawInitialChart() {
    const config = {
      type: 'line',
      data: temperatureChartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { left: 10, right: 10 } },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10 }
          },
          title: {
            display: true,
            text: 'Temperatures',
            font: { size: 30 }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              parser: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
              tooltipFormat: 'HH:mm',
              displayFormats: { minute: 'HH:mm' }
            }
          },
          y: {
            grid: { color: '#505050' }
          }
        }
      }
    };

    Chart.defaults.color = 'lightgray';
    Chart.defaults.font.size = 18;

    temperatureGraph = new Chart(ctx, config);
  }

  window.updateChartFromJSON = updateChartFromJSON;
  drawInitialChart();
});
