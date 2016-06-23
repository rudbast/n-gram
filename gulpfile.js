var gulp    = require('gulp'),
    cssnano = require('gulp-cssnano'),
    jsnano  = require('gulp-minify'),
    concat  = require('gulp-concat'),
    notify  = require('gulp-notify'),
    del     = require('del'),
    htmlmin = require('gulp-htmlmin'),
    runSeq  = require('run-sequence'),
    argv    = require('yargs').argv;

const PUBLIC_SRC_DIR  = './src/web/public',
      ASSETS_SRC_DIR  = PUBLIC_SRC_DIR + '/assets',
      BOWER_DIR       = './bower_components',
      JQUERY_DIR      = BOWER_DIR + '/jquery/dist',
      MATERIALIZE_DIR = BOWER_DIR + '/Materialize/dist',
      LODASH_DIR      = BOWER_DIR + '/lodash/dist',
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
        LODASH_DIR + '/lodash.min.js',
        MATERIALIZE_DIR + '/js/materialize.min.js'
    ];

    return gulp.src(libsSrc)
        .pipe(concat('libs.js'))
        .pipe(gulp.dest(ASSETS_SRC_DIR + '/js'));
});

// Copy fonts libraries.
gulp.task('otherlibs', function () {
    var libsSrc = [
        MATERIALIZE_DIR + '/fonts/**/*'
    ];

    return gulp.src(libsSrc)
        .pipe(gulp.dest(ASSETS_SRC_DIR + '/fonts'));
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

gulp.task('publichtml', function () {
    return gulp.src(PUBLIC_SRC_DIR + '/*.html')
        .pipe(htmlmin({collapseWhitespace: true}))
        .pipe(gulp.dest(PUBLIC_DIST_DIR));
});

gulp.task('publiccss', function () {
    return gulp.src(ASSETS_SRC_DIR + '/css/*.css')
        .pipe(cssnano())
        .pipe(gulp.dest(ASSETS_DIST_DIR + '/css'));
});

gulp.task('publicjs', function () {
    return gulp.src(ASSETS_SRC_DIR + '/js/*.js')
        .pipe(jsnano({
            ext: {
                src: '-debug.js',
                min: '.js'
            },
            noSource: true,
            exclude: ['libs.js']
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
gulp.task('default', function () {
    runSeq('cleanlibs',
           ['csslibs', 'jslibs', 'otherlibs'],
           ['copylibscss', 'copylibsjs', 'copylibsfonts'],
           'public');
});

// Custom task to replace data being used. Uses param.
// example: gulp restorecorpus --dir 1k
//          gulp restorecorpus --dir 5k
gulp.task('restorecorpus', function () {
    var dir     = argv.dir,
        dataDir = 'out/backup/' + dir + '/**/*',
        destDir = 'out';

    return gulp.src(dataDir)
        .pipe(gulp.dest(destDir));
});

// Custom task to backup current data. Uses param.
// example: gulp backupcorpus --dir 1k
//          gulp backupcorpus --dir 5k
gulp.task('backupcorpus', function () {
    var dir     = argv.dir,
        dataDir = [
            'out/ngrams/**/*',
            'out/similars.json',
            'out/trie.json'
        ],
        destDir = 'out/backup/' + dir;

    return gulp.src(dataDir, {base: './out/'})
        .pipe(gulp.dest(destDir));
});
