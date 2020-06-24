// ---------------------------------
// (C) 2017 David Jacobsen / dave@littlepunk.net
// See README
/*jshint esversion: 6 */

// Load third party modules

"use strict";

var express    = require('express');
var bodyParser = require("body-parser");
var app        = express();
var http       = require('http').Server(app);
var io         = require('socket.io')(http);
var request    = require('request');
var colors     = require('colors');
const fs 	   = require('fs');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

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

// Common list for smart plugs/switches
var plugs = [];

// TP-Link Smart Switch setup ---------------------------------------------------------------
const { Client } = require('tplink-smarthome-api');
const client = new Client();

client.on('plug-new', device => {

	logMsg('I',`Found TP-Link Smart Switch: ${device.alias} : ${device.host} : ${(device.relayState) ? 'on' : 'off'}`);  //false=off, true=on

	// Assumes plug will be found
	var tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
	decode(tpSensor.id + ';0;'+ C_SET + ';0;' + V_SWITCH + ';' + ((device.relayState) ? '1' : '0'));

	plugs.push({id:  tpSensor.id, host: device.host, type: "tplink"});

	device.startPolling(SENSORCHECKINTERVAL);
  
	device.on('power-on', () => {
		logMsg('I', `TP-Link device ${device.alias} is on`);
		var tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
		decode(tpSensor.id + ';0;'+ C_SET + ';0;' + V_SWITCH + ';1');

	});
	device.on('power-off', () => {
		logMsg('I', `TP-Link device ${device.alias} is off`);
		var tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
		decode(tpSensor.id + ';0;'+ C_SET + ';0;' + V_SWITCH + ';0');

	});
	device.on('in-use-update', inUse => {
		if (DEBUG) logMsg('I', `TP-Link device ${device.alias} is ${(device.relayState) ? 'on' : 'off'}`);
		//var tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
		//decode(tpSensor.id + ';0;'+ C_SET + ';0;' + V_SWITCH + ';' + ((device.relayState) ? '1' : '0'));	
	});  
  });
  client.on('plug-online', device => {
	if (DEBUG) logMsg('I', `TP-Link device ${device.alias} is contactable`);
	// Could mark sensor as uncontactable
  });
  client.on('plug-offline', device => {
	if (DEBUG) logMsg('I', `TP-Link device ${device.alias} is uncontactable`);
  });

logMsg('I', 'Starting TP-Link Device Discovery');
client.startDiscovery();


// Tuya Switch setup ---------------------------------------------------------------------
const TuyAPI = require('tuyapi');
const util = require('util');
const tuyaDev = new TuyAPI({
	id: '550705303c71bf20a967',
	key: '6590d93429b1034a'});

// Find device on network
tuyaDev.find().then(() => {
 	// Connect to device
 	tuyaDev.connect();
	});
  
// Add event listeners
tuyaDev.on('connected', () => {
	logMsg('I','Connected to Tuya device');
	// Hard coded name. Really need to get name from the switch and match.
	plugs.push({id:  conf.mysensors.sensornodes.find(n => n.name == 'Michael').id, type: "tuya"});

});

tuyaDev.on('disconnected', () => {
	logMsg('I','Disconnected from Tuya device.');
});

tuyaDev.on('error', error => {
	logMsg('E','Tuya general error!' + error);
});

tuyaDev.on('data', data => {
	try {
// //		logMsg('I',`Tuya switch status is: ${data.dps['1']}.`);
// //		logMsg('I',`Tuya switch status is: ${tuyaDev.get().then(status => logMsg('I', 'Tuya status: ' + status))}.`);
// 	}
		logMsg('I','Tuya data: ' + util.inspect(data));
	}
	catch (error) {
		logMsg('E', 'Tuya data error: ' + error);
	}
	
	// Can set Tuya switch via:
	//tuyaDev.set({set: true}).then(() => logMsg('I', 'Tuya device was turned on'));
	//tuyaDev.set({set: false}).then(() => logMsg('I', 'Tuya device was turned off'));

});

  // Disconnect after 10 seconds
