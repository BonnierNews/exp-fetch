"use strict";

var maxAgeFromHeader = require("../../lib/maxAgeFromHeader");
var should = require("chai").should();

describe("maxAgeFromHeader", function () {

  it("should return null if no cache headers", function () {
    should.equal(maxAgeFromHeader(null), null);
  });

  it("should return -1 (no cache) if cache headers contains private", function () {
    maxAgeFromHeader("private, max-age=30").should.eql(-1);
  });

  it("should not return -1 if cache headers contains both public and private", function () {
    maxAgeFromHeader("public, private, max-age=30").should.not.eql(-1);
  });

  it("should return -1 (no cache) if cache headers contains no-cache", function () {
    maxAgeFromHeader("no-cache, max-age=30").should.eql(-1);
  });

  it("should return -1 (no cache) if cache headers contains max-age=0", function () {
    maxAgeFromHeader("public, max-age=0").should.eql(-1);
  });

  it("should return -1 (no cache) if cache headers contains must-revalidate", function () {
    maxAgeFromHeader("must-revalidate").should.eql(-1);
  });

  it("should return cache time (in millis) from max-age (in seconds)", function () {
    maxAgeFromHeader("max-age=1").should.eql(1000);
    maxAgeFromHeader("max-age=10").should.eql(10000);
    maxAgeFromHeader("max-age=300").should.eql(300000);
  });
});
