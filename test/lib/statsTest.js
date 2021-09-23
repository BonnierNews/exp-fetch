"use strict";

const nock = require("nock");
const fetchBuilder = require("../../.");

describe("fetch stats", () => {
  const host = "http://example.com";
  const path = "/testing123";
  const fake = nock(host);
  afterEach(nock.cleanAll);
  const fetch = fetchBuilder();

  it("stats should be all zero at start", () => {
    expect(fetch.stats()).to.deep.equal({calls: 0, cacheHitRatio: 0});
  });

  it("should have zero hit ratio after first access", (done) => {
    fake.get(path).reply(200);
    fetch.fetch(host + path, (err) => {
      if (err) return done(err);
      expect(fetch.stats()).to.deep.equal({calls: 1, cacheHitRatio: 0});
      done();
    });
  });

  it("should have 50% hit ratio after another access", (done) => {
    fetch.fetch(host + path, (err) => {
      if (err) return done(err);
      expect(fetch.stats()).to.deep.equal({calls: 2, cacheHitRatio: 0.5});
      done();
    });
  });
});
