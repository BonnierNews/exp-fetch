"use strict";
var request = require("request");
var VError = require("verror");
var AsyncCache = require("exp-asynccache");

var getMaxAge = require("./lib/maxAgeFromHeader.js");
var keepAliveAgent = require("./lib/keepAliveAgent");
var dummyLogger = require("./lib/dummyLogger");
var Promise = require("bluebird");

var dummyCache = {
  lookup: function (url, resolve, callback) {
    return resolve(callback);
  }
};

function isNumber(o) {
  return !isNaN(o - 0) && o !== null && o !== "" && o !== false;
}
var passThrough = function (key) { return key; };

// todo: formatFunction/cacheFunction/lookupFunction

function buildFetch(behavior) {
  behavior = behavior || {};

  // Options
  var freeze = behavior.freeze || false;
  var cache = new AsyncCache();
  var cacheKeyFn = behavior.cacheKeyFn || passThrough;
  var maxAgeFn = behavior.maxAgeFn || passThrough;
  var onNotFound = behavior.onNotFound;
  var onError = behavior.onError;
  var onSuccess = behavior.onSuccess;
  var cacheNotFound = false;
  var logger = behavior.logger || dummyLogger();

  if (behavior.hasOwnProperty("cacheNotFound")) {
    cacheNotFound = behavior.cacheNotFound;
  }

  if (behavior.hasOwnProperty("cache")) {
    cache = behavior.cache || dummyCache;
  }

  function handleNotFound(url, cacheKey, res, content, resolvedCallback) {
    logger.info("404 Not Found for: %j", url);
    var notFoundAge = -1;

    if (onNotFound) {
      onNotFound(url, cacheKey, res, content);
    }
    if (cacheNotFound) {
      notFoundAge = isNumber(cacheNotFound) ? Number(cacheNotFound) : getMaxAge(res.headers["cache-control"]);
    }
    notFoundAge = maxAgeFn(notFoundAge, cacheKey, res, content);
    return resolvedCallback(null, null, notFoundAge);
  }

  function handleError(url, cacheKey, res, content, resolvedCallback) {
    logger.warning("HTTP Fetching error %d for: %j", res.statusCode, url);
    if (onError) {
      onError(url, cacheKey, res, content);
    }
    return resolvedCallback(new VError("%s yielded %s ", url, res.statusCode));
  }

  function handleSuccess(url, cacheKey, res, content, resolvedCallback) {
    var maxAge = maxAgeFn(getMaxAge(res.headers["cache-control"]), cacheKey, res, content);
    if (freeze && typeof content === "object") {
      Object.freeze(content);
    }
    if (onSuccess) {
      onSuccess(url, cacheKey, res, content);
    }
    return resolvedCallback(null, content, maxAge);
  }

  // The main fetch function
  return function fetch(url, resultCallback) {
    var inner = function (callback) {

      var cacheKey = cacheKeyFn(url);
      cache.lookup(cacheKey, function (resolvedCallback) {
        logger.debug("fetching %s cacheKey '%s'", url, cacheKey);

        request.get({url: url, json: true, agent: keepAliveAgent}, function (err, res, content) {
          if (err) return resolvedCallback(new VError(err, "Fetching error for: %j", url));

          if (res.statusCode === 404) {
            return handleNotFound(url, cacheKey, res, content, resolvedCallback);
          } else if (res.statusCode > 200) {
            return handleError(url, cacheKey, res, content, resolvedCallback);
          }

          return handleSuccess(url, cacheKey, res, content, resolvedCallback);
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
  };

}

module.exports = buildFetch;
