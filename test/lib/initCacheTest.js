"use strict";

var initCache = require("../../lib/initCache");
var should = require("chai").should();
var wrap = function (value) {
  return function () {return value;}
}

describe("initCache", function () {
  it("should init a disabled cache if disabled", function () {
    var cache = initCache({disabled: true});
    cache.set("key", "value");
    should.equal(cache.get("key"), undefined);
    cache.keys().should.eql([]);
    cache.values().should.eql([]);
  });

  it("should set the max on size param", function () {
    var cache = initCache({size: 1, age: 1000, length: wrap(1)});
    cache.set("key", "value");
    cache.set("key2", "value2");
    should.equal(cache.get("key"), undefined);
    cache.keys().should.eql(["key2"]);
    cache.values().should.eql(["value2"]);
  });

  it("should set the age from param param", function (done) {
    var cache = initCache({age: 0.002});
    cache.set("key", "value");
    should.equal(cache.get("key"), "value");
    setTimeout(function () {
      should.equal(cache.get("key"), undefined);
      cache.keys().should.eql([]);
      cache.values().should.eql([]);
      done();
    }, 5);
  });

});
