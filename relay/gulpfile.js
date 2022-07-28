/**
 * Author      : Sarthak Tickoo
 * Date        : June 2022
 * Description : Gulp build, packaging and testing script for relay server and components
 */

// use 'strict'
// jshint esversion: 6

const fancyLog = require("fancy-log");
const { series } = require("gulp");
const fs = require("fs");

let buildDir = "./dist";

function _cb(cb) {
    if (cb) cb();
}

function setupProject(cb) {
    _cb(cb);
}

function clean(cb) {
    fancyLog.log(`Checking if '${buildDir}' exists`);
    if (fs.existsSync(buildDir)) {
        // remove the build directory
        fs.rm(buildDir, { recursive: true, force: true });
        fancyLog.log(`Removed: ${buildDir}`);
    } else fancyLog.log(`Directory does not exist: ${buildDir}. Moving on..`);
}

function doBuild(cb) {
    fancyLog.log("Doing some build..");
    if (cb) cb();
}

exports.build = series(clean, doBuild);
exports.default = exports.build;
