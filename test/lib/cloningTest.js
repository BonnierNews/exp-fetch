"use strict";

var fetchBuilder = require("../../.");
var nock = require("nock");
nock.disableNetConnect();
nock.enableNetConnect(/(localhost|127\.0\.0\.1):\d+/);

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
    var fetch = fetchBuilder({freeze: false});
    fakeResponse(path);
    fetch(host + path, function (err, content) {
      content.should.eql({a: 1, b: 2});
      content.b = "other";
      fetch(host + path, function (err, content) {
        content.should.eql({a: 1, b: 2});
        done(err);
      });
    });
  });

  it("should not clone an object if clone is set to false", function (done) {
    var fetch = fetchBuilder({freeze: false, clone: false});
    fakeResponse(path);
    fetch(host + path, function (err, content) {
      content.should.eql({a: 1, b: 2});
      content.b = "other";
      fetch(host + path, function (err, content) {
        content.should.eql({a: 1, b: "other"});
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
    var fetch = fetchBuilder({followRedirect: false, freeze: false});
    fake
      .get(path)
      .reply(302, "", {
        Location: host + "/otherPath"
      });

    fetch(host + path, function (err, content) {
      if (err) return done(err);
      expected(content);
      content.statusCode = 200
      fetch(host + path, function (err, content) {
        if (err) return done(err);
        expected(content);
        done(err);
      });
    });
  });
});
