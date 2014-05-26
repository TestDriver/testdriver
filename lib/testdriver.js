"use strict";

var fs = require("fs");
var path = require("path");
var glob = require("glob");
var callsite = require("callsite");
var chalk = require("chalk");
var fork = require("child_process").fork;
var net = require("net");

function TestDriver() {
  if (!(this instanceof TestDriver)) { return new TestDriver(); }
  var driver = this;
  driver.files = [];
  driver.clients = [];
  driver.forks = {};


  driver.server = net.createServer({allowHalfOpen: true}, function (socket) {
    socket.name = socket.remoteAddress + ":" + socket.remotePort;
    socket.setEncoding("utf8");
    driver.clients.push(socket);
    socket.on("data", function (json) {
      var msg = JSON.parse(json.trim());
      var log = "";
      if (msg.event === "block") {
        log += new Array(msg.data.depth).join("  ");
        log += chalk.cyan(msg.data.name);
        if (msg.data.type === "test") {
          log += chalk.green(" \u2714 Passed");
        }
        console.log(log);
      }
    });
  }).listen(30303);
}

TestDriver.prototype.log = function (msg) {
  var log = chalk.gray("[TestDriver] ");
  log += chalk.gray(msg);
  console.log(log);
};

TestDriver.prototype.loadTests = function (pattern) {
  var driver = this;
  var callDir = path.dirname(callsite()[1].getFileName());
  pattern = path.resolve(callDir, pattern);
  var files = glob.sync(pattern);
  this.files = this.files.concat(files);
};

TestDriver.prototype.runTest = function () {
  var driver = this;

  var testFile = driver.files.shift();

  if (!testFile) {
    console.log("");
    driver.log("All tests complete");
    process.exit();
  }

  var child = fork(__dirname + "/fork-process.js", [testFile]);
  driver.forks[child.pid] = child;
  driver.forks[child.pid].file = testFile;

  console.log("");
  driver.log("Running " + testFile.replace(process.cwd(), ""));
  console.log("");

  child.on("exit", function () {
    driver.runTest.call(driver);
  });
};

TestDriver.prototype.run = function () {
  var driver = this;
  driver.runTest();
};



module.exports = TestDriver;
