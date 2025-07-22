const Service = require('node-windows').Service;

const svc = new Service({
  name: 'AutoHome',
  description: 'Running AutoHome node.js as a background service',
  script: 'C:\\Users\\littlepunk\\Documents\\autohome\\autohome.js',
  nodeOptions: ['--harmony', '--max_old_space_size=4096'],
  env: [{
    name: 'NODE_ENV',
    value: 'production'
  }],
  wait: 30,           // Initial restart delay (seconds)
  grow: 0.9,         // Increase delay by 50% each time
  maxRetries: 5,     // Max restart attempts
  execPath: 'C:\\Program Files\\nodejs\\node.exe'
});

svc.on('install', () => {
  console.log('Service installed');
  svc.start();
});

svc.install();