var gulp    = require('gulp'),
    cssnano = require('gulp-cssnano'),
    jsnano  = require('gulp-minify'),
    concat  = require('gulp-concat'),
    notify  = require('gulp-notify'),
    del     = require('del');

const ASSETS_DIR      = './src/web/public/assets';
      BOOTSTRAP_DIR   = './bower_components/bootstrap-css',
      JQUERY_DIR      = './bower_components/jquery/dist'
      MATERIALIZE_DIR = './bower_components/Materialize/dist';

gulp.task('cleanlibs', function () {
    return del([
        ASSETS_DIR + '/css/libs.js',
        ASSETS_DIR + '/js/libs.js',
        ASSETS_DIR + '/font',
        ASSETS_DIR + '/fonts'
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
               .pipe(gulp.dest(ASSETS_DIR + '/css/'))
               .pipe(notify('csslibs task complete'));
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
               .pipe(gulp.dest(ASSETS_DIR + '/js/'))
               .pipe(notify('jslibs task complete'));
});

gulp.task('otherlibs', function () {
    var libsSrc = [
        // BOOTSTRAP_DIR + '/fonts/*',
        MATERIALIZE_DIR + '/fonts/**/*'
    ];

    var extraLibsSrc = [
        MATERIALIZE_DIR + '/font/**/*'
    ];

   gulp.src(extraLibsSrc)
       .pipe(gulp.dest(ASSETS_DIR + '/font/'));

    return gulp.src(libsSrc)
               .pipe(gulp.dest(ASSETS_DIR + '/fonts/'))
               .pipe(notify('otherlibs task complete'));
});

gulp.task('libs', ['cleanlibs'], function () {
    gulp.start('csslibs', 'jslibs', 'otherlibs');
});
