const { src, dest, watch } = require('gulp');
const concat = require("gulp-concat");

function concatStates() {
  // body omitted
  return src('front/states/**/*.js')
  .pipe(concat("allStates.js"))
  .pipe(dest("landing/assets/js/"))
  .pipe(dest("cabinet/assets/js/"));
}

function concatJSR() {
  // body omitted
  return src('front/states/**/*.html')
    .pipe(concat("allTemplates.html"))
    .pipe(dest("landing/assets/js/"))
    .pipe(dest("cabinet/assets/js/"));
}

function concatFrontClasses() {
  // body omitted
  return src('front/classes/**/*.js')
    .pipe(concat("frontClasses.js"))
    .pipe(dest("landing/assets/js/"))
    .pipe(dest("cabinet/assets/js/"));
}

exports.default = function () {
  watch('front/states/**/*.js', { ignoreInitial: false }, concatStates);
  watch('front/states/**/*.html', { ignoreInitial: false }, concatJSR);
  watch('front/classes/**/*.js', { ignoreInitial: false }, concatFrontClasses);
};