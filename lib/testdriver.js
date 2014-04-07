"use strict";

var fs = require("fs");
var path = require("path");
var glob = require("glob");
var vm = require("vm");

var Runner = require("./runner");

function TestDrive() {
	if (!(this instanceof TestDrive)) { return new TestDrive(); }

	this.config = {};
	this.files = [];
	this.running = false;
	this.reloadDelay = 1000;
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

	} catch (err) {
		console.error(err);
		throw err;
	}
};

TestDrive.prototype.locateTests = function () {
	var filePath, matches, watcher, reloading;

	reloading = false;

	if (this.config.files) {
		this.config.files.forEach(function (pattern) {
			filePath = path.resolve(this.cwd, pattern);
			matches = glob.sync(filePath, {});
			this.files = this.files.concat(matches);
		}.bind(this));

		this.files.forEach(function (file) {
			fs.watch(file, function (event, filename) {

				if (!this.running) {
					this.running = true;
					this.runTests();
					setTimeout(function () {
						this.running = false;
					}.bind(this), this.reloadDelay);
				}

			}.bind(this));
		}.bind(this));

		this.runTests();
	}
};

TestDrive.prototype.runTests = function () {
	var currentTest, runner, testName, testModule;

	runner = new Runner();
	this.files.forEach(function (test) {
		vm.runInNewContext("require(test)(runner.suite.bind(runner), runner.test.bind(runner), runner)", {
			require: require,
			test: test,
			runner: runner
		});
	});

	this.files.forEach(function (test) {
		delete require.cache[test];
		console.log(require.cache[test]);
	});


	runner.start();
};

module.exports = TestDrive;