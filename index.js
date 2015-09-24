"use strict";
var request = require("request");
var VError = require("verror");
var AsyncCache = require("exp-asynccache");
var Promise = require("bluebird");
var clone = require("clone");
var util = require("util");

var getMaxAge = require("./lib/maxAgeFromHeader.js");
var dummyLogger = require("./lib/dummyLogger");
var isNumber = require("./lib/isNumber");
var dummyCache = require("./lib/dummyCache");
var initCache = require("./lib/initCache");
var parseResponse = require("./lib/parseResponse");
var calculateCacheKey = require("./lib/calculateCacheKey");
var isRedirect = require("./lib/isRedirect");
var ensureAbsoluteUrl = require("./lib/ensureAbsoluteUrl");

var passThrough = function (key) { return key; };

function buildFetch(behavior) {
  behavior = behavior || {};

  // Options
  var freeze = true;
  var cache = new AsyncCache(initCache({age: 60}));
  var cacheKeyFn = behavior.cacheKeyFn || calculateCacheKey;
  var cacheValueFn = behavior.cacheValueFn || passThrough;
  var maxAgeFn = behavior.maxAgeFn || passThrough;
  var onNotFound = behavior.onNotFound;
  var onError = behavior.onError;
  var onSuccess = behavior.onSuccess;
  var cacheNotFound = false;
  var logger = behavior.logger || dummyLogger();
  var errorOnRemoteError = true;
  var contentType = (behavior.contentType || "json").toLowerCase();
  var keepAliveAgent = behavior.agent;
  var followRedirect = true;
  var performClone = true;
  var maximumNumberOfRedirects = 10;
  var httpMethod = (behavior.httpMethod || "GET").toUpperCase();
  var timeout = behavior.timeout || 20000;
  var stats = {calls: 0, misses: 0};

  function defaultRequestTimeFn(requestOptions, took) {
    logger.debug("fetching %s: %s took %sms", requestOptions.method, requestOptions.url, took);
  }
  var requestTimeFn = behavior.requestTimeFn || defaultRequestTimeFn;

  if (behavior.hasOwnProperty("clone")) {
    performClone = !!behavior.clone;
  }

  if (behavior.hasOwnProperty("freeze")) {
    freeze = !!behavior.freeze;
  }

  if (behavior.hasOwnProperty("followRedirect")) {
    followRedirect = !!behavior.followRedirect;
  }

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
    return resolvedCallback(null, cacheValueFn(null, res.headers, res.statusCode), notFoundAge);
  }

  function handleError(url, cacheKey, res, content, resolvedCallback) {
    logger.warning("HTTP Fetching error %d for: %j", res.statusCode, url);
    if (onError) {
      onError(url, cacheKey, res, content);
    }
    var error = errorOnRemoteError ? new VError("%s yielded %s (%s)", url, res.statusCode, util.inspect(content)) : null;
    return resolvedCallback(error, cacheValueFn(undefined, res.headers, res.statusCode));
  }

  function handleSuccess(url, cacheKey, res, content, resolvedCallback) {
    var maxAge = maxAgeFn(getMaxAge(res.headers["cache-control"]), cacheKey, res, content);
    if (freeze && typeof content === "object") {
      Object.freeze(content);
    }
    if (onSuccess) {
      onSuccess(url, cacheKey, res, content);
    }

    return resolvedCallback(null, cacheValueFn(content, res.headers, res.statusCode), maxAge);
  }

  function handleRedirect(url, cacheKey, res, body, resolvedCallback) {
    var maxAge = maxAgeFn(getMaxAge(res.headers["cache-control"]), cacheKey, res, body);

    var content = {
      statusCode: res.statusCode,
      headers: res.headers
    };
    return resolvedCallback(null, content, maxAge);
  }

  function performRequest(url, body, redirectCount, callback, onRequestInit) {
    var cacheKey = cacheKeyFn(url, body);
    var startTime = new Date().getTime();
    stats.calls++;
    cache.lookup(cacheKey, function (resolveFunction) {
      stats.misses++;
      logger.debug("fetching %s cacheKey '%s'", url, cacheKey);

      var options = {
        url: url,
        json: contentType === "json",
        agent: keepAliveAgent,
        followRedirect: false,
        method: httpMethod,
        timeout: timeout
      };

      if (body) {
        options.body = body;
      }

      var passOptions = {
        url: options.url,
        json: options.json,
        method: options.method,
        followRedirect: followRedirect
      };
      if (onRequestInit && !onRequestInit.called) {

        onRequestInit(passOptions, cacheKey);
      }

      function resolvedCallback(err, content, maxAge) {
        requestTimeFn(passOptions, new Date().getTime() - startTime);
        resolveFunction(err, content, maxAge);
      }

      request(options, function (err, res, content) {
        if (err) return resolvedCallback(new VError(err, "Fetching error for: %j", url));
        if (isRedirect(res)) return handleRedirect(url, cacheKey, res, content, resolvedCallback);

        if (res.statusCode === 404) {
          return handleNotFound(url, cacheKey, res, content, resolvedCallback);
        } else if (res.statusCode > 299) {
          return handleError(url, cacheKey, res, content, resolvedCallback);
        }

        return parseResponse(content, contentType, function (err, transformed) {
          return handleSuccess(url, cacheKey, res, transformed, resolvedCallback);
        });
      });
    }, function (err, response) {
      if (followRedirect && isRedirect(response)) {
        if (redirectCount++ < maximumNumberOfRedirects) {
          var location = ensureAbsoluteUrl(response.headers, url);
          return performRequest(location, body, redirectCount, callback);
        } else {
          return callback(new VError("Maximum number of redirects exceeded while fetching", url));
        }
      }
      callback(err, (performClone ? clone(response) : response));
    });
  }

  // The main fetch function
  var ret = function fetch(url, optionalBody, resultCallback) {
    if (typeof optionalBody === "function") {
      resultCallback = optionalBody;
      optionalBody = null;
    }
    var onRequestInit = function () {
      if (behavior.onRequestInit) {
        behavior.onRequestInit.apply(null, arguments);
      }
      onRequestInit.called = true;
    };

    if (resultCallback) {
      performRequest(url, optionalBody, 0, resultCallback, onRequestInit);
    } else {
      return new Promise(function (resolve, reject) {
        performRequest(url, optionalBody, 0, function (err, content) {
          if (err) return reject(err);
          return resolve(content);
        }, onRequestInit);
      });
    }
  };

  ret.stats = function () {
    return {
      calls: stats.calls,
      cacheHitRatio: stats.calls > 0 ? (stats.calls - stats.misses) /  stats.calls : 0
    };
  };

  return ret;

}

module.exports = buildFetch;
module.exports.initLRUCache = initCache;
