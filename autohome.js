// --------------------------------------------------------
// © 2017-2025 David Jacobsen / dave.jacobsen@gmail.com
// See README.md
// AUTOHOME - MySensors Gateway with a modern Web Interface
// --------------------------------------------------------
/*jshint esversion: 6 */

"use strict";

// Import dependencies ---------------------------

// Comms and server
const express        = require("express");
const http           = require("http");
const socketIo       = require("socket.io");
const request        = require("request");
const geoip          = require("geoip-lite");
const { SerialPort } = require("serialport");

// Costmetic
const colors = require("colors");             // To use of colors in console messages
const { styleText } = require("util");        // For colored console messages

// File system, path handling and command line arguments
const fs        = require("fs");
const args      = require('minimist')(process.argv.slice(2)); // Using `minimist` for easier flag handling
const { spawn } = require("child_process");

// Load environment variables
require("dotenv").config();

// Modules
const MS = require("./modules/constants.js"); // MySensors API constants

// Smart Plug definitions
const enableWEMO   = false;   // Set to true to enable Wemo smart switches
const enableTPLINK = true;    // Set to true to enable TP-Link smart switches - WILL NEED TO UNCOMMENT RELATED CODE
const enableTUYA   = false;   // Set to true to enable TUYA smart switches - WILL NEED TO UNCOMMENT RELATED CODE
//let plugs = [];   // List of smart plugs/switches

// Extract command-line arguments
let DEBUG = args.d || false; // Debug mode defaults to false

// Add extra command line processing commands here if needed
const enableRRD = !args.nograph || true; // Generate graphs unless app started with --nograph

// Keep track of when data was last received from the gateway
let lastDataReceived = Date.now();
let serialConnectionErrorTriggered = false;

// Initialize Express app and HTTP server
const app    = express();
const server = http.Server(app);
const io     = socketIo(server);

// Express settings
app.use(express.urlencoded({ extended: false })); 
app.use(express.json());

// Allow modules for client access
app.use('/css',     express.static(__dirname + '/css'));
app.use('/js',      express.static(__dirname + '/js'));
app.use('/images',  express.static(__dirname + '/images'));
app.use('/modules', express.static(__dirname + '/modules'));

// RRDTool setup
const TempsRRDFile     = './temps.rrd'; // RRD file for temperature data
const makeGraphCmdFile = 'make-graph.cmd'; // Command to create graphs
const autohomeLogFile  = './autohome.log'; // Log file for console messages
const settingsFile     = './settings.json'; // Settings file to load

let conf = {}; // settings.json will be loaded in here later

const SENSORCHECKINTERVAL = 300000;  // 5 mins
const RRDUPDATEINTERVAL   = 300000;  // This should ALWAYS be 5 mins. That's what RRDTOOL expects.

// Used by the decode function
let rNode 	    = "";
let rSensor 	= "";
let rMsgtype 	= "";
let rAck 		= "";
let rSubtype 	= "";
let rPayload 	= "";

// AWS SES (Email) setup
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

// Set AWS region and access key
const ses = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
    
// Send an email using AWS SES. Send to dave.jacobsen@gmail.com by default
async function sendEmail(mailRecipients='dave.jacobsen@gmail.com', mailSubject='Alert from Autohome', MailMessage='') {
  const params = {
    Source: 'dave@littlepunk.co.nz',
    Destination: {
      ToAddresses: [mailRecipients]
    },
    Message: {
      Subject: {
        Data: mailSubject,
        Charset: 'UTF-8'
      },
      Body: {
        Text: {
          Data: MailMessage,
          Charset: 'UTF-8'
        },
        // Optional: add HTML
        // Html: {Data: '<h1>Hello</h1><p>This is an HTML email</p>', Charset: 'UTF-8'}
      }
    }
  };

  try {
    const command = new SendEmailCommand(params);
    const result = await ses.send(command);
    logMsg('D', `Email sent! Message ID: ${result.MessageId}`);
  } catch (error) {
    logMsg('E', `Error sending email: ${error}`);
  }
}

if (DEBUG) { sendEmail('dave.jacobsen@gmail.com',"AutoHome Debug", "AutoHome started");}


// ===================================================================
// Load settings at startup
readSettings();

// Set up timers for regular tasks
function startPolling() {
    setTimeout(() => {
        updateStatuses();
        startPolling();
    }, conf.polling.interval * 1000);
}

