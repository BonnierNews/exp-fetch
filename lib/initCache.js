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
    get: function () {
      return undefined;
    },
    set: function () {},
    values: function () {
      return [];
    },
    keys: function () {
      return [];
    },
    reset: function () {},
    del: function () {}
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
