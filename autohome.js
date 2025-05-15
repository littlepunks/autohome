// ----------------------------------------------------
// © 2017-2025 David Jacobsen / dave.jacobsen@gmail.com
// See README.md
// AUTOHOME - MySensors Gateway with Web Interface
// ----------------------------------------------------
/*jshint esversion: 6 */

"use strict";

// Import dependencies
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const request = require("request");
const colors = require("colors");             // To use of colors in console messages
const fs = require("fs");
const geoip = require("geoip-lite");
const { spawn } = require("child_process");
const { SerialPort } = require("serialport");
const { styleText } = require("util");        // For colored console messages
const MS = require("./modules/constants.js"); // MySensors API constants

// Get command-line arguments
const args = require('minimist')(process.argv.slice(2)); // Using `minimist` for easier flag handling

// Extract arguments
let DEBUG = args.d || false; // Debug mode defaults to false
// Add extra command line processing commands here if needed
const enableRRD = !args.nograph || true; // Generate graphs unless app started with --nograph

// Smart Switches
const enableWEMO   = false;   // Set to true to enable Wemo smart switches
const enableTPLINK = false;   // Set to true to enable TP-Link smart switches - WILL NEED TO UNCOMMENT RELATED CODE
const enableTUYA   = false;   // Set to true to enable TUYA smart switches - WILL NEED TO UNCOMMENT RELATED CODE
let plugs = [];   // List of smart plugs/switches

// Load environment variables
require("dotenv").config();

// Initialize Express app and HTTP server
const app = express();
const server = http.Server(app);
const io = socketIo(server);

app.use(express.urlencoded({ extended: false })); 
app.use(express.json());

// RRDTool setup
//const rrdtool = 'C:/Users/littlepunk/Documents/autohome/rrdtool/rrdtool.exe';
const TempsRRDFile = './temps.rrd'; // RRD file for temperature data
const makeGraphCmdFile = 'make-graph.cmd'; // Command to create graphs
const autohomeLogFile = './autohome.log'; // Log file for console messages
//const enableRRD = true; // Set to true to enable RRDTool graphing

let conf = {}; // settings.json will be loaded in here later
const settingsFile = './settings.json'; // Settings file to load

const SENSORCHECKINTERVAL = 300000;  // 5 mins
const RRDUPDATEINTERVAL = 300000;  // This should ALWAYS be 5 mins. That's what RRDTOOL expects.

// Used by the decode function
var rNode 		= "";
var rSensor 	= "";
var rMsgtype 	= "";
var rAck 		= "";
var rSubtype 	= "";
var rPayload 	= "";

// AWS SES (Email) setup
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

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
        // Html: {
        //   Data: '<h1>Hello</h1><p>This is an HTML email</p>',
        //   Charset: 'UTF-8'
        // }
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

// Create RRD if it doesn't exist
// **** NEEDS TO BE CHECKED AGAINST THE LATEST CONFIG
// // function createRRD() {
// 	if (fs.existsSync(TempsRRDFile)) {
// 	  logMsg('I','RRD file already exists.');
// 	  return;
// 	}

// 	// 	List of datasources'Outside','Tom','Bedroom','Sophie','Michael','Laundry','Freezer','Balcony','Humidity','Pressure','Speed'

// 	// Notes:
// 	// Rename datasource:
// 	//   rrdtool tune TempsRRDFile -r oldname:newname
// 	// Add datasource:
// 	//   rrdtool tune DS:SensorName:GAUGE:600:min:max

// 	const args = [
// 	  'create', TempsRRDFile,
// 	  '--step', '300',
// 	  'DS:Outside:GAUGE:600:-50:100',
// 	  'DS:Tom:GAUGE:600:-50:100',
// 	  'DS:Bedroom:GAUGE:600:-50:100',
// 	  'DS:Sophie:GAUGE:600:-50:100',
// 	  'DS:Michael:GAUGE:600:-50:100',
// 	  'DS:Laundry:GAUGE:600:-50:100',
// 	  'DS:Freezer:GAUGE:600:-50:100',
// 	  'DS:Balcony:GAUGE:600:-50:100',
// 	  'DS:Humidity:GAUGE:600:0:100',
// 	  'DS:Pressure:GAUGE:600:900:1100',
// 	  'DS:WindSpeed:GAUGE:600:0:300',

