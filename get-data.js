// This is a test script to get power data from Mercury using
// the .env credentials and the underlying opower Python module
// but is othwerwise independent of the rest of autohome.
//
// To help troubleshoot this file the following command line can 
// be used to check that the Mercury end of things is ok:
//    python -m opower --utility mercury --username dave.jacobsen@gmail.com --password {ENTER PASSWORD} --start_date 2025-04-24 --end_date 2025-05-24

require('dotenv').config();

// Return a YYYY-MM-DD strings from an integer delta based on todays date
function getDateStringFromDelta(deltaDays) {
  const date = new Date();
  date.setDate(date.getDate() + deltaDays);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// This removes unnecessary headers from the power data and returns just the data lines
function trimToFirstDateLine(text) {
  const lines = text.split(/\r?\n/);
  const dateLineIndex = lines.findIndex(line => /^\d{4}-\d{2}-\d{2}/.test(line.trim()));

  if (dateLineIndex === -1) {
    console.log('No power data found');
    return ''; // No date line found
  }

  return lines.slice(dateLineIndex).join('\n');
}

function trimEmptyLines(text) {
  return text
    .split(/\r?\n/)               // Split into lines
    .filter(line => line.trim())  // Remove empty or whitespace-only lines
    .join('\n');                  // Rejoin into a single string
}


const { OpowerClient } = require('./node-opower.js');
(async () => {
// async function getPowerData() {
  try {
    let opowerUser = process.env.OPOWER_USERNAME;
    let opowerPassword = process.env.OPOWER_PASSWORD;

    let startDate = getDateStringFromDelta(-90);
    let endDate = getDateStringFromDelta(-60);
    const clientConfig = {
        username: opowerUser,
        password: opowerPassword
      };

    const client = new OpowerClient(clientConfig);
    // const usage = await client.getUsage('2025-05-01', '2025-05-31');
    console.log(`Fetching power data from Mercury from ${startDate} to ${endDate} with ${opowerUser} and ${opowerPassword}...`);
    const usage = await client.getUsage(startDate, endDate);
    //console.log("Here it is:" + usage);
    const usageData = trimToFirstDateLine(usage);
    // logMsg('I',`Power data:\n${usageData}`);
  // const usage = await client.getUsage('2025-05-01', '2025-05-31');
    //console.log('And we are done');
    console.log(trimEmptyLines(usageData));
  }
  catch (error) {
    // Check for Opower API error
    if (error.message && error.message.includes('Unable to obtain a JWT')) {
      console.error('❌ Could not fetch power data: The Opower service is temporarily unavailable (503 error). Please try again later.');
    } else if (error.message && error.message.includes('opower exited')) {
      // Show just the main error line for other opower errors
      const lines = error.message.split('\n');
      console.error('❌ Error fetching power data:', lines[0]);
    } else {
      // Fallback for other errors
      console.error('❌ Error fetching power data:', error);
    }
  }
}
)();
//getPowerData();


// const { OpowerClient } = require('./node-opower.js');
// (async () => {
//   const client = new OpowerClient({
//     username: 'dave.jacobsen@gmail.com',
//     password: 'ukHh#0QP%2SF3t0k'
//   });
//   const usage = await client.getUsage('2025-06-22', '2025-07-22');
//   console.log(usage);
// })();



// const { OpowerClient } = require('./node-opower.js');
// (async () => {
//   const client = new OpowerClient({
//     username: 'dave.jacobsen@gmail.com',
//     password: 'ukHh#0QP%2SF3t0k'
//   });
//   console.log("Logging in ...");
//   await client.login();
//   console.log("Retrieving data ...");
//   const usage = await client.getUsage({
//     startDate: '2025-05-01',
//     endDate: '2025-05-31',
//     interval: 'daily'
//   });
//   console.log(usage);

//   const bills = await client.getBills();
//   console.log(bills);
  
  // Download PDF for the first bill:
//   const pdfBuffer = await client.downloadBillPdf(bills[0].id);
//   require('fs').writeFileSync('bill.pdf', pdfBuffer);
// })();

