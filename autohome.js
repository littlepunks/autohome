// ----------------------------------------------------
// © 2017-2025 David Jacobsen / dave.jacobsen@gmail.com
// See README.md
// ----------------------------------------------------
/*jshint esversion: 6 */

// Load third party modules

"use strict";

var express    = require('express');
var app        = express();
var http       = require('http').Server(app);
var io         = require('socket.io')(http);
var request    = require('request');
var colors     = require('colors');
const fs 	   = require('fs');
const geoip    = require('geoip-lite');

// Load environment variables from .env file
require('dotenv').config()



const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

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

//import { styleText } from 'node:util';
const { styleText } = require('node:util');

const MS = require('./modules/constants.js'); // MySensors API constants

const rrdtool = 'C:/Users/littlepunk/Documents/autohome/rrdtool/rrdtool.exe';

const TempsRRDFile = './temps.rrd'; // RRD file for temperature data
const makeGraphCmdFile = 'make-graph.cmd'; // Command to create graphs
const autohomeLogFile = './autohome.log'; // Log file for console messages
const enableRRD = true; // Set to true to enable RRDTool graphing

const spawn = require('child_process').spawn;

// Create RRD if it doesn't exist
function createRRD() {
	if (fs.existsSync(TempsRRDFile)) {
	  logMsg('I','RRD file already exists.');
	  return;
	}
	// 	['Outside','Tom','Bedroom','Sophie','Michael','Laundry','Freezer','Balcony','Humidity','Pressure','Speed'].forEach(s => {

  
	const args = [
	  'create', TempsRRDFile,
	  '--step', '300',
	  'DS:Outside:GAUGE:600:-50:100',
	  'DS:Tom:GAUGE:600:-50:100',
	  'DS:Bedroom:GAUGE:600:-50:100',
	  'DS:Sophie:GAUGE:600:-50:100',
	  'DS:Michael:GAUGE:600:-50:100',
	  'DS:Laundry:GAUGE:600:-50:100',
	  'DS:Freezer:GAUGE:600:-50:100',
	  'DS:Balcony:GAUGE:600:-50:100',
	  'DS:Humidity:GAUGE:600:0:100',
	  'DS:Pressure:GAUGE:600:900:1100',
	  'DS:Speed:GAUGE:600:0:300',

	  'RRA:AVERAGE:0.5:1:288',
	  'RRA:AVERAGE:0.5:12:168',
	  'RRA:AVERAGE:0.5:288:52',
	  'RRA:MAX:0.5:1:288',
	  'RRA:MAX:0.5:12:168',
	  'RRA:MAX:0.5:288:52',
	  'RRA:MIN:0.5:1:288',
	  'RRA:MIN:0.5:12:168',
	  'RRA:MIN:0.5:288:52'
	];
  
	const child = spawn(rrdtool, args);
	child.on('close', code => {
	  if (code === 0) logMsg('I', 'RRD created successfully.');
	  else logMsg('E', 'RRD creation failed.');
	});
  }

createRRD();

const enableWEMO = false; // Set to true to enable Wemo smart switches

const enableTPLINK = false; // Set to true to enable TP-Link smart switches
const enableTUYA = false; // Set to true to enable TP-Link smart switches


