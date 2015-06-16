"use strict";
var request = require("request");
var VError = require("verror");
var AsyncCache = require("exp-asynccache");

var getMaxAge = require("./lib/maxAgeFromHeader.js");
var dummyLogger = require("./lib/dummyLogger");
var Promise = require("bluebird");
var isNumber = require("./lib/isNumber");
var dummyCache = require("./lib/dummyCache");
var initCache = require("./lib/initCache");
var Agent = require("forever-agent");
var parseResponse = require("./lib/parseResponse");

var util = require("util");
var url = require("url");
var passThrough = function (key) { return key; };

function isRedirect(response) {
  if (!response) return false;
  //if (!response.caseless.has("location")) return false;

  return response.statusCode >= 300 && response.statusCode < 400;
}

function ensureAbsoluteUrl(headers, uri) {
  var path = url.parse(headers.location).path;
  var parsed = url.parse(uri);
  return util.format("%s//%s%s", parsed.protocol, parsed.host, path);
}
function buildFetch(behavior) {
  behavior = behavior || {};

  // Options
  var freeze = true;
  var cache = new AsyncCache(initCache({age: 60}));
  var cacheKeyFn = behavior.cacheKeyFn || passThrough;
  var cacheValueFn = behavior.cacheValueFn || passThrough;
  var maxAgeFn = behavior.maxAgeFn || passThrough;
  var onNotFound = behavior.onNotFound;
  var onError = behavior.onError;
  var onSuccess = behavior.onSuccess;
  var cacheNotFound = false;
  var logger = behavior.logger || dummyLogger();
  var errorOnRemoteError = true;
  var contentType = (behavior.contentType || "json").toLowerCase();
  var keepAliveAgent = new Agent(behavior.agentOptions || {});
  var followRedirect = true;
  var maximumNumberOfRedirects = 10;
  var onRequestInitCalled = false;
  var onRequestInit = function() {
    if (behavior.onRequestInit) {
      behavior.onRequestInit.apply(null, arguments);
    } 
    onRequestInitCalled = true;
  };

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

  function performGet(url, redirectCount, callback) {
    var cacheKey = cacheKeyFn(url);
    cache.lookup(cacheKey, function (resolvedCallback) {
      logger.debug("fetching %s cacheKey '%s'", url, cacheKey);

      var options = {
        url: url,
        json: contentType === "json",
        agent: keepAliveAgent,
        followRedirect: false
      };

      if (!onRequestInitCalled) {
        var passOptions = {
          url: options.url,
          json: options.json,
          followRedirect: followRedirect
        };

        onRequestInit(passOptions, cacheKey);
      }

      request.get(options, function (err, res, content) {
        if (err) return resolvedCallback(new VError(err, "Fetching error for: %j", url));
        if (isRedirect(res)) return handleRedirect(url, cacheKey, res, content, resolvedCallback);

        if (res.statusCode === 404) {
          return handleNotFound(url, cacheKey, res, content, resolvedCallback);
        } else if (res.statusCode > 200) {
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
          return performGet(location, redirectCount, callback);
        } else {
          return callback(new VError("Maximum number of redirects exceeded while fetching", url));
        }
      }
      callback(err, response);
    });
  }

  // The main fetch function
  return function fetch(url, resultCallback) {
    onRequestInitCalled = false;
    if (resultCallback) {
      performGet(url, 0, resultCallback);
    } else {
      return new Promise(function (resolve, reject) {
        performGet(url, 0, function (err, content) {
          if (err) return reject(err);
          return resolve(content);
        });
      });
    }
  };

}

module.exports = buildFetch;
module.exports.initLRUCache = initCache;