// 	  'RRA:AVERAGE:0.5:1:288',
// 	  'RRA:AVERAGE:0.5:12:168',
// 	  'RRA:AVERAGE:0.5:288:52',
// 	  'RRA:MAX:0.5:1:288',
// 	  'RRA:MAX:0.5:12:168',
// 	  'RRA:MAX:0.5:288:52',
// 	  'RRA:MIN:0.5:1:288',
// 	  'RRA:MIN:0.5:12:168',
// 	  'RRA:MIN:0.5:288:52'
// 	];
  
// 	const child = spawn(process.env.RRDTOOL_PATH, args);
// 	child.on('close', code => {
// 	  if (code === 0) logMsg('I', 'RRD created successfully.');
// 	  else logMsg('E', 'RRD creation failed.');
// 	});
//   }

// createRRD();

// if (enableTPLINK) {
	
// 	// Common list for smart plugs/switches
// 	//var plugs = [];

// 	// TP-Link Smart Switch setup ---------------------------------------------------------------
// 	const { Client } = require('tplink-smarthome-api');
// 	const client = new Client();

// 	client.on('plug-new', device => {

// 		logMsg('I',`Found TP-Link Smart Switch: ${device.alias} : ${device.host} : ${(device.relayState) ? 'on' : 'off'}`);  //false=off, true=on

// 		// Assumes plug will be found
// 		var tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
// 		decode(tpSensor.id + ';0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';' + ((device.relayState) ? '1' : '0'));

// 		plugs.push({id:  tpSensor.id, host: device.host, type: "tplink"});

// 		device.startPolling(SENSORCHECKINTERVAL);
	
// 		device.on('power-on', () => {
// 			logMsg('I', `TP-Link device ${device.alias} is on`);
// 			// Need to check if it exists otherwise the decode will error
// 			var tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
// 			decode(tpSensor.id + ';0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';1');

// 		});
// 		device.on('power-off', () => {
// 			logMsg('I', `TP-Link device ${device.alias} is off`);
// 			var tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
// 			decode(tpSensor.id + ';0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';0');

// 		});
// 		device.on('in-use-update', inUse => {
// 			//logMsg('DI', `TP-Link device ${device.alias} is ${(device.relayState) ? 'on' : 'off'}`);
// 			//var tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
// 			//decode(tpSensor.id + ';0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';' + ((device.relayState) ? '1' : '0'));	
// 		});  
// 	});
// 	client.on('plug-online', device => {
// 		//logMsg('DI', `TP-Link device ${device.alias} is contactable`);
// 		// Could mark sensor as uncontactable
// 	});
// 	client.on('plug-offline', device => {
// 		logMsg('DI', `TP-Link device ${device.alias} is uncontactable`);
// 	});

// 	logMsg('I', 'Starting TP-Link Device Discovery');
// 	client.startDiscovery();
// }

// // Tuya Switch setup ---------------------------------------------------------------------
// if (enableTUYA) {
// 	const TuyAPI = require('tuyapi');
// 	const util = require('util');
// 	const tuyaDev = new TuyAPI({
// 		id: process.env.TUYA_ID,
// 		key: process.env.TUYA_KEY});
// 		// const tuyaDev = new TuyAPI({
// 		// 	id: '550705303c71bf20a967',
// 		// 	key: '6590d93429b1034a'});
		
// 	//Find device on network
// 	tuyaDev.find().then(() => {
// 		// Connect to device
// 		tuyaDev.connect();
// 		});
	
// 	//Add event listeners
// 	tuyaDev.on('connected', () => {
// 		logMsg('I','Connected to Tuya device');
// 		// Hard coded name. Really need to get name from the switch and match.
// 		plugs.push({id:  conf.mysensors.sensornodes.find(n => n.name == 'Michael').id, type: "tuya"});

// 	});

// 	tuyaDev.on('disconnected', () => {
// 		logMsg('I','Disconnected from Tuya device.');
// 	});

// 	tuyaDev.on('error', error => {
// 		logMsg('E',`Tuya general error! ${$error}`);
// 	});

// 	tuyaDev.on('data', data => {
// 		try {
// 			logMsg('I',`Tuya switch status is: ${data.dps['1']}.`);
// 			logMsg('I',`Tuya switch status is: ${tuyaDev.get().then(status => logMsg('I', 'Tuya status: ' + status))}.`);
		
// 			logMsg('I','Tuya data: ' + util.inspect(data));
// 		}
// 		catch (error) {
// 			logMsg('E', 'Tuya data error: ' + error);
// 		}
		
// 		//Can set Tuya switch via:
// 		tuyaDev.set({set: true}).then(() => logMsg('I', 'Tuya device was turned on'));
// 		tuyaDev.set({set: false}).then(() => logMsg('I', 'Tuya device was turned off'));

