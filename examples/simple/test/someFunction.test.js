var expect = require("chai").expect;

module.exports = function (describe) {
  var someFunction = require("../lib/someFunction.js");

  describe("Suite C", function (describe) {
    describe("Subsuite C1", function (it) {
      it("Test C", function (done) {
        //console.log("Test C1 started");
        setTimeout(function () {
          //console.log("Test C1 ended");
          done();
        }, 1000);
      });
      it("Test CA", function (done) {
        //console.log("Test C1 started");
        setTimeout(function () {
          //console.log("Test C1 ended");
          done();
        }, 1000);
      });
    });
    describe("Subsuite C2", function (it) {
      it("Test C2", function (done) {
        //console.log("Test C2 done");
        done();
      });
    });
    describe("Subsuite C3", function (it) {
      it("Test C3", function (done) {
        //console.log("Test C2 done");
        done();
      });
    });
  });

};
