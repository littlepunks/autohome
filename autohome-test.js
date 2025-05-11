const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');

const width = 600; // Set a valid width
const height = 600; // Set a valid height

const chartCanvas = new ChartJSNodeCanvas({ width, height });

const now = Date.now(); // Current timestamp in milliseconds
// const chartTimeframe = 7 * 24 * 60 * 60 * 1000; // Example: 7-day window
const chartTimeframe = 30 * 24 * 60 * 60 * 1000; // Example: 20 HOURS window

// Generate timestamps for the selected timeframe
const timestamps = [];
function generateTimestamps(start, end) {
	for (let i = 0; i < 10; i++) { // Create 10 sample timestamps
		timestamps.push(now - chartTimeframe + (i * (chartTimeframe / 10)));
	}
}
for (let i = 0; i < 10; i++) { // Create 10 sample timestamps
    timestamps.push(now - chartTimeframe + (i * (chartTimeframe / 10)));
}

// Example sensor data
const temperatureData = timestamps.map(() => Math.floor(Math.random() * 10) + 20);
const humidityData = timestamps.map(() => Math.floor(Math.random() * 10) + 60);

console.log('Timestamps:', timestamps);
console.log(temperatureData);
console.log(humidityData);	

async function createChart() {
    const config = {
        type: 'line',
        data: {
            labels: timestamps.map(ts => formatLabel(ts, chartTimeframe)), // Dynamically formatted labels
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: temperatureData,
                    borderColor: 'rgb(0, 255, 255)',
                    backgroundColor: 'rgba(0, 255, 255, 0.2)',
                    tension: 0.4
                },
                {
                    label: 'Humidity (%)',
                    data: humidityData,
                    borderColor: 'rgb(255, 0, 255)',
                    backgroundColor: 'rgba(255, 0, 255, 0.2)',
                    tension: 0.4
                }
            ]
        },
        options: {
            plugins: {
                legend: {
                    labels: { color: 'white', font: { size: 16 } }
                }
            },
            scales: {
                x: {
                    ticks: { color: 'white', font: { size: 16 } },
                    grid: { color: 'rgb(65, 65, 65)', linechartWidth: 1.5 }
                },
                y: {
                    ticks: { color: 'white', font: { size: 16 } },
                    grid: {
                        color: (ctx) => ctx.tick.value % 5 === 0 ? 'rgb(65, 65, 65)' : 'transparent',
                        linechartWidth: 1
                    }
                }
            }
        }
    };

    const imageBuffer = await chartCanvas.renderToBuffer(config);
    fs.writeFileSync('sensor_chart.png', imageBuffer);
    console.log('Chart saved as sensor_chart.png');
}

// Function to format timestamps based on the timeframe
function formatLabel(timestamp, timeframe) {
    const date = new Date(timestamp);
    if (timeframe <= 24 * 60 * 60 * 1000) { // 24-hourS
        return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }); // Just time
    } else if (timeframe <= 7 * 24 * 60 * 60 * 1000) { // 7 days
        return date.toLocaleString("en-US", { weekday: "short", hour: "2-digit", minute: "2-digit" }); // Day + Time
    } else {
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }); // Short date
    }
}

createChart();