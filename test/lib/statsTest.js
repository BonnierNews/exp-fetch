"use strict";

// jshint unused: false
var should = require("chai").should();
var nock = require("nock");
var fetchBuilder = require("../../.");
nock.disableNetConnect();
nock.enableNetConnect(/(localhost|127\.0\.0\.1):\d+/);

describe("fetch stats", function () {
  var host = "http://example.com";
  var path = "/testing123";
  var fake = nock(host);
  afterEach(nock.cleanAll);
  var fetch = fetchBuilder();

  it ("stats should be all zero at start", function () {
    fetch.stats().should.eql({calls:0, cacheHitRatio: 0});
  });

  it ("should have zero hit ratio after first access", function (done) {
    fake.get(path).reply(200);
    fetch.fetch(host + path, function (err) {
      if (err) return done(err);
      fetch.stats().should.eql({calls:1, cacheHitRatio: 0});
      done();
    });
  });

  it ("should have 50% hit ratio after another access", function (done) {
    fetch.fetch(host + path, function (err) {
      if (err) return done(err);
      fetch.stats().should.eql({calls:2, cacheHitRatio: 0.5});
      done();
    });
  });
});
