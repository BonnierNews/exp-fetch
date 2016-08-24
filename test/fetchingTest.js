"use strict";

var chai = require("chai");
var should = chai.should();
var Promise = require("bluebird");
var nock = require("nock");
var fetchBuilder = require("../.");
//var Log = require("log");
nock.disableNetConnect();
nock.enableNetConnect(/(localhost|127\.0\.0\.1):\d+/);
var util = require("util");

describe("fetch", function () {
  var host = "http://example.com";
  var path = "/testing123";
  var fake = nock(host);
  afterEach(nock.cleanAll);

  it("should support callbacks and promises", function (done) {
    var fetch = fetchBuilder().fetch;
    fake.get(path).reply(200, {some: "content"}, {"cache-control": "no-cache"});
    fetch(host + path, function (err, body) {
      body.should.eql({some: "content"});
      fake.get(path).reply(200, {some: "content"}, {"cache-control": "no-cache"});
      fetch(host + path).then(function (body) {
        body.should.eql({some: "content"});
        done();
      }, done);
    });
  });

  describe("Fetching a json endpoint", function () {
    var fetch = fetchBuilder({clone:false}).fetch;

    it("should should fetch an url", function (done) {
      fake.get(path).reply(200, {some: "content"}, {"cache-control": "no-cache"});
      fetch(host + path, function (err, body) {
        body.should.eql({some: "content"});
        done(err);
      });
    });

    it("should be able to pass on request headers", function (done) {
      fake.get(path).matchHeader("User-Agent", "request").reply(200, {some: "content"}, {"cache-control": "no-cache"});
      var options = {
        url: host + path, 
        headers: { "User-Agent": "request"}
      }
      fetch(options, function (err, body) {
        body.should.eql({some: "content"});
        done(err);
      });
    });

    it("should be able to pass on request headers in promises", function (done) {
      fake.get(path).matchHeader("User-Agent", "request").reply(200, {some: "content"}, {"cache-control": "no-cache"});
      var options = {
        url: host + path, 
        headers: { "User-Agent": "request"}
      }
      fetch(options).then(function (body) {
        body.should.eql({some: "content"});
        done();
      });
    });

    it("should pass request headers on to redirects", function (done) {
      fake.get(path).reply(301, {}, {"cache-control": "no-cache", "location": "http://example.com/testing321"});
      fake.get("/testing321").matchHeader("User-Agent", "request").reply(200, {some: "content"}, {"cache-control": "no-cache"});
      var options = {
        url: host + path, 
        headers: { "User-Agent": "request"}
      }
      fetch(options, function (err, body) {
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

    it("should render error on none 200", function (done) {
      fake.get(path).reply(500, {some: "content"}, {"cache-control": "no-cache"});
      fetch(host + path, function (err) {
        should.exist(err);
        done();
      });
    });

    it("should not freeze content if freeze is set to false", function (done) {
      var localFetch = fetchBuilder({freeze:false, clone: false}).fetch;
      fake.get(path).times(2).reply(200, {some: "content", child: { some: "child-content" }}, {"cache-control": "no-cache"});
      fetch(host + path, function (err, content) {
        Object.isFrozen(content).should.be.true;
        Object.isFrozen(content.child).should.be.false;

        should.throw(function () {
          content.prop1 = true;
        }, TypeError);
        localFetch(host + path, function (err, content) {
          should.not.throw(function () {
            content.prop1 = true;
          }, TypeError);
          done(err);
        });
      });
    });

    it("should freeze objects recursively if deepFreeze is set to true", function (done) {
      var localFetch = fetchBuilder({deepFreeze:true, clone: false}).fetch;
      fake.get(path).reply(200, {some: "content", child: { some: "child-content" }}, {"cache-control": "no-cache"});
      localFetch(host + path, function (err, content) {
        Object.isFrozen(content).should.be.true;
        Object.isFrozen(content.child).should.be.true;
        done(err);
      });
    });
  });

  describe("Hooks", function () {
    function testStatus(statusCode, callbackName, done) {
      var called = false;

      function eventCallback(/*url, cacheKey, res, content*/) {
        called = true;
      }

      var behavior = {};
      behavior[callbackName] = eventCallback;

      var fetch = fetchBuilder(behavior).fetch;
      fake.get(path).reply(statusCode, {}, {"cache-control": "no-cache"});
      fetch(host + path, function () {
        called.should.eql(true);
        done();
      });

    }

    it("should call onNotFound if 404", function (done) {
      testStatus(404, "onNotFound", done);
    });

    it("should call onError if responseCode > 200", function (done) {
      testStatus(500, "onError", done);
    });

    it("should call onSuccess if responseCode === 200 and content", function (done) {
      testStatus(200, "onSuccess", done);
    });

    it("should call requestTimeFn", function (done) {
      testStatus(200, "requestTimeFn", function () {
        testStatus(404, "requestTimeFn", function () {
          testStatus(500, "requestTimeFn", done);
        });
      });
    });

    it("should call onRequestInit with request options", function (done) {
      var called = false;
      var behavior = {
        onRequestInit: function(options) {
          options.should.have.property("url");
          options.should.have.property("json", true);
          options.should.have.property("followRedirect", true);

          fake.get(path).reply(200, {}, {"cache-control": "no-cache"});
          called = true;
        }
      };

      var fetch = fetchBuilder(behavior).fetch;
      fetch(host + path, function (err) {
        if (err) return done(err);
        called.should.eql(true);
        done();
      });
    });

    it("should honour call onRequestInit with followRedirect false", function (done) {
      var called = false;
      var behavior = {
        followRedirect: false,
        onRequestInit: function(options) {
          if (called) throw new Error("Called twice!");

          options.should.have.property("url");
          options.should.have.property("json", true);
          options.should.have.property("followRedirect", false);
          fake.get(path).reply(301, {}, {"cache-control": "no-cache", "location": "http://example.com"});
          called = true;
        }
      };

      var fetch = fetchBuilder(behavior).fetch;
      fetch(host + path, function (err, res) {
        if (err) return done(err);
        called.should.eql(true);
        res.statusCode.should.eql(301);
        res.headers.should.have.property("location", "http://example.com");
        done();
      });
    });

    it("onRequestInit is only called once", function (done) {
      var called = false;
      var behavior = {
        followRedirect: true,
        onRequestInit: function(options) {
          if (called) throw new Error("Called twice!");

          options.should.have.property("url");
          options.should.have.property("json", true);
          options.should.have.property("followRedirect", true);
          fake.get(path).reply(301, {}, {"cache-control": "no-cache", "location": host + "/actual-content"});
          fake.get("/actual-content").reply(200, {}, {"cache-control": "no-cache"});
          called = true;
        }
      };

      var fetch = fetchBuilder(behavior).fetch;
      fetch(host + path, function (err) {
        if (err) return done(err);
        called.should.eql(true);
        done();
      });
    });

    it("onRequestInit is called before each fetch", function (done) {
      var called = false;
      var behavior = {
        followRedirect: true,
        onRequestInit: function(options) {
          if (called) throw new Error("Called twice!");

          options.should.have.property("url");
          options.should.have.property("json", true);
          options.should.have.property("followRedirect", true);
          fake.get(path).reply(301, {}, {"cache-control": "no-cache", "location": host + "/actual-content"});
          fake.get("/actual-content").reply(200, {}, {"cache-control": "no-cache"});
          called = true;
        }
      };

      var fetch = fetchBuilder(behavior).fetch;
      fetch(host + path, function (err) {
        if (err) return done(err);
        called = false;
        fetch(host + path, function (err) {
          if (err) return done(err);
          called.should.eql(true);
          done();
        });
      });
    });

    it("onRequestInit is called before in parallel fetch", function (done) {
      var called = [];
      var behavior = {
        followRedirect: true,
        onRequestInit: function(options) {
          called.push(options.url);
        }
      };

      fake.get("/parallel-1").delay(98).reply(200, {}, {"cache-control": "no-cache"});
      fake.get("/parallel-2").reply(200, {}, {"cache-control": "no-cache"});

      var fetch = fetchBuilder(behavior).fetch;
      fetch(host + "/parallel-1", function (err) {
        if (err) return done(err);
        called.length.should.eql(2);
        done();
      });
      fetch(host + "/parallel-2", function (err) {
        if (err) return done(err);
      });
    });
  });

  describe("Caching", function () {
    it("should cache by default", function (done) {
      var fetch = fetchBuilder().fetch;
      fake.get(path).reply(200, {some: "content"}, {"cache-control": "max-age=30"});
      fetch(host + path, function (err, body) {
        body.should.eql({some: "content"});
        fake.get(path).reply(200, {some: "contentz"}, {"cache-control": "max-age=30"});
        fetch(host + path, function (err, body) {
          body.should.eql({some: "content"});
          fake.pendingMocks().should.eql([util.format("GET %s:80%s", host, path)]);
          done(err);
        });
      });
    });

    it("should not cache if falsy cache is given", function (done) {
      var fetch = fetchBuilder({cache: null}).fetch;
      fake.get(path).reply(200, {some: "content"}, {"cache-control": "max-age=30"});
      fetch(host + path, function (err, body) {
        body.should.eql({some: "content"});
        fake.get(path).reply(200, {some: "contentz"}, {"cache-control": "max-age=30"});
        fetch(host + path, function (err, body) {
          body.should.eql({some: "contentz"});
          done(err);
        });
      });
    });

    it("should cache with a lookup function", function (done) {
      var url = require("url");
      fake.get(path).reply(200, {some: "content"}, {"cache-control": "max-age=30"});
      function cacheKeyFn(key) {
        return url.parse(key).path.replace(/\//g, "");
      }

      var fetch = fetchBuilder({cacheKeyFn: cacheKeyFn}).fetch;
      Promise.all([
        fetch(host + path),
        fetch("http://other.expample.com" + path),
        fetch(host + "/testing/123/")
      ]).then(function (result) {
        result[0].should.eql({some: "content"});
        result[0].should.eql(result[1]).eql(result[2]);
        done();
      }, done);
    });

    it("should cache with a custom value function", function (done) {
      fake.get(path).reply(200, {some: "content"}, {"cache-control": "max-age=30"});
      var valueFn = function (body, headers, statusCode) {
        return {
          body: body,
          headers: headers,
          statusCode: statusCode
        };
      };
      var fetch = fetchBuilder({cacheValueFn: valueFn}).fetch;
      fetch(host + path, function (err, content) {
        content.should.eql({
          body: {some: "content"},
          headers: {
            "content-type": "application/json",
            "cache-control": "max-age=30"
          },
          statusCode: 200
        });
        done(err);
      });
    });

    it("should cache with a custom maxAgeFn", function (done) {
      fake.get(path).reply(200, {some: "content"}, {"cache-control": "max-age=30"});
      function maxAgeFn(/* maxAge, key, headers, content */) {
        return -1;
      }

      var fetch = fetchBuilder({maxAgeFn: maxAgeFn}).fetch;
      fetch(host + path).then(function (content) {
        fake.get(path).reply(200, {some: "contentz"}, {"cache-control": "max-age=30"});
        content.should.eql({some: "content"});
        fetch(host + path).then(function (content) {
          content.should.eql({some: "contentz"});
          done();
        }, done);
      }, done);
    });

    it("should cache with a custom maxAgeFn on errors", function (done) {
      fake.get(path).reply(503, {some: "content"}, {"cache-control": "max-age=30"});
      function maxAgeFn(maxAge /*, key, headers, content */) {
        return done();
      }

      var fetch = fetchBuilder({maxAgeFn: maxAgeFn, errorOnRemoteError: false}).fetch;
      return fetch(host + path);
    });

    it("should not cache 404s by default", function (done) {
      var fetch = fetchBuilder().fetch;
      fake.get(path).reply(404);
      fetch(host + path, function () {
        fake.get(path).reply(200, {some: "content"});
        fetch(host + path, function (err, body) {
          body.should.eql({some: "content"});
          done(err);
        });
      });
    });

    it("should cache 404s if it has cacheNotFound set", function (done) {
      var fetch = fetchBuilder({cacheNotFound: 1000}).fetch;
      fake.get(path).reply(404);
      fetch(host + path, function () {
        fake.get(path).reply(200, {some: "content"});
        fetch(host + path, function (err, body) {
          should.equal(body, null);
          done(err);
        });
      });
    });

    it("should override cacheNotFound with maxAgeFn", function (done) {
      function maxAgeFn(maxAge, cacheKey, res) {
        if (res.statusCode === 404) {
          return 1000;
        }
        return maxAge;
      }

      var fetch = fetchBuilder({cacheNotFound: -1, maxAgeFn: maxAgeFn}).fetch;
      fake.get(path).reply(404);
      fetch(host + path, function () {
        fake.get(path).reply(200, {some: "content"});
        fetch(host + path, function (err, body) {
          should.equal(body, null);
          done(err);
        });
      });
    });

    it("should not cache errors with empty response", function (done) {
      var fetch = fetchBuilder().fetch;
      fake.get(path).reply(500);
      fetch(host + path, function () {
        fake.get(path).reply(200, {some: "contentz"}, {"cache-control": "max-age=30"});
        fetch(host + path, function (err, body) {
          body.should.eql({some: "contentz"});
          done(err);
        });
      });
    });

    it("should not return an error if errorOnRemoteError is false", function (done) {
      var fetch = fetchBuilder({errorOnRemoteError: false}).fetch;
      fake.get(path).reply(500);
      fetch(host + path, function (err) {
        should.not.exist(err);
        done(err);
      });
    });

    it("should not cache errors with string response", function (done) {
      var fetch = fetchBuilder().fetch;
      fake.get(path).reply(500, "Internal Error");
      fetch(host + path, function () {
        fake.get(path).reply(200, {some: "contentz"}, {"cache-control": "max-age=30"});
        fetch(host + path, function (err, body) {
          body.should.eql({some: "contentz"});
          done(err);
        });
      });
    });
  });

  describe("contentType option", function () {
    it("should fetch json", function (done) {
      var fetch = fetchBuilder({contentType: "json"}).fetch;
      fake.get(path).reply(200, {some: "content"});
      fetch(host + path, function (err, body) {
        body.should.eql({some: "content"});
        done(err);
      });
    });

    it("should fetch (and parse) xml", function (done) {
      var fetch = fetchBuilder({contentType: "xml"}).fetch;
      var xmlString = " <?xml version=\"1.0\" encoding=\"utf-8\"?><channel><title>Expressen: Nyheter</title><link>http://www.expressen.se/</link></channel>";
      fake.get(path).reply(200, xmlString, {"ContentType": "text/xml"});
      fetch(host + path, function (err, body) {
        body.should.eql({
          channel: {
            title: "Expressen: Nyheter",
            link: "http://www.expressen.se/"
          }
        });
        done(err);
      });
    });
  });
});
