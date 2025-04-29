
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



// Allows for use of colors in console messages
const { styleText } = require('node:util');

const MS = require('./modules/constants.js'); // MySensors API constants

// RRDTool setup
const rrdtool = 'rrdtool.exe';
const TempsRRDFile = './temps.rrd'; // RRD file for temperature data
const makeGraphCmdFile = 'make-graph.cmd'; // Command to create graphs
const autohomeLogFile = './autohome.log'; // Log file for console messages
const enableRRD = true; // Set to true to enable RRDTool graphing
const spawn = require('child_process').spawn;


const enableWEMO = false; // Set to true to enable Wemo smart switches

const enableTPLINK = false; // Set to true to enable TP-Link smart switches - WILL NEED TO UNCOMMENT RELATED CODE
const enableTUYA = false; // Set to true to enable TP-Link smart switches - WILL NEED TO UNCOMMENT RELATED CODE


app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Start of TP-Link smart switch code
let plugs = [];
var DEBUG = false;

// STG.json will be loaded in here later
var conf = {};

const SF = './STG.json'; // STG file to load

const SCI = 300000;  // 5 mins

// This should ALWAYS be 5 mins. That's what RRDTOOL expects.
const RDI = 300000;  // 5 mins

// Load STG at startup
readSTG();

// Used by the decode function
var rN 		= "";
var rS 	= "";
var rMT 	= "";
var rA 		= "";
var rST 	= "";
var rP 	= "";

