"use strict";
var LRU = require("lru-cache");

function purgeCache(lruCache) {
  // This will iterate over each cache entry and purge those that have expired.
  lruCache.forEach(function () {});
}

function defaultLengthFn(v) {
  return v && v.length || 1;
}

function disabledCache() {
  return {
    set: function () {},
    get: function () { return undefined; },
    peek: function () { return undefined; },
    del: function () {},
    reset: function () {},
    has: function () { return false; },
    forEach: function () {},
    keys: function () { return []; },
    values: function () { return []; },
    length: function () { return 0; },
    itemCount: function () { return 0; }
  };
}

function initCache(cacheConfig) {
  cacheConfig = cacheConfig || {
    disabled: true
  };
  if (cacheConfig.disabled === true || cacheConfig.disabled === "true") {
    return disabledCache();
  } else {
    var maxAge = 1000 * Number(cacheConfig.age || cacheConfig.maxAge || 60);
    var lruCache = new LRU({
      maxAge: maxAge,
      length: cacheConfig.length || defaultLengthFn,
      max: Number(cacheConfig.size || cacheConfig.max) || 2000000
    });

    if (maxAge > 0) {
      setInterval(function () {
        purgeCache(lruCache);
      }, maxAge).unref();
    }

    return lruCache;
  }
}

module.exports = initCache;
