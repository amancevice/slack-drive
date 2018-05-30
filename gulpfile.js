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

// Build event publisher
gulp.task('build-event-publisher', () => {
  let pack = require('./src/event-publisher/package.json');
  pack.version = pkg.version;
  return gulp.src([
      'src/event-publisher/index.js',
      'config.json',
      'client_secret.json'
    ])
    .pipe(file('package.json', JSON.stringify(pack, null, 2)))
    .pipe(gulp.dest('build/event-publisher'));
});

// Build event consumer
gulp.task('build-event-consumer', () => {
  let pack = require('./src/event-consumer/package.json');
  pack.version = pkg.version;
  return gulp.src([
      'src/event-consumer/index.js',
      'src/messages.json',
      'config.json',
      'client_secret.json'
    ])
    .pipe(file('package.json', JSON.stringify(pack, null, 2)))
    .pipe(gulp.dest('build/event-consumer'));
});

// Build slash command
gulp.task('build-slash-command', () => {
  let pack = require('./src/slash-command/package.json');
  pack.version = pkg.version;
  return gulp.src([
      'src/slash-command/index.js',
      'src/messages.json',
      'config.json'
    ])
    .pipe(file('package.json', JSON.stringify(pack, null, 2)))
    .pipe(gulp.dest('build/slash-command'));
});

// Build redirect
gulp.task('build-redirect', () => {
  let pack = require('./src/redirect/package.json');
  pack.version = pkg.version;
  return gulp.src([
      'src/redirect/index.js',
      'src/messages.json',
      'config.json',
      'client_secret.json'
    ])
    .pipe(file('package.json', JSON.stringify(pack, null, 2)))
    .pipe(gulp.dest('build/redirect'));
});

// Build artifacts
gulp.task('build', gulp.series([
  'verify-config',
  'verify-client-secret',
  'build-event-publisher',
  'build-event-consumer',
  'build-slash-command',
  'build-redirect'
]));

// Build distribution for event publisher
gulp.task('dist-event-publisher', () => {
  return gulp.src('build/event-publisher/*')
    .pipe(zip(`slack-drive-event-publisher-${pkg.version}.zip`))
    .pipe(gulp.dest('dist'));

});

// Build distribution for event consumer
gulp.task('dist-event-consumer', () => {
  return gulp.src('build/event-consumer/*')
    .pipe(zip(`slack-drive-event-consumer-${pkg.version}.zip`))
    .pipe(gulp.dest('dist'));
});

// Build distribution for slash command
gulp.task('dist-slash-command', () => {
  return gulp.src('build/slash-command/*')
    .pipe(zip(`slack-drive-slash-command-${pkg.version}.zip`))
    .pipe(gulp.dest('dist'));
});

// Build distribution for redirect
gulp.task('dist-redirect', () => {
  return gulp.src('build/redirect/*')
    .pipe(zip(`slack-drive-redirect-${pkg.version}.zip`))
    .pipe(gulp.dest('dist'));
});

// Build distributions
gulp.task('dist', gulp.series([
  'build',
  'dist-event-publisher',
  'dist-event-consumer',
  'dist-slash-command',
  'dist-redirect'
]));

// Default
gulp.task('default', gulp.series(['dist']));
