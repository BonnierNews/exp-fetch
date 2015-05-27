"use strict";
var request = require("request");
var VError = require("verror");
var AsyncCache = require("exp-asynccache");

var getMaxAge = require("./lib/maxAgeFromHeader.js");
var keepAliveAgent = require("./lib/keepAliveAgent");
var dummyLogger = require("./lib/dummyLogger");
var Promise = require("bluebird");
// var logger = require("./logger.js");
// var caches = require("./caches.js");
// var cache = new AsyncCache(caches.content);

var dummyCache = {
  lookup: function (url, resolve, callback) {
    return resolve(callback);
  }
};

// todo: formatFunction/cacheFunction/lookupFunction

function buildFetch(behavior) {
  behavior = behavior || {};
  var freeze = behavior.freeze || false;
  var cache = new AsyncCache();

  if (behavior.hasOwnProperty("cache")) {
    cache = behavior.cache || dummyCache;
  }

  var logger = behavior.logger || dummyLogger();

  function fetch(url, resultCallback) {
    var inner = function (callback) {
      cache.lookup(url, function (resolvedCallback) {
        logger.debug("fetching", url);

        request.get({url: url, json: true, agent: keepAliveAgent}, function (err, res, content) {
          if (err) return resolvedCallback(new VError(err, "Fetching error for: %j", url));

          if (res.statusCode !== 200) {
            if (res.statusCode === 404) {
              logger.info("404 Not Found for: %j", url);
            } else {
              logger.warning("HTTP Fetching error %d for: %j", res.statusCode, url);
            }
            return resolvedCallback(null, null, getMaxAge(res.headers["cache-control"]));
          }

          if (freeze) {
            Object.freeze(content);
          }
          return resolvedCallback(null, content, getMaxAge(res.headers["cache-control"]));
        });
      }, callback);
    };

    if (resultCallback) {
      inner(resultCallback);
    } else {
      return new Promise(function (resolve, reject) {
        inner(function (err, content) {
          if (err) return reject(err);
          return resolve(content);
        });
      });
    }

  }

  var api = {
    fetch: fetch,
    cache: cache,
    clearCache: function () {
      if (cache && cache.cache) {
        return cache.cache.reset();
      }
    }
  };
  return api;

}

module.exports = buildFetch;
