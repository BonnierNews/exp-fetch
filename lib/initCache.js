"use strict";

const LRU = require("lru-cache");

module.exports = function initCache(cacheConfig) {
  cacheConfig = cacheConfig || { disabled: true };
  if ([ true, "true" ].includes(cacheConfig.disabled)) {
    return disabledCache();
  } else {
    const maxAge = 1000 * Number(cacheConfig.age || cacheConfig.maxAge) || 60;
    const lruCache = new LRU({
      maxAge,
      max: Number(cacheConfig.size || cacheConfig.max) || 2_000_000,
    });

    if (maxAge > 0) {
      setInterval(() => {
        lruCache.prune();
      }, maxAge).unref();
    }

    return lruCache;
  }
};

function disabledCache() {
  return {
    set: noop,
    get: noop,
    peek: noop,
    del: noop,
    reset: noop,
    has: function () {
      return false;
    },
    forEach: noop,
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
    },
  };
}

function noop() {}
