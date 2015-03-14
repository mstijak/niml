// include gulp
var gulp = require('gulp'),
    niml = require('./gulp-niml'),
    rename = require('gulp-rename'),
    watch = require('gulp-watch'),
    livereload = require('gulp-livereload'),
    lazypipe = require('lazypipe'),
    wrap = require('gulp-wrap'),
    prettify = require('gulp-html-prettify'),
    browserify = require('gulp-browserify');

var processHtml = lazypipe()
    .pipe(niml)
    .pipe(wrap, { src: '_layout.html' })
    .pipe(prettify, {indent_char: ' ', indent_size: 2})
    .pipe(rename, { extname: '.html' });

// JS hint task
gulp.task('niml', function() {
    gulp.src('./**/*.niml')
        .pipe(processHtml())
        .pipe(gulp.dest('.'))
        .pipe(livereload());

    gulp.src('./**/*.niml')
        .pipe(niml('json'))
        .pipe(rename({ extname: '.json' }))
        .pipe(gulp.dest('.'));
});

// JS hint task
gulp.task('watch', function() {
    livereload.listen();

    gulp.watch('_layout.html', ['niml']);

    watch('./**/*.niml')
        .pipe(processHtml())
        .pipe(gulp.dest('.'))
        .pipe(livereload());

    watch('./**/*.niml')
        .pipe(niml('json'))
        .pipe(rename({ extname: '.json' }))
        .pipe(gulp.dest('.'));
});

gulp.task('scripts', function() {
    // Single entry point to browserify
    gulp.src('js/try.js')
        .pipe(browserify({
          standalone: 'NIML'
          //debug : !gulp.env.prguloduction
        }))
        .pipe(gulp.dest('./dist/'))
});

