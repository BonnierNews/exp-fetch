"use strict";

const maxAgeFromHeader = require("../../lib/maxAgeFromHeader");

describe("maxAgeFromHeader", () => {

  it("should return null if no cache headers", () => {
    expect(maxAgeFromHeader(null)).to.be.null;
  });

  it("should return -1 (no cache) if cache headers contains private", () => {
    expect(maxAgeFromHeader("private, max-age=30")).to.equal(-1);
  });

  it("should return -1 (no cache) if cache headers contains no-cache", () => {
    expect(maxAgeFromHeader("no-cache, max-age=30")).to.equal(-1);
  });

  it("should return -1 (no cache) if cache headers contains max-age=0", () => {
    expect(maxAgeFromHeader("public, max-age=0")).to.equal(-1);
  });

  it("should return -1 (no cache) if cache headers contains must-revalidate", () => {
    expect(maxAgeFromHeader("must-revalidate")).to.equal(-1);
  });

  it("should return cache time (in millis) from max-age (in seconds)", () => {
    expect(maxAgeFromHeader("max-age=1")).to.equal(1000);
    expect(maxAgeFromHeader("max-age=10")).to.equal(10000);
    expect(maxAgeFromHeader("max-age=300")).to.equal(300000);
  });
});
