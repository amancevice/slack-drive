const { exec } = require('child_process');
const pkg = require('./package.json');
const fs = require('fs');
const gulp = require('gulp');
const file = require('gulp-file');
const zip = require('gulp-zip');

// Build event publisher
gulp.task('build-event-publisher', () => {
  let pack = require('./src/event-publisher/package.json');
  pack.version = pkg.version;
  return gulp.src('src/event-publisher/index.js')
    .pipe(file('package.json', JSON.stringify(pack, null, 2)))
    .pipe(gulp.dest('build/src/event-publisher'));
});

// Build event consumer
gulp.task('build-event-consumer', () => {
  let pack = require('./src/event-consumer/package.json');
  pack.version = pkg.version;
  return gulp.src('src/event-consumer/index.js')
    .pipe(file('package.json', JSON.stringify(pack, null, 2)))
    .pipe(gulp.dest('build/src/event-consumer'));
});

// Build slash command
gulp.task('build-slash-command', () => {
  let pack = require('./src/slash-command/package.json');
  pack.version = pkg.version;
  return gulp.src('src/slash-command/index.js')
    .pipe(file('package.json', JSON.stringify(pack, null, 2)))
    .pipe(gulp.dest('build/src/slash-command'));
});

// Build redirect
gulp.task('build-redirect', () => {
  let pack = require('./src/redirect/package.json');
  pack.version = pkg.version;
  return gulp.src('src/redirect/index.js')
    .pipe(file('package.json', JSON.stringify(pack, null, 2)))
    .pipe(gulp.dest('build/src/redirect'));
});

// Build messages.json
gulp.task('build-messages', () => {
  return gulp.src('src/messages.json')
    .pipe(gulp.dest('build/src'));
});

// Build root files
gulp.task('build-root', () => {
  return gulp.src([
      'config.example.json',
      'gulpfile.js',
      'package.json',
      'package-lock.json',
      'terraform.tf'
    ])
    .pipe(file('README', 'Deploying Slack Drive\n1. Update `config.json` with the correct API keys and options\n2. Download `client_secret.json` from the Google Cloud console and put in this directory.\n3. Optionally update `terraform.tf` with the correct values.\n4. Run `npm install` and `gulp dist` to build distribution packages.\n5. Run `terraform apply` to create the Slack Drive infrastructure.\n'))
    .pipe(gulp.dest('build'));
});

// Zip build
gulp.task('build-dist', () => {
  return gulp.src('build/**')
    .pipe(zip(`slack-drive-${pkg.version}.zip`))
    .pipe(gulp.dest('dist'));
});

// Build artifacts
gulp.task('build', gulp.series([
  'build-event-publisher',
  'build-event-consumer',
  'build-slash-command',
  'build-redirect',
  'build-messages',
  'build-root',
  'build-dist'
]));

// Verify config.json exists
gulp.task('verify-config', () => {
  return new Promise((resolve, reject) => {
    fs.access('./config.json', (err) => {
      if (err) reject(err);
      resolve();
    });
  });
});

// Verify config.json exists
gulp.task('verify-client-secret', () => {
  return new Promise((resolve, reject) => {
    fs.access('./client_secret.json', (err) => {
      if (err) reject(err);
      resolve();
    });
  });
});

// Build event publisher
gulp.task('dist-event-publisher', () => {
  let pack = require('./src/event-publisher/package.json');
  pack.version = pkg.version;
  return gulp.src([
      'src/event-publisher/index.js',
      'config.json',
      'client_secret.json'
    ])
    .pipe(file('package.json', JSON.stringify(pack, null, 2)))
    .pipe(zip(`slack-drive-event-publisher-${pkg.version}.zip`))
    .pipe(gulp.dest('dist'));
});

// Build event consumer
gulp.task('dist-event-consumer', () => {
  let pack = require('./src/event-consumer/package.json');
  pack.version = pkg.version;
  return gulp.src([
      'src/event-consumer/index.js',
      'src/messages.json',
      'config.json',
      'client_secret.json'
    ])
    .pipe(file('package.json', JSON.stringify(pack, null, 2)))
    .pipe(zip(`slack-drive-event-consumer-${pkg.version}.zip`))
    .pipe(gulp.dest('dist'));
});

// Build slash command
gulp.task('dist-slash-command', () => {
  let pack = require('./src/slash-command/package.json');
  pack.version = pkg.version;
  return gulp.src([
      'src/slash-command/index.js',
      'src/messages.json',
      'config.json'
    ])
    .pipe(file('package.json', JSON.stringify(pack, null, 2)))
    .pipe(zip(`slack-drive-slash-command-${pkg.version}.zip`))
    .pipe(gulp.dest('dist'));
});

// Build redirect
gulp.task('dist-redirect', () => {
  let pack = require('./src/redirect/package.json');
  pack.version = pkg.version;
  return gulp.src([
      'src/redirect/index.js',
      'src/messages.json',
      'config.json',
      'client_secret.json'
    ])
    .pipe(file('package.json', JSON.stringify(pack, null, 2)))
    .pipe(zip(`slack-drive-redirect-${pkg.version}.zip`))
    .pipe(gulp.dest('dist'));
});

// Build distributions
gulp.task('dist', gulp.series([
  'verify-config',
  'verify-client-secret',
  'dist-event-publisher',
  'dist-event-consumer',
  'dist-slash-command',
  'dist-redirect'
]));

// Set up links to config.json and client_secret.json
gulp.task('link', () => {
  return Promise.all([
    exec('ln config.json src/event-publisher/config.json'),
    exec('ln config.json src/event-consumer/config.json'),
    exec('ln config.json src/slash-command/config.json'),
    exec('ln config.json src/redirect/config.json'),
    exec('ln client_secret.json src/event-publisher/client_secret.json'),
    exec('ln client_secret.json src/event-consumer/client_secret.json'),
    exec('ln client_secret.json src/redirect/client_secret.json'),
    exec('ln src/messages.json src/event-consumer/messages.json'),
    exec('ln src/messages.json src/slash-command/messages.json'),
    exec('ln src/messages.json src/redirect/messages.json')
  ]);
});

// Start functions emulator
gulp.task('emulator-start', () => {
  return exec(`echo ${process.env.PROJECT_ID} | functions start`);
});

// Deploy functions on emulator
gulp.task('emulator-deploy', () => {
  return Promise.all([
    exec(`functions deploy publishEvent --source src/event-publisher --trigger-http --timeout 3s`),
    exec(`functions deploy consumeEvent --source src/event-consumer --trigger-topic=${process.env.PUBSUB_TOPIC}`),
    exec(`functions deploy slashCommand --source src/slash-command --trigger-http --timeout 3s`),
    exec(`functions deploy redirect --source src/redirect --trigger-http --timeout 10s`)
  ]);
});

// Build docker
gulp.task('emulator', gulp.series([
  'link',
  'emulator-start',
  'emulator-deploy'
]));

// Default
gulp.task('default', gulp.series(['build']));
