const { spawn } = require('child_process');
const path = require('path');

const rrdtoolPath = 'C:\\Users\\littlepunk\\Documents\\autohome\\rrdtool\\rrdtool.exe';

/**
 * Generate multiple rrdtool graphs with shared styling.
 * @param {Array<Object>} graphs - An array of graph config objects.
 */
function graphRRD(graphs) {
  graphs.forEach(({ output, title, start, end, defs = [], lines = [] }) => {
    const args = [
      'graph', path.resolve(output),
      '--start', start,
      '--end', end,
      '--title', title,
      '--width', '490',
      '--height', '310',

      // Fonts
      // '--font', 'TITLE:14:Arial',
      // '--font', 'AXIS:10:Courier',
      // '--font', 'LEGEND:12:Verdana',
      // '--font', 'DEFAULT:10:Tahoma',
      '--font', `DEFAULT:8:'C:\\Windows\\Fonts\\Arial.ttf'`,
      // Colors
      '--color', 'BACK#152934',
      '--color', 'CANVAS#152934',
      '--color', 'FONT#E1F4F4',
      '--color', 'SHADEA#6596C4',
      '--color', 'SHADEB#6596C4',
      '--color', 'ARROW#152934',

      // DEFs and graph lines
      ...defs,
      ...lines
    ];

    const child = spawn(rrdtoolPath, args);

    child.stdout.on('data', data => {
      console.log(`[${output}] stdout: ${data}`);
    });

    child.stderr.on('data', data => {
      console.error(`[${output}] stderr: ${data}`);
    });

    child.on('close', code => {
      if (code === 0) {
        console.log(`✅ Graph generated: ${output}`);
      } else {
        console.error(`❌ rrdtool graph failed for ${output} (code ${code})`);
      }
    });
  });
}

module.exports = graphRRD;
