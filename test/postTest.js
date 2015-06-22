"use strict";

var fetchBuilder = require("../index.js");
var nock = require("nock");
nock.disableNetConnect();
nock.enableNetConnect(/(localhost|127\.0\.0\.1):\d+/);

describe("Posting", function () {
  var host = "http://example.com";
  var path = "/testing123";
  var fake = nock(host);
  afterEach(nock.cleanAll);

  function fakeReponse(pathName, body) {
    fake
      .post(pathName, body)
      .reply(200, {a: 1, b: 2});
  }

  function fakeRedirect(from, to) {
    fake
      .post(from)
      .reply(302, "", {
        Location: to,
        "cache-control": "no-cache"
      });
  }

  it("should make a post request", function (done) {
    var fetch = fetchBuilder({httpMethod: "POST"});
    var body = {q: "term"};
    fakeReponse(path, body);
    fetch(host + path, body, function (err, content) {
      if (!err) {
        content.should.eql({a: 1, b: 2});
      }
      done(err);
    });
  });

  it("should follow a redirect when posting", function (done) {
    var fetch = fetchBuilder({httpMethod: "POST"});
    var body = {q: "term"};
    fakeRedirect("/someOtherPath", path);
    fakeReponse(path, body);
    fetch(host + "/someOtherPath", body, function (err, content) {
      if (!err) {
        content.should.eql({a: 1, b: 2});
      }
      done(err);
    });

  });

});
