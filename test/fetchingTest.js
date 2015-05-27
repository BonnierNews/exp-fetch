"use strict";

var chai = require("chai");
var should = chai.should();

var fetchBuilder = require("../.");
var nock = require("nock");
var Log = require("log");
nock.disableNetConnect();
nock.enableNetConnect(/(localhost|127\.0\.0\.1):\d+/);

describe("fetch", function () {
  var host = "http://example.com";
  var path = "/testing123";
  var fake = nock(host);

  describe("Fetching a json endpoint", function () {
    var fetch = fetchBuilder().fetch;

    it("should should fetch an url", function (done) {
      fake.get(path).reply(200, {some: "content"}, {"cache-control": "no-cache"});
      fetch(host + path, function (err, body) {
        body.should.eql({some: "content"});
        done(err);
      });
    });

    it("should get null if 404", function (done) {
      fake.get(path).reply(404, {some: "content"}, {"cache-control": "no-cache"});
      fetch(host + path, function (err, body) {
        should.equal(body, null);
        done(err);
      });
    });

    it("should get null non 200", function (done) {
      fake.get(path).reply(500, {some: "content"}, {"cache-control": "no-cache"});
      fetch(host + path, function (err, body) {
        should.equal(body, null);
        done(err);
      });
    });
  });

  describe("Caching", function () {
    var fetch = fetchBuilder().fetch;

    afterEach(function () {
      nock.cleanAll();
    });

    it("should cache by default", function (done) {
      fake.get(path).reply(200, {some: "content"}, {"cache-control": "max-age=30"});
      fetch(host + path, function (err, body) {
        body.should.eql({some: "content"});
        fake.get(path).reply(200, {some: "contentz"}, {"cache-control": "max-age=30"});
        fetch(host + path, function (err, body) {
          body.should.eql({some: "content"});
          done(err);
        });
      });
    });

    it("should not cache if falsy cache is given", function (done) {
      var localFetch = fetchBuilder({cache: null}).fetch;
      fake.get(path).reply(200, {some: "content"}, {"cache-control": "max-age=30"});
      localFetch(host + path, function (err, body) {
        body.should.eql({some: "content"});
        fake.get(path).reply(200, {some: "contentz"}, {"cache-control": "max-age=30"});
        localFetch(host + path, function (err, body) {
          body.should.eql({some: "contentz"});
          done(err);
        });
      });
    });

  });
});

