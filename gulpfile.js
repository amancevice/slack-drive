const gulp = require('gulp');
const zip = require('gulp-zip');
const packages = ['event-consumer', 'event-publisher', 'redirect', 'slash-command'];

// Init
gulp.task('init', () => {
  return gulp.src('examples/*')
    .pipe(gulp.dest('.'));
});

// Deploy
gulp.task('dist', () => {
  return Promise.all(packages.map((dir) => {
    let pkg = require(`./src/${dir}/package.json`);
    return gulp.src([`src/${dir}/*`, 'config.json', 'client_secret.json'])
      .pipe(zip(`slack-drive-${dir}-${pkg.version}.zip`))
      .pipe(gulp.dest('dist'));
  }));
});

// Build archives
gulp.task('build', () => {
  return Promise.all(packages.map((dir) => {
    let pkg = require(`./src/${dir}/package.json`);
    return gulp.src(`src/${dir}/*`)
      .pipe(zip(`slack-drive-${dir}-${pkg.version}.zip`))
      .pipe(gulp.dest('build'));
  }));
});

// Default
gulp.task('default', gulp.series(['init', 'build']));
