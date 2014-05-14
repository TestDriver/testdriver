"use strict";

var net = require("net");

process.on("message", function (m, sock) {
  var client = net.createConnection("/tmp/td.sock", function (c) {
    console.log("child connected", c);
    client.on("data", function (chunk) {
      process.stdout.write("CHILD:");
      process.stdout.write(chunk.toString());
      //client.write(chunk.toString() + "x\r\n");
    });
    client.write("C");
  });


});

require(process.argv[2]);
