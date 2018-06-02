const { exec } = require('child_process');
const pkg = require('./package.json');
const fs = require('fs');
const gulp = require('gulp');
const file = require('gulp-file');
const zip = require('gulp-zip');

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

// Set up links to config.json and client_secret.json
gulp.task('link', () => {
  return Promise.all([
    gulp.series(['verify-config', 'verify-client-secret']),
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

// Build artifacts
gulp.task('build', () => {
  return gulp.src(['src/terraform.tf', 'src/README'])
    .pipe(file('VERSION', pkg.version))
    .pipe(gulp.dest('build/slack-drive'));
});

// Dist artifact
gulp.task('dist', () => {
  return gulp.src('build/**')
    .pipe(zip(`slack-drive-${pkg.version}.zip`))
    .pipe(gulp.dest('dist'));
});

// Travis deploy check
gulp.task('travis', () => {
  return new Promise((resolve, reject) => {
    if (process.env.TRAVIS_TAG !== pkg.version) {
      reject(new Error('$TRAVIS_TAG and package.json do not match'));
    }
    resolve();
  });
});

// Default
gulp.task('default', gulp.series(['build', 'dist']));
