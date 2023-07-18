const { dest, src, watch } = require('gulp');
const path = require('path');
const concat = require('gulp-concat');
const htmlmin = require('gulp-htmlmin');
const gulpTransform = require('gulp-transform');

const SRC_DIR_STATES = 'front/states';
const SRC_DIR_FRONT_CLASSES = 'front/classes';
const DEST_DIRS = ['landing/assets/js', 'cabinet/assets/js'];

// Function to create the template file content
function createTemplateFile(content, file) {
  const fileName = path.basename(file.path, path.extname(file.path));
  return templateContent = `<script id="tmpl_${fileName}" type="text/html">${content}</script>\n`;
}

// Concatenate all the JavaScript files in the states directory
function concatStates() {
  return src(`${SRC_DIR_STATES}/**/*.js`)
    .pipe(concat("allStates.js"))
    .pipe(dest(DEST_DIRS[0]))
    .pipe(dest(DEST_DIRS[1]));
}

// Concatenate all the HTML files in the states directory
function concatJSR() {
  return src(`${SRC_DIR_STATES}/**/*.html`)
    .pipe(gulpTransform('utf8', createTemplateFile))
    .pipe(concat('allTemplates.html'))
    .pipe(dest(DEST_DIRS[0]))
    .pipe(dest(DEST_DIRS[1]))
    ;
}

// Concatenate all the JavaScript files in the front classes directory
function concatFrontClasses() {
  return src(`${SRC_DIR_FRONT_CLASSES}/**/*.js`)
    .pipe(concat("frontClasses.js"))
    .pipe(dest(DEST_DIRS[0]))
    .pipe(dest(DEST_DIRS[1]));
}

// Watch for changes in the JavaScript and HTML files and call the corresponding functions
exports.default = function () {
  watch(`${SRC_DIR_STATES}/**/*.js`, { ignoreInitial: false }, concatStates);
  watch(`${SRC_DIR_STATES}/**/*.html`, { ignoreInitial: false }, concatJSR);
  watch(`${SRC_DIR_FRONT_CLASSES}/**/*.js`, { ignoreInitial: false }, concatFrontClasses);
};
