"use strict";

var AsyncCache = require("exp-asynccache");
var LRU = require("lru-cache");
var chai = require("chai");
var should = chai.should();
var Promise = require("bluebird");
var nock = require("nock");
var fetchBuilder = require("../.");
//var Log = require("log");
nock.disableNetConnect();
nock.enableNetConnect(/(localhost|127\.0\.0\.1):\d+/);
var util = require("util");

describe("Freezing of result", function() {
  var host = "http://example.com";
  var path = "/testing123";
  var fake = nock(host);
  afterEach(nock.cleanAll);

  var fetch = fetchBuilder({
    clone: false
  }).fetch;

  it("should not freeze content if freeze is set to false", function(done) {
    var localFetch = fetchBuilder({freeze: false,clone: false}).fetch;
    fake.get(path).reply(200, {
      some: "content",
      child: {
        some: "child-content"
      }
    }, {
      "cache-control": "no-cache"
    });
    localFetch(host + path, function(err, content) {
      Object.isFrozen(content).should.be.false;
      Object.isFrozen(content.child).should.be.false;
      done(err);
    });
  });

  it("should freeze the result root but not descendants by default", function(done) {
    var localFetch = fetchBuilder({clone: false}).fetch;
    fake.get(path).reply(200, {
      some: "content",
      child: {
        some: "child-content"
      }
    }, {
      "cache-control": "no-cache"
    });
    localFetch(host + path, function(err, content) {
      Object.isFrozen(content).should.be.true;
      Object.isFrozen(content.child).should.be.false;
      done(err);
    });
  });

  it("should freeze objects recursively if deepFreeze is set to true", function(done) {
    var localFetch = fetchBuilder({deepFreeze: true, clone: false}).fetch;
    fake.get(path).reply(200, {
      some: "content",
      child: {
        some: "child-content"
      }
    }, {
      "cache-control": "no-cache"
    });
    localFetch(host + path, function(err, content) {
      Object.isFrozen(content).should.be.true;
      Object.isFrozen(content.child).should.be.true;
      done(err);
    });
  });

  it("should return a frozen object if freeze:true and clone:true", function(done) {
    var localFetch = fetchBuilder({freeze: true,clone: true}).fetch;
    fake.get(path).reply(200, {
      some: "content"
    }, {
      "cache-control": "no-cache"
    });
    localFetch(host + path, function(err, content) {
      Object.isFrozen(content).should.be.true;
      done(err);
    });
  });

  it("should return a deep frozen object if deepFreeze:true and clone:true", function(done) {
    var localFetch = fetchBuilder({deepFreeze: true, clone: true}).fetch;
    fake.get(path).reply(200, {
      some: "content",
      child: {
        some: "child-content"
      }
    }, {
      "cache-control": "no-cache"
    });
    localFetch(host + path, function(err, content) {
      Object.isFrozen(content).should.be.true;
      Object.isFrozen(content.child).should.be.true;
      done(err);
    });
  });

  describe("cache is remote (i.e returns new objects each time)", function() {
      function fakeRemoteCache() {
        var cache = new LRU();
        return {
          get: function(key) {
            var result = cache.get(key)
            if (result) {
              return JSON.parse(JSON.stringify(result))
            }
            return result;
          },
          set: cache.set.bind(cache),
          del: cache.del.bind(cache),
          has: cache.has.bind(cache)
        };
      }
    it("should return frozed objects if freeze is set to true", function(done) {
      var cloningCache = fakeRemoteCache();
      var cache = new AsyncCache(cloningCache);
      var localFetch = fetchBuilder({freeze: true, cache: cache, clone: false}).fetch;
      cloningCache.set(host + path, Object.freeze({some: "content"}));
      localFetch(host + path, function(err, content) {
        if (!err) {
          should.exist(content);
          content.should.eql({some: "content"});
          Object.isFrozen(content).should.be.true;
        }
        done(err);
      });
    });

    it("should return a deep frozed objects if deepFreeze is set to true", function(done) {
      var cloningCache = fakeRemoteCache();
      var cache = new AsyncCache(cloningCache);
      var localFetch = fetchBuilder({deepFreeze: true, cache: cache, clone: false}).fetch;
      cloningCache.set(host + path, Object.freeze({some: "content"}));
      localFetch(host + path, function(err, content) {
        if (!err) {
          should.exist(content);
          content.should.eql({some: "content"});
          Object.isFrozen(content).should.be.true;
        }
        done(err);
      });
    });

  });
});