app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Start of TP-Link smart switch code
if (enableTPLINK) {
	
	// Common list for smart plugs/switches
	var plugs = [];

	// TP-Link Smart Switch setup ---------------------------------------------------------------
	const { Client } = require('tplink-smarthome-api');
	const client = new Client();

	client.on('plug-new', device => {

		logMsg('I',`Found TP-Link Smart Switch: ${device.alias} : ${device.host} : ${(device.relayState) ? 'on' : 'off'}`);  //false=off, true=on

		// Assumes plug will be found
		var tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
		decode(tpSensor.id + ';0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';' + ((device.relayState) ? '1' : '0'));

		plugs.push({id:  tpSensor.id, host: device.host, type: "tplink"});

		device.startPolling(SENSORCHECKINTERVAL);
	
		device.on('power-on', () => {
			logMsg('I', `TP-Link device ${device.alias} is on`);
			// Need to check if it exists otherwise the decode will error
			var tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
			decode(tpSensor.id + ';0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';1');

		});
		device.on('power-off', () => {
			logMsg('I', `TP-Link device ${device.alias} is off`);
			var tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
			decode(tpSensor.id + ';0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';0');

		});
		device.on('in-use-update', inUse => {
			//logMsg('DI', `TP-Link device ${device.alias} is ${(device.relayState) ? 'on' : 'off'}`);
			//var tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
			//decode(tpSensor.id + ';0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';' + ((device.relayState) ? '1' : '0'));	
		});  
	});
	client.on('plug-online', device => {
		//logMsg('DI', `TP-Link device ${device.alias} is contactable`);
		// Could mark sensor as uncontactable
	});
	client.on('plug-offline', device => {
		logMsg('DI', `TP-Link device ${device.alias} is uncontactable`);
	});

	logMsg('I', 'Starting TP-Link Device Discovery');
	client.startDiscovery();
}

// Tuya Switch setup ---------------------------------------------------------------------
if (enableTUYA) {
	const TuyAPI = require('tuyapi');
	const util = require('util');
	const tuyaDev = new TuyAPI({
		id: process.env.TUYA_ID,
		key: process.env.TUYA_KEY});
		// const tuyaDev = new TuyAPI({
		// 	id: '550705303c71bf20a967',
		// 	key: '6590d93429b1034a'});
		
	//Find device on network
	tuyaDev.find().then(() => {
		// Connect to device
		tuyaDev.connect();
		});
	
	//Add event listeners
	tuyaDev.on('connected', () => {
		logMsg('I','Connected to Tuya device');
		// Hard coded name. Really need to get name from the switch and match.
		plugs.push({id:  conf.mysensors.sensornodes.find(n => n.name == 'Michael').id, type: "tuya"});

	});

	tuyaDev.on('disconnected', () => {
		logMsg('I','Disconnected from Tuya device.');
	});

	tuyaDev.on('error', error => {
		logMsg('E',`Tuya general error! ${$error}`);
	});

	tuyaDev.on('data', data => {
		try {
			logMsg('I',`Tuya switch status is: ${data.dps['1']}.`);
			logMsg('I',`Tuya switch status is: ${tuyaDev.get().then(status => logMsg('I', 'Tuya status: ' + status))}.`);
		
			logMsg('I','Tuya data: ' + util.inspect(data));
		}
		catch (error) {
			logMsg('E', 'Tuya data error: ' + error);
		}
		
		//Can set Tuya switch via:
		tuyaDev.set({set: true}).then(() => logMsg('I', 'Tuya device was turned on'));
		tuyaDev.set({set: false}).then(() => logMsg('I', 'Tuya device was turned off'));

	});

	//Disconnect after 10 seconds
	setTimeout(() => { tuyaDev.disconnect(); }, 10000);
}
// =============================================================================
// CONFIGURATION:

// Set to false to turn off debugging
var DEBUG = true;

// settings.json will be loaded in here later
var conf = {};


const SENSORCHECKINTERVAL = 300000;  // 5 mins

// This should ALWAYS be 5 mins. That's what RRDTOOL expects.
const RRDUPDATEINTERVAL = 300000;  // 5 mins

// Load settings at startup
readSettings();

// Used by the decode function
var rNode 		= "";
var rSensor 	= "";
var rMsgtype 	= "";
var rAck 		= "";
var rSubtype 	= "";
var rPayload 	= "";

// Loop to do any regular activities ============================================
function updateStatuses() {
	// Update external temp/humidity/pressure
	getOutsideWeather();
}

// Start the timer by defining setTimeout with a function to run after so many msecs.
function startTimer () {
    setTimeout(stopTimer, conf.polling.interval*1000);
}

// This runs when the timer fires. It sends a message and starts the timer again
function stopTimer () {
    updateStatuses();
    startTimer();
}

// -------------------
// Regularly check sensor update times and highlight any missing by changing the colour


// BUG:
// Improve these timers by using setInterval and clearInterval instead of setTimeout
// setTimeout is a bit of a hack and not as efficient as setInterval
// setInterval is a bit more efficient and easier to read.

function startSensorCheckTimer() {
	setTimeout(stopSensorCheckTimer, SENSORCHECKINTERVAL); // 5 mins
}

function stopSensorCheckTimer() {
	logMsg('DI', 'Checking for sensor timeouts');
	// Check that the COM port (MySensors gateway) is still open and hasn't had an error
	if (!gw.isOpen) { gwErrFlag = true; }
	if (gwErrFlag) { logMsg('E', 'Error with the COM port connecting to the gateway. Please restart.'); }

	// Iterate through all the sensors and
	// update {sensor}.contact_status with 0,1,2 (green, amber, red)
	// if timeouts have expired.
	var tnow = new Date().getTime();
	conf.mysensors.sensornodes.forEach(s => {
		let oldStatus = s.contact_status;
		let delta = tnow - s.updated;

		if (delta > (s.freq * 1000 * 2)) { // convert secs to milis and 2 periods
			// Very late
			s.contact_status = '2';
		}
		else if (delta > (s.freq * 1000)) {
			// Missed one check
			s.contact_status = '1';
		}
		else {
			// All good
			s.contact_status = '0';
		}
		// Send updates for those that have changed only, saves network traffic
		if (oldStatus != s.contact_status) {
			io.emit('SMv2', JSON.stringify(s));
		}
	});

	startSensorCheckTimer();
}

startSensorCheckTimer();


// -------------------
// Regular gathering temperature data that is passed to RRDTool


// **** NEW POTENTIAL CODE DO BATCH DRAW GRAPHS WITHOUT CMD FILE using graphRRD.js file
// const graphRRD = require('./graphRRD');

// const defs = [
//   'DEF:s1=temps.rrd:Outside:AVERAGE',
//   'DEF:s2=temps.rrd:Bedroom:AVERAGE',
//   'DEF:s3=temps.rrd:sensor3:AVERAGE'
// ];

// const lines = [
//   'LINE2:s1#FF0000:Outside',
//   'LINE2:s2#00FF00:Bedroom',
//   'LINE2:s3#0000FF:Sensor3'
// ];

// graphRRD([
//   {
//     output: 'last_hour.png',
//     title: 'Temperature - Last Hour',
//     start: 'end-1h',
//     end: 'now',
//     defs,
//     lines
//   },
//   {
//     output: 'last_24h.png',
//     title: 'Temperature - Last 24 Hours',
//     start: 'end-24h',
//     end: 'now',
//     defs,
//     lines
//   },
//   {
//     output: 'last_week.png',
//     title: 'Temperature - Last Week',
//     start: 'end-1w',
//     end: 'now',
//     defs,
//     lines
//   }
// ]);
// ******************************************************************************







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
//	['Outside','Tom','Bedroom','Laundry','Balcony','Humidity','Pressure','Speed'].forEach(s => {
		getSensor = conf.mysensors.sensornodes.find(sensor => sensor.name == s);
		args += ":" + ((getSensor !== undefined) ? getSensor.value : "U");
	})

	logMsg('DI', `RRD data update: ${args}`);

//	const bat = spawn('rrdtool', ['update', TempsRRDFile, args]);
	const bat = spawn(rrdtool, ['update', TempsRRDFile, args]);

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

// Update statuses at startup and then start timer to repeat regularly
startTimer();

function readSettings() {
	logMsg('I', 'Reading settings');
	const fs = require('fs');
	try {
		var fileContents = fs.readFileSync('./settings.json', 'utf-8');
	} catch (err) {
		if (err.code === 'ENOENT') {
			logMsg('E','Settings file not found: settings.json');
		}
		throw err;
	}
	
	try {
		conf = JSON.parse(fileContents);
	} catch (err) {
		logMsg('E', 'Error parsing settings file: ' + err.message);
		throw err;
	}
	logMsg('I', 'Settings loaded');
}

// Asynchronous version (preferred)
function writeSettings() {
	var fs = require('fs');
	logMsg('I', 'Writing settings...');

	fs.writeFile("./settings.json", JSON.stringify(conf, null, 2), 'utf-8',
		function(error) {
			if (error) { logMsg('E', 'Problem writing settings: ' + error); }
			else { logMsg('I', 'Settings written'); }
		}); 
}

// Synchronous write - only used at shutdown
function writeSettingsSync() {
	var fs = require('fs');
	logMsg('I', 'Writing settings at shutdown');

	try {
		fs.writeFileSync("./settings.json", JSON.stringify(conf, null, 2), 'utf-8'); 
	} catch(err) {
		logMsg('E', 'Tried to write settings but failed: ' + err);
	}
}

process.on('SIGINT', () => {
    logMsg('I', 'Local shut down requested. Saving settings and exiting.');
    writeSettingsSync();
    process.exit(0);
});



// Open serial port to connect to MySensor Gateway
logMsg('I', 'Commence opening serial port');
const { SerialPort} = require('serialport');

//Errors here
// var gw = new SerialPort(conf.mysensors.comport, {baudRate: conf.mysensors.baud, autoOpen: conf.mysensors.autoopen});
const gw = new SerialPort({path: conf.mysensors.comport, baudRate: conf.mysensors.baud, autoOpen: conf.mysensors.autoopen});
var gwErrFlag = true;  // We're in an error state until the port is officially open

gw.open();
gw.on('open', function() {
	logMsg('I', 'Connected to serial gateway on ' + conf.mysensors.comport + ' at ' + conf.mysensors.baud + ' baud');
	gwErrFlag = false;
	}).on('data', function(rd) {
		appendData(rd.toString());
		gwErrFlag = false;
	}).on('end', function() {
	 	logMsg('I', 'Disconnected from gateway');
		gwErrFlag = true;
	}).on('error', function() {
		logMsg('E', "Connection error. Can't connect to com port. Please restart later.");
		gwErrFlag = true;
	});


// Send a text message off to the gateway
function gwWrite(msg, logtxt) {
	gw.write(msg + '\n', function(err) {
		if (err) {
	    	return logMsg('E', 'Error on serial write to MySensors gateway: ' + err.message);
	  	}
	  	logMsg('DI', logtxt);
	});
}

// Helper function to build up a message string from a sensor
function appendData(str) {
	var pos = 0;
	var appendedString = "";

    while (str.charAt(pos) != '\n' && pos < str.length) {
        appendedString = appendedString + str.charAt(pos);
        pos++;
    }
    if (str.charAt(pos) == '\n') {
		// Process the message contained in appendedString as it's a full line
		// Decode will decode and perform actions
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

function getOutsideWeather() {
	logMsg('I', 'Requesting updated external weather.');
	request(conf.weather.externalTempURL, function (error, response, body) {
		if (error) {
			logMsg('E', 'Error getting external weather.');
		}
		else {
			logMsg('I', 'External weather data collected.');
			var obj = JSON.parse(body);

			// Check that there was neither an error nor an undefined object returned
			if ((obj instanceof Error) || (! obj.main)) {
				logMsg('E', 'Error parsing returned weather data.');
			}
			else {
				// Does assume that obj.* contains values, should really check

				// Send values of to decode for processing
				decode('100;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + Math.round((obj.main.temp-273.15)*10)/10);
				decode('50;0;' + MS.C_SET + ';0;' + MS.V_TEMP + ';' + obj.main.humidity);
				decode('51;0;' + MS.C_SET + ';0;' + MS.V_TEMP + ';' + Math.round(obj.main.pressure));
				decode('202;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + obj.wind.deg);
				decode('203;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + Math.round(3.6 * obj.wind.speed));
				decode('204;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + convertTimestampToTime(obj.sys.sunrise));
				decode('205;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + convertTimestampToTime(obj.sys.sunset));
				decode('209;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + obj.weather[0].description);
				decode('210;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + obj.weather[0].main);
				decode('211;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + Math.round((obj.main.feels_like-273.15)*10)/10);
				decode('200;0;'+ MS.C_SET + ';0;' + MS.V_IMAGE + ';' + 'http://openweathermap.org/img/w/' + obj.weather[0].icon + '.png');

				// Refresh graphs
				decode('99;0;' + MS.C_SET + ';0;' + MS.V_IMAGE + ';' + 'temp_graph_1w.png');
				decode('206;0;'+ MS.C_SET + ';0;' + MS.V_IMAGE + ';' + 'humidity_1w.png');
				decode('207;0;'+ MS.C_SET + ';0;' + MS.V_IMAGE + ';' + 'pressure_1w.png');
				decode('208;0;'+ MS.C_SET + ';0;' + MS.V_IMAGE + ';' + 'speed_1w.png');
			}
			writeSettings();
		}
	 });
}

// Returns a string of the form "01-12-2017 12:34:56" from the current time
function dateTimeString() {
	var   d = new Date()
	return (('0' + d.getDate()).slice(-2) + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + d.getFullYear() +
		 ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2));
  }
  
  function convertTimestampToTime(timestamp) {
	var d = new Date(timestamp * 1000),	// Convert the passed timestamp to milliseconds
		  hh = d.getHours(),
		  h = hh,
		  min = ('0' + d.getMinutes()).slice(-2),		// Add leading 0.
		  ampm = 'AM',
		  time;
			  
	  if (hh > 12) {
		  h = hh - 12;
		  ampm = 'PM';
	  } else if (hh === 12) {
		  h = 12;
		  ampm = 'PM';
	  } else if (hh == 0) {
		  h = 12;
	  }
	  
	  // ie: 8:35 AM	
	  time = h + ':' + min + ' ' + ampm;
		  
	  return time;
  }
  

// Writes a log message to the console.
// If the type start with a D then it will only be displayed if the global DEBUG is true
// If the type is DE then it will log an error only of DEBUG is true
// If the type is DI then it will log a informational message only if DEBUG is true
function logMsg(type, txt) {
	var msgTxt = "";
	// If DEBUG is not true then don't print debug messages
	if (type[0] == 'D') {
		if (DEBUG) {
			msgTxt = ((type.length == 2) ? type[1] : 'D') + ' ' + dateTimeString() + ' ' + txt;
		} else {
			return 0;
		}
	} else {
		msgTxt = type + ' ' + dateTimeString() + ' ' + txt;
	}

	switch (type) {
		case 'E':
			console.log(styleText('cyan', msgTxt));
			break;
		case 'C':
			console.log(msgTxt.yellow);
			break;
		case 'R':
			console.log(msgTxt.green);
			break;
		default:
			console.log(msgTxt);
	}
	fs.appendFile(autohomeLogFile, msgTxt + '\r\n', (err) => {  
    	if (err) {
    		console.log("ERROR Writing to log file!");
    		throw err;
    	}
	});
}

// Decode a message received from a sensor
function decode(msg) {
	var msgs = msg.toString().split(";");

	//	logMsg('I', 'Decoding: ' + msg);
	// Should really check that all these parameters are available
	if (msgs.length < 6) {
		// logMsg("DE", "Incomplete message from gateway: " + msg);
		logMsg("DE", `Incomplete message from gateway: ${msg}`);
		return 1;
	}

	rNode    = msgs[0];
	rSensor  = +msgs[1];
	rMsgtype = +msgs[2];
	rAck     = +msgs[3];
	rSubtype = msgs[4];   // Had plus
	rPayload = +msgs[5].trim();
	if (isNaN(rPayload)) {
		rPayload = msgs[5].trim();
	}

	switch (rMsgtype) {
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
					// Special handling of Freezer Temp and alerting:
					if ((rNode == '14') && (rPayload > -12)) {
						sendEmail('dave.jacobsen@gmail.com', 'Freezer Alert', 'Freezer temperature is above -12 degrees!'); 
						logMsg('E', 'Freezer temperature is greater than -12 degrees! Sending email alert.');
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
	res.sendFile(__dirname + '/test.html');
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
io.on('connection', function(socket){
  logMsg('DC', 'Web client connected');
  socket.on('ClientMsg', function(msg){

    // This only fires when message received from an IP Socket NOT sensors 
    // Clean up text
	msg = msg.replace(/(\r\n|\n|\r)/gm,"");
	var msgs = msg.toString().split(";");

    // if "redraw" is received from client then redraw all controls
	if (msgs[0] == 'redraw') {
    	// Emit all sensors
		conf.mysensors.sensornodes.forEach(s => {
			io.emit('SMv2', JSON.stringify(s));
		});
		logMsg('DR', 'Redraw requested');
    }
    // Click event received
    else if ((msgs[0] == 'BUT') || (msgs[0] == 'CHK')) {
		logMsg('DR', 'Button/Checkbox: ' + msgs[1]);
		processButton(msgs[1]);
    }
    else {
		logMsg('I', 'Received unknown message from client: ' + msg);
    }
  });

  socket.on('disconnect', function(){
    logMsg('DC', 'Web client disconnected');
  });
});

logMsg('I', 'Starting http listen');

// Start Web Service listening on TCP specified in the settings
//http.listen(conf.sockets.port, function(){
//BUG: Why hard coded here?
http.listen(8080, function(){
	logMsg('C', 'Listening on *:' + conf.sockets.port);
});
  
// Process button or checkbox switch presses from the client
function processButton(butID) {
	logMsg('DR', 'Handling button ' + butID);
	var sID = conf.mysensors.sensornodes.find(sensor => sensor.id == butID);
	if (sID !== undefined) {
		sID.updated = new Date().getTime();

		// Toggle switch
		sID.value = (sID.value == '0') ? '1' : '0';
		sID.contact_status = '0';
		logMsg('I', 'Changing ' + sID.name + '(' + butID + ') to ' + sID.value);
		io.emit('SMv2', JSON.stringify(sID));

		// Some buttons have special actions, so perform them now
		// Sonoff switch (reflashed)
		if (butID == '12') {
			request('http://192.168.1.87/control?cmd=GPIO,12,' + sID.value, function (error, response, body) {
				if (error) {
					logMsg('E', 'Error turning on ' + butID + ' : ' + error);
				}
			});
		}
		else if (butID == '103') {
			logMsg('DI', 'Checkbox ' + butID + ' : ' + sID.value);
			DEBUG = (sID.value == '1');
			logMsg('I', 'Debug is now: ' + DEBUG);
		}
		else if (butID == '106') {
			logMsg('I', 'Handling Tuya switch');
			// tuyaDev.set({set: (sID.value == '1')});
		}

		// ***********************************************
		// Special button to shutdown the application hard
		else if (butID == '999') {
			logMsg('I', '**** Client initiated shutdown ****');
			writeSettingsSync();
			process.exit(0);
		}
		else if (butID == '998') {
			writeSettings();
			decode('998;0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';0');
		}

		//Handle smart plugs/switches
		else {
			// Is it in the plugs array?
			var plug = plugs.find(p => p.id == butID);
			// If yes then change state
			if (plug != undefined) {
				switch (plug.type) {
					case 'tplink':
						var tPlugDev = client.getPlug({host: plug.host});
						tPlugDev.setPowerState((sID.value =='1'));
						break;
					// case 'wemo':
					// 	// Change Wemo switch
					// 	var wClient = wemo.client(plug.deviceInfo);
					// 	wClient.getBinaryState((err, value) => {
					// 		// Deal with error : console.log(err);
					// 		wClient.setBinaryState(sID.value == '1' ? '1' : '0');
					// 	})
					// 	break;
					case 'tuya':
						// Change Tuya switch
						//		logMsg('I',`Tuya switch status is: ${data.dps['1']}.`);
						logMsg('I','Tuya switch action underway ...');
						
						try {
							tuyaDev.set({set: true}).then(() => logMsg('I', 'Turning Tuya device on'));
						}
						catch (error) {
							logMsg('E', 'Tuya switching error: ' + error);
						}
						//tuyaDev.set({set: false}).then(() => logMsg('I', 'Tuya device was turned off'));
					
						break;
					default:
						logMsg('E', "Unexpected smart switch type: " + plug.type);
				}

			} else{
				logMsg('E', "Thought ButtonID:" + butID + " was a smart switch but can't confirm");
			}
		}
	}
	else {
		logMsg('E', 'Unknown switch/checkbox: ' + butID);
	}
}



// const privateKey = fs.readFileSync('/etc/letsencrypt/live/littlepunk.duckdns.org/privkey.pem', 'utf8');
// const certificate = fs.readFileSync('/etc/letsencrypt/live/littlepunk.duckdns.org/cert.pem', 'utf8');
// const ca = fs.readFileSync('/etc/letsencrypt/live/littlepunk.duckdns.org/chain.pem', 'utf8');

// const credentials = {
// 	key: privateKey,
// 	cert: certificate,
// 	ca: ca
// };

// - Congratulations! Your certificate and chain have been saved at:
// /etc/letsencrypt/live/littlepunk.duckdns.org/fullchain.pem
// Your key file has been saved at:
// /etc/letsencrypt/live/littlepunk.duckdns.org/privkey.pem
// Your cert will expire on 2020-08-30. To obtain a new or tweaked
// version of this certificate in the future, simply run certbot
// again. To non-interactively renew *all* of your certificates, run
// "certbot renew"