//setTimeout(() => { tuyaDev.disconnect(); }, 10000);

// =============================================================================
// CONFIGURATION:

// Set to zero to turn off debugging
var DEBUG = false;

var conf = {};

// Console messages are saved in this string and written to autohome.log when the app shutsdown normally.
// Is a risk that something useful may be missed.
var consoleMsgs = "";

const colDkBlue   = "#152934";
const colLtBlue   = "#6596C4";
const colNavBack  = "#01649D"; // Nav button background blue
const colText     = "#E1F4F4";
const colRed      = "#B00000";
const colAmber    = "#F0A946";
const colGreen    = "#00A000";
const colLtGrn    = "#20F020";
const colYellow   = "#F0F000"; 
const colBrtBlue  = "#00A0F0";

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
var rNodeID 	= "";

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
function startSensorCheckTimer() {
	setTimeout(stopSensorCheckTimer, SENSORCHECKINTERVAL); // 5 mins
}

function stopSensorCheckTimer() {
	// if (DEBUG) logMsg('I', ' Checking for sensor timeouts');
	logMsg('I', 'Checking for sensor timeouts');
	// Check that the COM port (MySensors gateway) is still open and hasn't had an error
	if (!gw.isOpen) { gwErrFlag = true; }
	if (gwErrFlag) { logMsg('E', 'Error with the COM port connecting to the gateway. Please restart.'); }

	// Iterate through all the sensors and
	// update {sensor}.contact_status with 0,1,2 (green, amber, red)
	// if timeouts have expired.
	var tnow = new Date().getTime();
	conf.mysensors.sensornodes.forEach(s => {
		var oldStatus = s.contact_status;
		var delta = tnow - s.updated;

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

function startTempTimer () {
    setTimeout(stopTempTimer, RRDUPDATEINTERVAL);  // 5 mins
}

function stopTempTimer () {
	// Write out current temperatures readings to RRDTool and generate new graphs
	// "U" is the value for UNKNOWN and is handled by RRDTOOL more gracefully than an empty string
	var getSensor = conf.mysensors.sensornodes.find(sensor => sensor.name == 'Outside');
	var t1 = (getSensor !== undefined) ? getSensor.value : "U";

	getSensor = conf.mysensors.sensornodes.find(sensor => sensor.name == 'Tom');
	var t2 = (getSensor !== undefined) ? getSensor.value : "U";

	getSensor = conf.mysensors.sensornodes.find(sensor => sensor.name == 'Bedroom');
	var t3 = (getSensor !== undefined) ? getSensor.value : "U";

	getSensor = conf.mysensors.sensornodes.find(sensor => sensor.name == 'Laundry');
	var t4 = (getSensor !== undefined) ? getSensor.value : "U";

	getSensor = conf.mysensors.sensornodes.find(sensor => sensor.name == 'Balcony');
	var t5 = (getSensor !== undefined) ? getSensor.value : "U";

	var updStr = "N:" + t1 + ":" + t2 + ":" + t3 + ":" + t4 + ":" + t5 +  ":" + conf.weather.humidity +  ":" + conf.weather.pressure +  ":" + conf.weather.wind.speed;
	if (DEBUG) logMsg('I', 'RRD data update: ' + updStr);

	// const spawn = require('child_process').spawn;
	// const bat = spawn('rrdtool', ['update', '/home/pi/autohome/temps.rrd', updStr]);

	// bat.stdout.on('data', (data) => { if (DEBUG) { logMsg('I', 'RRD data updating: ' + data.toString());}});
	// bat.stderr.on('data', (data) => { logMsg('E', 'RRD data update error: ' + data.toString());	});

	// bat.on('exit', (code) => {
	// 	if (code != 0) { logMsg('E', 'RRD data update error code: ' + code);}
	// 	const bat2 = spawn('/home/pi/autohome/make-graph.sh');

	// 	bat2.stdout.on('data', (data) => { if (DEBUG) {	logMsg('I', 'RRD graph being created: ' + data.toString().trim()); }});
	// 	bat2.stderr.on('data', (data) => { if (DEBUG) { logMsg('E', 'RRD graph creation error: ' + data.toString()); }});

	// 	bat2.on('exit', (code) => {
	// 		if (code != 0) {
	// 			  if (DEBUG) { logMsg('E', 'RRD graph creation error code: ' + code);	}}
	// 		else {
	// 			// Uncomment line below and remove copy of this line above when ready for Prod
	// 			//io.emit('SMv2','{"id": "4","name": "Temps","value":"images/temp_graph_1d.png","type":"4"}' );
	// 		}
	// 	});
	// });

    startTempTimer();

    // Worth savings settings every now and then
    writeSettings();
}

// Reenable later
startTempTimer();

// --------------------------------------

// Update statuses at startup and then start timer to repeat regularly
startTimer();

function readSettings() {
	logMsg('I', 'Reading settings');
	var fs = require('fs');
	try {
		var fileContents = fs.readFileSync('settings.json', 'utf-8');
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

	fs.writeFile("settings.json", JSON.stringify(conf, null, 2), 'utf-8',
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
		fs.writeFileSync("settings.json", JSON.stringify(conf, null, 2), 'utf-8'); 
	} catch(err) {
		logMsg('E', 'Tried to write settings but failed: ' + err);
	}
}


// Open serial port to connect to MySensor Gateway
var SerialPort = require('serialport');
const e = require('express');
var gw = new SerialPort(conf.mysensors.comport, {baudRate: conf.mysensors.baud, autoOpen: conf.mysensors.autoopen});
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
	  	if (DEBUG) { logMsg('I', logtxt); }
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
        if (DEBUG) {
        	logMsg('R', "Sensor message: NodeID:" + rNode + "(" + rNodeID + "),SensorID:" + rSensor + ",MsgType:" + rMsgtype + ",Ack:" + rAck + ",SubType:" + rSubtype + ",PLoad:" + rPayload);
        }
    }
    if (pos < str.length) {
        // There's still more data to process so chop of what's been processed and recurse
        appendData(str.substr(pos + 1, str.length - pos - 1));
    }
 }

// Returns a string of the form "01-12-2017 12:34:56"
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


// Get external weather
// The new API gets way more info an also a forecast:
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
				decode('100;0;'+ C_SET + ';0;' + V_TEMP + ';' + Math.round((obj.main.temp-273.15)*10)/10);
				decode('50;0;' + C_SET + ';0;' + V_TEMP + ';' + obj.main.humidity);
				decode('51;0;' + C_SET + ';0;' + V_TEMP + ';' + Math.round(obj.main.pressure));
				decode('202;0;'+ C_SET + ';0;' + V_TEMP + ';' + obj.wind.deg);
				decode('203;0;'+ C_SET + ';0;' + V_TEMP + ';' + Math.round(3.6 * obj.wind.speed));
				decode('204;0;'+ C_SET + ';0;' + V_TEMP + ';' + convertTimestampToTime(obj.sys.sunrise));
				decode('205;0;'+ C_SET + ';0;' + V_TEMP + ';' + convertTimestampToTime(obj.sys.sunset));
				decode('209;0;'+ C_SET + ';0;' + V_TEMP + ';' + obj.weather[0].description);
				decode('210;0;'+ C_SET + ';0;' + V_TEMP + ';' + obj.weather[0].main);
				decode('200;0;'+ C_SET + ';0;' + V_IMAGE + ';' + 'http://openweathermap.org/img/w/' + obj.weather[0].icon + '.png');

				// Refresh graphs
				decode('99;0;' + C_SET + ';0;' + V_IMAGE + ';' + 'temp_graph_1w.png');
				decode('206;0;'+ C_SET + ';0;' + V_IMAGE + ';' + 'humidity_1w.png');
				decode('207;0;'+ C_SET + ';0;' + V_IMAGE + ';' + 'pressure_1w.png');
				decode('208;0;'+ C_SET + ';0;' + V_IMAGE + ';' + 'speed_1w.png');
			}
			writeSettings();
		}
	 });
}


