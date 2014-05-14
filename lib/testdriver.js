"use strict";

var argv = require("yargs").argv;
var fs = require("fs");
var path = require("path");
var glob = require("glob");
var vm = require("vm");

var Runner = require("./runner");

function TestDriver() {
	if (!(this instanceof TestDriver)) { return new TestDriver(); }

	this.state = {
		running: false
	};
	this.config = {
		reloadDelay: 1000,
		files: [],
		cwd: path.dirname(process.argv[1])
	};

	this.files = [];
	this.testFiles = [];
}

TestDriver.prototype.cli = function () {
	this.state.cli = true;
	this.loadConfig(path.resolve(process.cwd(), process.argv[2]));
};

TestDriver.prototype.setup = function (config) {
	for (var k in config) {
		if (k in this.config) {
			this.config[k] = config[k];
		}
	}

	this.loadTests();
};

TestDriver.prototype.loadTests = function () {
	var matches = [];
	this.config.files.forEach(function (pattern) {
		matches = matches.concat(glob.sync(path.resolve(this.config.cwd, pattern), {}));
	}.bind(this));

	matches.forEach(this.loadNewTest.bind(this));

	this.run();

};

TestDriver.prototype.loadNewTest = function (file) {
	if (this.testFiles.indexOf(file) === -1) {
		this.testFiles.push(file);
		fs.watch(file, function (event, filename) {
			this.run();
		}.bind(this));
	}
};

TestDriver.prototype.run = function () {
	var runner;

	if (!this.state.running) {
		this.state.running = true;

		runner = new Runner();

		this.testFiles.forEach(function (test) {
			vm.runInNewContext("require(test)(runner.suite.bind(runner), runner.test.bind(runner), runner)", {
				require: require,
				test: test,
				runner: runner
			});
		});

		runner.start();

		this.testFiles.forEach(function (test) {
			delete require.cache[test];
		});

		setTimeout(function () {
			this.state.running = false;
		}.bind(this), this.config.reloadDelay);
	}
};

TestDriver.prototype.loadConfig = function (configFile) {
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



module.exports = TestDriver;