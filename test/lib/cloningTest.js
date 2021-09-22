"use strict";

const fetchBuilder = require("../../.");
const nock = require("nock");

describe("Fetching redirected resources", () => {
  const host = "http://example.com";
  const path = "/testing123";
  const fake = nock(host);
  afterEach(nock.cleanAll);

  function fakeResponse(pathName) {
    fake
      .get(pathName)
      .reply(200, {a: 1, b: 2});
  }

  it("should clone an object by default", (done) => {
    const fetch = fetchBuilder({freeze: false}).fetch;
    fakeResponse(path);
    fetch(host + path, (_, content0) => {
      expect(content0).to.deep.equal({a: 1, b: 2});
      content0.b = "other";
      fetch(host + path, (err, content1) => {
        expect(content1).to.deep.equal({a: 1, b: 2});
        done(err);
      });
    });
  });

  it("should not clone an object if clone is set to false", (done) => {
    const fetch = fetchBuilder({freeze: false, clone: false}).fetch;
    fakeResponse(path);
    fetch(host + path, (_, content0) => {
      expect(content0).to.deep.equal({a: 1, b: 2});
      content0.b = "other";
      fetch(host + path, (err, content1) => {
        expect(content1).to.deep.equal({a: 1, b: "other"});
        done(err);
      });
    });
  });

  function expected(content) {
    expect(content).to.deep.equal({
      statusCode: 302,
      headers: {
        "location": host + "/otherPath"
      }
    });

  }

  it("should clone redirects if followRedirect is set to false", (done) => {
    const fetch = fetchBuilder({followRedirect: false, freeze: false}).fetch;
    fake
      .get(path)
      .reply(302, "", {
        Location: host + "/otherPath"
      });

    fetch(host + path, (err0, content0) => {
      if (err0) return done(err0);
      expected(content0);
      content0.statusCode = 200;
      fetch(host + path, (err, content1) => {
        if (err) return done(err);
        expected(content1);
        done(err);
      });
    });
  });
});
