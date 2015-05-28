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
var passThrough = function (key) { return key; };

// todo: formatFunction/cacheFunction/lookupFunction

function buildFetch(behavior) {
  behavior = behavior || {};
  var freeze = behavior.freeze || false;
  var cache = new AsyncCache();
  var cacheKeyFn = behavior.cacheKeyFn || passThrough;
  var maxAgeFn = behavior.maxAgeFn || passThrough;
  var onNotFound = behavior.onNotFound;
  var onError = behavior.onError;
  var onSuccess = behavior.onSuccess;

  if (behavior.hasOwnProperty("cache")) {
    cache = behavior.cache || dummyCache;
  }

  var logger = behavior.logger || dummyLogger();

  function fetch(url, resultCallback) {
    var inner = function (callback) {

      var cacheKey = cacheKeyFn(url);
      cache.lookup(cacheKey, function (resolvedCallback) {
        logger.debug("fetching %s cacheKey '%s'", url, cacheKey);

        request.get({url: url, json: true, agent: keepAliveAgent}, function (err, res, content) {
          if (err) return resolvedCallback(new VError(err, "Fetching error for: %j", url));
          var maxAge = maxAgeFn(getMaxAge(res.headers["cache-control"]), cacheKey, res.headers, content);

          if (res.statusCode === 404 || typeof content !== "object") {
            logger.info("404 Not Found for: %j", url);
            if (onNotFound) {
              onNotFound(url, cacheKey, res.headers);
            }
            return resolvedCallback(null, null, maxAge);
          }

          if (res.statusCode > 200) {
            logger.warning("HTTP Fetching error %d for: %j", res.statusCode, url);
            if (onError) {
              onError(url, cacheKey, res.headers);
            }
            return resolvedCallback(new VError("%s yielded %s ", url, res.statusCode));
          }

          if (freeze) {
            Object.freeze(content);
          }
          if (onSuccess) {
            onSuccess(url, cacheKey, res.headers);
          }
          return resolvedCallback(null, content, maxAge);
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

  return fetch;

}

module.exports = buildFetch;