function startSensorCheck() {
    setTimeout(() => {
        runSensorCheck();
        startSensorCheck();
    }, SENSORCHECKINTERVAL);
}

function runSensorCheck() {
    const now = Date.now();

    // Check each sesnor node for its last update time
    conf.mysensors.sensornodes.forEach(sensor => {
        let oldStatus = sensor.contact_status;
        let timeDiff = now - sensor.updated;

        sensor.contact_status = timeDiff > sensor.freq * 2000 ? "2" : 
                                timeDiff > sensor.freq * 1000 ? "1" : "0";

        if (oldStatus !== sensor.contact_status) {
            io.emit("Sensor", JSON.stringify(sensor));
        }
    });

    // Check if the gateway has sent data recently
    if ((lastDataReceived < (now - 2 * SENSORCHECKINTERVAL)) && (!serialConnectionErrorTriggered)) {
        logMsg('E', 'Gateway has not sent data recently. Please check the connection.');
        conf.mysensors.gatewayStatus = "2"; // 2 = error
        sendEmail('dave.jacobsen@gmail.com', 'Gateway Error', 'Gateway has not sent data recently. Please check the connection.');
        serialConnectionErrorTriggered = true;
    } else {
        serialConnectionErrorTriggered = false;
    }
}

// Get things started
startSensorCheck();
startPolling();

// Loop to do any regular activities 
function updateStatuses() {
 	// Update external temp/humidity/pressure/weather
 	getOutsideWeather();        // From openweathermap.org
    getWeatherFromMetService(); // From MetService API
}

// Regularly check sensor update times and highlight any missing by changing the colour
// Regular gathering temperature data that is passed to RRDTool

function startTempTimer () {
    setTimeout(stopTempTimer, RRDUPDATEINTERVAL);  // 5 mins
}

function stopTempTimer () {
	// Write out current temperatures readings to RRDTool and generate new graphs
	// Sensors MUST be in the order shown
	// "U" is the value for UNKNOWN and is handled by RRDTOOL more gracefully than an empty string
	let args = "N";
	let getSensor;

	// Build up RRD update string from each sensor in order
	['Outside','Tom','Bedroom','Sophie','Michael','Laundry','Freezer','Balcony','Humidity','Pressure','Speed'].forEach(s => {
		getSensor = conf.mysensors.sensornodes.find(sensor => sensor.name == s);
		args += ":" + ((getSensor !== undefined) ? getSensor.value : "U");
	})

	logMsg('DI', `RRD data update: ${args}`);

	const bat = spawn(process.env.RRDTOOL_PATH, ['update', TempsRRDFile, args]);

	bat.stdout.on('data', (data) => { logMsg('DI', `RRD data updating: ${data.toString()}`);});
	bat.stderr.on('data', (data) => { logMsg('E', `RRD data update error: ${data.toString()}`);	});

	bat.on('exit', (code) => {
		if (code != 0) { logMsg('E', `RRD data update error code: ${code}`);}
		logMsg('DI', `About to create RRD graphs`);
		//const bat2 = spawn(makeGraphCmdFile);
		const bat2 = spawn('cmd.exe', ['/c', makeGraphCmdFile]);

		bat2.stdout.on('data', (data) => { logMsg('DI', `RRD graph being created: ${data.toString().trim()}`); });
		bat2.stderr.on('data', (data) => { logMsg('DE', `RRD graph creation error: ${data.toString()}`); });

		bat2.on('exit', (code) => {
			if (code != 0) {
				logMsg('DE', `RRD graph creation error code: ${code}`);	}
		});
	});

    startTempTimer();

    // Worth savings settings every now and then
    writeSettings();
}

// Start the timer to update RRD data and graphs regularly
// !!!! Re-enable once there is an RRD file in place
if (enableRRD) {
	startTempTimer();
}

// --------------------------------------


function readSettings() {
    logMsg('I', 'Reading settings');
    
    try {
        // Check if the settings file exists before reading
        if (!fs.existsSync(settingsFile)) {
            throw new Error(`Settings file not found: ${settingsFile}`);
        }

        // Read the file
        const fileContents = fs.readFileSync(settingsFile, "utf-8");

        // Ensure the file is not empty
        if (!fileContents.trim()) {
            throw new Error("Settings file is empty.");
        }

        // Attempt to parse JSON with additional validation
        const parsedConfig = JSON.parse(fileContents);

        if (typeof parsedConfig !== 'object' || parsedConfig === null) {
            throw new Error("Parsed settings are not a valid JSON object.");
        }

        // Assign parsed configuration
        conf = parsedConfig;

    } catch (err) {
        console.error("Error reading settings:", err.message);
    }

    logMsg('I', 'Settings loaded');
}

