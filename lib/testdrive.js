"use strict";

var path = require("path");
var glob = require("glob");

var Runner = require("./runner");

function TestDrive() {
	if (!(this instanceof TestDrive)) { return new TestDrive(); }

	this.config = {};
	this.files = [];
}

TestDrive.prototype.cli = function () {
	this.loadConfig(path.resolve(process.cwd(), process.argv[2]));
};

TestDrive.prototype.loadConfig = function (configFile) {
	try {
		this.config = require(configFile);
		this.configFile = configFile;
		this.cwd = path.dirname(configFile);
		this.locateTests();
		this.runTests();
	} catch (err) {
		console.error(err);
	}
};

TestDrive.prototype.locateTests = function () {
	var filePath, matches;

	if (this.config.files) {
		this.config.files.forEach(function (pattern) {
			filePath = path.resolve(this.cwd, pattern);
			matches = glob.sync(filePath, {});
			this.files = this.files.concat(matches);
		}.bind(this));
	}
};

TestDrive.prototype.runTests = function () {
	var currentTest, runner;

	currentTest = require(this.files.pop());
	runner = new Runner();
	currentTest.call(null, runner.suite.bind(runner), runner.test.bind(runner), runner);
	runner.start();
};

var server = require("karma").server;

server.start({port: 9876, files: ["./test/browser/*"]}, function (exitCode) {
	console.log(exitCode);
	process.exit(exitCode);
});

module.exports = TestDrive;