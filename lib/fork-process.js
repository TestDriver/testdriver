"use strict";

var testdriver = require("./fork-runner.js");

var file = process.argv[2];

if (file) {
  testdriver(require(file));
}