// Asynchronous version (preferred)
function writeSettings() {
    try {
        if (!conf || typeof conf !== "object") {
            throw new Error("Invalid configuration object.");
        }

        const jsonData = JSON.stringify(conf, null, 2);

        if (!jsonData) {
            throw new Error("Failed to serialize configuration data.");
        }

        fs.writeFile(settingsFile, jsonData, "utf-8", (err) => {
            if (err) {
                logMsg('E', `Error saving settings: ${err.message}`);
            } else {
                logMsg('I', "Settings successfully saved.");
            }
        });

    } catch (error) {
        logMsg('E', `WriteSettings error: ${error.message}`);
    }
}

// Synchronous version (not preferred, but used for shutdown)
function writeSettingsSync() {
    try {
        fs.writeFileSync(settingsFile, JSON.stringify(conf, null, 2), "utf-8");
    } catch (err) {
		logMsg('E', 'Tried to write settings but failed: ' + err);
    }
}

// Gracefully handle shutdown signals
process.on('SIGINT', () => {
    logMsg('I', 'Local shut down requested. Saving settings and exiting.');
    writeSettingsSync();
    process.exit(0);
});


// Open serial port to connect to MySensor Gateway
logMsg('I', 'Commence opening serial port');

const gw = new SerialPort({path: conf.mysensors.comport, baudRate: conf.mysensors.baud, autoOpen: conf.mysensors.autoopen});
let gwErrFlag = true;  // We're in an error state until the port is officially open

gw.open();
gw.on('open', function() {
	logMsg('I', 'Connected to serial gateway on ' + conf.mysensors.comport + ' at ' + conf.mysensors.baud + ' baud');
	gwErrFlag = false;
	}).on('data', function(data) {
        lastDataReceived = Date.now(); // Update last data received time
		processIncomingData(data.toString());
		gwErrFlag = false;
	}).on('end', function() {
	 	logMsg('I', 'Disconnected from gateway');
		gwErrFlag = true;
	}).on('error', function() {
		logMsg('E', "Connection error. Can't connect to com port. Please restart later.");
		gwErrFlag = true;
	});

function processIncomingData(str) {
	str.split("\n").forEach(line => {
		if (line.trim()) decode(line.trim());
	});
}
	
// IS THIS NEEDED??? Used where? Surely to update a display or change a sensor setting
// Send a text message off to the gateway
// function gwWrite(msg, logtxt) {
// 	gw.write(msg + '\n', function(err) {
// 		if (err) {
// 	    	return logMsg('E', 'Error on serial write to MySensors gateway: ' + err.message);
// 	  	}
// 	  	logMsg('DI', logtxt);
// 	});
// }

// Helper function to build up a message string from a sensor
function appendData(str) {
	let pos = 0;
	let appendedString = "";

    while (str.charAt(pos) != '\n' && pos < str.length) {
        appendedString = appendedString + str.charAt(pos);
        pos++;
    }
    if (str.charAt(pos) == '\n') {
		// Process the message contained in appendedString as it's a full line with decode function
        decode(appendedString.trim());
        logMsg('DR', "Sensor message: NodeID:" + rNode + ",SensorID:" + rSensor + ",MsgType:" + rMsgtype + ",Ack:" + rAck + ",SubType:" + rSubtype + ",PLoad:" + rPayload);
    }
    if (pos < str.length) {
        // There's still more data to process so chop of what's been processed and recurse
        appendData(str.substr(pos + 1, str.length - pos - 1));
    }
}


// Get power usage data from Mercury Energy for the last month
// =========================================================
// Use these from .env
//     OPOWER_USERNAME
//     OPOWER_PASSWORD

