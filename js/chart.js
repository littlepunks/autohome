// charts.js

const includeList = ['Bedroom', 'Balcony', 'Tom'];


document.addEventListener("DOMContentLoaded", () => {
  const ctx = document.getElementById('graphCanvas')?.getContext('2d');
  if (!ctx) {
    console.error('Canvas context not found. Chart cannot be rendered.');
    return;
  }
  // Initialize the temperature graph and chart data
  let temperatureGraph;
  let temperatureChartData = {
    labels: [],
    datasets: []
  };

  const dataColors = [
    'rgba(255, 32, 32, 0.8)',
    'rgba(32, 255, 32, 0.8)',
    'rgba(160, 160, 255, 0.8)',
    'rgba(128, 128, 32, 0.8)',
    'rgba(32, 128, 128, 0.8)',
    'rgba(224, 32, 224, 0.8)',
    'rgba(255, 128, 32, 0.8)',
    'rgba(32, 255, 128, 0.8)',
    'rgba(128, 32, 255, 0.8)'
  ];

  function epochToISO(epochMs) {
    return new Date(epochMs).toISOString();
  }

  function addChartDataPoint(sensorLabel, isoTime, value) {
    // Add a new timestamp (y-axis)

    const now = new Date();
    now.setSeconds(0, 0); // Round down seconds and milliseconds
    const isoTimeNow = now.toISOString();

    // By rounding if there a sequence of quick updates the last few might
    // get missed becaue the check below returns early.

    if (!temperatureChartData.labels.includes(isoTimeNow)) {
      temperatureChartData.labels.push(isoTimeNow);
    } else {
      // If the same time then check the individual sensor and if it's
      // null the value can be updated.
      temperatureChartData.datasets.forEach(sensorDataset => {
        if ((sensorDataset.label === sensorLabel) && (sensorDataset.data[sensorDataset.data.length-1] === null)) {
          sensorDataset.data[sensorDataset.data.length-1] = value;
          return;
        }
      })
      return;
    }

    // Where the sensor matches sensorLabel push the new data,
    // Otherwise push the last value (last entry in dataset array),
    // or if that doesn't exit push a blank value.

    temperatureChartData.datasets.forEach(sensorDataset => {
      if (sensorDataset.label === sensorLabel) {
        sensorDataset.data.push(value);
      }
      else {
        // Copy old datapoint
        if (sensorDataset.data.length === 0) {
          sensorDataset.data.push(null);
        } else {
          sensorDataset.data.push(sensorDataset.data[sensorDataset.data.length-1]);
        }
      }
    });

    console.log(temperatureChartData.labels);
    console.log(temperatureChartData.datasets);
  }

  // Update the chart from a JSON object checking it's usable.
  function updateChartFromJSON(jsonObj) {
    const { name, value, updated, control } = jsonObj;
    const timeISO = epochToISO(updated);
    const numericValue = parseFloat(value);

    if (isNaN(numericValue) || !includeList.includes(name) || control !== 'GAU') return;

    addChartDataPoint(name, timeISO, numericValue);
    //console.log(`Adding: ${name} ${timeISO} ${numericValue}`);
    if (temperatureGraph) temperatureGraph.update();
  }

  function drawInitialChart() {

    // add each sensor with empty data
    includeList.forEach( name => {
      let dataset = {
        label: name,
        data: [],  // Maybe push initial value?
        backgroundColor: dataColors[temperatureChartData.datasets.length % dataColors.length],
        borderColor: dataColors[temperatureChartData.datasets.length % dataColors.length],
        tension: 0.4
      };
      temperatureChartData.datasets.push(dataset);
    });
    
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

  // May no longer be needed, but kept for reference
  function destroyChart() {
    if (temperatureGraph) {
      temperatureGraph.destroy();
      temperatureGraph = null;
    }
  } 

  // Start the chart with initial data
  drawInitialChart();

  // Expose the ability to update the chart from JSON data
  window.updateChartFromJSON = updateChartFromJSON;
});
