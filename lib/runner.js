"use strict";

function Runner() {

}

Runner.prototype.run = function (file) {
  console.log("I should run", file);
};

module.exports = Runner;
