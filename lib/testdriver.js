"use strict";

var path = require("path");
var fork = require("child_process").fork;
var http = require("http");
var net = require("net");
var fs = require("fs");

var Runner = require("./runner.js");

var isParent = (path.basename(process.argv[1]) !== "fork-process.js");
var isChild = (path.basename(process.argv[1]) === "fork-process.js");

function TestDriver() {
  if (!(this instanceof TestDriver)) { return new TestDriver(); }

  if (isParent) {
    var file = process.argv[1];
    //var server = http.createServer().listen(8000);
    var child = fork(__dirname + "/fork-process.js", [file]);
    var server = net.createServer({
      allowHalfOpen: true,
      readable: true,
      writable: true
    }, function (c) {
      console.log("connection listener");
      c.on("end", function () {
        console.log("server disconnected");
      });
      c.write("hello\r\n");
      c.pipe(c);
      var i = 0;
      setInterval(function () {
        i++;
        c.write(i.toString() + "\r\n");
      }, 1000);
    }).listen("/tmp/td.sock", function () {
      console.log("socket listening");
    });

    server.on("connection", function () {
      console.log("connection received");
    });

    child.send("hello");
  }
}

TestDriver.prototype.run = function (file) {
  if (isParent) { return; }
  console.log(file);
};

module.exports = TestDriver;
