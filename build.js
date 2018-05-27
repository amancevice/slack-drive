const child_process = require('child_process');
const packages = ['event-consumer', 'event-publisher', 'redirect', 'slash-command'];

child_process.execSync(`mkdir -p ./dist`);
packages.map((dir) => {
  let pkg = require(`./src/${dir}/package.json`);
  child_process.execSync(`cd ./src/${dir} && zip ../../dist/${pkg.name}-${pkg.version}.zip ./*`);
});
