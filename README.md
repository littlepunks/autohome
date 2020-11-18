(C) 2017-2020 David Jacobsen / dave.jacobsen@gmail.com

# Description

AutoHome is a node.js based home automation controller that runs on a Raspberry Pi (or PC) and utilises a MySensors (www.mysensors.org) radio based sensor network for sensor data.
The controller is connected to a USB/Serially attached MySensors gateway than in turn connects to the sensors via radio.
It supports TP-Link, Tuya and Wemo smart switches.
The software is currently design to connect to MySensor API 1.5

# Files

All files must reside in the same folder:
- index.js -         The main node server component
- settings.json -     A local settings file read at startup
- dash.html -        The main html based dashboard
- make-graph.cmd -   Calls rrdtool to generate graphs
- temps.rrd -        (In rrdtool directory) temperature log data
- README.txt -       This file
- sorry.html -       Message for geo-blocked users
- cert.js -          Cert details for littlepunk.co.nz
- sensor_mappings.xlsx
- graphs.html


# Execution (New)

From the autohome directory:
> npm start

# Execution (OLD)

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
e.g. COM1 in Windows, or /dev/ttyUSB0 in Raspbian

Gateway and sensors use Arduino Nano V3 modules

# Node.JS Details

Tested Working:

**Windows**

Node Version 4.5.0
NPM Version 2.15.9

**Raspbian**

Node Version 14.4.0
NPM Version 6.14.5

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

# Other Dependencies
- RRDTool (in Windows needs Cygwin installed with defaults as well)

# Arduino Settings

Arduino with USB: Arduino Nano V3, ATmega328, 5V
Arduino without USB: ArduinPro Mini, ATmega328, 3V?

# Build Instructions

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


# Fedora build instructions
1. Install Fedora with username littlepunk
2. Create /home/littlepunk/autohome
3. sudo dnf update
4. curl -sL https://

# Sensor Details

Refer to sensor_mappings.xlsx for sensor details

# Settings

All settings are stored in JSON format in settings.json

Entries from the settings file are detailed below with default or example values
```
sockets:
	port:3000 - TCP port to connect a Web client to.
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
- [All] After a restart the controller doesn't always appear as a COM port or ttyUSB device straight away. May require continuous power to gateway or g/w power cycle
- [All] Tuya support is patchy. Sometimes can't discover in time, doesn't report external changes

- If Tuya devices offline will sometimes get:
		(node:855) UnhandledPromiseRejectionWarning: Error: find() timed out. Is the device powered on and the ID or IP correct?
			at /home/pi/autohome/node_modules/tuyapi/index.js:619:13
			at Timeout._onTimeout (/home/pi/autohome/node_modules/p-timeout/index.js:25:13)
			at listOnTimeout (internal/timers.js:549:17)
			at processTimers (internal/timers.js:492:7)
		(Use `node --trace-warnings ...` to show where the warning was created)
		(node:855) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). To terminate the node process on unhandled promise rejection, use the CLI flag `--unhandled-rejections=strict` (see https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode). (rejection id: 1)
		(node:855) [DEP0018] DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.


# To Do

- Move /var/log to RAM to reduce load on SD (refer https://mcuoneclipse.com/2019/04/01/log2ram-extending-sd-card-lifetime-for-raspberry-pi-lorawan-gateway/)
- Double check there isn't a permissions error on the graph image files when they are git cloned or written for the first time. Has crashed autohome before. There is some error checking already but may need more, like checks for dirs and permissions
- TPLINK - plug online/offline events should change sensor status to red
- Consider using MY_RX_MESSAGE_BUFFER_FEATURE on gateway/repeaters to buffer messages. Needs IRQ (Pin2) connected.
- Weather image doesn't resize like the other canvases. Is an image not a canvas, so may need action on a resize event. Or draw image on canvas
- Updates from switches should be processed and the sensor values updated automatically.
- [Alexa] Add getting switch status, e.g. is the fan on, or "is anything turned on"
- Record last motion detected for motion sensors. Useful to report on.
- Need "status_check" values for switches (and all oddball sensors)
- Changing from id's to classes in html to allow duplicate controls. dash.html will then need to iterate over all matching classes
- Testing setting radio levels on troublesome nodes to/from  RF24_PA_MAX/RF24_PA_LOW/RF24_PA_MIN. Using glad wrap/foil around radio module when using an external attenna, trying further away. Checkout https://docs.google.com/spreadsheets/d/1fsJyOGhNGL9IeZMMSuVwluUpo9he43wcWjM_w6xTL5k/edit#gid=0 for radio capabilities
- How to handle nodes with multiple sensors. Deal with NodeID and SensorID as a unique pair (key). E.g. temp node with multiple sensors
- Alert (email) when more than a "few" sensors are missing too long
- Add 2 way comms (to change update times) to all modules, also add "query" to find out description
- Show IR sensor movement map (security)
- Show trend arrows, e.g. is the air pressure going up or down since the last reading
- replace "colors" npm module with "chalk"
- Use a geoip module instead of validClientIPs
- more granular control of when to send emails, e.g. priority
- have a page displaying sensor settings and make then adjustable
- change RRDTOOL data to show averages too.
- RRDTOOL to capture motion events
- Set the waitInterval on nodes remotely usually a code like W20000. Other letter codes could be used for other tasks. Apply to one or more sensors
- Add a +/- control for setting the waitInterval
- For actions such as turning a switch on/off, need to process the ACK message that the sensor sends through to confirm.
- Gather all the functions that execute at startup in one place. Maybe wrap with a main()
- Maybe add a "source" field to controls. e.g. "url:http://weatheraddress" or "sensor,sensorid" or "file:filename"
- Poll devices on startup
- Separate web page to add/remove controls
- Move to database for all data
- Displays can be sent to rather than having to poll themselves.
- Add a +/- counter control
- sort out https/cert access via littlepunk.co.nz or littlepunk.duckdns.org
- Combine multiple sensors into one (Laundry - motion, room temp, freezer temp, washing machine action,floor moisture, door part open(drier), door full open)
- Create LCD/OLED/Table console for kitchen
- Have schedules and structure, e.g. alert on motion when no-one home, or heater on when after 5pm and someone home
