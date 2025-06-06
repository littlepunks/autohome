
// TP-Link Smart Switch setup ---------------------------------------------------------------
// device.sysinfo returns detailed information about the device...
//
// rssi:
// 		>-90 (dBm) : signal is extremely weak, and will be unreliable
//  	-67 : this is a fairly strong signal
//		-55 : this is a very strong signal
//		-30 : your device is very close to the Wifi router
//
// model: Describes the model of the device, e.g., HS100, HS110, etc.
// mic_type: device type, e.g., plug, bulb, etc.
// next_action: type=-1 or empty means nothing planned
// sw_ver: software version
// hw_ver: hardware version
// alias: friendly name


// function logMsg(message) {
//   const now = new Date();
//   const formattedTime = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  
//   console.log(`I ${formattedTime} ${message}`);
// }

// Import logMsg functoin from autohome.js
const parent = require('../autohome.js');
function logMsg(code, message) {
	parent.logMsg(code, message);
}

// Set up TP-Link client
const { Client } = require('tplink-smarthome-api');
const TPLinkClient = new Client();
const TPLinkDeviceRegistry = new Map();

function startTPLink() {

	TPLinkClient.on('plug-new', device => {

		// alias      is the friendly name of the device
		// host       is the IP address of the device
		// relayState is true if the device is on, false if it is off
		// sysInfo    contains detailed information about the device

		const rssi = device.sysInfo.rssi;
		let signalStrength = `, signal (${rssi}) is `;
		switch (true) {
			case (rssi < -90):
				signalStrength += 'very weak';
				break;
			case (rssi < -67):
				signalStrength += 'fairly strong';
				break;
			case (rssi < -55):
				signalStrength += 'strong';
				break;
			default:
				signalStrength += 'very strong';
				break;	
		}

		logMsg('I', `Found TP-Link Device: ${device.alias} : ${device.host} : ${(device.relayState) ? 'on' : 'off'}${signalStrength}`);  //false=off, true=on

		// Add the device to the registry
		// The registry is a Map where the key is the device alis (name)
		// and the value is the device object itself.
		if (!TPLinkDeviceRegistry.has(device.alias)) {
			TPLinkDeviceRegistry.set(device.alias, device);
		}

		// Need to update conf.sesnors with current status
		// use parent.getConf() to return conf object.
		// Search for matching name then update conf.
		parent.updateSmartDeviceStatus(device.alias, device.relayState);

		// // decode(tpSensor.id + ';0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';' + ((device.relayState) ? '1' : '0'));
		// if (conf)	{
		// 	console.log('Conf: ', JSON.stringify(conf));
		// }
		plugs.push({id:  tpSensor.id, host: device.host, type: "tplink"});

		device.startPolling(SENSORCHECKINTERVAL);
	
		device.on('power-on', () => {
			logMsg('I', `TP-Link device ${device.alias} is on`);
			// Need to check if it exists otherwise the decode will error
			let tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
			//(tpSensor.id + ';0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';1');

		});
		device.on('power-off', () => {
			logMsg('I', `TP-Link device ${device.alias} is off`);
			//let tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
			//decode(tpSensor.id + ';0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';0');

		});
		device.on('power-update', (powerState) => {
			if (powerState) {
				logMsg('I', `TP-Link device ${device.alias} was turned ON`);
			} else {
				logMsg('I', `TP-Link device ${device.alias} was turned OFF`);
			}

			let tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
			//decode(tpSensor.id + ';0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';0');

		});
		
		device.on('in-use-update', inUse => {
			logMsg('I', `TP-Link device - in-use-update:  ${JSON.stringify(device)}`);
			//let tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
			//decode(tpSensor.id + ';0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';' + ((device.relayState) ? '1' : '0'));	
		});  
	});
	TPLinkClient.on('plug-online', device => {
		// Seems to receive a high number of updates from device.
		//logMsg('DI', `TP-Link device ${device.alias} is contactable`);
		// Could mark sensor as uncontactable
	});
	TPLinkClient.on('plug-offline', device => {
		logMsg('E', `TP-Link device ${device.alias} is uncontactable`);
	});

	logMsg('I', 'Starting TP-Link Device Discovery');
	TPLinkClient.startDiscovery();
}