// Write a message to the console
// Used to write to file. 

function logMsg____new(type, txt) {
	var msgTxt = type + ' ' + dateTimeString() + ' ' + txt;

	switch (type) {
		case 'E':
			console.log(msgTxt.red);
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

	consoleMsgs += msgTxt + '\n';
}

function logMsg(type, txt) {
	var msgTxt = type + ' ' + dateTimeString() + ' ' + txt;

	switch (type) {
		case 'E':
			console.log(msgTxt.red);
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
	fs.appendFile('autohome.log', msgTxt + '\r\n', (err) => {  
    	if (err) {
    		console.log("ERROR Writing to log file!");
    		throw err;
    	}
	});
}

function redrawAllControls() {
	conf.mysensors.sensornodes.forEach(s => {
		io.emit('SMv2', JSON.stringify(s));
	});

	// And refresh the weather data
	getOutsideWeather();
}

// Decode a message received from a sensor
function decode(msg) {
	var msgs = msg.toString().split(";");

//	logMsg('I', 'Decoding: ' + msg);
	// Should really check that all these parameters are available
	if (msgs.length < 6) {
		// if (DEBUG)  logMsg("E", "Incomplete message from gateway: " + msg);
		logMsg("E", "Incomplete message from gateway: " + msg);
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
	//logMsg("I", "Received from gateway: " + msg);

	// Next few lines are messy. Sort it out!
	rNodeID = rNode;   //?  RN 14; S0; MT1; ACK0; ST0; Pay9.1
	if (1) {
	// if (rNodeID <= conf.mysensors.sensornodes.length) {   // Ensure Node ID is valid
		switch (rMsgtype) {
			case C_PRESENTATION:  // = 0
				break;
			case C_SET:  //SET message = 1
				switch (rSubtype) {
					case V_TRIPPED:
					case V_LOCK_STATUS:
					case V_SWITCH:
					case V_TEMP:
					case V_IMAGE:
						var getSensor = conf.mysensors.sensornodes.find(sensor => sensor.id == rNode);
						if (getSensor !== undefined) {
							var oldVal = getSensor.value;
							getSensor.updated = new Date().getTime();
							getSensor.value = rPayload;
							getSensor.contact_status = '0';
							// Send JSON of sensor
							io.emit('SMv2', JSON.stringify(getSensor));
							logMsg('I', "Got: " + getSensor.name + " : " + getSensor.value);
							if (DEBUG) {
								logMsg('I', "Sending JSON: " + JSON.stringify(getSensor));
							}

							// If from FanSwitch(25) then send of to fan switch (105)
							// Check to see if the value has changed at all
							if ((rNodeID == '25') && (rPayload != oldVal)) {
								logMsg('I', 'Received message from Fan Switch. Sending to fan: ' + '105;0;'+ C_SET + ';0;' + V_SWITCH + ';' + rPayload);
								decode('105;0;'+ C_SET + ';0;' + V_SWITCH + ';' + rPayload);
								processButton('105');
							}
 						} else {
							logMsg('E', "Working with: " + msg + " but wasn't found");
						}
						break;
					case V_STATUS:
						break;
					default:
						logMsg ('E', 'Unknown Sensor message: ' + rNode + ";" + rSensor + ";" + rMsgtype + ";" + rAck + ";" + rSubtype + ";" + String(rPayload));
				}
				break;

			case C_REQ:  // = 2 = A sensor is asking for data
				break;

			case C_INTERNAL:  //INTERNAL messages = 3
				switch (rSubtype) {
					case I_BATTERY_LEVEL:
						logMsg('I', "Internal battery level is " + rPayload + "%");
						break;
					case I_LOG_MESSAGE:
						if (DEBUG) {
							logMsg('I', 'MySensors Internal Log Message: ' + rNode + ';' + rSensor + ';' + rMsgtype + ';' + rAck + ';' + rSubtype + ';' + rPayload);
						}
						break;

					case I_GATEWAY_READY:
						logMsg('I', 'MySensors Gateway startup is complete.');
						break;

					default:
						if (DEBUG) {
							logMsg('I', 'MySensors Int Msg: ' + rNode + ';' + rSensor + ';' + rMsgtype + ';' + rAck + ';' + rSubtype + ';' + rPayload);
						}
						// All other INTERNAL MSGS
				}
				break;
			case C_BROADCAST:   // Usually at sensor startup
				if (DEBUG) {
					logMsg ('I', 'Sensor Broadcast: ' + rNode + ";" + rSensor + ";" + rMsgtype + ";" + rAck + ";" + rSubtype + ";" + rPayload);
				}
				break;

			default:
				logMsg ('E', 'Sensor Msg Unknown: ' + rNode + ";" + rSensor + ";" + rMsgtype + ";" + rAck + ";" + rSubtype + ";" + rPayload);

		}
	}
	else {
		logMsg ('E', 'Unknown sensor message: ' + msg);
	}
}




// What to serve from the root address. http://localhost/
app.get('/', function(req, res){
// Iterate through validClientIPs array to check client IP is ok

	var sendFileName = __dirname + '/sorry.html';

	for (var i=0; i<conf.validclients.length; i++){
		if (req.connection.remoteAddress.indexOf(conf.validclients[i]) !== -1){
			sendFileName = __dirname + '/dash.html';
			break;
		}
	}

	res.sendFile(sendFileName);

});

// Used for testing
app.get('/test', function(req, res){
	res.sendFile(__dirname + '/test.html');
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

// When a connection is made, setup the handler function
io.on('connection', function(socket){
  logMsg('C', 'Web client connected');
  socket.on('ClientMsg', function(msg){

    // This only fires when message received from an IP Socket NOT sensors 
    // Clean up text
	msg = msg.replace(/(\r\n|\n|\r)/gm,"");
    // if "redraw" is received from client then 
    // iterate through all controls and emit details out
	var msgs = msg.toString().split(";");

	if (msgs[0] == 'redraw') {
    	// Call function that sends back all sensor data
    	redrawAllControls();
	    if (DEBUG) { logMsg('R', 'Redraw requested'); }
    }
    // Click event received
    else if ((msgs[0] == 'BUT') || (msgs[0] == 'CHK')) {
		if (DEBUG) { logMsg('R', 'Button/Checkbox: ' + msgs[1]); }
		processButton(msgs[1]);
    }
    else {
		logMsg('I', 'Received unknown message from client: ' + msg);
    }
  });

  socket.on('disconnect', function(){
    if (DEBUG) { logMsg('C', 'Web client disconnected'); }
  });
});

// Start Web Service listening on TCP specified in the settings
/* ???????? */
http.listen(conf.sockets.port, function(){
	logMsg('C', 'Listening on *:' + conf.sockets.port);
});
  
// https.listen(443, () => {
// 	logMsg('C', 'Listening on 443');
// });
  
	

// Process button or checkbox switch presses from the client
function processButton(butID) {
	if (DEBUG) { logMsg('R', 'Handling button ' + butID);}
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
			if (DEBUG) {logMsg('I', 'Checkbox ' + butID + ' : ' + sID.value);}
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
			logMsg('I', '***** SHUTTING DOWN *****');
			writeSettingsSync();
			process.exit(0);
		}
		else if (butID == '998') {
			writeSettings();
			decode('998;0;'+ C_SET + ';0;' + V_SWITCH + ';0');
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
						//??
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


// These are MySensors API constants
const C_PRESENTATION = 0;
const C_SET			= 1;
const C_REQ			= 2;
const C_INTERNAL	= 3;
const C_STREAM		= 4;
const C_BROADCAST	= 255;

const V_TEMP		= '0';
const V_HUM			= '1';
const V_STATUS		= '2';
const V_DIMMER		= '3';
const V_PRESSURE	= '4';
const V_FORECAST	= '5';
const V_RAIN		= '6';
const V_RAINRATE	= '7';
const V_WIND		= '8';
const V_GUST		= '9';
const V_DIRECTION	= '10';
const V_UV			= '11';
const V_WEIGHT		= '12';
const V_DISTANCE	= '13';
const V_IMPEDANCE	= '14';
const V_SWITCH		= '15';
const V_TRIPPED		= '16';
const V_WATT		= '17';
const V_KWH			= '18';
const V_SCENE_ON	= '19';
const V_SCENE_OFF	= '20';
const V_HEATER		= '21';
const V_HEATER_SW	= '22';
const V_LIGHT_LEVEL	= '23';
const V_VAR1		= '24';
const V_VAR2		= '25';
const V_VAR3		= '26';
const V_VAR4		= '27';
const V_VAR5		= '28';
const V_UP			= '29';
const V_DOWN		= '30';
const V_STOP		= '31';
const V_IR_SEND		= '32';
const V_IR_RECEIVE	= '33';
const V_FLOW		= '34';
const V_VOLUME		= '35';
const V_LOCK_STATUS	= '36';
const V_LEVEL		= '37';
const V_VOLTAGE		= '38';
const V_IMAGE		= '39';
				

const I_BATTERY_LEVEL	= 0;
const I_TIME			= 1; // Sensors can request the current time from the Controller using this message. The time will be reported as the seconds since 1970
const I_VERSION			= 2; // Used to request gateway version from controller.
const I_ID_REQUEST		= 3; // Use this to request a unique node id from the controller
const I_ID_RESPONSE		= 4; // Id response back to node. Payload contains node id.
const I_INCLUSION_MODE	= 5; // Start/stop inclusion mode of the Controller (1=start, 0=stop).
const I_CONFIG			= 6; // Config request from node. Reply with (M)etric or (I)mperal back to sensor.
const I_PING			= 7; // AKA I_FIND_PARENT - When a sensor starts up, it broadcast a search request to all neighbor nodes. They reply with a I_FIND_PARENT_RESPONSE.
const I_PING_ACK		= 8; //  AKA I_FIND_PARENT_RESPONSE - Reply message type to I_FIND_PARENT request.
const I_LOG_MESSAGE		= 9; // Sent by the gateway to the Controller to trace-log a message
const I_CHILDREN		= 10; // A message that can be used to transfer child sensors (from EEPROM routing table) of a repeating node.
const I_SKETCH_NAME		= 11; // Optional sketch name that can be used to identify sensor in the Controller GUI
const I_SKETCH_VERSION	= 12; // Optional sketch version that can be reported to keep track of the version of sensor in the Controller GUI.
const I_REBOOT			= 13; // Used by OTA firmware updates. Request for node to reboot.
const I_GATEWAY_READY 	= 14;
const I_REQUEST_SIGNING	= 15; // Used between sensors when initialting signing.
const I_GET_NONCE 		= 16; // Used between sensors when requesting nonce.
const I_GET_NONCE_RESPONSE = 17; // Used between sensors for nonce response.

const S_DOOR		= 0;
const S_MOTION		= 1;
const S_SMOKE		= 2;

const S_LIGHT		= 3;
const S_BINARY		= 3;

const S_DIMMER		= 4;
const S_COVER		= 5;
const S_TEMP		= 6;
const S_HUM			= 7;
const S_BARO		= 8;
const S_WIND		= 9;
const S_RAIN		= 10;
const S_UV			= 11;
const S_WEIGHT		= 12;
const S_POWER		= 13;
const S_HEATER		= 14;
const S_DISTANCE	= 15;
const S_LIGHT_LEVEL	= 16;
const S_ARDUINO_NODE	= 17;
const S_REPEATER_NODE	= 18;
const S_LOCK		= 19;
const S_IR			= 20;
const S_WATER		= 21;
const S_AIR_QUALITY	= 22;