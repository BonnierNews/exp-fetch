"use strict";

const fetchBuilder = require("../../.");
const nock = require("nock");

describe("Fetching redirected resources", () => {
  const host = "http://example.com";
  const path = "/testing123";
  const fake = nock(host);
  afterEach(nock.cleanAll);

  function fakeRedirect(from, to, times) {
    fake
      .get(from)
      .times(times || 1)
      .reply(302, "", {
        Location: to,
        "cache-control": "no-cache"
      });
  }

  it("should cache redirects", (done) => {
    const fetch = fetchBuilder().fetch;
    fakeRedirect(path, "/otherPath");
    fake.get("/otherPath").reply(200, {some: "content"});
    fetch(host + path, (err, content) => {
      expect(content).to.deep.equal({some: "content"});
      done(err);
    });
  });

  it("should handle get params", (done) => {
    const fetch = fetchBuilder().fetch;
    fakeRedirect(path, "/otherPath?contentId=22");
    fake.get("/otherPath?contentId=11").reply(200, {some: "content11"});
    fake.get("/otherPath?contentId=22").reply(200, {some: "content22"});
    fetch(host + path, (err, content) => {
      expect(content).to.deep.equal({some: "content22"});
      done(err);
    });
  });

  it("should cache redirects on the destination url", (done) => {
    const fetch = fetchBuilder().fetch;
    fakeRedirect(path, host + "/otherPath");
    fake.get("/otherPath").reply(200, {some: "content"});
    fetch(host + path, (_, content0) => {
      expect(content0).to.deep.equal({some: "content"});
      fetch(host + "/otherPath", (err, content) => {
        expect(content).to.deep.equal({some: "content"});
        done(err);
      });
    });
  });

  it("should only cache the redirection on the fromUrl", (done) => {
    const fetch = fetchBuilder().fetch;
    fakeRedirect(path, host + "/otherPath");
    fake.get("/otherPath").reply(200, {some: "content"});
    fake.get("/otherPath2").reply(200, {some: "otherContent"});
    fetch(host + path, (_, content0) => {
      expect(content0).to.deep.equal({some: "content"});
      fakeRedirect(path, "/otherPath2");
      fetch(host + path, (err, content) => {
        expect(content).to.deep.equal({some: "otherContent"});
        done(err);
      });
    });
  });

  it("should not follow redirects if followRedirect is set to false", (done) => {
    const fetch = fetchBuilder({followRedirect: false}).fetch;
    fakeRedirect(path, host + "/otherPath");
    fetch(host + path, (err, content) => {
      if (err) return done(err);
      expect(content).to.deep.equal({
        statusCode: 302,
        headers: {
          "cache-control": "no-cache",
          "location": host + "/otherPath"
        }
      });
      done(err);
    });
  });

  it("should only follow 10 redirects", (done) => {
    const fetch = fetchBuilder().fetch;
    fake.get("/20").reply(200, {some: "content"});
    fakeRedirect(path, host + "/1");
    for (let i = 1; i < 20; i++) {
      fakeRedirect("/" + i, host + "/" + (i + 1));
    }
    fetch(host + path, (err, content) => {
      expect(err).to.be.ok;
      expect(content).to.not.be.ok;
      done();
    });
  });

  it("should handle protocol and host changes", (done) => {
    const fetch = fetchBuilder().fetch;
    const secureHost = "https://secure-example.com";
    const secureFake = nock(secureHost);

    fakeRedirect(path, secureHost + path, 15);
    secureFake.get(path).reply(200, {some: "secure-content"});

    fetch(host + path, (err, content) => {
      if (err) return done(err);
      expect(content).to.deep.equal({some: "secure-content"});
      done();
    });
  });
});
