/*
 * node-opower: A Node.js wrapper around tronikos/opower Python client
 *
 * This module delegates authentication and data retrieval to the existing
 * Python `opower` package, avoiding the complexity of reimplementing
 * OAuth2 PKCE flows in JavaScript.
 *
 * Prerequisites:
 *   - Install Python 3.10+
 *   - pip install opower
 *
 * Usage:
 *   const { OpowerClient } = require('node-opower');
 *   const client = new OpowerClient({ username, password, utility: 'mercury' });
 *   await client.getUsage('2025-01-01', '2025-07-16').then(console.log);
 */

const { spawn } = require('child_process');

class OpowerClient {
  /**
   * @param {{ username: string, password: string, utility?: string }} options
   */
  constructor({ username, password, utility }) {
    this.username = username;
    this.password = password;
    this.utility = utility || 'mercury';
  }

  /**
   * Internal: spawn a Python opower command and capture JSON output
   * @param {string[]} args
   * @returns {Promise<any>}
   */
  _runPython(args) {
    return new Promise((resolve, reject) => {
      // insert --utility flag before the utility name
      // const pyArgs = ['-m', 'opower', '--utility', this.utility, ...args];
      const pyArgs = ['-m', 'opower', '--utility', this.utility, '--username', this.username, '--password', this.password, ...args];
      console.log(`Command line is: python ${pyArgs}`);
      const py = spawn('python', pyArgs);
      let output = '';
      let error = '';
      py.stdout.on('data', (data) => { output += data; });
      py.stderr.on('data', (data) => { error += data; });
      py.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`opower exited ${code}: ${error.trim()}`));
        }
        resolve(output);
      });
    });
  }

  /**
   * Retrieves usage data between two dates.
   * @param {string} startDate in YYYY-MM-DD
   * @param {string} endDate in YYYY-MM-DD
   */
  async getUsage(startDate, endDate) {
    return this._runPython(['--start_date', startDate, '--end_date', endDate]);
  }

  /**
   * Retrieves list of bills
   */
  async getBills() {
    return this._runPython(['--show-bills']);
  }

  /**
   * Downloads a specific bill PDF by ID
   * @param {string} billId
   * @returns {Promise<Buffer>}
   */
  async downloadBillPdf(billId) {
    // The Python CLI does not output binary, so we call Python module directly
    return new Promise((resolve, reject) => {
      const py = spawn('python', ['-c', `import sys,opower; data=opower.utilities.mercury.Mercury().download_bill('${billId}'); sys.stdout.buffer.write(data)`]);
      const chunks = [];
      py.stdout.on('data', (chunk) => chunks.push(chunk));
      py.stderr.on('data', (data) => console.error(data.toString()));
      py.on('close', (code) => {
        if (code !== 0) return reject(new Error(`PDF download failed code ${code}`));
        resolve(Buffer.concat(chunks));
      });
    });
  }
}

module.exports = { OpowerClient };
