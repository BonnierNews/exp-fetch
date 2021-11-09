"use strict";

const fetchBuilder = require("../index.js");
const nock = require("nock");

describe("Posting", () => {
  const host = "http://example.com";
  const path = "/testing123";
  const fake = nock(host);
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

  it("should make a post request", (done) => {
    const fetch = fetchBuilder({ httpMethod: "POST" }).fetch;
    const body = { q: "term" };
    const response = { a: 1, b: 2 };

    fakeResponse(path, body, response);
    fetch(host + path, body, (err, content) => {
      if (!err) {
        expect(content).to.deep.equal(response);
      }
      done(err);
    });
  });

  it("should handle xml-post", (done) => {
    const fetch = fetchBuilder({ httpMethod: "POST", contentType: "dontparse" }).fetch;
    const body = "<?xml version=\"1.0\" encoding=\"utf-8\"?><q>search</q>";
    const responseBody = "<?xml version=\"1.0\" encoding=\"utf-8\"?><a>response</a>";

    fakeResponse(path, body, responseBody);
    fetch(host + path, body, (err, content) => {
      if (!err) {
        expect(content).to.deep.equal(responseBody);
      }
      done(err);
    });
  });

  it("should follow a redirect when posting", (done) => {
    const fetch = fetchBuilder({ httpMethod: "POST" }).fetch;
    const body = { q: "term" };
    const response = { c: 1, d: 2 };
    fakeRedirect("/someOtherPath", path);
    fakeResponse(path, body, response);
    fetch(`${host}/someOtherPath`, body, (err, content) => {
      if (!err) {
        expect(content).to.deep.equal(response);
      }
      done(err);
    });
  });

  it("should cache on url and body by default", (done) => {
    const fetch = fetchBuilder({ httpMethod: "POST" }).fetch;
    const bodyOne = { q: "term" };
    const responseOne = { a: 1, b: 2 };
    const bodyTwo = { q: "another world" };
    const responseTwo = { c: 1, d: 2 };

    fakeResponse(path, bodyOne, responseOne);
    fakeResponse(path, bodyTwo, responseTwo);

    fetch(host + path, bodyOne, (_err0, content0) => {
      if (_err0) return done(_err0);
      expect(content0).to.deep.equal(responseOne);
      fetch(host + path, bodyOne, (_err1, content1) => {
        if (_err1) return done(_err1);
        expect(content1).to.deep.equal(responseOne);

        fetch(host + path, bodyTwo, (_err2, content2) => {
          if (_err2) return done(_err2);
          expect(content2).to.deep.equal(responseTwo);
          done();
        });
      });
    });
  });
});