// Loop to do any regular activities ============================================
function updateStatuses() {
	// Update external temp/humidity/pressure
	getOutsidewva();
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


function startSensorCT() {
	setTimeout(stopSensorCT, SCI); // 5 mins
}

function stopSensorCT() {
	// logMsg{'DI', 'Checking for sensor timeouts');
	// Check that the COM port (MySensors gateway) is still open and hasn't had an error
	if (!gw.isOpen) { gwErrFlag = true; }
	if (gwErrFlag) { }// logMsg{'E', 'Error with the COM port connecting to the gateway. Please restart.'); }

	// Iterate through all the sensors and
	// update {sensor}.contact_status with 0,1,2 (green, amber, red)
	// if timeouts have expired.
	var tnow = new Date().getTime();
	conf.mys.sensorNs.forEach(s => {
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

	startSensorCT();
}

startSensorCT();

// -------------------
// Regular gathering temperature data that is passed to RRDTool

function startTT () {
    setTimeout(stopTT, RDI);  // 5 mins
}

function stopTT () {
	// Write out current temperatures readings to RRDTool and generate new graphs
	// Sensors MUST be in the order shown
	// "U" is the value for UNKNOWN and is handled by RRDTOOL more gracefully than an empty string
	var args = "N";
	var getSensor;

	// Build up RRD update string from each sensor in order
	['Outside','Tom'].forEach(s => {
		getSensor = conf.mys.sensorNs.find(sensor => sensor.name == s);
		args += ":" + ((getSensor !== undefined) ? getSensor.value : "U");
	})

	// logMsg{'DI', `RRD data update: ${args}`);

	const bat = spawn(rrdtool, ['update', TempsRRDFile, args]);

	bat.stdout.on('data', (data) => { })// logMsg{'DI', `RRD data updating: ${data.toString()}`);});
	bat.stderr.on('data', (data) => { })// logMsg{'E', `RRD data update error: ${data.toString()}`);	});

	bat.on('exit', (code) => {
		if (code != 0) { }// logMsg{'E', `RRD data update error code: ${code}`);}
		// logMsg{'DI', `About to create RRD graphs`);
		//const bat2 = spawn(makeGraphCmdFile);
		const bat2 = spawn('cmd.exe', ['/c', makeGraphCmdFile]);

		bat2.stdout.on('data', (data) => {}) // logMsg{'DI', `RRD graph being created: ${data.toString().trim()}`); });
		bat2.stderr.on('data', (data) => {}) // logMsg{'DE', `RRD graph creation error: ${data.toString()}`); });

		bat2.on('exit', (code) => {
			if (code != 0) {
			}// logMsg{'DE', `RRD graph creation error code: ${code}`);	}
		});
	});

    startTT();

    // Worth savings STG every now and then
    writeSTG();
}

// Start the timer to update RRD data and graphs regularly
// !!!! Re-enable once there is an RRD file in place
if (enableRRD) {
	startTT();
}

// --------------------------------------

// Update statuses at startup and then start timer to repeat regularly
startTimer();

function readSTG() {
	// logMsg{'I', 'Reading STG');
	const fs = require('fs');
	try {
		var fileContents = fs.readFileSync(SF, 'utf-8');
	} catch (err) {
		if (err.code === 'ENOENT') {
			// logMsg{'E','STG file not found: STG.json');
		}
		throw err;
	}
	
	try {
		conf = JSON.parse(fileContents);
	} catch (err) {
		// logMsg{'E', 'Error parsing STG file: ' + err.message);
		throw err;
	}
	// logMsg{'I', 'STG loaded');
}

// Asynchronous version (preferred)
function writeSTG() {
	var fs = require('fs');
	// logMsg{'I', 'Writing STG...');

	fs.writeFile(SF, JSON.stringify(conf, null, 2), 'utf-8',
		function(error) {
			if (error) {} // logMsg{'E', 'Problem writing STG: ' + error); }
			else {} // logMsg{'I', 'STG written'); }
		}); 
}

// Synchronous write - only used at shutdown
function writeSTGSync() {
	var fs = require('fs');
	// logMsg{'I', 'Writing STG at shutdown');

	try {
		fs.writeFileSync(SF, JSON.stringify(conf, null, 2), 'utf-8'); 
	} catch(err) {
		// logMsg{'E', 'Tried to write STG but failed: ' + err);
	}
}

process.on('SIGINT', () => {
    // logMsg{'I', 'Local shut down requested. Saving STG and exiting.');
    writeSTGSync();
    process.exit(0);
});



// Open serial port to connect to MySensor Gateway
// logMsg{'I', 'Commence opening serial port');
const { SerialPort} = require('serialport');

const gw = new SerialPort({path: conf.mys.comport, baudRate: conf.mys.baud, autoOpen: conf.mys.autoopen});
var gwErrFlag = true;  // We're in an error state until the port is officially open

gw.open();
gw.on('open', function() {
	// logMsg{'I', 'Connected to serial gateway on ' + conf.mys.comport + ' at ' + conf.mys.baud + ' baud');
	gwErrFlag = false;
	}).on('data', function(rd) {
		appendData(rd.toString());
		gwErrFlag = false;
	}).on('end', function() {
	 	// logMsg{'I', 'Disconnected from gateway');
		gwErrFlag = true;
	}).on('error', function() {
		// logMsg{'E', "Connection error. Can't connect to com port. Please restart later.");
		gwErrFlag = true;
	});


// Send a text message off to the gateway
function gwWrite(msg, logtxt) {
	gw.write(msg + '\n', function(err) {
		if (err) {
	    	return // logMsg{'E', 'Error on serial write to MySensors gateway: ' + err.message);
	  	}
	  	// logMsg{'DI', logtxt);
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
        // logMsg{'DR', "Sensor message: NodeID:" + rN + ",SensorID:" + rS + ",MsgType:" + rMT + ",Ack:" + rA + ",SubType:" + rST + ",PLoad:" + rP);
    }
    if (pos < str.length) {
        // There's still more data to process so chop of what's been processed and recurse
        appendData(str.substr(pos + 1, str.length - pos - 1));
    }
 }


// Get external wva
// URL is in STG.json
// The new API gets way more info and also a forecast, but the JSON structure is slightly different:
// https://api.openwvamap.org/data/2.5/onecall?lat=-41.29&lon=174.78&exclude=minutely&appid=cce91f7f0d86e2f338101f1ca24dd37f

function getOutsidewva() {
	// logMsg{'I', 'Requesting updated external wva.');
	request(conf.wva.externalTempURL, function (error, response, body) {
		if (error) {
			// logMsg{'E', 'Error getting external wva.');
		}
		else {
			// logMsg{'I', 'External wva data collected.');
			var obj = JSON.parse(body);

			// Check that there was neither an error nor an undefined object returned
			if ((obj instanceof Error) || (! obj.main)) {
				// logMsg{'E', 'Error parsing returned wva data.');
			}
			else {
				// Does assume that obj.* contains values, should really check

				// Send values of to decode for processing
				// decode('100;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + Math.round((obj.main.temp-273.15)*10)/10);
				// decode('50;0;' + MS.C_SET + ';0;' + MS.V_TEMP + ';' + obj.main.humidity);
				// decode('51;0;' + MS.C_SET + ';0;' + MS.V_TEMP + ';' + Math.round(obj.main.pressure));
				// decode('202;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + obj.wind.deg);
				// decode('203;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + Math.round(3.6 * obj.wind.speed));
				// decode('204;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + convertTimestampToTime(obj.sys.sunrise));
				// decode('205;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + convertTimestampToTime(obj.sys.sunset));
				// decode('209;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + obj.wva[0].description);
				// decode('210;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + obj.wva[0].main);
				// decode('211;0;'+ MS.C_SET + ';0;' + MS.V_TEMP + ';' + Math.round((obj.main.feels_like-273.15)*10)/10);
				// decode('200;0;'+ MS.C_SET + ';0;' + MS.V_IMAGE + ';' + 'http://openwvamap.org/img/w/' + obj.wva[0].icon + '.png');

				// // Refresh graphs
				// decode('99;0;' + MS.C_SET + ';0;' + MS.V_IMAGE + ';' + 'temp_graph_1w.png');
				// decode('206;0;'+ MS.C_SET + ';0;' + MS.V_IMAGE + ';' + 'humidity_1w.png');
				// decode('207;0;'+ MS.C_SET + ';0;' + MS.V_IMAGE + ';' + 'pressure_1w.png');
				decode('208;0;'+ MS.C_SET + ';0;' + MS.V_IMAGE + ';' + 'speed_1w.png');
			}
			writeSTG();
		}
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


// Decode a message received from a sensor
function decode(msg) {
	const msgs = msg.toString().split(";");

	//	// logMsg{'I', 'Decoding: ' + msg);
	// Should really check that all these parameters are available
	if (msgs.length < 6) {
		// // logMsg{"DE", "Incomplete message from gateway: " + msg);
		// logMsg{"DE", `Incomplete message from gateway: ${msg}`);
		return 1;
	}

	//Split out the valid message into its components
	const [rN, rS, rMT, rA, rST, payload] = msgs;
	const trimmed = payload.trim();
    let rP = isNaN(+trimmed) ? trimmed : +trimmed;

	switch (+rMT) {
		case MS.C_PRESENTATION:  // = 0
		case MS.C_REQ:  // = 2 = A sensor is asking for data
			break;
		case MS.C_SET:  //SET message = 1
			switch (rST) {
				case MS.V_TEMP:
					var getSensor = conf.mys.sensorNs.find(sensor => sensor.id == rN);
					if (getSensor !== undefined) {
						var oldVal = getSensor.value;
						getSensor.updated = new Date().getTime();
						getSensor.value = rP;
						getSensor.contact_status = '0';
						// Send JSON of sensor
						io.emit('SMv2', JSON.stringify(getSensor));
						// logMsg{'I', `Got: ${getSensor.name} (${rN}): ${getSensor.value}`);
						// logMsg{'DI', "Sending JSON: " + JSON.stringify(getSensor));

						// If from FanSwitch(25) then send of to fan switch (105)
						// Check to see if the value has changed at all
						if ((rN == '25') && (rP != oldVal)) {
							// logMsg{'I', 'Received message from Fan Switch. Sending to fan: ' + '105;0;'+ C_SET + ';0;' + V_SWITCH + ';' + rP);
							decode('105;0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';' + rP);
							processButton('105');
						}
					} else {
						// logMsg{'E', `Working with: ${msg} but wasn't found`);
					}
					// Special handling of Freezer (14) Temp and alerting:
					if (rN == '14') {
						checkSensor(getSensor);
					}
					break;
				case MS.V_STATUS:
					break;
				default:
					// logMsg{'E', 'Unknown Sensor message: ' + rN + ";" + rS + ";" + rMT + ";" + rA + ";" + rST + ";" + String(rP));
			}
			break;

		case MS.C_INTERNAL:  //INTERNAL messages = 3
			switch (rST) {
				case MS.I_BATTERY_LEVEL:
					// logMsg{'I', "Internal battery level is " + rP + "%");
					break;
				case MS.I_LOG_MESSAGE:
					// logMsg{'DI', 'MySensors Internal Log Message: ' + rN + ';' + rS + ';' + rMT + ';' + rA + ';' + rST + ';' + rP);
					break;

				case MS.I_GATEWAY_READY:
					// logMsg{'I', 'MySensors Gateway startup is complete.');
					break;

				default:
					// logMsg{'DI', 'MySensors Int Msg: ' + rN + ';' + rS + ';' + rMT + ';' + rA + ';' + rST + ';' + rP);
			}
			break;
		case MS.C_BROADCAST:   // Usually at sensor startup
			// logMsg{'DI', 'Sensor Broadcast: ' + rN + ";" + rS + ";" + rMT + ";" + rA + ";" + rST + ";" + rP);
			break;

		default:
			// logMsg{'E', 'Sensor Msg Unknown: ' + rN + ";" + rS + ";" + rMT + ";" + rA + ";" + rST + ";" + rP);

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
        // if (!threshold) {
		// 	// If returning from an alarm state, send a message to say all is well
		// 	if (sensor.alarmState !== 0) {
		// 		const msgBody = `INFO: ${sensor.name} value (${sensor.value}) is back to normal!`;
		// 		// logMsg{'I', msgBody);
		// 		sendEmail('dave.jacobsen@gmail.com', `${sensor.name} Normal`, msgBody); 
		// 	}
		// 	sensor.alarmState = 0; // No threshold set, no alert
		// 	return false;
		// }
        const { operator, number } = threshold;
        return operator === '=' ? sensor.value === number :
               operator === '<' ? sensor.value < number :
               operator === '>' ? sensor.value > number :
               false;
    }

	// Check if the sensor is now normal but alarmState was true and email things are ok
	if (!(shouldRaiseAlert(alarm) || shouldRaiseAlert(warning)) && (sensor.alarmState !== 0)) {
		const msgBody = `INFO: ${sensor.name} value (${sensor.value}) is back to normal!`;
		// logMsg{'I', msgBody);
		sendEmail('dave.jacobsen@gmail.com', `${sensor.name} Normal`, msgBody); 
		sensor.alarmState = 0; // No threshold set, no alert
	}

	// Check if the sensor value exceeds the warning or alarm thresholds and email only if not in alarm state already
	if (shouldRaiseAlert(alarm) && (sensor.alarmState !== 2)) {
		const msgBody = `ALARM: ${sensor.name} value (${sensor.value}) exceeded threshold! (${alarm.operator}${alarm.number})`;
		// logMsg{'E', msgBody);
		sendEmail('dave.jacobsen@gmail.com', `${sensor.name} Alarm`, msgBody); 
		sensor.alarmState = 2;
    } else if (shouldRaiseAlert(warning) && (sensor.alarmState !== 1))  {
		const msgBody = `WARNING: ${sensor.name} value (${sensor.value}) near critical value! (${alarm.operator}${alarm.number})`;
        // logMsg{'C', msgBody);
		sendEmail('dave.jacobsen@gmail.com', `${sensor.name} Warning`, msgBody); 
		sensor.alarmState = 1;
    }
}


//// logMsg{'I', 'Starting app.get');
// What to serve from the root address. http://localhost/
app.get('/', function(req, res){
	var sendFileName = __dirname + '/dash.html';

	// Geo check src ip
	var geo = geoip.lookup(req.ip);

	if (geo) {

		if ((geo.country == 'NZ') || (geo.country == 'AU')) {
			// logMsg{'I', 'Hello ' + req.ip + ' from ' + geo.country);
		} else {
			// logMsg{'I', 'Sorry ' + req.ip + ' from ' + geo.country + 'you are denied');
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
	var sensorJSON = JSON.stringify(conf.mys.sensorNs);
	res.send(sensorJSON);
});


// Used for displaying all graphs
app.get('/graphs', function(req, res){
	res.sendFile(__dirname + '/graphs.html');
});

app.use(express.static('images'));
app.use(express.static('js'));
app.use(express.static('css'));

// logMsg{'I', 'Starting io handler');
// When a connection is made, setup the handler function
io.on('connection', function(socket){
  // logMsg{'DC', 'Web client connected');
  //socket.emit("SMv2", "Hello from server!");
  socket.on('ClientMsg', function(msg){

    // This only fires when message received from an IP Socket NOT sensors 
    // Clean up text
	msg = msg.replace(/(\r\n|\n|\r)/gm,"");
	var msgs = msg.toString().split(";");

    // if "redraw" is received from client then redraw all controls
	if (msgs[0] == 'redraw') {
    	// Emit all sensors
		conf.mys.sensorNs.forEach(s => {
			io.emit('SMv2', JSON.stringify(s));
		});
		// logMsg{'DR', 'Redraw requested');
		io.emit('', JSON.stringify(conf.mys.sensorNs));
    }
	// if "init" is received from client then send all sensors - for modern dashboard
	else if (msgs[0] == 'init') {
		io.emit('sensors', JSON.stringify(conf.mys.sensorNs));
    }
    // Click event received
    else if ((msgs[0] == 'BUT') || (msgs[0] == 'CHK')) {
		// logMsg{'DR', 'Button/Checkbox: ' + msgs[1]);
		processButton(msgs[1]);
    }
    else {
		// logMsg{'I', 'Received unknown message from client: ' + msg);
    }
  });

  socket.on('disconnect', function(){
    // logMsg{'DC', 'Web client disconnected');
  });
});

// logMsg{'I', 'Starting http listen');

// Start Web Service listening on TCP specified in the STG
//http.listen(conf.sockets.port, function(){
//BUG: Why hard coded here?
http.listen(8080, function(){
	// logMsg{'C', 'Listening on *:' + conf.sockets.port);
});
  
// Process button or checkbox switch presses from the client
// NEW COPILOT CODE. Old code below.

function processButton(butID) {
    // logMsg{'DR', `Handling button ${butID}`);
    const sensor = conf.mys.sensorNs.find(s => s.id == butID);

    if (!sensor) {
        // logMsg{'E', `Unknown switch/checkbox: ${butID}`);
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

    // logMsg{'I', `Changing ${sensor.name} (${sensor.id}) to ${sensor.value}`);
    io.emit('SMv2', JSON.stringify(sensor));
}

function handleSpecialActions(butID, value) {

	// Maybe add the Sonoff's as well that calls the handleSmartSwitch below.
    const specialActions = {
        '12': () => controlSonoffSwitch(value),
        '103': () => toggleDebug(value),
        '997': () => shutdownApplication(),
        '998': () => triggerSTGSave()
    };

    specialActions[butID]?.();
}

function handleSmartSwitch(butID, value) {
    const plug = plugs.find(p => p.id == butID);
    if (!plug) {
        // logMsg{'E', `ButtonID: ${butID} was expected to be a smart switch but couldn't be confirmed`);
        return;
    }

    const smartSwitchHandlers = {
        tplink: () => client.getPlug({ host: plug.host }).setPowerState(value === '1'),
        tuya: () => toggleTuyaSwitch(value)
    };

    smartSwitchHandlers[plug.type]?.() || {}// logMsg{'E', `Unexpected smart switch type: ${plug.type}`);
}

function controlSonoffSwitch(value) {
    request(`http://192.168.1.87/control?cmd=GPIO,12,${value}`, (error) => {
        if (error) {
            // logMsg{'E', `Error turning on Sonoff switch (12): ${error}`);
        }
    });
}

function toggleDebug(value) {
    DEBUG = (value === '1');
    // logMsg{'I', `Debug is now: ${DEBUG}`);
}

function shutdownApplication() {
    // logMsg{'I', '**** Client initiated shutdown ****');
    writeSTGSync();
    process.exit(0);
}

function triggerSTGSave() {
    writeSTG();
    decode(`998;0;${MS.C_SET};0;${MS.V_SWITCH};0`);
}

function toggleTuyaSwitch(value) {
    // logMsg{'I', 'Tuya switch action underway...');
    try {
        tuyaDev.set({ set: value === '1' })
            .then(() => {})// logMsg{'I', `Tuya device turned ${value === '1' ? 'on' : 'off'}`));
    } catch (error) {
        // logMsg{'E', `Tuya switching error: ${error}`);
    }
}

// OLD CODE:
// function processButton(butID) {
// 	// logMsg{'DR', 'Handling button ' + butID);
// 	var sID = conf.mys.sensorNs.find(sensor => sensor.id == butID);
// 	if (sID !== undefined) {
// 		sID.updated = new Date().getTime();

// 		// Toggle switch
// 		sID.value = (sID.value == '0') ? '1' : '0';
// 		sID.contact_status = '0';
// 		// logMsg{'I', 'Changing ' + sID.name + '(' + butID + ') to ' + sID.value);
// 		io.emit('SMv2', JSON.stringify(sID));

// 		// Some buttons have special actions, so perform them now
// 		// Sonoff switch (reflashed)
// 		if (butID == '12') {
// 			request('http://192.168.1.87/control?cmd=GPIO,12,' + sID.value, function (error, response, body) {
// 				if (error) {
// 					// logMsg{'E', 'Error turning on ' + butID + ' : ' + error);
// 				}
// 			});
// 		}
// 		else if (butID == '103') {
// 			// logMsg{'DI', 'Checkbox ' + butID + ' : ' + sID.value);
// 			DEBUG = (sID.value == '1');
// 			// logMsg{'I', 'Debug is now: ' + DEBUG);
// 		}
// 		else if (butID == '106') {
// 			// logMsg{'I', 'Handling Tuya switch');
// 			// tuyaDev.set({set: (sID.value == '1')});
// 		}

// 		// ***********************************************
// 		// Special button to shutdown the application hard
// 		else if (butID == '999') {
// 			// logMsg{'I', '**** Client initiated shutdown ****');
// 			writeSTGSync();
// 			process.exit(0);
// 		}
// 		else if (butID == '998') {
// 			writeSTG();
// 			decode('998;0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';0');
// 		}

// 		//Handle smart plugs/switches
// 		else {
// 			// Is it in the plugs array?
// 			var plug = plugs.find(p => p.id == butID);
// 			// If yes then change state
// 			if (plug != undefined) {
// 				switch (plug.type) {
// 					case 'tplink':
// 						var tPlugDev = client.getPlug({host: plug.host});
// 						tPlugDev.setPowerState((sID.value =='1'));
// 						break;
// 					// case 'wemo':
// 					// 	// Change Wemo switch
// 					// 	var wClient = wemo.client(plug.deviceInfo);
// 					// 	wClient.getBinaryState((err, value) => {
// 					// 		// Deal with error : console.log(err);
// 					// 		wClient.setBinaryState(sID.value == '1' ? '1' : '0');
// 					// 	})
// 					// 	break;
// 					case 'tuya':
// 						// Change Tuya switch
// 						//		// logMsg{'I',`Tuya switch status is: ${data.dps['1']}.`);
// 						// logMsg{'I','Tuya switch action underway ...');
						
// 						try {
// 							tuyaDev.set({set: true}).then(() => // logMsg{'I', 'Turning Tuya device on'));
// 						}
// 						catch (error) {
// 							// logMsg{'E', 'Tuya switching error: ' + error);
// 						}
// 						//tuyaDev.set({set: false}).then(() => // logMsg{'I', 'Tuya device was turned off'));
					
// 						break;
// 					default:
// 						// logMsg{'E', "Unexpected smart switch type: " + plug.type);
// 				}

// 			} else{
// 				// logMsg{'E', "Thought ButtonID:" + butID + " was a smart switch but can't confirm");
// 			}
// 		}
// 	}
// 	else {
// 		// logMsg{'E', 'Unknown switch/checkbox: ' + butID);
// 	}
// }
