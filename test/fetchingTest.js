"use strict";

const { expect } = require("chai");
const nock = require("nock");
const fetchBuilder = require("../.");

describe("fetch", () => {
  const host = "http://example.com";
  const path = "/testing123";
  const fake = nock(host, { badheaders: [ "correlation-id", "x-correlation-id" ] });
  beforeEach(nock.cleanAll);

  it("should support callbacks and promises", (done) => {
    const fetch = fetchBuilder().fetch;
    fake.get(path).reply(200, { some: "content" }, { "cache-control": "no-cache" });
    fetch(host + path, (err, body) => {
      if (err) return done(err);

      expect(body).to.deep.equal({ some: "content" });
      fake.get(path).reply(200, { some: "content" }, { "cache-control": "no-cache" });

      fetch(host + path).then((body2) => {
        expect(body2).to.deep.equal({ some: "content" });
        done();
      }, done);
    });
  });

  describe("Fetching a json endpoint", () => {
    const fetch = fetchBuilder({ clone: false }).fetch;

    it("should should fetch an url", (done) => {
      fake.get(path).reply(200, { some: "content" }, { "cache-control": "no-cache" });
      fetch(host + path, (err, body) => {
        expect(body).to.deep.equal({ some: "content" });
        done(err);
      });
    });

    it("should be able to pass on request headers", (done) => {
      fake.get(path).matchHeader("User-Agent", "request").reply(200, { some: "content" }, { "cache-control": "no-cache" });
      const options = {
        url: host + path,
        headers: { "User-Agent": "request" }
      };
      fetch(options, (err, body) => {
        expect(body).to.deep.equal({ some: "content" });
        done(err);
      });
    });

    it("should be able to pass on request headers in promises", (done) => {
      fake.get(path).matchHeader("User-Agent", "request").reply(200, { some: "content" }, { "cache-control": "no-cache" });
      const options = {
        url: host + path,
        headers: { "User-Agent": "request" }
      };
      fetch(options).then((body) => {
        expect(body).to.deep.equal({ some: "content" });
        done();
      });
    });

    it("should pass request headers on to redirects", (done) => {
      fake.get(path).reply(301, {}, { "cache-control": "no-cache", location: "http://example.com/testing321" });
      fake.get("/testing321").matchHeader("User-Agent", "request").reply(200, { some: "content" }, { "cache-control": "no-cache" });
      const options = {
        url: host + path,
        headers: { "User-Agent": "request" }
      };
      fetch(options, (err, body) => {
        expect(body).to.deep.equal({ some: "content" });
        done(err);
      });
    });

    it("should get null if 404", (done) => {
      fake.get(path).reply(404, { some: "content" }, { "cache-control": "no-cache" });
      fetch(host + path, (err, body) => {
        expect(body).to.equal(null);
        done(err);
      });
    });

    it("should render error on none 200", (done) => {
      fake.get(path).reply(500, { some: "content" }, { "cache-control": "no-cache" });
      fetch(host + path, (err) => {
        expect(err).to.be.instanceof(Error);
        done();
      });
    });

    it("should not freeze content if freeze is set to false", (done) => {
      const localFetch = fetchBuilder({ freeze: false, clone: false }).fetch;
      fake.get(path).reply(200, { some: "content", child: { some: "child-content" } }, { "cache-control": "no-cache" });
      localFetch(host + path, (err, content) => {
        expect(Object.isFrozen(content)).to.be.false;
        expect(Object.isFrozen(content.child)).to.be.false;
        done(err);
      });
    });

    it("should freeze the result root but not descendants by default", (done) => {
      const localFetch = fetchBuilder({ clone: false }).fetch;
      fake.get(path).reply(200, { some: "content", child: { some: "child-content" } }, { "cache-control": "no-cache" });
      localFetch(host + path, (err, content) => {
        expect(Object.isFrozen(content)).to.be.true;
        expect(Object.isFrozen(content.child)).to.be.false;
        done(err);
      });
    });

    it("should freeze objects recursively if deepFreeze is set to true", (done) => {
      const localFetch = fetchBuilder({ deepFreeze: true, clone: false }).fetch;
      fake.get(path).reply(200, { some: "content", child: { some: "child-content" } }, { "cache-control": "no-cache" });
      localFetch(host + path, (err, content) => {
        if (err) return done(err);
        expect(Object.isFrozen(content)).to.be.true;
        expect(Object.isFrozen(content.child)).to.be.true;
        done();
      });
    });
  });

  describe("Hooks", () => {
    function testStatus(statusCode, callbackName, done) {
      let called = false;

      function eventCallback(/* url, cacheKey, res, content*/) {
        called = true;
      }

      const behavior = {};
      behavior[callbackName] = eventCallback;

      const fetch = fetchBuilder(behavior).fetch;
      fake.get(path).reply(statusCode, {}, { "cache-control": "no-cache" });
      fetch(host + path, () => {
        expect(called).to.be.true;
        done();
      });

    }

    it("should call onNotFound if 404", (done) => {
      testStatus(404, "onNotFound", done);
    });

    it("should call onError if responseCode > 200", (done) => {
      testStatus(500, "onError", done);
    });

    it("should call onSuccess if responseCode === 200 and content", (done) => {
      testStatus(200, "onSuccess", done);
    });

    it("should call requestTimeFn", (done) => {
      testStatus(200, "requestTimeFn", () => {
        testStatus(404, "requestTimeFn", () => {
          testStatus(500, "requestTimeFn", done);
        });
      });
    });

    it("should call onRequestInit with request options", (done) => {
      let called = false;
      const behavior = {
        onRequestInit(options) {
          expect(options).to.have.property("url");
          expect(options).to.have.property("followRedirect", true);

          fake.get(path).reply(200, {}, { "cache-control": "no-cache" });
          called = true;
        }
      };

      const fetch = fetchBuilder(behavior).fetch;
      fetch(host + path, (err) => {
        if (err) return done(err);
        expect(called).to.be.true;
        done();
      });
    });

    it("onRequestInit is only called once", (done) => {
      let called = false;
      const behavior = {
        followRedirect: true,
        onRequestInit: function (options) {
          if (called) throw new Error("Called twice!");

          expect(options).to.have.property("url");
          expect(options).to.have.property("followRedirect", true);
          fake.get(path).reply(301, {}, { "cache-control": "no-cache", location: `${host}/actual-content` });
          fake.get("/actual-content").reply(200, {}, { "cache-control": "no-cache" });
          called = true;
        }
      };

      const fetch = fetchBuilder(behavior).fetch;
      fetch(host + path, (err) => {
        if (err) return done(err);
        expect(called).to.be.true;
        done();
      });
    });

    it("onRequestInit is called before each fetch", (done) => {
      let called = false;
      const behavior = {
        followRedirect: true,
        onRequestInit: function (options) {
          if (called) throw new Error("Called twice!");

          expect(options).to.have.property("url");
          expect(options).to.have.property("followRedirect", true);
          fake.get(path).reply(301, {}, { "cache-control": "no-cache", location: `${host}/actual-content` });
          fake.get("/actual-content").reply(200, {}, { "cache-control": "no-cache" });
          called = true;
        }
      };

      const fetch = fetchBuilder(behavior).fetch;
      fetch(host + path, (err0) => {
        if (err0) return done(err0);
        called = false;
        fetch(host + path, (err) => {
          if (err) return done(err);
          expect(called).to.be.true;
          done();
        });
      });
    });

    it("onRequestInit is called before in parallel fetch", (done) => {
      const called = [];
      const behavior = {
        followRedirect: true,
        onRequestInit: function (options) {
          called.push(options.url);
        }
      };

      fake.get("/parallel-1").delay(98).reply(200, {}, { "cache-control": "no-cache" });
      fake.get("/parallel-2").reply(200, {}, { "cache-control": "no-cache" });

      const fetch = fetchBuilder(behavior).fetch;
      fetch(`${host}/parallel-1`, (err) => {
        if (err) return done(err);
        expect(called).to.have.length(2);
        done();
      });
      fetch(`${host}/parallel-2`, (err) => {
        if (err) return done(err);
      });
    });
  });

  describe("Correlation id", () => {
    it("should use getCorrelationId from behavior", (done) => {
      nock(host).get(path)
        .matchHeader("correlation-id", "foo")
        .reply(200, {}, { "cache-control": "no-cache" });
      const behavior = {
        getCorrelationId: () => {
          return "foo";
        }
      };

      const fetch = fetchBuilder(behavior).fetch;
      fetch(host + path, (err, body) => {
        if (err) return done(err);
        expect(body).to.eql({});
        done();
      });
    });

    it("should use getCorrelationId and header name from from behavior", (done) => {
      nock(host).get(path)
        .matchHeader("x-correlation-id", "moo")
        .reply(200, {}, { "cache-control": "no-cache" });
      const behavior = {
        correlationIdHeader: "x-correlation-id",
        getCorrelationId: () => {
          return "moo";
        }
      };

      const fetch = fetchBuilder(behavior).fetch;
      fetch(host + path, (err, body) => {
        if (err) return done(err);
        expect(body).to.eql({});
        done();
      });
    });

    it("should pass no correlation id if getCorrelationId returns null", (done) => {
      nock(host, { badheaders: [ "correlation-id" ] }).get(path)
        .reply(200, {}, { "cache-control": "no-cache" });

      const behavior = {
        getCorrelationId: () => {
          return null;
        }
      };

      const fetch = fetchBuilder(behavior).fetch;
      fetch(host + path, (err, body) => {
        if (err) return done(err);
        expect(body).to.eql({});
        done();
      });
    });
  });

  describe("Caching", () => {
    it("should cache by default", (done) => {
      const fetch = fetchBuilder().fetch;
      fake.get(path).reply(200, { some: "content" }, { "cache-control": "max-age=30" });
      fetch(host + path, (_, body0) => {
        expect(body0).to.deep.equal({ some: "content" });
        fake.get(path).reply(200, { some: "contentz" }, { "cache-control": "max-age=30" });
        fetch(host + path, (err, body1) => {
          if (err) return done(err);
          expect(body1).to.deep.equal({ some: "content" });
          expect(fake.pendingMocks()).to.deep.equal([ `GET ${host}:80${path}` ]);
          done();
        });
      });
    });

    it("should not cache if falsy cache is given", (done) => {
      const fetch = fetchBuilder({ cache: null }).fetch;
      fake.get(path).reply(200, { some: "content" }, { "cache-control": "max-age=30" });
      fetch(host + path, (_, body0) => {
        expect(body0).to.deep.equal({ some: "content" });
        fake.get(path).reply(200, { some: "contentz" }, { "cache-control": "max-age=30" });
        fetch(host + path, (err, body1) => {
          if (err) return done(err);
          expect(body1).to.deep.equal({ some: "contentz" });
          done();
        });
      });
    });

    it("should cache with a lookup function", (done) => {
      const url = require("url");
      fake.get(path).reply(200, { some: "content" }, { "cache-control": "max-age=30" });
      function cacheKeyFn(key) {
        return url.parse(key).path.replace(/\//g, "");
      }

      const fetch = fetchBuilder({ cacheKeyFn }).fetch;
      Promise.all([
        fetch(host + path),
        fetch(`http://other.expample.com${path}`),
        fetch(`${host}/testing/123/`)
      ]).then((result) => {
        expect(result[0]).to.deep.equal({ some: "content" });
        expect(result[0]).to.deep.equal(result[1]).eql(result[2]);
        done();
      }, done);
    });

    it("should cache with a custom value function", (done) => {
      fake.get(path).reply(200, { some: "content" }, { "cache-control": "max-age=30" });
      const valueFn = function (body, headers, statusCode) {
        return {
          body,
          headers,
          statusCode
        };
      };
      const fetch = fetchBuilder({ cacheValueFn: valueFn }).fetch;
      fetch(host + path, (err, content) => {
        expect(content).to.deep.equal({
          body: { some: "content" },
          headers: {
            "content-type": "application/json",
            "cache-control": "max-age=30"
          },
          statusCode: 200
        });
        done(err);
      });
    });

    it("should cache with a custom maxAgeFn", (done) => {
      fake.get(path).reply(200, { some: "content" }, { "cache-control": "max-age=30" });
      function maxAgeFn(/* maxAge, key, headers, content */) {
        return -1;
      }

      const fetch = fetchBuilder({ maxAgeFn }).fetch;
      fetch(host + path).then((content0) => {
        fake.get(path).reply(200, { some: "contentz" }, { "cache-control": "max-age=30" });
        expect(content0).to.deep.equal({ some: "content" });
        fetch(host + path).then((content1) => {
          expect(content1).to.deep.equal({ some: "contentz" });
          done();
        }, done);
      }, done);
    });

    it("should cache with a custom maxAgeFn on errors", (done) => {
      fake.get(path).reply(503, { some: "content" }, { "cache-control": "max-age=30" });
      function maxAgeFn() {
        return done();
      }

      const fetch = fetchBuilder({ maxAgeFn, errorOnRemoteError: false }).fetch;
      fetch(host + path);
    });

    it("should not cache 404s by default", (done) => {
      const fetch = fetchBuilder().fetch;
      fake.get(path).reply(404);
      fetch(host + path, () => {
        fake.get(path).reply(200, { some: "content" });
        fetch(host + path, (err, body) => {
          expect(body).to.deep.equal({ some: "content" });
          done(err);
        });
      });
    });

    it("should cache 404s if it has cacheNotFound set", (done) => {
      const fetch = fetchBuilder({ cacheNotFound: 1000 }).fetch;
      fake.get(path).reply(404);
      fetch(host + path, () => {
        fake.get(path).reply(200, { some: "content" });
        fetch(host + path, (err, body) => {
          expect(body).to.equal(null);
          done(err);
        });
      });
    });

    it("should override cacheNotFound with maxAgeFn", (done) => {
      function maxAgeFn(maxAge, cacheKey, res) {
        if (res.statusCode === 404) {
          return 1000;
        }
        return maxAge;
      }

      const fetch = fetchBuilder({ cacheNotFound: -1, maxAgeFn }).fetch;
      fake.get(path).reply(404);
      fetch(host + path, () => {
        fake.get(path).reply(200, { some: "content" });
        fetch(host + path, (err, body) => {
          expect(body).to.be.null;
          done(err);
        });
      });
    });

    it("should not cache errors with empty response", (done) => {
      const fetch = fetchBuilder().fetch;
      fake.get(path).reply(500);
      fetch(host + path, () => {
        fake.get(path).reply(200, { some: "contentz" }, { "cache-control": "max-age=30" });
        fetch(host + path, (err, body) => {
          expect(body).to.deep.equal({ some: "contentz" });
          done(err);
        });
      });
    });

    it("should not return an error if errorOnRemoteError is false", (done) => {
      const fetch = fetchBuilder({ errorOnRemoteError: false }).fetch;
      fake.get(path).reply(500);
      fetch(host + path, (err) => {
        done(err);
      });
    });

    it("should not cache errors with string response", (done) => {
      const fetch = fetchBuilder().fetch;
      fake.get(path).reply(500, "Internal Error");
      fetch(host + path, () => {
        fake.get(path).reply(200, { some: "contentz" }, { "cache-control": "max-age=30" });
        fetch(host + path, (err, body) => {
          expect(body).to.deep.equal({ some: "contentz" });
          done(err);
        });
      });
    });
  });

  describe("contentType option", () => {
    it("should fetch json", (done) => {
      const fetch = fetchBuilder({ contentType: "json" }).fetch;
      fake.get(path).reply(200, { some: "content" });
      fetch(host + path, (err, body) => {
        expect(body).to.deep.equal({ some: "content" });
        done(err);
      });
    });

    it("should fetch (and parse) xml", (done) => {
      const fetch = fetchBuilder({ contentType: "xml" }).fetch;
      const xmlString = " <?xml version=\"1.0\" encoding=\"utf-8\"?><channel><title>Expressen: Nyheter</title><link>http://www.expressen.se/</link></channel>";
      fake.get(path).reply(200, xmlString, { ContentType: "text/xml" });
      fetch(host + path, (err, body) => {
        expect(body).to.deep.equal({
          channel: {
            title: "Expressen: Nyheter",
            link: "http://www.expressen.se/"
          }
        });
        done(err);
      });
    });
  });

  describe("app name header", () => {
    it("should include app name from package.json", () => {
      const fetch = fetchBuilder({ contentType: "json" }).fetch;

      fake
        .get(path)
        .matchHeader("x-exp-fetch-appname", "exp-fetch")
        .reply(200);

      return fetch(host + path);
    });
  });

  describe("retry", () => {
    it("should retry if retry is specified in behavior", async () => {
      const fetch = fetchBuilder({
        contentType: "json",
        cache: false,
        retry: {
          calculateDelay() {
            return 50;
          },
          retries: 2,
          statusCodes: [ 500, 503 ]
        }
      }).fetch;

      nock(host)
        .get(path)
        .reply(500)
        .get(path)
        .reply(503)
        .get(path)
        .reply(200, { data: 1 });

      const response = await fetch(host + path);
      expect(response).to.deep.equal({ data: 1 });
    });
  });

  describe("timeout", () => {
    it("should honour timeout set in behavior", (done) => {
      const fetch = fetchBuilder({
        timeout: 10
      }).fetch;

      fake
        .get(path)
        .delay(600)
        .reply(200, { some: "content" });

      fetch(host + path, (err) => {
        if (!err) return done(new Error("No timeout"));
        expect(err.message).to.include("ESOCKETTIMEDOUT");
        done();
      });
    });

    it("should honour socket timeout set in behavior", (done) => {
      const fetch = fetchBuilder({
        timeout: {
          socket: 10
        }
      }).fetch;

      fake
        .get(path)
        .delayConnection(30)
        .reply(200, { some: "content" });

      fetch(host + path, (err) => {
        if (!err) return done(new Error("No socket timeout"));
        expect(err.message).to.include("ESOCKETTIMEDOUT");
        done();
      });
    });

    it("should honour response timeout set in behavior", (done) => {
      const fetch = fetchBuilder({
        timeout: {
          socket: 100,
          request: 200,
        },
      }).fetch;

      fake
        .get(path)
        .delayBody(300)
        .reply(200, { some: "content" });

      fetch(host + path, (err) => {
        if (!err) return done(new Error("No response timeout"));
        expect(err.message).to.include("ESOCKETTIMEDOUT");
        done();
      });
    });

    it("should allow overriding behavior timeout per request", (done) => {
      const fetch = fetchBuilder({
        timeout: 200
      }).fetch;
      fake
        .get(path)
        .delay(30)
        .reply(200, { some: "content" });

      fetch({ url: host + path, timeout: 1 }, (err) => {
        if (!err) return done(new Error("No timeout"));
        expect(err.message).to.include("ESOCKETTIMEDOUT");
        done();
      });
    });

    it("should allow overriding timeout behavior with object for socket timeout", (done) => {
      const fetch = fetchBuilder({
        timeout: 200
      }).fetch;
      fake
        .get(path)
        .delayConnection(30)
        .reply(200, { some: "content" });

      fetch({
        url: host + path,
        timeout: {
          socket: 10
        }
      }, (err) => {
        if (!err) return done(new Error("No timeout"));
        expect(err.message).to.include("ESOCKETTIMEDOUT");
        done();
      });
    });

    it("should allow overriding behavior timeout per request when following redirects", (done) => {
      const fetch = fetchBuilder({
        timeout: 200
      }).fetch;
      fake
        .get(path)
        .reply(301, null, { location: `${host}/someotherpath` });

      fake
        .get("/someotherpath")
        .delay(30)
        .reply(200, { some: "content" });
      fetch({ url: host + path, timeout: 1 }, (err) => {
        if (!err) return done(new Error("No timeout"));
        expect(err.message).to.include("ESOCKETTIMEDOUT");
        done();
      });
    });

    it("should allow overriding behavior timeout per request when using promises", (done) => {
      const fetch = fetchBuilder({
        timeout: 200
      }).fetch;
      fake
        .get(path)
        .delay(30)
        .reply(200, { some: "content" });
      fetch({ url: host + path, timeout: 1 }).catch((err) => {
        if (!err) return done(new Error("No timeout"));
        expect(err.message).to.include("ESOCKETTIMEDOUT");
        done();
      });
    });
  });

  describe("error status codes", () => {
    it("should pass on the error status code", (done) => {
      const fetch = fetchBuilder().fetch;
      fake.get(path).reply(500, "Internal Server Error");
      fetch(host + path, (err) => {
        expect(err).to.be.ok;
        expect(err.statusCode).to.equal(500);
        done();
      });
    });
  });

  describe("Global header", () => {
    const fetch = fetchBuilder({
      headers: { "User-Agent": "request" }
    }).fetch;

    const options = {
      url: host + path,
      headers: { "X-Test": "test" }
    };

    it("should pass through global headers and local headers", (done) => {
      fake.get(path)
        .matchHeader("User-Agent", "request")
        .matchHeader("X-Test", "test")
        .reply(200, { some: "content" }, { "cache-control": "no-cache" });
      fetch(options, (err, body) => {
        expect(body).to.deep.equal({ some: "content" });
        done(err);
      });
    });

    it("should be able to pass on request headers in promises", (done) => {
      fake.get(path)
        .matchHeader("User-Agent", "request")
        .matchHeader("X-Test", "test")
        .reply(200, { some: "content" }, { "cache-control": "no-cache" });
      fetch(options).then((body) => {
        expect(body).to.deep.equal({ some: "content" });
        done();
      });
    });

    it("should pass request headers on to redirects", (done) => {
      fake.get(path)
        .reply(301, {}, { "cache-control": "no-cache", location: "http://example.com/testing321" });
      fake.get("/testing321")
        .matchHeader("User-Agent", "request")
        .matchHeader("X-Test", "test")
        .reply(200, { some: "content" }, { "cache-control": "no-cache" });
      fetch(options, (err, body) => {
        expect(body).to.deep.equal({ some: "content" });
        done(err);
      });
    });

    it("should make sure local headers take precedence over global", (done) => {
      fake.get(path)
        .matchHeader("User-Agent", "local-request")
        .reply(200, { some: "content" }, { "cache-control": "no-cache" });
      options.headers = { "User-Agent": "local-request" };
      fetch(options, (err, body) => {
        expect(body).to.deep.equal({ some: "content" });
        done(err);
      });
    });
  });
});
