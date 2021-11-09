"use strict";

const initCache = require("../../lib/initCache");

describe("initCache", () => {
  it("should init a disabled cache if disabled", () => {
    const cache = initCache({ disabled: true });
    cache.set("key", "value");

    expect(cache.keys()).to.deep.equal([]);
    expect(cache.values()).to.deep.equal([]);

    expect(cache.get("key")).to.be.undefined;
    expect(cache.peek()).to.be.undefined;
    expect(cache.has("key")).to.be.false;
    expect(cache.length()).to.equal(0);
    expect(cache.itemCount()).to.equal(0);
    cache.forEach(() => {
      throw new Error("Should not be called");
    });

    expect(cache.del()).to.be.undefined;
    expect(cache.reset()).to.be.undefined;
  });

  it("should set the max on size param", () => {
    const cache = initCache({ size: 1, age: 1000, length: wrap(1) });
    cache.set("key", "value");
    cache.set("key2", "value2");
    expect(cache.get("key")).to.be.undefined;
    expect(cache.keys()).to.deep.equal([ "key2" ]);
    expect(cache.values()).to.deep.equal([ "value2" ]);
  });

  it("should set the age from param param", (done) => {
    const cache = initCache({ age: 0.002 });
    cache.set("key", "value");
    expect(cache.get("key")).to.equal("value");
    setTimeout(() => {
      expect(cache.get("key")).to.be.undefined;
      expect(cache.keys()).to.deep.equal([]);
      expect(cache.values()).to.deep.equal([]);
      done();
    }, 5);
  });

});

function wrap(value) {
  return function () {
    return value;
  };
}