function getDateStringFromDelta(deltaDays) {
  const date = new Date();
  date.setDate(date.getDate() + deltaDays);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// This removes unnecessary headers from the power data and returns just the data lines
function trimToFirstDateLine(text) {
  const lines = text.split(/\r?\n/);
  const dateLineIndex = lines.findIndex(line => /^\d{4}-\d{2}-\d{2}/.test(line.trim()));

  if (dateLineIndex === -1) {
    console.log('No power data found');
    return ''; // No date line found
  }

  return lines.slice(dateLineIndex).join('\n');
}

function trimEmptyLines(text) {
  return text
    .split(/\r?\n/)               // Split into lines
    .filter(line => line.trim())  // Remove empty or whitespace-only lines
    .join('\n');                  // Rejoin into a single string
}


const { OpowerClient } = require('./node-opower.js');


// (async () => {
async function getPowerData() {
  try {
    let opowerUser = process.env.OPOWER_USERNAME;
    let opowerPassword = process.env.OPOWER_PASSWORD;

    let startDate = getDateStringFromDelta(-90);
    let endDate = getDateStringFromDelta(-60);
    const clientConfig = {
        username: opowerUser,
        password: opowerPassword
      };

    const client = new OpowerClient(clientConfig);
    logMsg('I', `Fetching power data from Mercury from ${startDate} to ${endDate} with ${opowerUser} ...`);
    const usage = await client.getUsage(startDate, endDate);
    const usageData = trimToFirstDateLine(usage);
    logMsg('I',`Power data:\n${trimEmptyLines(usageData)}`);
    //?? Add: Store and emit power data
    latestPowerData = trimEmptyLines(usageData);
    io.emit("PowerData", latestPowerData);
    //??
  }
  catch (error) {
    console.error('❌ Error fetching power data:', error);
  }
}
// )();
getPowerData();



async function getWeatherFromMetService() {
    // Getting data from the MetService API
    // =========================================================
    // Use these from .env
    //     METSERVICE_KEY
    //     METSERVICE_URL
    //
    // API Console : https://console.metoceanapi.com/#/dashboard
    // Login with Gmail credentials
    // =========================================================

    let url = process.env.METSERVICE_URL;    // Use from .env

    let data = {
        points: [{lon: 174.7787, lat: -41.2924}],   // Wellington, NZ
        variables: ['precipitation.rate'],
        time: {
            from: new Date(Date.now() - 60*60*1000).toISOString(),  // Time 1 hour ago
            interval: '1h',
            repeat: 0,
        }
    };

    let options = {
        method: 'post',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.METSERVICE_KEY    // *** Use key from .env
        }
    };

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`HTTP error fetch from MetService. Status: ${response.status}`);
        }
        const json = await response.json();
        if (!json.variables || !json.variables["precipitation.rate"] || !json.variables["precipitation.rate"].data) {
            throw new Error("Invalid JSON structure returned from MetService. Missing precipitation rate data.");
        }

        // Ensure the precipitation rate data exists and is a valid number
        const precipitationRate = json.variables["precipitation.rate"].data[0];
        if (typeof precipitationRate !== "number") {
            throw new Error(`Unexpected data type for precipitation rate: ${typeof precipitationRate}`);
        }

        //console.log(JSON.stringify(json.dimensions.time.data, null, 2), JSON.stringify(json.variables["precipitation.rate"].data[0], null, 2));
        // Send the precipitation rate to the MySensors gateway
        decode(`201;0;${MS.C_SET};0;${MS.V_TEMP};${precipitationRate.toFixed(1)}`);
    } catch (error) {
        logMsg('E', 'Error fetching from MetService: ' + error)
    }
}

// Do initial fetch of weather data from MetService API
getWeatherFromMetService();

async function getOutsideWeather() {
    logMsg("I", "Requesting updated external weather.");

    try {
        const response = await fetch(conf.weather.externalTempURL);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const obj = await response.json();

        if (!obj.main || !obj.weather) {
            logMsg("E", "Error parsing returned weather data.");
            return;
        }

        // Parse and send weather data
        updateWeatherData(obj);
        writeSettings();

    } catch (error) {
        logMsg("E", `Error getting external weather: ${error.message}`);
    }
}

