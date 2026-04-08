"use strict";

const nock = require("nock");
const fetchBuilder = require("../.");
const crypto = require("crypto");

describe("fetch", () => {
  const host = "http://example.com";
  const path = "/testing123";
  const fake = nock(host, { badheaders: [ "correlation-id", "x-correlation-id" ] });
  beforeEach(nock.cleanAll);
  afterEach(() => {
    nock.abortPendingRequests();
    nock.cleanAll();
  });

  describe("Promise API", () => {
    it("returns resolving promise on success", async () => {
      fake.get(path).reply(200, { some: "content" }, { "cache-control": "no-cache" });

      const fetch = fetchBuilder().fetch;
      const pendingResponse = fetch(host + path);

      const awaitResponse = await pendingResponse;
      expect(awaitResponse).to.deep.equal({ some: "content" });

      return pendingResponse.then((thenResponse) => {
        expect(thenResponse).to.deep.equal({ some: "content" });
      });
    });

    it("returns rejecting promise on internal error", () => {
      const fetch = fetchBuilder().fetch;

      const invalidArgument = undefined;
      return fetch(invalidArgument)
        .then(() => undefined)
        .catch((err) => err)
        .then((rejection) => {
          expect(rejection).to.exist;
        });
    });
  });

  describe("Callback API", () => {
    it("runs callback with result on success", (done) => {
      fake.get(path).reply(200, { some: "content" }, { "cache-control": "no-cache" });

      const fetch = fetchBuilder().fetch;
      fetch(host + path, (err, body) => {
        expect(err).to.not.exist;
        expect(body).to.deep.equal({ some: "content" });
        done();
      });
    });

    it("runs callback with error on internal error", (done) => {
      const fetch = fetchBuilder().fetch;
      const invalidArgument = undefined;
      fetch(invalidArgument, {}, (err) => {
        expect(err).to.exist;
        done();
      });
    });
  });

  describe("Verbs", () => {
    it("should support all the verbs", async () => {
      const request = fetchBuilder();
      fake.get(path).reply(200, { some: "content" }, { "cache-control": "no-cache" });
      await request.get(host + path).then((body2) => {
        expect(body2).to.deep.equal({ some: "content" });
      });
      fake.post(path, { foo: "bar" }).reply(200, { some: "content" }, { "cache-control": "no-cache" });
      await request.post(host + path, { foo: "bar" }).then((body2) => {
        expect(body2).to.deep.equal({ some: "content" });
      });
      fake.put(path, { foo: "bar" }).reply(200, { some: "content" }, { "cache-control": "no-cache" });
      await request.put(host + path, { foo: "bar" }).then((body2) => {
        expect(body2).to.deep.equal({ some: "content" });
      });
      fake.patch(path, { foo: "bar" }).reply(200, { some: "content" }, { "cache-control": "no-cache" });
      await request.patch(host + path, { foo: "bar" }).then((body2) => {
        expect(body2).to.deep.equal({ some: "content" });
      });
      fake.head(path).reply(200, undefined, { "cache-control": "no-cache" });
      await request.head(host + path);
      fake.options(path).reply(200, { some: "content" }, { "cache-control": "no-cache" });
      await request.options(host + path).then((body2) => {
        expect(body2).to.deep.equal({ some: "content" });
      });
      fake.delete(path).reply(200, { some: "content" }, { "cache-control": "no-cache" });
      await request.del(host + path, { foo: "bar" }).then((body2) => {
        expect(body2).to.deep.equal({ some: "content" });
      });
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
        headers: { "User-Agent": "request" },
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
        headers: { "User-Agent": "request" },
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
        headers: { "User-Agent": "request" },
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
        },
      };

      const fetch = fetchBuilder(behavior).fetch;
      fetch(host + path, (err) => {
        if (err) return done(err);
        expect(called).to.be.true;
        done();
      });
    });

    it("should honour call onRequestInit with followRedirect false", (done) => {
      let called = false;
      const behavior = {
        followRedirect: false,
        onRequestInit: function (options) {
          if (called) throw new Error("Called twice!");

          expect(options).to.have.property("url");
          expect(options).to.have.property("followRedirect", false);
          fake.get(path).reply(301, {}, { "cache-control": "no-cache", location: "http://example.com" });
          called = true;
        },
      };

      const fetch = fetchBuilder(behavior).fetch;
      fetch(host + path, (err, res) => {
        if (err) return done(err);
        expect(called).to.be.true;
        expect(res.statusCode).to.eql(301);
        expect(res.headers).to.have.property("location", "http://example.com");
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
        },
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
        },
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
        },
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

  describe("Got-style hooks", () => {
    it("should call beforeRequest hooks before making request", (done) => {
      const called = [];
      const behavior = {
        hooks: {
          beforeRequest: [
            (options) => {
              called.push("hook1");
              options.headers["x-custom"] = "injected";
            },
          ],
        },
      };

      nock(host).get(path)
        .matchHeader("x-custom", "injected")
        .reply(200, { ok: true }, { "cache-control": "no-cache" });

      const fetch = fetchBuilder(behavior).fetch;
      fetch(host + path, (err, body) => {
        if (err) return done(err);
        expect(called).to.deep.equal(["hook1"]);
        expect(body).to.deep.equal({ ok: true });
        done();
      });
    });

    it("should call multiple beforeRequest hooks in order", (done) => {
      const called = [];
      const behavior = {
        hooks: {
          beforeRequest: [
            () => { called.push("first"); },
            () => { called.push("second"); },
          ],
        },
      };

      fake.get(path).reply(200, {}, { "cache-control": "no-cache" });

      const fetch = fetchBuilder(behavior).fetch;
      fetch(host + path, (err) => {
        if (err) return done(err);
        expect(called).to.deep.equal(["first", "second"]);
        done();
      });
    });

    it("should call afterResponse hooks with response", (done) => {
      const responses = [];
      const behavior = {
        hooks: {
          afterResponse: [
            (response) => {
              responses.push(response.statusCode);
              return response;
            },
          ],
        },
      };

      fake.get(path).reply(200, { data: "yes" }, { "cache-control": "no-cache" });

      const fetch = fetchBuilder(behavior).fetch;
      fetch(host + path, (err, body) => {
        if (err) return done(err);
        expect(responses).to.deep.equal([200]);
        expect(body).to.deep.equal({ data: "yes" });
        done();
      });
    });

    it("should allow afterResponse to modify the response", (done) => {
      const behavior = {
        hooks: {
          afterResponse: [
            (response) => {
              response.body = { modified: true };
              return response;
            },
          ],
        },
      };

      fake.get(path).reply(200, { original: true }, { "cache-control": "no-cache" });

      const fetch = fetchBuilder(behavior).fetch;
      fetch(host + path, (err, body) => {
        if (err) return done(err);
        expect(body).to.deep.equal({ modified: true });
        done();
      });
    });

    it("should call beforeError hooks to transform errors", (done) => {
      const behavior = {
        timeout: 50,
        hooks: {
          beforeError: [
            (error) => {
              error.customProperty = "enriched";
              return error;
            },
          ],
        },
      };

      nock(host).get("/hooks-error-test").delay(200).reply(200, {}, { "cache-control": "no-cache" });

      const fetch = fetchBuilder(behavior).fetch;
      fetch(`${host}/hooks-error-test`, (err) => {
        expect(err).to.exist;
        expect(err.customProperty).to.equal("enriched");
        done();
      });
    });

    it("should call beforeRetry hooks before retrying", (done) => {
      const retryCalls = [];
      const behavior = {
        retry: { limit: 2, calculateDelay: () => 0 },
        hooks: {
          beforeRetry: [
            (error, retryCount) => {
              retryCalls.push({ retryCount });
            },
          ],
        },
      };

      nock(host).get("/hooks-retry-test").reply(503, {}, { "cache-control": "no-cache" });
      nock(host).get("/hooks-retry-test").reply(503, {}, { "cache-control": "no-cache" });
      nock(host).get("/hooks-retry-test").reply(200, { ok: true }, { "cache-control": "no-cache" });

      const fetch = fetchBuilder(behavior).fetch;
      fetch(`${host}/hooks-retry-test`, (err, body) => {
        if (err) return done(err);
        expect(retryCalls).to.have.length(2);
        expect(body).to.deep.equal({ ok: true });
        done();
      });
    });

    it("should work with empty hooks object", (done) => {
      const behavior = { hooks: {} };

      fake.get(path).reply(200, { ok: true }, { "cache-control": "no-cache" });

      const fetch = fetchBuilder(behavior).fetch;
      fetch(host + path, (err, body) => {
        if (err) return done(err);
        expect(body).to.deep.equal({ ok: true });
        done();
      });
    });

    it("should support async beforeRequest hooks", async () => {
      const behavior = {
        hooks: {
          beforeRequest: [
            async (options) => {
              options.headers["x-async"] = "async-value";
            },
          ],
        },
      };

      nock(host).get(path)
        .matchHeader("x-async", "async-value")
        .reply(200, { async: true }, { "cache-control": "no-cache" });

      const fetch = fetchBuilder(behavior).fetch;
      const body = await fetch(host + path);
      expect(body).to.deep.equal({ async: true });
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
        },
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
        },
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
        },
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
      fake.get(path).reply(200, { some: "content" }, { "cache-control": "max-age=30" });
      function cacheKeyFn(key) {
        return new URL(key).pathname.replace(/\//g, "");
      }

      const fetch = fetchBuilder({ cacheKeyFn }).fetch;
      Promise.all([
        fetch(host + path),
        fetch(`http://other.expample.com${path}`),
        fetch(`${host}/testing/123/`),
      ]).then((result) => {
        expect(result[0]).to.deep.equal({ some: "content" });
        expect(result[0]).to.deep.equal(result[1]).eql(result[2]);
        done();
      }, done);
    });

    it("should cache with a lookup function using the headers", (done) => {
      fake.get(path).matchHeader("foo", "foo").reply(200, { some: "content" }, { "cache-control": "max-age=30" });
      fake.get(path).matchHeader("foo", "foo2").reply(200, { some: "content2" }, { "cache-control": "max-age=30" });
      function cacheKeyFn(url, body, headers) {
        const cacheKey = crypto.createHash("md5").update(`${url} ${headers.foo}`).digest("hex");
        return cacheKey;
      }

      const fetch = fetchBuilder({ cacheKeyFn }).fetch;
      Promise.all([
        fetch({ url: host + path, headers: { foo: "foo" } }),
        fetch({ url: host + path, headers: { foo: "foo2" } }),
        fetch({ url: host + path, headers: { foo: "foo2" } }),
        fetch({ url: host + path, headers: { foo: "foo" } }),
      ]).then((result) => {
        expect(result[0]).to.deep.equal({ some: "content" }).eql(result[3]);
        expect(result[1]).to.deep.equal({ some: "content2" }).eql(result[2]);
        done();
      }, done);
    });

    it("should cache with a custom value function", (done) => {
      fake.get(path).reply(200, { some: "content" }, { "cache-control": "max-age=30" });
      const valueFn = function (body, headers, statusCode) {
        return {
          body,
          headers,
          statusCode,
        };
      };
      const fetch = fetchBuilder({ cacheValueFn: valueFn }).fetch;
      fetch(host + path, (err, content) => {
        expect(content).to.deep.equal({
          body: { some: "content" },
          headers: {
            "content-type": "application/json",
            "cache-control": "max-age=30",
          },
          statusCode: 200,
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
            link: "http://www.expressen.se/",
          },
        });
        done(err);
      });
    });

    it("should fetch plain text", (done) => {
      const fetch = fetchBuilder({ contentType: "text" }).fetch;
      const textResponse = "This is just plain text";
      fake.get(path).reply(200, textResponse, { ContentType: "text/html" });
      fetch(host + path, (err, body) => {
        expect(body).to.deep.equal("This is just plain text");
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

  describe("user-agent header", () => {
    it("should include user-agent and version from package.json", () => {
      const fetch = fetchBuilder({ contentType: "json" }).fetch;
      const packageInfo = require("../package.json");
      fake
        .get(path)
        .matchHeader("User-Agent", `exp-fetch/${packageInfo.version}`)
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
          statusCodes: [ 500, 503 ],
        },
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
      const fetch = fetchBuilder({ timeout: 50 }).fetch;

      nock(host)
        .get(path)
        .delay(600)
        .reply(200, { some: "content" });

      fetch(host + path, (err) => {
        if (!err) return done(new Error("No timeout"));
        expect(err.message).to.include("timed out after");
        expect(err.message).to.include("50ms");
        expect(err.code).to.equal("TIMEOUT");
        done();
      });
    });

    it("should honour socket timeout set in behavior", (done) => {
      const fetch = fetchBuilder({ timeout: { socket: 50 } }).fetch;

      nock(host)
        .get(path)
        .delay(200)
        .reply(200, { some: "content" });

      fetch(host + path, (err) => {
        if (!err) return done(new Error("No socket timeout"));
        expect(err.message).to.include("timed out after");
        expect(err.message).to.include("50ms");
        expect(err.code).to.equal("TIMEOUT");
        done();
      });
    });

    it("should honour response timeout set in behavior", (done) => {
      const fetch = fetchBuilder({
        timeout: {
          socket: 500,
          request: 100,
        },
      }).fetch;

      nock(host)
        .get(path)
        .delay(300)
        .reply(200, { some: "content" });

      fetch(host + path, (err) => {
        if (!err) return done(new Error("No response timeout"));
        expect(err.message).to.include("timed out after");
        expect(err.message).to.include("100ms");
        expect(err.code).to.equal("TIMEOUT");
        done();
      });
    });

    it("should allow overriding behavior timeout per request", (done) => {
      const fetch = fetchBuilder({ timeout: 2000 }).fetch;
      nock(host)
        .get(path)
        .delay(200)
        .reply(200, { some: "content" });

      fetch({ url: host + path, timeout: 50 }, (err) => {
        if (!err) return done(new Error("No timeout"));
        expect(err.message).to.include("timed out after");
        expect(err.message).to.include("50ms");
        expect(err.code).to.equal("TIMEOUT");
        done();
      });
    });

    it("should allow overriding timeout behavior with object for socket timeout", (done) => {
      const fetch = fetchBuilder({ timeout: 2000 }).fetch;
      nock(host)
        .get(path)
        .delay(200)
        .reply(200, { some: "content" });

      fetch({
        url: host + path,
        timeout: { socket: 50 },
      }, (err) => {
        if (!err) return done(new Error("No timeout"));
        expect(err.message).to.include("timed out after");
        expect(err.message).to.include("50ms");
        expect(err.code).to.equal("TIMEOUT");
        done();
      });
    });

    it("should allow overriding behavior timeout per request when following redirects", (done) => {
      const fetch = fetchBuilder({ timeout: 2000 }).fetch;
      nock(host)
        .get(path)
        .reply(301, null, { location: `${host}/someotherpath` });

      nock(host)
        .get("/someotherpath")
        .delay(200)
        .reply(200, { some: "content" });
      fetch({ url: host + path, timeout: 50 }, (err) => {
        if (!err) return done(new Error("No timeout"));
        expect(err.message).to.include("timed out after");
        expect(err.code).to.equal("TIMEOUT");
        done();
      });
    });

    it("should allow overriding behavior timeout per request when using promises", (done) => {
      const fetch = fetchBuilder({ timeout: 2000 }).fetch;
      nock(host)
        .get(path)
        .delay(200)
        .reply(200, { some: "content" });
      fetch({ url: host + path, timeout: 50 }).catch((err) => {
        if (!err) return done(new Error("No timeout"));
        expect(err.message).to.include("timed out after");
        expect(err.code).to.equal("TIMEOUT");
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
    const fetch = fetchBuilder({ headers: { "User-Agent": "request" } }).fetch;

    const options = {
      url: host + path,
      headers: { "X-Test": "test" },
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
