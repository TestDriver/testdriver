"use strict";

var q = require("q");

function check(input) {
	if (input) {
		console.log("check passed");
	} else {
		throw new Error("error");
	}
}

function doAsync(fnct) {
	return function () {
		var dfd = q.defer();
		fnct(dfd.resolve);
		return dfd.promise;
	};
}

function doSync(fnct) {
	return function () {
		fnct();
	};
}

function onError(err) {
	console.log(err);
}

function TestDriveRunner(testFile) {
	if (!(this instanceof TestDriveRunner)) {return new TestDriveRunner(testFile); }

	this.suiteApply = [this.suite, this.test];

	this._suiteName;
	this._testName;
	this._queue = [];
}

TestDriveRunner.prototype.suite = function (name, fnct) {
	this._suiteName = name;
	fnct.call(this, this.test.bind(this));
};

TestDriveRunner.prototype.test = function (name, fnct) {
	this._testName = name;
	this._queue.push({
		suite: this._suiteName,
		test: this._testName,
		fnct: fnct
	});
};



TestDriveRunner.prototype.start = function () {
	var queue;

	queue = q();

	this._queue.forEach(function (fnct) {
		if (fnct.fnct.length === 1) {
			queue = queue.then(doAsync(fnct.fnct), onError);
		} else {
			queue = queue.then(doSync(fnct.fnct), onError);
		}
	});

	queue.done();
	return queue;

};



module.exports = TestDriveRunner;