// Helper function to update weather data
function updateWeatherData(obj) {
    const weatherData = [
        { id: 100, value: Math.round((obj.main.temp - 273.15) * 10) / 10 },
        { id: 50, value: obj.main.humidity },
        { id: 51, value: Math.round(obj.main.pressure) },
        // { id: 201, value: getWeatherFromMetService() },    // To be added later with MetService API. Precipitation (rain)
        { id: 202, value: obj.wind.deg },
        { id: 203, value: Math.round(3.6 * obj.wind.speed) },
        { id: 204, value: convertTimestampToTime(obj.sys.sunrise) },
        { id: 205, value: convertTimestampToTime(obj.sys.sunset) },
        { id: 209, value: obj.weather[0].description },
        { id: 210, value: obj.weather[0].main },
        { id: 211, value: Math.round((obj.main.feels_like - 273.15) * 10) / 10 },
        { id: 200, value: `http://openweathermap.org/img/w/${obj.weather[0].icon}.png`, type: MS.V_IMAGE }
    ];

    const graphData = [
        { id: 99, value: "temp_graph_1w.png", type: MS.V_IMAGE },
        { id: 206, value: "humidity_1w.png", type: MS.V_IMAGE },
        { id: 207, value: "pressure_1w.png", type: MS.V_IMAGE },
        { id: 208, value: "speed_1w.png", type: MS.V_IMAGE }
    ];

    // Process weather data
    weatherData.forEach(({ id, value, type = MS.V_TEMP }) => {
        decode(`${id};0;${MS.C_SET};0;${type};${value}`);
    });

    // Process graphs
    graphData.forEach(({ id, value }) => {
        decode(`${id};0;${MS.C_SET};0;${MS.V_IMAGE};${value}`);
    });
}

// Format the current date and time as a string like "DD-MM-YYYY HH:MM:SS"
function dateTimeString() {
	const now = new Date(); // Get current date and time
	const withLead0 = (value) => String(value).padStart(2, '0'); // Ensure leading zeros

	// Construct the date and time string
	return `${withLead0(now.getDate())}-${withLead0(now.getMonth() + 1)}-${now.getFullYear()} ` +
			`${withLead0(now.getHours())}:${withLead0(now.getMinutes())}:${withLead0(now.getSeconds())}`;
}

// This function takes a timestamp (in seconds) and converts it to a 12-hour format with AM/PM
function convertTimestampToTime(timestamp) {
    const date = new Date(timestamp * 1000); // Convert the timestamp to milliseconds
    const hours = date.getHours(); // Get hours
    const minutes = date.getMinutes(); // Get minutes
    const formattedMinutes = String(minutes).padStart(2, '0'); // Add leading 0 to minutes
    const isPM = hours >= 12; // Check if the time is PM
    const adjustedHours = hours % 12 || 12; // Adjust hours to 12-hour format
    const ampm = isPM ? 'PM' : 'AM'; // Determine AM or PM
    
    // Format the time string
    return `${adjustedHours}:${formattedMinutes} ${ampm}`;
}


// Writes a log message to the console.
// Type D will only be displayed if the global DEBUG is true
// Type DE will log an error only of DEBUG is true
// Type DI will log a informational message only if DEBUG is true
function logMsg(type, txt) {
    // Exit early if DEBUG is false and the type is debug ('D')
    if (type.startsWith('D') && !DEBUG) return 0;

    // Construct the message text
    const debugLevel = type.length === 2 ? type[1] : 'D';
    const msgTxt = `${type.startsWith('D') ? debugLevel : type} ${dateTimeString()} ${txt}`;

    // Log the message with the appropriate style
    switch (type) {
        case 'E': // Error messages
            console.log(styleText('cyan', msgTxt));
            break;
        case 'C': // Critical messages
            console.log(msgTxt.yellow);
            break;
        case 'R': // Recovery messages
            console.log(msgTxt.green);
            break;
        default: // Generic messages
            console.log(msgTxt);
            break;
    }

    // Append the message to the log file
    fs.appendFile(autohomeLogFile, `${msgTxt}\r\n`, (err) => {
        if (err) {
            console.error("ERROR Writing to log file!");
            throw err;
        }
    });
}

// Export logMsg for use in sub-modules
module.exports.logMsg = logMsg;
module.exports.updateSmartDeviceStatus = updateSmartDeviceStatus;

const smartPlugs = require("./js/smart-devices.js"); // Smart devices module for TP-Link and Tuya

const e = require("express");

function updateSmartDeviceStatus(deviceName, deviceStatus){
    let smartDevice = conf.mysensors.sensornodes.find(n => n.name == deviceName);
    //logMsg('C', `${deviceName}: old: ${smartDevice.value} new: ${deviceStatus ? '1' : '0'}`);
    if (smartDevice && (smartDevice.value != (deviceStatus ? '1':'0'))) {
        smartDevice.value = deviceStatus ? '1':'0';
        io.emit('Sensor', JSON.stringify(smartDevice));
        //logMsg('C', JSON.stringify(smartDevice));
    }
}

smartPlugs.startTPLink(); // Start TP-Link smart switch handling

