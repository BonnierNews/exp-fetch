"use strict";
var request = require("request");
var VError = require("verror");
var AsyncCache = require("exp-asynccache");
var xml2js = require("xml2js");

var getMaxAge = require("./lib/maxAgeFromHeader.js");
var dummyLogger = require("./lib/dummyLogger");
var Promise = require("bluebird");
var isNumber = require("./lib/isNumber");
var dummyCache = require("./lib/dummyCache");
var initCache = require("./lib/initCache");
var Agent = require("forever-agent");

var passThrough = function (key) { return key; };

function parseResponse(content, contentType, callback) {
  if (contentType === "xml") {
    return xml2js.parseString(content, {explicitArray: false}, callback);
  }
  return callback(null, content);
}

function buildFetch(behavior) {
  behavior = behavior || {};

  // Options
  var freeze = behavior.freeze || false;
  var cache = new AsyncCache(initCache({age: 60}));
  var cacheKeyFn = behavior.cacheKeyFn || passThrough;
  var maxAgeFn = behavior.maxAgeFn || passThrough;
  var onNotFound = behavior.onNotFound;
  var onError = behavior.onError;
  var onSuccess = behavior.onSuccess;
  var cacheNotFound = false;
  var logger = behavior.logger || dummyLogger();
  var errorOnRemoteError = true;
  var contentType = (behavior.contentType || "json").toLowerCase();
  var keepAliveAgent = new Agent(behavior.agentOptions || {});

  if (behavior.hasOwnProperty("errorOnRemoteError")) {
    errorOnRemoteError = !!behavior.errorOnRemoteError;
  }

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
    var error = errorOnRemoteError ? new VError("%s yielded %s ", url, res.statusCode) : null;
    return resolvedCallback(error);
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

        var options = {
          url: url,
          json: contentType === "json",
          agent: keepAliveAgent
        };
        request.get(options, function (err, res, content) {
          if (err) return resolvedCallback(new VError(err, "Fetching error for: %j", url));

          if (res.statusCode === 404) {
            return handleNotFound(url, cacheKey, res, content, resolvedCallback);
          } else if (res.statusCode > 200) {
            return handleError(url, cacheKey, res, content, resolvedCallback);
          }

          return parseResponse(content, contentType, function (err, transformed) {
            return handleSuccess(url, cacheKey, res, transformed, resolvedCallback);
          });
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
module.exports.initLRUCache = initCache;
