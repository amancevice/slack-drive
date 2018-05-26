const child_process = require('child_process');
const packages = ['event-consumer', 'event-publisher', 'redirect', 'slash-command'];

child_process.execSync(`mkdir -p ./dist`);
packages.map((pkg) => {
  let cfg = require(`./src/${pkg}/package.json`),
      files = `client_secret.json config.json index.js messages.json package.json`;
  child_process.execSync(`cp client_secret.json config.json ./src/${pkg}/ && cd ./src/${pkg} && zip ../../dist/${cfg.name}-${cfg.version}.zip ${files}`);
});