// Decode a message received from a sensor
function decode(msg) {
	const msgs = msg.toString().split(";");

	// Should really check that all these parameters are available
	if (msgs.length < 6) {
		// logMsg("DE", "Incomplete message from gateway: " + msg);
		logMsg("DE", `Incomplete message from gateway: ${msg}`);
		return 1;
	}

	//Split out the valid message into its components
	const [rNode, rSensor, rMsgtype, rAck, rSubtype, payload] = msgs;
	const trimmed = payload.trim();
    let rPayload = isNaN(+trimmed) ? trimmed : +trimmed;

	switch (+rMsgtype) {
		case MS.C_PRESENTATION:  // = 0
		case MS.C_REQ:  // = 2 = A sensor is asking for data
			break;
		case MS.C_SET:  //SET message = 1
			switch (rSubtype) {
				case MS.V_TRIPPED:
				case MS.V_LOCK_STATUS:
				case MS.V_SWITCH:
				case MS.V_TEMP:
				case MS.V_IMAGE:
					let getSensor = conf.mysensors.sensornodes.find(sensor => sensor.id == rNode);
					if (getSensor !== undefined) {
						let oldVal = getSensor.value;
						getSensor.updated = new Date().getTime();
						getSensor.value = rPayload;
						getSensor.contact_status = '0';
						// Send JSON of sensor
						io.emit('Sensor', JSON.stringify(getSensor));
						logMsg('I', `Got: ${getSensor.name} (${rNode}): ${getSensor.value}`);
						logMsg('DI', "Sending JSON: " + JSON.stringify(getSensor));

						// If from FanSwitch(25) then send of to fan switch (105)
						// Check to see if the value has changed at all
						// if ((rNode == '25') && (rPayload != oldVal)) {
						// 	logMsg('I', 'Received message from Fan Switch. Sending to fan: ' + '105;0;'+ C_SET + ';0;' + V_SWITCH + ';' + rPayload);
						// 	decode('105;0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';' + rPayload);
						// 	processButton('105');
						// }
					} else {
						logMsg('E', `Working with: ${msg} but wasn't found`);
					}
					// Special handling of Freezer (14) Temp and alerting:
					if (rNode == '14') {
						checkSensor(getSensor);
					}
					break;
				case MS.V_STATUS:
					break;
				default:
					logMsg ('E', `Unknown Sensor message: ${rNode};${rSensor};${rMsgtype};${rAck};${rSubtype};${String(rPayload)}`);
			}
			break;

		case MS.C_INTERNAL:  //INTERNAL messages = 3
			switch (rSubtype) {
				case MS.I_BATTERY_LEVEL:
					logMsg('I', "Internal battery level is " + rPayload + "%");
					break;
				case MS.I_LOG_MESSAGE:
					logMsg('DI', 'MySensors Internal Log Message: ' + rNode + ';' + rSensor + ';' + rMsgtype + ';' + rAck + ';' + rSubtype + ';' + rPayload);
					break;

				case MS.I_GATEWAY_READY:
					logMsg('I', 'MySensors Gateway startup is complete.');
					break;

				default:
					logMsg('DI', 'MySensors Int Msg: ' + rNode + ';' + rSensor + ';' + rMsgtype + ';' + rAck + ';' + rSubtype + ';' + rPayload);
			}
			break;
		case MS.C_BROADCAST:   // Usually at sensor startup
			logMsg ('DI', 'Sensor Broadcast: ' + rNode + ";" + rSensor + ";" + rMsgtype + ";" + rAck + ";" + rSubtype + ";" + rPayload);
			break;

		default:
			logMsg ('E', 'Sensor Msg Unknown: ' + rNode + ";" + rSensor + ";" + rMsgtype + ";" + rAck + ";" + rSubtype + ";" + rPayload);

	}
}

// function checkSensor(sensor) {

// 	// Check if the sensor has a valid value and thresholds
//     function parseThreshold(threshold) {
//         if (typeof threshold === 'number') return { operator: '=', number: threshold };
        
// 		// Check if the threshold is a string and matches the expected format
// 		const match = threshold.match(/^([<>])(-?\d+)$/); 
//         return match ? { operator: match[1], number: parseFloat(match[2]) } : null;
//     }

//     const warning = parseThreshold(sensor.warningThreshold);
//     const alarm = parseThreshold(sensor.alarmThreshold);

//     function shouldRaiseAlert(threshold) {
//         const { operator, number } = threshold;
//         return operator === '=' ? sensor.value === number :
//                operator === '<' ? sensor.value < number :
//                operator === '>' ? sensor.value > number :
//                false;
//     }

