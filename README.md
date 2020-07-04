(C) 2017-2020 David Jacobsen / dave.jacobsen@gmail.com

DESCRIPTION

AutoHome is a Node.js based software controller that runs on a Raspberry Pi and utilises a MySensors (www.mysensors.org) radio based sensor network.
The controller connected to a USB/Serially attached MySensors gateway than in turn connects to the sensors via radio.
The software is currently design to connect to MySensor API 1.5

FILES

All files must reside in the same folder:
- index.js          The main node server component
- settings.json     A local settings file read at startup
- dash.html         The main html based dashboard
- make-graph.cmd    Calls rrdtool to generate graphs
- temps.rrd         (In rrdtool directory) temperature log data
- README.txt        This file
- sorry.html        Message for geo-blocked users
- cert.js           Cert details for littlepunk.co.nz
- sensor_mappings.xlsx
- graphs.html


EXECUTION

Using 'screen' utility to created a detached sessions that survives Putty exits. Later will setup as a service.
Using nodemon to auto restart script when autohome.js is changed.

> screen -S autohome
> sudo nodemon --ignore '*.json' --ignore '*.html' autohome.js               // checkpackage.json for full command line
> { Ctrl-A,D }
> screen -r autohome      // at any time to reconnect
> screen -list     // to see sessions

Refer to https://y-ax.com/nodejs-app-auto-start-in-server for how to set up on boot.

HARDWARE
A MySensors gateway must be connected to a known serial port on the local PC.
e.g. COM1 in Windows, or /dev/ttyUSB0 in Raspbian

Gateway and sensors use Arduino Nano V3 modules

NODE.JS DETAILS (tested working)
Windows
  Node Version 4.5.0
  NPM Version 2.15.9

Raspbian
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

OTHER DEPENDENCIES
- RRDTool (in Windows needs Cygwin installed with defaults as well)


ARDUINO SETTINGS
Arduino with USB: Arduino Nano V3, ATmega328, 5V
Arduino without USB: ArduinPro Mini, ATmega328, 3V?
---
BUILD INSTRUCTIONS

Download latest Raspberry PI OS image from: https://www.raspberrypi.org/downloads/raspberry-pi-os/
Unzip the file.
Use the Win32DiskImager utility to write to an SD card (8 GB+)
Boot from SD
Follow the wizard onscreen to:
- Choose your country
- Set password
- Select Wifi network
- Allow it to update software
- Decline restart
- Choose "Preferences"->"Raspberry Pi Configuration" to set to boot to command line, change host name, enable ssh
- Restart

Then do:
	git clone https://github.com/littlepunks/autohome.git
	cd autohome
	chmod +x autohome-build.sh
	./autohome-build.sh

When done type: npm start (or npm test)

-----------------------------------------------------------------------------
SENSOR DETAILS

Refer to sensor_mappings.xlsx for sensor details

-----------------------------------------------------------------------------
SETTINGS
All settings are stored in JSON format in settings.json

Entries from the settings file are detailed below with default or example values
sockets:
	port:3000 - TCP port to connect a Web client to.
mysensors:
	comport:COM1 or //dev/ttyUSB0 - The local com (serial) port that the MySensors controller is connected to.
	baud - The baud rate of the serial connection in bits per second.
	sensornodes[] - A array of the MySensor node names.
mailOptions - to/from addresses, subject and message format settings for email alerts
smtpConfig - mail server and authentication settings
weather.externalTempURL - URL for openweathermap.org to get the local weather conditions. You need to register with the website to get a unique id for your location

-----------------------------------------------------------------------------
BASIC OPERATION
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

-----------------------------------------------------------------------------
BUGS/KNOWN ERRORS
- [All] When Wemo automatically turns off, AutoHome doesn't pick it up --> poll regularly?
- [All] After a restart the controller doesn't always appear as a COM port or ttyUSB device straight away. May require continuous power to gateway or g/w power cycle
- [PC] The com port is hard coded in settings.json. Check Windows device manager and edit the port name as required. The wrong port will display "Connection error - trying to reconnect" messages in the console and the code will exit.
- [All] The Wemo IP is hardcoded. Check IP/MAC excel sheet and arp table
= [All] Tuya support is patchy. Sometimes can't discover in time, doesn't report external changes

-----------------------------------------------------------------------------
TO DO

- RRDTOOL uses conf.weather settings from the settings file but that should be changed to search and use the sensor values instead
- Convert remaining weather items such as Description and images to the Decode mode
- TPLINK - plug online/offline events should change sensor status to red
- Weather image doesn't resize like the other canvases. Is an image not a canvas, so may need action on a resize event. Or draw image on canvas
- Updates from switches should be processed and the sensor values updated automatically.
- [Alexa] Add getting switch status, e.g. is the fan on, or "is anything turned on"
- Record last motion detected for motion sensors. Useful to report on.
- Need "status_check" values for switches (and all oddball sensors)
- Add weather data as individual sensors to conf.mysensors.sensornodes - useful when sending to Alexa. Already in settings.json but in the wrong place
- ACTIVE: Changing from id's to classes in html to allow duplicate controls.
- Testing setting radio levels on troublesome nodes to/from  RF24_PA_MAX/RF24_PA_LOW/RF24_PA_MIN. Using glad wrap/foil around radio module when using a
  external attenna, trying further away. Checkout https://docs.google.com/spreadsheets/d/1fsJyOGhNGL9IeZMMSuVwluUpo9he43wcWjM_w6xTL5k/edit#gid=0 for radio
  capabilities
- dash.html - iterate through all matching controls on an update not just the first
- How to handle nodes with multiple sensors. Deal with NodeID and SensorID as a unique pair (key). E.g. temp node with multiple sensors
- Alert (email) when more than a "few" sensors are missing too long
- add 2 way comms (to change update times) to all modules, also add "query" to find out description
- Show IR sensor movement map (security)
- Show trend arrows, e.g. is the air pressure going up or down since the last reading
- replace "colors" npm module with "chalk"
- move validClientIPs to settings.json
- allow a reload of settings once started
- more granular control of when to send emails, e.g. priority
- have a page displaying sensor settings and make then adjustable
- change RRDTOOL data to show averages too.
- RRDTOOL to capture motion events
- Set the waitInterval on nodes remotely usually a code like W20000. Other letter codes could be used for other tasks.
  Apply to one or more sensors
- Add a +/- control for setting the waitInterval
- For actions such as turning a switch on/off, need to process the ACK message that the sensor sends through to confirm.
- Gather all the functions that execute at startup in one place. Maybe wrap with a main()
- Maybe add a "source" field to controls. e.g. "url:http://weatheraddress" or "sensor,sensorid" or "file:filename"
- Occasionally the Wemo goes "wacky" and refuses connections. This will cause the wemo commands to error and autohome to crash
  Need to check that the URL is available (via a get) before executing the Wemo commands
- Occasionally poll Wemo status as it is sometimes wrong after it auto timeouts
- Have Wemo be a special kind of control to allow for event subscription
- Poll devices on startup
- Separate web page to add/remove controls
- Move to database for all data
- Auto discover all Wemo switches
- Auto allocate node id's when a client first tries to register
- have a web page to add/change/delete sensor details
- Allow for more than one Wemo
- Get onto Github?
- Displays can be sent to rather than having to poll themselves.
- Add a +/- counter control
- sort out https/cert access via littlepunk.co.nz or littlepunk.duckdns.org
- Combine multiple sensors into one (Laundry - motion, room temp, freezer temp, washing machine action,floor moisture, door part open(drier), door full open)
- Create LCD/OLED/Table console
- Have schedules, e.g. alert on motion when no-one home