// Toggle a TPLink Smart Plug based on its alias (name) -------------------
async function toggleTPLinkPlug(deviceAlias) {
	// Find the matchng device in the registry
	const device = TPLinkDeviceRegistry.get(deviceAlias);
	// If the device is not found, log an error and return
	if (!device) {
		logMsg('E', `TP-Link device with ID ${deviceAlias} not found in registry.`);
		return;
	}

	// Read the power state of the Tuya switch then toggle it
	const value = device.relayState ? '0' : '1'; // Toggle the state
	logMsg('I', `TP-Link device ${device.alias} is being turned ${value === '1' ? 'on' : 'off'}`);

	// Attempt to set the device state
	try {
        await device.setPowerState(value === '1' ? true : false);
        logMsg('I', `TP-Link device ${device.alias} is now ${value === '1' ? 'on' : 'off'}`);
	} catch (err) {
		logMsg('E', `Failed to turn TP-Link device ${device.alias} ${value === '1' ? 'on' : 'off'}:`, err);
	}
}

// Set the power state of a TPLink Smart Plug based on its name (alias) -------------------
// State can be true (on) or false (off)
async function setStateTPLinkPlug(deviceAlias, state) {
	// Find the matchng device in the registry
	const device = TPLinkDeviceRegistry.get(deviceAlias);
	// If the device is not found, log an error and return
	if (!device) {
		logMsg('E', `TP-Link device with ID ${deviceId} not found in registry.`);
		return;
	}

	// Attempt to set the device state
	try {
        await device.setPowerState(state);
        logMsg('I', `TP-Link device ${device.alias} has been turned ${state ? 'on' : 'off'}`);
	} catch (err) {
		logMsg('E', `Failed to turn TP-Link device ${device.alias} ${state ? 'on' : 'off'}:`, err);
	}
}

// TP-Link Example Usage ---------------------------------------------------------------

// toggleTPLinkPlug('Sky'); // Wardrobe plug

// setTimeout(() => {
// 	setStateTPLinkPlug('Sky', true); // Wardrobe plug
// }, 5000); // Toggle after 5 seconds	

// setTimeout(() => {
// 	setStateTPLinkPlug('Sky', false); // Wardrobe plug
// }, 8000); // Toggle after 5 seconds	



//--------------------------------------

module.exports = {
	startTPLink,
	toggleTPLinkPlug,
	setStateTPLinkPlug,
	TPLinkDeviceRegistry
	// handleSpecialActions,
	// handleSmartSwitch,
	// controlSonoffSwitch
};

// Samsung SmartThings API setup ---------------------------------------------------------------------
// Notes:
// - For more info refer to https://developer.smartthings.com/docs/api/public/#tag/Devices/operation/getDevices
// - Personal Access Tokens (PATs) are probably the go
// - OAuth2 scopes : generally in the form permission:entity-type:entity-id (wildcards may be used)
// - Bearer Authentication Scopes :
//		- l:devices : List devices
//		- r:devices : Read device details
//		- w:devices : Update or delete devices
//		- x:devices : Execute commands on a device






// Tuya Switch setup ---------------------------------------------------------------------
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

	// try {
	// 	tuyaClient.set({ set: value === '1' })
	// 		.then(() => logMsg('I', `Tuya device turned ${value === '1' ? 'on' : 'off'}`));
	// } catch (error) {
	// 	logMsg('E', `Tuya switching error: ${error}`);
	// }



	// // Need to carefully merge this function with the existing function in autohome.js
	// function handleSpecialActions(butID, value) {
	//     const specialActions = {
	//         '12': () => controlSonoffSwitch(value),
	//         '103': () => toggleDebug(value),
	//         '106': () => logMsg('I', 'Handling Tuya switch'),
	//         '997': () => shutdownApplication(),
	//         '998': () => triggerSettingsSave()
	//     };

	//     specialActions[butID]?.();
	// }

	// function handleSmartSwitch(butID, value) {
	//     const plug = plugs.find(p => p.id == butID);
	//     if (!plug) {
	//         logMsg('E', `ButtonID: ${butID} was expected to be a smart switch but couldn't be confirmed`);
	//         return;
	//     }

	//     const smartSwitchHandlers = {
	//         tplink: () => client.getPlug({ host: plug.host }).setPowerState(value === '1'),
	//         tuya: () => toggleTuyaSwitch(value)
	//     };

	//     smartSwitchHandlers[plug.type]?.() || logMsg('E', `Unexpected smart switch type: ${plug.type}`);
	// }

	// function controlSonoffSwitch(value) {
	//     request(`http://192.168.1.87/control?cmd=GPIO,12,${value}`, (error) => {
	//         if (error) {
	//             logMsg('E', `Error turning on Sonoff switch (12): ${error}`);
	//         }
	//     });
	// }