// 	// Check if the sensor is now normal but alarmState was true and email things are ok
// 	if (!(shouldRaiseAlert(alarm) || shouldRaiseAlert(warning)) && (sensor.alarmState !== 0)) {
// 		const msgBody = `INFO: ${sensor.name} value (${sensor.value}) is back to normal!`;
// 		logMsg('I', msgBody);
// 		sendEmail('dave.jacobsen@gmail.com', `${sensor.name} Normal`, msgBody); 
// 		sensor.alarmState = 0; // No threshold set, no alert
// 	}

// 	// Check if the sensor value exceeds the warning or alarm thresholds and email only if not in alarm state already
// 	if (shouldRaiseAlert(alarm) && (sensor.alarmState !== 2)) {
// 		const msgBody = `ALARM: ${sensor.name} value (${sensor.value}) exceeded threshold! (${alarm.operator}${alarm.number})`;
// 		logMsg('E', msgBody);
// 		sendEmail('dave.jacobsen@gmail.com', `${sensor.name} Alarm`, msgBody); 
// 		sensor.alarmState = 2;
//     } else if (shouldRaiseAlert(warning) && (sensor.alarmState !== 1))  {
// 		const msgBody = `WARNING: ${sensor.name} value (${sensor.value}) near critical value! (${alarm.operator}${alarm.number})`;
//         logMsg('C', msgBody);
// 		sendEmail('dave.jacobsen@gmail.com', `${sensor.name} Warning`, msgBody); 
// 		sensor.alarmState = 1;
//     }
// }

// ----------------

function checkSensor(sensor) {
    function parseThreshold(threshold) {
        if (typeof threshold === "number") return { operator: "=", number: threshold };
        const match = threshold.match(/^([<>])(-?\d+)$/);
        return match ? { operator: match[1], number: parseFloat(match[2]) } : null;
    }

    function shouldRaiseAlert(threshold) {
        if (!threshold) return false;
        const { operator, number } = threshold;
        return operator === "=" ? sensor.value === number :
               operator === "<" ? sensor.value < number :
               operator === ">" ? sensor.value > number :
               false;
    }

    function handleAlert(type, code, state, msg) {
        logMsg(code, msg);
        sendEmail("dave.jacobsen@gmail.com", `${sensor.name} ${type}`, msg);
        sensor.alarmState = state;
    }

    const warning = parseThreshold(sensor.warningThreshold);
    const alarm = parseThreshold(sensor.alarmThreshold);

    if (!shouldRaiseAlert(alarm) && !shouldRaiseAlert(warning) && sensor.alarmState !== 0) {
        handleAlert("Normal", "I", 0, `INFO: ${sensor.name} value (${sensor.value}) is back to normal!`);
    } else if (shouldRaiseAlert(alarm) && sensor.alarmState !== 2) {
        handleAlert("Alarm", "E", 2, `ALARM: ${sensor.name} value (${sensor.value}) exceeds threshold! (${alarm.operator}${alarm.number})`);
    } else if (shouldRaiseAlert(warning) && sensor.alarmState !== 1) {
        handleAlert("Warning", "C", 1, `WARNING: ${sensor.name} value (${sensor.value}) is near critical value! (${alarm.operator}${alarm.number})`);
    }
}

//??
let latestPowerData = ""; // Store latest power data for new clients
//??

// What to serve from the root address. http://localhost/
app.get('/', function(req, res){
	let sendFileName = __dirname + '/dash.html';

	// Geo check src ip
	let geo = geoip.lookup(req.ip);

	if (geo) {

		if ((geo.country == 'NZ') || (geo.country == 'AU')) {
			logMsg('I', 'Hello ' + req.ip + ' from ' + geo.country);
		} else {
			logMsg('I', 'Sorry ' + req.ip + ' from ' + geo.country + 'you are denied');
			// Just ignore it   //sendFileName = __dirname + '/sorry.html';
            return;
		}
	}
	res.sendFile(sendFileName);
});

// Used for testing
app.get('/test', function(req, res){
	res.sendFile(__dirname + '/dash-modern.html');
});

// Used for testing
app.get('/test2', function(req, res){
	res.sendFile(__dirname + '/test.html');
});

// Used for testing
app.get('/constants-client.js', function(req, res){
	res.sendFile(__dirname + '/constants-client.js');
});

// Returns JSON version of the current sensor values
app.get('/sensors', function(req, res){
	let sensorJSON = JSON.stringify(conf.mysensors.sensornodes);
	res.send(sensorJSON);
});


