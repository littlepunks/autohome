© 2017-2025 David Jacobsen / dave.jacobsen@gmail.com

# Description

AutoHome is a node.js based home automation controller that runs on a Raspberry Pi (or PC) and utilises a MySensors (www.mysensors.org) radio based (NRF24L01+ 2.4 Ghz) sensor network for sensor data.
The controller module is connected to a USB/Serially attached MySensors gateway (Arduino Nano) that in turn connects to the sensors via radio.
It supports TP-Link, Tuya and Wemo smart switches.
The software is currently designed to connect to MySensors API 1.5

# Files

All files must reside in the same folder:
- autohome.js -         The main node server component
- settings.json -     A local settings file read at startup
- dash.html -        The main html based dashboard
- contants-client.js - predefined constants
- make-graph.(cmd|sh) -   Calls rrdtool to generate graphs
- temps.rrd -        (In rrdtool directory) temperature log data
- README.md  -       This file
- sorry.html -       Message for geo-blocked users
- cert.js -          Cert details for littlepunk.co.nz
- sensor_mappings.xlsx
- graphs.html
- constants.js -     Useful constants for autohome.js

# Execution (New)

From the autohome directory:
> npm start

## Execution (OLD)

Using 'screen' utility to created a detached sessions that survives Putty exits. Later will setup as a service.
Using nodemon to auto restart script when autohome.js is changed.

```
> screen -S autohome
> npm start                  [ OLD is: > sudo nodemon --ignore '*.json' --ignore '*.html' autohome.js  // check package.json for full command line ]
> { Ctrl-A,D }
> screen -r autohome      // at any time to reconnect
> screen -list     // to see sessions

```

Refer to https://y-ax.com/nodejs-app-auto-start-in-server for how to set up on boot.

# Hardware

A MySensors gateway must be connected to a known serial port on the local PC.
e.g. COM1 in Windows, or /dev/ttyUSB0 in Raspbian or Linux

Gateway and sensors use Arduino Nano V3 modules

# Node.JS Details

Tested Working:

**Windows**

Node Version 22.14.0
NPM Version 11.2.0

**Raspbian**

Node Version 14.4.0
NPM Version 6.14.5

**Ubuntu 20.04.3**

Node Version 16.9.1
NPM Version 7.23.0

The app requires the following node modules:
- express
- bodyparser
- http
- serialport
- socket.io
- tplink-smarthome-api
- tuyapi
- request
- colors
- nodemon
- util
- geoip-lite

# Other Dependencies
- RRDTool (in Windows needs Cygwin installed with defaults as well). Some install downloads include the needed DLL's without a Cygwin install.

# Arduino Settings

Arduino with USB: Arduino Nano V3, ATmega328, 5V
Arduino without USB: ArduinPro Mini, ATmega328, 3V?

# Build Instructions

## Raspberry PI

1. Download latest Raspberry PI OS image from: https://www.raspberrypi.org/downloads/raspberry-pi-os/
2. Unzip the file.
3. Use the Win32DiskImager utility to write to an SD card (8 GB+)
4. Boot from SD
5. Follow the wizard onscreen to:
- Choose your country
- Set password
- Select Wifi network
- Allow it to update software
- Decline restart
- Choose "Preferences"->"Raspberry Pi Configuration" to set to boot to command line, change host name, enable ssh
- Restart

6. Then do:
```
	git clone https://github.com/littlepunks/autohome.git
	cd autohome
	chmod +x autohome-build.sh
	./autohome-build.sh
```
7. When done type:
```
npm start (or npm test)
```
## Ubuntu

Run:
cd ~/ && git clone https://github.com/littlepunks/autohome.git && cd ./autohome && chmod +x autohome-build-ubuntu.sh && ./autohome-build-ubuntu.sh

## Windows

Edit and use autohome-build-windows.ps1 file that automates most of the build. It has not been tested.

# Sensor Details

Refer to sensor_mappings.xlsx for sensor details

# Settings

All settings are stored in JSON format in settings.json

Entries from the settings file are detailed below with default or example values
```
sockets:
	port:8080 - TCP port to connect a Web client to.
mysensors:
	comport:COM1 or //dev/ttyUSB0 - The local com (serial) port that the MySensors controller is connected to.
	baud - The baud rate of the serial connection in bits per second.
	sensornodes[] - A array of the MySensor node names.
mailOptions - to/from addresses, subject and message format settings for email alerts
smtpConfig - mail server and authentication settings
weather.externalTempURL - URL for openweathermap.org to get the local weather conditions. You need to register with the website to get a unique id for your location
```
---

# Basic Operation
At startup:
- All node modules are loaded
- Various constant, variables and helper functions are defined
- Settings are read and stored in a controls array
- TP-Link, Tuya and Wemo devices are discovered
- Serial port to the controller is opened
- Web client event handler started
- Web server started
- Regular status check timers are started
- Regular WeatherAPI calls are started

# Bugs/Known Errors
- When developing using the Cloud version of the Arduino IDE the COM port may be held by that and not be available to Autohome.
- The TCP port must be >1024 otherwise root access is required to run the core process
- [All] After a restart the controller doesn't always appear as a COM port or ttyUSB device straight away. May require continuous power to gateway or g/w power cycle. Worse on Linux.
- [All] Tuya support is patchy. Sometimes can't discover in time, doesn't report external changes. Currently disabled in code.

