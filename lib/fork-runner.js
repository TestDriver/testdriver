"use strict";

var net = require("net");
var crypto = require("crypto");
var EventEmitter = require("events").EventEmitter;
var util = require("util");

function generateId(len) {
  len = len || 8;
  return crypto.randomBytes(len/2).toString("hex").slice(0, len);
}

function $forEach(arr, fn) {
  for (var i=0; i<arr.length; i++) {
    fn(arr[i]);
  }
}

function Runner() {
  if (!(this instanceof Runner)) { return new Runner(); }
  EventEmitter.call(this);
  var runner = this;

  runner.blocks = {};
  runner.queue = [];
  runner.aliases = {
    suite: ["suite", "describe"],
    test: ["test", "it"],
    before: ["before", "setup"],
    after: ["after", "teardown"],
    beforeEach: ["beforeEach"],
    afterEach: ["afterEach"],
    done: ["done"]
  };

  runner.options = {
    timeout: 3000
  };
  runner.buffer = [];
  runner.socketReady = true;

  runner.socket = net.connect(30303, function (socket) {
    // socket connected
  });

  process.nextTick(function () {
    runner.runNextBlock();
  });
}
util.inherits(Runner, EventEmitter);

Runner.prototype.counter = function (name) {
  var runner = this;
  runner.counters = runner.counters || {};
  runner.counters[name] = runner.counters[name] || 0;
  runner.counters[name]++;
};

Runner.prototype.write = function (event, data) {
  var runner = this;
  var msg = {
    event: event
  };
  msg.data = data;
  runner.buffer.push(msg);
  runner.sendData();
};

Runner.prototype.sendData = function () {
  var runner = this;
  if (runner.buffer.length === 0) {
    runner.emit("buffer:empty");
    return;
  }

  if (runner.socketReady) {
    runner.socketReady = false;
    var msg = runner.buffer.shift();
    msg = JSON.stringify(msg);
    msg += "\r\n";


    runner.socket.write(msg, function () {
      setTimeout(function () {
        runner.socketReady = true;
        runner.sendData();
      }, 10);
    });
  }
};

Runner.prototype.testChain = function (id) {
  var runner = this;
  var chain = {};

  $forEach(runner.aliases.suite, function (n) {
    chain[n] = runner.addSuite(id).bind(runner);
  });

  $forEach(runner.aliases.test, function (n) {
    chain[n] = runner.addTest(id).bind(runner);
  });

  $forEach(runner.aliases.before, function (n) {
    chain[n] = runner.addBefore(id).bind(runner);
  });

  $forEach(runner.aliases.done, function (n) {
    chain[n] = runner.addDone(id).bind(runner);
  });

  return chain;
};

Runner.prototype.addSuite = function (parent) {
  return function (name, fnct) {
    var runner = this, id = generateId();

    runner.blocks[id] = {
      id: id,
      parent: parent,
      type: "suite",
      name: name,
      before: [],
      beforeEach: [],
      after: [],
      afterEach: []
    };

    var parentBlock = runner.blocks[parent] || {};
    runner.blocks[id].depth = (parentBlock.depth || 0) + 1;
    runner.counter("suites.added");
    runner.queue.push(id);
    if (fnct) { runner.injectParameters(fnct, id); }
    return runner.testChain(id);
  };
};

Runner.prototype.addTest = function (parent) {
  return function (name, fnct) {
    var runner = this, id = generateId();

    runner.blocks[id] = {
      id: id,
      parent: parent,
      type: "test",
      name: name,
      fnct: fnct
    };

    var parentBlock = runner.blocks[parent] || {};
    runner.blocks[id].depth = (parentBlock.depth || 0) + 1;
    runner.counter("tests.added");
    runner.queue.push(id);
    return runner.testChain(id);
  };
};

Runner.prototype.addDone = function (testId) {
  return function (name, fnct) {
    var runner = this;
    runner.counter("tests.completed");
    runner.emit(testId);
    runner.runNextBlock();
  };
};

Runner.prototype.addBefore = function (parent) {
  return function (name, fnct) {
    var runner = this, id = generateId();

    runner.blocks[id] = {
      id: id,
      parent: parent,
      type: "before",
      name: name,
      fnct: fnct
    };

    runner.blocks[parent].before.push(id);
    runner.queue.push(id);
  };
};

Runner.prototype.runNextBlock = function () {
  var runner = this;
  var testId = runner.queue.shift();
  if (!testId) { return runner.testsComplete(); }
  var test = runner.blocks[testId];
  if (!test) { return runner.testsComplete(); }

  var parent = runner.blocks[test.parent] || {};
  runner.write("block", test);

  if (test.type === "test") {
    var timeout = setTimeout(function () {
      throw new Error("Timeout reached");
    }, runner.options.timeout);
    runner.once(testId, function () {
      clearTimeout(timeout);
    });
    runner.injectParameters(test.fnct, testId);
  } else {
    runner.counter(test.type + ".complete");
    runner.runNextBlock();
  }
};

Runner.prototype.testsComplete = function () {
  var runner = this;
  runner.sendData();
  runner.once("buffer:empty", function () {
    process.exit();
  });
};

// Source: http://stackoverflow.com/questions/15270311/angularjs-how-does-the-di-system-know-of-the-name-of-the-arguments
// Example: http://jsfiddle.net/arunpjohny/p6qQT/1/

var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
var FN_ARG_SPLIT = /,/;
var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

Runner.prototype.injectParameters = function (fn, parent) {
  var runner = this;
  parent = parent || "root";
  var chain = runner.testChain(parent);

  var fnText = fn.toString().replace(STRIP_COMMENTS, "");
  var argDecl = fnText.match(FN_ARGS);
  var args = argDecl[1].split(FN_ARG_SPLIT);
  var params = [];

  for (var i=0; i<args.length; i++) {
    var arg = args[i].trim();
    if (!chain[arg]) {
      console.log("[!] Invalid parameter name");
      process.exit(0);
    }
    params.push(chain[arg]);
  }
  fn.apply(null, params);

};

process.on("uncaughtException", function (exception) {
  if (exception.name === "AssertionError!") {
    console.log("caught an assertion error");
  } else {
    throw exception;
  }
});

module.exports = function (fnct) {
  var runner = new Runner();
  runner.injectParameters(fnct);
  return runner;
};