// Used for displaying all graphs
app.get('/graphs', function(req, res){
	res.sendFile(__dirname + '/graphs.html');
});

logMsg('I', 'Starting io handler');
// When a connection is made, setup the handler function
io.on("connection", function (socket) {
    logMsg("DC", "Web client connected");

    //?? Send latest power data on connect
    if (latestPowerData) {
      socket.emit("PowerData", latestPowerData);
    }
    //??

    // Listen for client messages
    socket.on("ClientMsg", function (msg) {
        // Clean up and process the received message
        const cleanedMsg = msg.replace(/(\r\n|\n|\r)/gm, "");
        const [action, param] = cleanedMsg.split(";");

        // Handle the different actions from the client
        switch (action) {
            case "redraw":
                handleRedraw();
                break;
            case "init":
                handleInit();
                break;
            case "BUT":  //e.g. "BUT;105"
            case "CHK":
                handleButtonOrCheckbox(param); 
                break;
            default:
                logMsg("I", `Received unknown message from client: ${msg}`);
        }
    });

    // Handle client disconnection
    socket.on("disconnect", function () {
        logMsg("DC", "Web client disconnected");
    });

    // Helper Functions
    function handleRedraw() {
        conf.mysensors.sensornodes.forEach(sensor => {
            io.emit("Sensor", JSON.stringify(sensor));
        });
        logMsg("DR", "Redraw requested");
        // *** Needed? considering above?   io.emit("", JSON.stringify(conf.mysensors.sensornodes)); // Emit sensor nodes data
    }

    function handleInit() {
        io.emit("AllSensors", JSON.stringify(conf.mysensors.sensornodes)); // Emit sensor nodes data
        logMsg("DR", "Init requested");
        //?? Send latest power data to this client
        if (latestPowerData) {
          socket.emit("PowerData", latestPowerData);
        }
        //??
    }

    // function handleButtonOrCheckbox(buttonId) {
    //     //logMsg("I", `Button/Checkbox: ${buttonId}`);
    //     processButton(buttonId); // Process the button action
    // }
});

logMsg('I', 'Starting http listen');

// Start Web Service listening on TCP specified in the settings
//BUG: Why hard coded here?

server.listen(conf.sockets.port, function(){
	logMsg('C', 'Listening on *:' + conf.sockets.port);
});
  
// Process button or checkbox switch presses from the client

// function processButton(butID) 
function handleButtonOrCheckbox(butID) {
    //logMsg('I', `Handling button ${butID}`);
    const sensor = conf.mysensors.sensornodes.find(s => s.id == butID);

    if (!sensor) {
        logMsg('E', `Unknown switch/checkbox: ${butID}`);
        return;
    }

    updateSensorState(sensor);

    // Handle changes for Smart Plugs or special actions

    // handleSpecialActions(butID, sensor.value);
    handleSpecialActions(sensor);
}

function updateSensorState(sensor) {
    sensor.updated = Date.now();
    sensor.value = sensor.value === '0' ? '1' : '0';
    sensor.contact_status = '0';

    // Send the updated sensor state to clients triggering a UI update
    io.emit('Sensor', JSON.stringify(sensor));
}

// Handle special actions based on the sensor id
function handleSpecialActions(sensor) {
    const specialActions = {
        '105': () => smartPlugs.setStateTPLinkPlug(sensor.name, sensor.value),   // Wardrobe
        '23' : () => smartPlugs.setStateTPLinkPlug(sensor.name, sensor.value),   //Sky
        '24' : () => smartPlugs.setStateTPLinkPlug(sensor.name, sensor.value),   //Sophie
        '26' : () => smartPlugs.setStateTPLinkPlug(sensor.name, sensor.value),   //Daves Blanket
        '21' : () => smartPlugs.setStateTPLinkPlug(sensor.name, sensor.value),   //Panel heater
        '103': () => toggleDebug(value),
        '997': () => shutdownApplication(),
        '998': () => triggerSettingsSave()
    };

    specialActions[sensor.id]?.();
}

function toggleDebug(value) {
    DEBUG = (value === '1');
    logMsg('I', `Debug is now: ${DEBUG}`);
}

function shutdownApplication() {
    logMsg('I', '**** Client initiated shutdown ****');
    writeSettingsSync();
    process.exit(0);
}

function triggerSettingsSave() {
    writeSettings();
    decode(`998;0;${MS.C_SET};0;${MS.V_SWITCH};0`);
}


