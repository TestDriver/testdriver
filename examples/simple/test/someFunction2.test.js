var expect = require("chai").expect;

module.exports = function (describe) {
  var someFunction = require("../lib/someFunction.js");

  describe("Suite D", function (describe) {
    describe("Subsuite D1", function (it) {
      it("Test D", function (done) {
        //console.log("Test D1 started");
        setTimeout(function () {
          //console.log("Test D1 ended");
          //expect(true).to.equal(false);
          done();
        }, 1000);
      });
    });
    describe("Subsuite D2", function (it) {
      it("Test D2", function (done) {
        //console.log("Test D2 done");
        done();
      });
    });
  });

};
