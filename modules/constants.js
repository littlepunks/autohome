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


module.exports = {
    C_PRESENTATION,C_SET,C_REQ,C_INTERNAL,C_STREAM,C_BROADCAST,V_TEMP,V_HUM,V_STATUS,V_DIMMER,V_PRESSURE,
    V_FORECAST,
    V_RAIN,
    V_RAINRATE,
    V_WIND,
    V_GUST,
    V_DIRECTION,
    V_UV,
    V_WEIGHT,
    V_DISTANCE,
    V_IMPEDANCE,
    V_SWITCH,
    V_TRIPPED,
    V_WATT,
    V_KWH,
    V_SCENE_ON,
    V_SCENE_OFF,
    V_HEATER,
    V_HEATER_SW,
    V_LIGHT_LEVEL,
    V_VAR1,
    V_VAR2,
    V_VAR3,
    V_VAR4,
    V_VAR5,
    V_UP,
    V_DOWN,
    V_STOP,
    V_IR_SEND,
    V_IR_RECEIVE,
    V_FLOW,
    V_VOLUME,
    V_LOCK_STATUS,
    V_LEVEL,
    V_VOLTAGE,
    V_IMAGE,
    
    I_BATTERY_LEVEL,
    I_TIME,
    I_VERSION,
    I_ID_REQUEST,
    I_ID_RESPONSE,
    I_INCLUSION_MODE,
    I_CONFIG,
    I_PING,
    I_PING_ACK,
    I_LOG_MESSAGE,
    I_CHILDREN,
    I_SKETCH_NAME,
    I_SKETCH_VERSION,
    I_REBOOT,
    I_GATEWAY_READY,
    I_REQUEST_SIGNING,
    I_GET_NONCE,
    I_GET_NONCE_RESPONSE,
    
    S_DOOR,
    S_MOTION,
    S_SMOKE,
    
    S_LIGHT,
    S_BINARY,
    
    S_DIMMER,
    S_COVER,
    S_TEMP,
    S_HUM,
    S_BARO,
    S_WIND,
    S_RAIN,
    S_UV,
    S_WEIGHT,
    S_POWER,
    S_HEATER,
    S_DISTANCE,
    S_LIGHT_LEVEL,
    S_ARDUINO_NODE,
    S_REPEATER_NODE,
    S_LOCK,
    S_IR,
    S_WATER,
    S_AIR_QUALITY
    };