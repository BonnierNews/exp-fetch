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

  function fakeResponse(pathName, body, response) {
    fake
      .post(pathName, body)
      .reply(200, response);
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
    var fetch = fetchBuilder({httpMethod: "POST"}).fetch;
    var body = {q: "term"};
    var response = {a: 1, b: 2};

    fakeResponse(path, body, response);
    fetch(host + path, body, function (err, content) {
      if (!err) {
        content.should.eql(response);
      }
      done(err);
    });
  });

  it("should handle xml-post", function (done) {
    var fetch = fetchBuilder({httpMethod: "POST", contentType: "dontparse"}).fetch;
    var body = "<?xml version=\"1.0\" encoding=\"utf-8\"?><q>search</q>";
    var responseBody = "<?xml version=\"1.0\" encoding=\"utf-8\"?><a>response</a>";

    fakeResponse(path, body, responseBody);
    fetch(host + path, body, function (err, content) {
      if (!err) {
        content.should.eql(responseBody);
      }
      done(err);
    });
  });

  it("should follow a redirect when posting", function (done) {
    var fetch = fetchBuilder({httpMethod: "POST"}).fetch;
    var body = {q: "term"};
    var response = {c: 1, d: 2};
    fakeRedirect("/someOtherPath", path);
    fakeResponse(path, body, response);
    fetch(host + "/someOtherPath", body, function (err, content) {
      if (!err) {
        content.should.eql(response);
      }
      done(err);
    });

  });

  it("should cache on url and body by default", function (done) {
    var fetch = fetchBuilder({httpMethod: "POST"}).fetch;
    var bodyOne = {q: "term"};
    var responseOne = {a: 1, b: 2};
    var bodyTwo = {q: "another world"};
    var responseTwo = {c: 1, d: 2};

    fakeResponse(path, bodyOne, responseOne);
    fakeResponse(path, bodyTwo, responseTwo);

    fetch(host + path, bodyOne, function (err, content) {
      content.should.eql(responseOne);
      fetch(host + path, bodyOne, function (err, content) {
        content.should.eql(responseOne);

        fetch(host + path, bodyTwo, function (err, content) {
          content.should.eql(responseTwo);
          done(err);
        });
      });
    });

  });

});
