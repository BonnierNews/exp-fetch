"use strict";

var fetchBuilder = require("../../.");
var nock = require("nock");

describe("Fetching redirected resources", function () {
  var host = "http://example.com";
  var path = "/testing123";
  var fake = nock(host);
  afterEach(nock.cleanAll);

  function fakeResponse(pathName) {
    fake
      .get(pathName)
      .reply(200, {a: 1, b: 2});
  }

  it("should clone an object by default", function (done) {
    var fetch = fetchBuilder({freeze: false}).fetch;
    fakeResponse(path);
    fetch(host + path, function (_, content0) {
      content0.should.eql({a: 1, b: 2});
      content0.b = "other";
      fetch(host + path, function (err, content1) {
        content1.should.eql({a: 1, b: 2});
        done(err);
      });
    });
  });

  it("should not clone an object if clone is set to false", function (done) {
    var fetch = fetchBuilder({freeze: false, clone: false}).fetch;
    fakeResponse(path);
    fetch(host + path, function (_, content0) {
      content0.should.eql({a: 1, b: 2});
      content0.b = "other";
      fetch(host + path, function (err, content1) {
        content1.should.eql({a: 1, b: "other"});
        done(err);
      });
    });
  });

  function expected(content) {
    content.should.eql({
      statusCode: 302,
      headers: {
        "location": host + "/otherPath"
      }
    });

  }

  it("should clone redirects if followRedirect is set to false", function (done) {
    var fetch = fetchBuilder({followRedirect: false, freeze: false}).fetch;
    fake
      .get(path)
      .reply(302, "", {
        Location: host + "/otherPath"
      });

    fetch(host + path, function (err0, content0) {
      if (err0) return done(err0);
      expected(content0);
      content0.statusCode = 200;
      fetch(host + path, function (err, content1) {
        if (err) return done(err);
        expected(content1);
        done(err);
      });
    });
  });
});
