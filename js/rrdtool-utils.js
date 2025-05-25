// Create RRD if it doesn't exist
// **** NEEDS TO BE CHECKED AGAINST THE LATEST CONFIG
function createRRD() {
	if (fs.existsSync(TempsRRDFile)) {
	  logMsg('I','RRD file already exists.');
	  return;
	}

	// 	List of datasources'Outside','Tom','Bedroom','Sophie','Michael','Laundry','Freezer','Balcony','Humidity','Pressure','Speed'

	// Notes:
	// Rename datasource:
	//   rrdtool tune TempsRRDFile -r oldname:newname
	// Add datasource:
	//   rrdtool tune DS:SensorName:GAUGE:600:min:max

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
	  'DS:WindSpeed:GAUGE:600:0:300',

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
  
	const child = spawn(process.env.RRDTOOL_PATH, args);
	child.on('close', code => {
	  if (code === 0) logMsg('I', 'RRD created successfully.');
	  else logMsg('E', 'RRD creation failed.');
	});
  }

createRRD();
