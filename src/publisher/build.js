const pkg = require('./package.json');
const execSync = require('child_process').execSync;
execSync(`zip ../../dist/${pkg.name}-${pkg.version}.zip client_secret.json config.json index.js package.json`);