- If Tuya devices offline will sometimes get:
		(node:855) UnhandledPromiseRejectionWarning: Error: find() timed out. Is the device powered on and the ID or IP correct?
			at /home/pi/autohome/node_modules/tuyapi/index.js:619:13
			at Timeout._onTimeout (/home/pi/autohome/node_modules/p-timeout/index.js:25:13)
			at listOnTimeout (internal/timers.js:549:17)
			at processTimers (internal/timers.js:492:7)
		(Use `node --trace-warnings ...` to show where the warning was created)
		(node:855) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). To terminate the node process on unhandled promise rejection, use the CLI flag `--unhandled-rejections=strict` (see https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode). (rejection id: 1)
		(node:855) [DEP0018] DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.


- [All] If you get weird node errors after a new build try running 'npm rebuild' (is part of the Ubuntu build script)

# To Do

## General
- Look at test.html for new way to do graphs. Need to save data in memory and send to client when asked.
- For each control have optional and default settings, especially related to visuals and alerting.
() = optional
{} = default
CAPS = User defined
e.g. 
Temp Gauge --
	id: UNIQUE_NUM;
	name: NAME_STR;
	value: VALUE_STR;
	control: CONTROL_TYPE_STR;
	contact_status: STATUS_NUM_STR;
	(prefix: {""} | STRING);
	(suffix: {""} | STRING);
	(type: {""} | SENSOR_TYPE);
	(min: MINIMUM_EXPECTED_NUM)
	(maz: MAXIMUM_EXPECTED_NUM)
	updated: TIMESTRING;
	freq: TIME_IN_SECONDS_NUM;
	(warningThreshold: "['<'|'>']'NUM");
	(alarmThreshold: "['<'|'>']'NUM");
	(alarmState: [{0}|1|2]);


LEVELS of values that are critical, also need to know if higher or lower than matters

## Security
- Use helmet module for greater security. Possible helmet options:
		app.use(
			helmet({
				contentSecurityPolicy: false, // Disables CSP (allowing locally served pages)
				hsts: false, // Disables HTTP Strict Transport Security (not enforcing HTTPS)
				crossOriginEmbedderPolicy: false, // Disables Cross-Origin Embedder Policy
				crossOriginResourcePolicy: false, // Disables Cross-Origin Resource Policy
			})
		);

- Run npm audit
- Consider using snyk: npm install -g snyk; cd myapp; snyk test; snyk wizard
- Use certbot and Lets Encrypt or https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-16-04
- Use NGINX reverse proxy : https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-20-04
- sort out https/cert access via littlepunk.co.nz or littlepunk.duckdns.org
- consider using express-limit or express-rate-limit or NGINX rate limiting to stop DDoS

## Graphing
- Move to Highcharts or chart.js and storing the data a different way (JSON, CSV)
- [PI] Move /var/log to RAM to reduce load on SD (refer https://mcuoneclipse.com/2019/04/01/log2ram-extending-sd-card-lifetime-for-raspberry-pi-lorawan-gateway/)
- RRDTOOL to capture motion events

## Sensors
- TPLINK - plug online/offline events should change sensor status to red
- Consider using MY_RX_MESSAGE_BUFFER_FEATURE on gateway/repeaters to buffer messages. Needs IRQ (Pin2) connected.
- Updates from switches should be processed and the sensor values updated automatically.
- Record last motion detected for motion sensors. Useful to report on.
- Need "status_check" values for switches (and all oddball sensors)
- Testing setting radio levels on troublesome nodes to/from  RF24_PA_MAX/RF24_PA_LOW/RF24_PA_MIN. Using glad wrap/foil around radio module when using an external attenna, trying further away. Checkout https://docs.google.com/spreadsheets/d/1fsJyOGhNGL9IeZMMSuVwluUpo9he43wcWjM_w6xTL5k/edit#gid=0 for radio capabilities
- How to handle nodes with multiple sensors. Deal with NodeID and SensorID as a unique pair (key). E.g. temp node with multiple sensors
- Alert (email) when more than a "few" sensors are missing too long
- Add 2 way comms (to change update times) to all modules, also add "query" to find out description
- Show IR sensor movement map (security)
- Set the waitInterval on nodes remotely usually a code like W20000. Other letter codes could be used for other tasks. Apply to one or more sensors
- Poll devices on startup
- Displays can be sent to rather than having to poll themselves.
- Combine multiple sensors into one (Laundry - motion, room temp, freezer temp, washing machine action,floor moisture, door part open(drier), door full open)
- For actions such as turning a switch on/off, need to process the ACK message that the sensor sends through to confirm.

## Dashboard
- Weather image doesn't resize like the other canvases. Is an image not a canvas, so may need action on a resize event. Or draw image on canvas
- Changing from id's to classes in html to allow duplicate controls. dash.html will then need to iterate over all matching classes
- Show trend arrows, e.g. is the air pressure going up or down since the last reading
- have a page displaying sensor settings and make then adjustable
- Create LCD/OLED/Table console for kitchen
- Separate web page to add/remove controls
- Add a +/- counter control
- Add a +/- control for setting the waitInterval

## Alexa
- Add getting switch status, e.g. is the fan on, or "is anything turned on"
- Rebuild Alexa skill

## Gateway
- more granular control of when to send emails, e.g. priority
- Move to database for all data
- Have schedules and structure, e.g. alert on motion when no-one home, or heater on when after 5pm and someone home
- Maybe add a "source" field to controls. e.g. "url:http://weatheraddress" or "sensor,sensorid" or "file:filename"
- Gather all the functions that execute at startup in one place. Maybe wrap with a main()
- Maybe combine nodemon and forever to cover all eventualities
- Use 'winston-daily-rotate-file' or 'pino' module to manage log files
- Improve timers - use setinterval
- Move things like Tuya id and keys to environment variables, maybe using dotenv
- Implement rate limiting on http requests



