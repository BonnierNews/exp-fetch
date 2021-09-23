"use strict";

const LRU = require("lru-cache");

module.exports = initCache;

function purgeCache(lruCache) {
  // This will iterate over each cache entry and purge those that have expired.
  lruCache.forEach(dummy);
}

function defaultLengthFn(v) {
  return v && v.length || 1;
}

function disabledCache() {
  return {
    set: dummy,
    get: function () {
      return undefined;
    },
    peek: function () {
      return undefined;
    },
    del: dummy,
    reset: dummy,
    has: function () {
      return false;
    },
    forEach: dummy,
    keys: function () {
      return [];
    },
    values: function () {
      return [];
    },
    length: function () {
      return 0;
    },
    itemCount: function () {
      return 0;
    }
  };
}

function initCache(cacheConfig) {
  cacheConfig = cacheConfig || {
    disabled: true
  };
  if (cacheConfig.disabled === true || cacheConfig.disabled === "true") {
    return disabledCache();
  } else {
    const maxAge = 1000 * Number(cacheConfig.age || cacheConfig.maxAge || 60);
    const lruCache = new LRU({
      maxAge: maxAge,
      length: cacheConfig.length || defaultLengthFn,
      max: Number(cacheConfig.size || cacheConfig.max) || 2000000
    });

    if (maxAge > 0) {
      setInterval(() => {
        purgeCache(lruCache);
      }, maxAge).unref();
    }

    return lruCache;
  }
}

function dummy() {}
