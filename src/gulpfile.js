const fs = require("fs");
const gulp = require('gulp');
const uglify = require('gulp-uglify');
const browserify = require("browserify");
const babelify = require('babelify');

const env = process.env.NODE_ENV || 'development';

gulp.task('default', () => {

    browserify("./dan.js")
        .transform("babelify", { presets: ["es2015"] })
        .bundle()
        .pipe(fs.createWriteStream("../dan.js"));

});


/*
*	Error handler
*/
function errorLog(error) {
    console.log(error);
    console.error.bind(error);
    this.emit('end');
}