// 	});

// 	//Disconnect after 10 seconds
// 	setTimeout(() => { tuyaDev.disconnect(); }, 10000);
// }

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

    conf.mysensors.sensornodes.forEach(sensor => {
        let oldStatus = sensor.contact_status;
        let timeDiff = now - sensor.updated;

        sensor.contact_status = timeDiff > sensor.freq * 2000 ? "2" : 
                                timeDiff > sensor.freq * 1000 ? "1" : "0";

        if (oldStatus !== sensor.contact_status) {
            io.emit("SMv2", JSON.stringify(sensor));
        }
    });
}
startSensorCheck();
startPolling();

// Loop to do any regular activities 
function updateStatuses() {
 	// Update external temp/humidity/pressure
 	getOutsideWeather();
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
	var args = "N";
	var getSensor;

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
        const fileContents = fs.readFileSync(settingsFile, "utf-8");
        conf = JSON.parse(fileContents);
    } catch (err) {
        console.error("Error reading settings:", err);
    }

	logMsg('I', 'Settings loaded');
}

// Asynchronous version (preferred)
function writeSettings() {
    fs.writeFile(settingsFile, JSON.stringify(conf, null, 2), "utf-8", err => {
        if (err) logMsg('E', `Error saving settings: ${err}`);
    });
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
var gwErrFlag = true;  // We're in an error state until the port is officially open

gw.open();
gw.on('open', function() {
	logMsg('I', 'Connected to serial gateway on ' + conf.mysensors.comport + ' at ' + conf.mysensors.baud + ' baud');
	gwErrFlag = false;
	}).on('data', function(data) {
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
	var pos = 0;
	var appendedString = "";

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


// Get external weather
// URL is in settings.json
// The new API gets way more info and also a forecast, but the JSON structure is slightly different:
// https://api.openweathermap.org/data/2.5/onecall?lat=-41.29&lon=174.78&exclude=minutely&appid=cce91f7f0d86e2f338101f1ca24dd37f

// function getOutsideWeather() {
// 	logMsg('I', 'Requesting updated external weather.');
// 	request(conf.weather.externalTempURL, function (error, response, body) {
// 		if (error) {
// 			logMsg('E', 'Error getting external weather.');
// 		}
// 		else {
// 			logMsg('I', 'External weather data collected.');
// 			var obj = JSON.parse(body);

// 			// Check that there was neither an error nor an undefined object returned
// 			if ((obj instanceof Error) || (! obj.main)) {
// 				logMsg('E', 'Error parsing returned weather data.');
// 			}
// 			else {
// 				// Does assume that obj.* contains values, should really check

// 				// Send values of to decode for processing
// 				decode('100;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + Math.round((obj.main.temp-273.15)*10)/10);
// 				decode('50;0;' + MS.C_SET + ';0;' + MS.V_TEMP + ';' + obj.main.humidity);
// 				decode('51;0;' + MS.C_SET + ';0;' + MS.V_TEMP + ';' + Math.round(obj.main.pressure));
// 				decode('202;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + obj.wind.deg);
// 				decode('203;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + Math.round(3.6 * obj.wind.speed));
// 				decode('204;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + convertTimestampToTime(obj.sys.sunrise));
// 				decode('205;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + convertTimestampToTime(obj.sys.sunset));
// 				decode('209;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + obj.weather[0].description);
// 				decode('210;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + obj.weather[0].main);
// 				decode('211;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + Math.round((obj.main.feels_like-273.15)*10)/10);
// 				decode('200;0;'+ MS.C_SET + ';0;' + MS.V_IMAGE + ';' + 'http://openweathermap.org/img/w/' + obj.weather[0].icon + '.png');

// 				// Refresh graphs
// 				decode('99;0;' + MS.C_SET + ';0;' + MS.V_IMAGE + ';' + 'temp_graph_1w.png');
// 				decode('206;0;'+ MS.C_SET + ';0;' + MS.V_IMAGE + ';' + 'humidity_1w.png');
// 				decode('207;0;'+ MS.C_SET + ';0;' + MS.V_IMAGE + ';' + 'pressure_1w.png');
// 				decode('208;0;'+ MS.C_SET + ';0;' + MS.V_IMAGE + ';' + 'speed_1w.png');
// 			}
// 			writeSettings();
// 		}
// 	 });
// }

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


function dateTimeString() {
	const now = new Date(); // Get current date and time
	const withLead0 = (value) => String(value).padStart(2, '0'); // Ensure leading zeros

	// Construct the date and time string
	return `${withLead0(now.getDate())}-${withLead0(now.getMonth() + 1)}-${now.getFullYear()} ` +
			`${withLead0(now.getHours())}:${withLead0(now.getMinutes())}:${withLead0(now.getSeconds())}`;
}
  
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
// If the type start with a D then it will only be displayed if the global DEBUG is true
// If the type is DE then it will log an error only of DEBUG is true
// If the type is DI then it will log a informational message only if DEBUG is true
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


// Decode a message received from a sensor
function decode(msg) {
	const msgs = msg.toString().split(";");

	//	logMsg('I', 'Decoding: ' + msg);
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
					var getSensor = conf.mysensors.sensornodes.find(sensor => sensor.id == rNode);
					if (getSensor !== undefined) {
						var oldVal = getSensor.value;
						getSensor.updated = new Date().getTime();
						getSensor.value = rPayload;
						getSensor.contact_status = '0';
						// Send JSON of sensor
						io.emit('SMv2', JSON.stringify(getSensor));
						logMsg('I', `Got: ${getSensor.name} (${rNode}): ${getSensor.value}`);
						logMsg('DI', "Sending JSON: " + JSON.stringify(getSensor));

						// If from FanSwitch(25) then send of to fan switch (105)
						// Check to see if the value has changed at all
						if ((rNode == '25') && (rPayload != oldVal)) {
							logMsg('I', 'Received message from Fan Switch. Sending to fan: ' + '105;0;'+ C_SET + ';0;' + V_SWITCH + ';' + rPayload);
							decode('105;0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';' + rPayload);
							processButton('105');
						}
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
					logMsg ('E', 'Unknown Sensor message: ' + rNode + ";" + rSensor + ";" + rMsgtype + ";" + rAck + ";" + rSubtype + ";" + String(rPayload));
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

function checkSensor(sensor) {

	// Check if the sensor has a valid value and thresholds
    function parseThreshold(threshold) {
        if (typeof threshold === 'number') {
            return { operator: '=', number: threshold };
        }
		// Check if the threshold is a string and matches the expected format
		const match = threshold.match(/^([<>])(-?\d+)$/); 
        return match ? { operator: match[1], number: parseFloat(match[2]) } : null;
    }

    const warning = parseThreshold(sensor.warningThreshold);
    const alarm = parseThreshold(sensor.alarmThreshold);

    function shouldRaiseAlert(threshold) {
        const { operator, number } = threshold;
        return operator === '=' ? sensor.value === number :
               operator === '<' ? sensor.value < number :
               operator === '>' ? sensor.value > number :
               false;
    }

	// Check if the sensor is now normal but alarmState was true and email things are ok
	if (!(shouldRaiseAlert(alarm) || shouldRaiseAlert(warning)) && (sensor.alarmState !== 0)) {
		const msgBody = `INFO: ${sensor.name} value (${sensor.value}) is back to normal!`;
		logMsg('I', msgBody);
		sendEmail('dave.jacobsen@gmail.com', `${sensor.name} Normal`, msgBody); 
		sensor.alarmState = 0; // No threshold set, no alert
	}

	// Check if the sensor value exceeds the warning or alarm thresholds and email only if not in alarm state already
	if (shouldRaiseAlert(alarm) && (sensor.alarmState !== 2)) {
		const msgBody = `ALARM: ${sensor.name} value (${sensor.value}) exceeded threshold! (${alarm.operator}${alarm.number})`;
		logMsg('E', msgBody);
		sendEmail('dave.jacobsen@gmail.com', `${sensor.name} Alarm`, msgBody); 
		sensor.alarmState = 2;
    } else if (shouldRaiseAlert(warning) && (sensor.alarmState !== 1))  {
		const msgBody = `WARNING: ${sensor.name} value (${sensor.value}) near critical value! (${alarm.operator}${alarm.number})`;
        logMsg('C', msgBody);
		sendEmail('dave.jacobsen@gmail.com', `${sensor.name} Warning`, msgBody); 
		sensor.alarmState = 1;
    }
}


//logMsg('I', 'Starting app.get');
// What to serve from the root address. http://localhost/
app.get('/', function(req, res){
	var sendFileName = __dirname + '/dash.html';

	// Geo check src ip
	var geo = geoip.lookup(req.ip);

	if (geo) {

		if ((geo.country == 'NZ') || (geo.country == 'AU')) {
			logMsg('I', 'Hello ' + req.ip + ' from ' + geo.country);
		} else {
			logMsg('I', 'Sorry ' + req.ip + ' from ' + geo.country + 'you are denied');
			sendFileName = __dirname + '/sorry.html';
		}
	}
	res.sendFile(sendFileName);

});

// Used for testing
app.get('/test', function(req, res){
	res.sendFile(__dirname + '/dash-modern.html');
});

// Used for testing
app.get('/constants-client.js', function(req, res){
	res.sendFile(__dirname + '/constants-client.js');
});

// Returns JSON version of the current sensor values
app.get('/sensors', function(req, res){
	var sensorJSON = JSON.stringify(conf.mysensors.sensornodes);
	res.send(sensorJSON);
});


// Used for displaying all graphs
app.get('/graphs', function(req, res){
	res.sendFile(__dirname + '/graphs.html');
});

app.use(express.static('images'));
app.use(express.static('js'));
app.use(express.static('css'));

logMsg('I', 'Starting io handler');
// When a connection is made, setup the handler function
io.on("connection", function (socket) {
    logMsg("DC", "Web client connected");

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

            case "BUT":
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
            io.emit("SMv2", JSON.stringify(sensor));
        });
        logMsg("DR", "Redraw requested");
        io.emit("", JSON.stringify(conf.mysensors.sensornodes)); // Emit sensor nodes data
    }

    function handleInit() {
        io.emit("sensors", JSON.stringify(conf.mysensors.sensornodes)); // Emit sensor nodes data
        logMsg("DR", "Init requested");
    }

    function handleButtonOrCheckbox(buttonId) {
        logMsg("DR", `Button/Checkbox: ${buttonId}`);
        processButton(buttonId); // Process the button action
    }
});

logMsg('I', 'Starting http listen');

// Start Web Service listening on TCP specified in the settings
//http.listen(conf.sockets.port, function(){
//BUG: Why hard coded here?
// http.listen(8080, function(){
server.listen(8080, function(){
		logMsg('C', 'Listening on *:' + conf.sockets.port);
});
  
// Process button or checkbox switch presses from the client
// NEW COPILOT CODE. Old code below.

function processButton(butID) {
    logMsg('DR', `Handling button ${butID}`);
    const sensor = conf.mysensors.sensornodes.find(s => s.id == butID);

    if (!sensor) {
        logMsg('E', `Unknown switch/checkbox: ${butID}`);
        return;
    }

    updateSensorState(sensor);
    handleSpecialActions(butID, sensor.value);
    // handleSmartSwitch(butID, sensor.value);  // <--- needs fixing see note in handleSpecialActions below
}

function updateSensorState(sensor) {
    sensor.updated = Date.now();
    sensor.value = sensor.value === '0' ? '1' : '0';
    sensor.contact_status = '0';

    logMsg('I', `Changing ${sensor.name} (${sensor.id}) to ${sensor.value}`);
    io.emit('SMv2', JSON.stringify(sensor));
}

function handleSpecialActions(butID, value) {

	// Maybe add the Sonoff's as well that calls the handleSmartSwitch below.
    const specialActions = {
        '12': () => controlSonoffSwitch(value),
        '103': () => toggleDebug(value),
        '106': () => logMsg('I', 'Handling Tuya switch'),
        '997': () => shutdownApplication(),
        '998': () => triggerSettingsSave()
    };

    specialActions[butID]?.();
}

function handleSmartSwitch(butID, value) {
    const plug = plugs.find(p => p.id == butID);
    if (!plug) {
        logMsg('E', `ButtonID: ${butID} was expected to be a smart switch but couldn't be confirmed`);
        return;
    }

    const smartSwitchHandlers = {
        tplink: () => client.getPlug({ host: plug.host }).setPowerState(value === '1'),
        tuya: () => toggleTuyaSwitch(value)
    };

    smartSwitchHandlers[plug.type]?.() || logMsg('E', `Unexpected smart switch type: ${plug.type}`);
}

function controlSonoffSwitch(value) {
    request(`http://192.168.1.87/control?cmd=GPIO,12,${value}`, (error) => {
        if (error) {
            logMsg('E', `Error turning on Sonoff switch (12): ${error}`);
        }
    });
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

function toggleTuyaSwitch(value) {
    logMsg('I', 'Tuya switch action underway...');
    try {
        tuyaDev.set({ set: value === '1' })
            .then(() => logMsg('I', `Tuya device turned ${value === '1' ? 'on' : 'off'}`));
    } catch (error) {
        logMsg('E', `Tuya switching error: ${error}`);
    }
}
