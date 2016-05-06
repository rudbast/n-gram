var gulp    = require('gulp'),
    cssnano = require('gulp-cssnano'),
    jsnano  = require('gulp-minify'),
    concat  = require('gulp-concat'),
    notify  = require('gulp-notify'),
    del     = require('del')
    htmlmin = require('gulp-htmlmin')
    runSeq  = require('run-sequence');

const PUBLIC_SRC_DIR  = './src/web/public',
      ASSETS_SRC_DIR  = PUBLIC_SRC_DIR + '/assets',
      BOWER_DIR       = './bower_components',
      BOOTSTRAP_DIR   = BOWER_DIR + '/bootstrap-css',
      JQUERY_DIR      = BOWER_DIR + '/jquery/dist',
      MATERIALIZE_DIR = BOWER_DIR + '/Materialize/dist',
      PUBLIC_DIST_DIR = './public',
      ASSETS_DIST_DIR = PUBLIC_DIST_DIR + '/assets';

// Clean previous build.
gulp.task('cleanlibs', function () {
    return del([
        ASSETS_SRC_DIR + '/css/libs.js',
        ASSETS_SRC_DIR + '/js/libs.js',
        ASSETS_SRC_DIR + '/fonts'
    ]);
});

// Concat all css libraries.
gulp.task('csslibs', function () {
    var libsSrc = [
        // BOOTSTRAP_DIR + '/css/bootstrap.min.css',
        // BOOTSTRAP_DIR + '/css/bootstrap-theme.min.css',
        MATERIALIZE_DIR + '/css/materialize.min.css'
    ];

    return gulp.src(libsSrc)
        .pipe(concat('libs.css'))
        .pipe(gulp.dest(ASSETS_SRC_DIR + '/css'));
});

// Concat all js libraries.
gulp.task('jslibs', function () {
    var libsSrc = [
        JQUERY_DIR + '/jquery.min.js',
        // BOOTSTRAP_DIR + '/js/bootstrap.min.js'
        MATERIALIZE_DIR + '/js/materialize.min.js'
    ];

    return gulp.src(libsSrc)
        .pipe(concat('libs.js'))
        .pipe(gulp.dest(ASSETS_SRC_DIR + '/js'));
});

// Copy fonts libraries.
gulp.task('otherlibs', function () {
    var libsSrc = [
        // BOOTSTRAP_DIR + '/fonts/*',
        MATERIALIZE_DIR + '/fonts/**/*'
    ];

    return gulp.src(libsSrc)
        .pipe(gulp.dest(ASSETS_SRC_DIR + '/fonts'));
});

gulp.task('copylibscss', function () {
    return gulp.src(ASSETS_SRC_DIR + '/css/libs.css')
        .pipe(gulp.dest(ASSETS_DIST_DIR + '/css'));
});

gulp.task('copylibscss', function () {
    return gulp.src(ASSETS_SRC_DIR + '/css/libs.css')
        .pipe(gulp.dest(ASSETS_DIST_DIR + '/css'));
});

gulp.task('copylibsjs', function () {
    return gulp.src(ASSETS_SRC_DIR + '/js/libs.js')
        .pipe(gulp.dest(ASSETS_DIST_DIR + '/js'));
});

gulp.task('copylibsfonts', function () {
    return gulp.src(ASSETS_SRC_DIR + '/fonts/**/*')
        .pipe(gulp.dest(ASSETS_DIST_DIR + '/fonts'));
});

// Combined libraries tasks.
gulp.task('libs', function () {
    runSeq('cleanlibs',
           ['csslibs', 'jslibs', 'otherlibs'],
           ['copylibscss', 'copylibsjs', 'copylibsfonts']);
});

gulp.task('publichtml', function () {
    return gulp.src(PUBLIC_SRC_DIR + '/index.html')
        .pipe(htmlmin({collapseWhitespace: true}))
        .pipe(gulp.dest(PUBLIC_DIST_DIR));
});

gulp.task('publiccss', function () {
    return gulp.src(ASSETS_SRC_DIR + '/css/main.css')
        .pipe(cssnano())
        .pipe(gulp.dest(ASSETS_DIST_DIR + '/css'));
});

gulp.task('publicjs', function () {
    return gulp.src(ASSETS_SRC_DIR + '/js/main.js')
        .pipe(jsnano({
            ext: {
                src: '-debug.js',
                min: '.js'
            }
        }))
        .pipe(gulp.dest(ASSETS_DIST_DIR + '/js'));
});

gulp.task('publicimg', function () {
    return gulp.src(ASSETS_SRC_DIR + '/img/**/*')
        .pipe(gulp.dest(ASSETS_DIST_DIR + '/img'));
});

gulp.task('publicfavicon', function () {
    return gulp.src(ASSETS_SRC_DIR + '/favicon.ico')
        .pipe(gulp.dest(ASSETS_DIST_DIR));
});

// Minify and move main public files to outer public.
gulp.task('public', [
    'publichtml',
    'publiccss',
    'publicjs',
    'publicimg',
    'publicfavicon'
]);

// Default task.
gulp.task('default', ['libs', 'public']);
