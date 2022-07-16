/**
 * Author      : Sarthak Tickoo
 * Date        : June 2022
 * Description : Gulp build, packaging and testing script for relay server and components
 */

// use 'strict'
// jshint esversion: 6

const { series, parallel } = require("gulp");
const fancyLog = require("fancy-log");
const fs = require("fs");

const buildDir = "./dist";

function clean(cb) {
    fancyLog.log(`Checking if '${buildDir}' exists`);
    if (fs.existsSync(buildDir)) {
        // remove the build directory
        fs.rm(buildDir, { recursive: true, force: true });
        fancyLog.log(`Removed: ${buildDir}`);
    } else fancyLog.log(`Directory does not exist: ${buildDir}. Moving on..`);

    if (cb) cb();
}

function doBuild(cb) {
    fancyLog.log("Doing some build..");
    if (cb) cb();
}

exports.build = series(clean, doBuild);
exports.default = exports.build;
