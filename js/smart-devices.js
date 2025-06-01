
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

function startTPLink() {		
	const { Client } = require('tplink-smarthome-api');
	const client = new Client();

	client.on('plug-new', device => {

		console.log(`Found TP-Link Smart Switch: ${device.alias} : ${device.host} : ${(device.relayState) ? 'on' : 'off'}`);  //false=off, true=on

		// const sysInfo = device.sysInfo;
		// console.log(`Device Info: ${JSON.stringify(sysInfo, null, 2)}`);
		const rssi = device.sysInfo.rssi;
		switch (true) {
			case (rssi < -90):
				console.log('Signal is very weak\n');
				break;
			case (rssi < -67):
				console.log('Signal is fairly strong\n');
				break;
			case (rssi < -55):
				console.log('Signal is strong\n');
				break;
			default:
				console.log(`Signal strength is ${rssi} dBm\n`);
				break;	
		}

		// Assumes plug will be found
		let tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
		decode(tpSensor.id + ';0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';' + ((device.relayState) ? '1' : '0'));

		plugs.push({id:  tpSensor.id, host: device.host, type: "tplink"});

		device.startPolling(SENSORCHECKINTERVAL);
	
		device.on('power-on', () => {
			console.log(`TP-Link device ${device.alias} is on`);
			// Need to check if it exists otherwise the decode will error
			let tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
			decode(tpSensor.id + ';0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';1');

		});
		device.on('power-off', () => {
			console.log(`TP-Link device ${device.alias} is off`);
			let tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
			decode(tpSensor.id + ';0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';0');

		});
		device.on('in-use-update', inUse => {
			//logMsg('DI', `TP-Link device ${device.alias} is ${(device.relayState) ? 'on' : 'off'}`);
			//let tpSensor = conf.mysensors.sensornodes.find(n => n.name == device.alias);
			//decode(tpSensor.id + ';0;'+ MS.C_SET + ';0;' + MS.V_SWITCH + ';' + ((device.relayState) ? '1' : '0'));	
		});  
	});
	client.on('plug-online', device => {
		//logMsg('DI', `TP-Link device ${device.alias} is contactable`);
		// Could mark sensor as uncontactable
	});
	client.on('plug-offline', device => {
		console.log(`TP-Link device ${device.alias} is uncontactable`);
	});

	console.log('Starting TP-Link Device Discovery');
	client.startDiscovery();
}


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


	// function toggleTuyaSwitch(value) {
	//     logMsg('I', 'Tuya switch action underway...');
	//     try {
	//         tuyaDev.set({ set: value === '1' })
	//             .then(() => logMsg('I', `Tuya device turned ${value === '1' ? 'on' : 'off'}`));
	//     } catch (error) {
	//         logMsg('E', `Tuya switching error: ${error}`);
	//     }
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


module.exports = {
	startTPLink
	// toggleTuyaSwitch,
	// handleSpecialActions,
	// handleSmartSwitch,
	// controlSonoffSwitch
};