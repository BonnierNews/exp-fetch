"use strict";

const got = require("got");
const VError = require("verror");
const AsyncCache = require("exp-asynccache");
const clone = require("clone");
const util = require("util");

const getMaxAge = require("./lib/maxAgeFromHeader.js");
const dummyLogger = require("./lib/dummyLogger");
const isNumber = require("./lib/isNumber");
const dummyCache = require("./lib/dummyCache");
const initCache = require("./lib/initCache");
const parseResponse = require("./lib/parseResponse");
const calculateCacheKey = require("./lib/calculateCacheKey");
const isRedirect = require("./lib/isRedirect");
const currentAppConfig = require("./lib/currentAppConfig");
const path = require("path");

const expFetchConfig = require(path.join(__dirname, "package.json"));

module.exports = buildFetch;
module.exports.initLRUCache = initCache;

function buildFetch(behavior) {
  behavior = behavior || {};

  // Options
  let freeze = true;
  let deepFreeze = false;
  let cache = new AsyncCache(initCache({ age: 60 }));
  const cacheKeyFn = behavior.cacheKeyFn || calculateCacheKey;
  const cacheValueFn = behavior.cacheValueFn || passThrough;
  const maxAgeFn = behavior.maxAgeFn || passThrough;
  const onNotFound = behavior.onNotFound;
  const onError = behavior.onError;
  const onSuccess = behavior.onSuccess;
  let cacheNotFound = false;
  const logger = behavior.logger || dummyLogger();
  const getCorrelationId = behavior.getCorrelationId;
  const correlationIdHeader = behavior.correlationIdHeader || "correlation-id";
  let errorOnRemoteError = true;
  const contentType = (behavior.contentType || "json").toLowerCase();
  const keepAliveAgent = behavior.agent;
  let followRedirect = true;
  let performClone = true;
  const maximumNumberOfRedirects = 10;
  const httpMethod = (behavior.httpMethod || "GET").toUpperCase();
  const timeout = behavior.timeout || 20000;
  const stats = { calls: 0, misses: 0 };
  const globalHeaders = behavior.headers || {};
  const retry = "retry" in behavior ? behavior.retry : 0;
  const hooks = "hooks" in behavior ? behavior.hooks : {}; // got hooks

  function defaultRequestTimeFn(requestOptions, took) {
    logger.debug("fetching %s: %s took %sms", requestOptions.method, requestOptions.url, took);
  }
  const requestTimeFn = behavior.requestTimeFn || defaultRequestTimeFn;

  if (Object.prototype.hasOwnProperty.call(behavior, "clone")) {
    performClone = !!behavior.clone;
  }

  if (Object.prototype.hasOwnProperty.call(behavior, "freeze")) {
    freeze = !!behavior.freeze;
  }

  if (Object.prototype.hasOwnProperty.call(behavior, "deepFreeze")) {
    deepFreeze = !!behavior.deepFreeze;
  }

  if (Object.prototype.hasOwnProperty.call(behavior, "followRedirect")) {
    followRedirect = !!behavior.followRedirect;
  }

  if (Object.prototype.hasOwnProperty.call(behavior, "errorOnRemoteError")) {
    errorOnRemoteError = !!behavior.errorOnRemoteError;
  }

  if (Object.prototype.hasOwnProperty.call(behavior, "cacheNotFound")) {
    cacheNotFound = behavior.cacheNotFound;
  }

  if (Object.prototype.hasOwnProperty.call(behavior, "cache")) {
    cache = behavior.cache || dummyCache;
  }

  function handleNotFound(url, cacheKey, res, content, resolvedCallback) {
    logger.info("404 Not Found for: %j", url);
    let notFoundAge = -1;

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
    if (typeof logger.warning === "function") {
      logger.warning("HTTP Fetching error %d for: %j", res.statusCode, url);
    } else if (typeof logger.warn === "function") {
      logger.warn("HTTP Fetching error %d for: %j", res.statusCode, url);
    }

    let errorAge = -1;

    if (onError) {
      onError(url, cacheKey, res, content);
    }

    errorAge = maxAgeFn(errorAge, cacheKey, res, content);

    if (errorOnRemoteError) {
      const error = new VError("%s yielded %s (%s)", url, res.statusCode, util.inspect(content));
      error.statusCode = res.statusCode;

      return resolvedCallback(error, cacheValueFn(undefined, res.headers, res.statusCode), errorAge);
    }

    return resolvedCallback(null, cacheValueFn(undefined, res.headers, res.statusCode), errorAge);
  }

  function deepFreezeObj(obj) {
    const propNames = Object.getOwnPropertyNames(obj);

    propNames.forEach((name) => {
      const prop = obj[name];

      if (typeof prop === "object" && prop !== null) {
        deepFreezeObj(prop);
      }
    });

    return Object.freeze(obj);
  }

  function handleSuccess(url, cacheKey, res, content, resolvedCallback) {
    const maxAge = maxAgeFn(getMaxAge(res.headers["cache-control"]), cacheKey, res, content);

    const typeOfContent = typeof content;

    if (deepFreeze && typeOfContent === "object") {
      deepFreezeObj(content);
    } else if (freeze && typeOfContent === "object") {
      Object.freeze(content);
    }

    if (onSuccess) {
      onSuccess(url, cacheKey, res, content);
    }

    return resolvedCallback(null, cacheValueFn(content, res.headers, res.statusCode), maxAge);
  }

  function handleRedirect(cacheKey, res, body, resolvedCallback) {
    const maxAge = maxAgeFn(getMaxAge(res.headers["cache-control"]), cacheKey, res, body);

    const content = {
      statusCode: res.statusCode,
      headers: res.headers,
    };
    return resolvedCallback(null, content, maxAge);
  }

  function performRequest(url, headers, explicitTimeout, method, body, redirectCount, callback, onRequestInit) {
    const cacheKey = cacheKeyFn(url, body, headers);
    const startTime = new Date().getTime();
    stats.calls++;
    cache.lookup(cacheKey, (resolveFunction) => {
      stats.misses++;
      logger.debug("fetching %s cacheKey '%s'", url, cacheKey);

      const options = {
        url,
        responseType: contentType === "json" ? contentType : undefined,
        agent: keepAliveAgent,
        followRedirect: false,
        retry,
        method: method || httpMethod,
        timeout: explicitTimeout || timeout,
        headers,
        cache: false,
        hooks,
      };

      if (body && typeof body === "object") {
        options.json = body;
      } else if (body) {
        options.body = body;
      }

      const passOptions = {
        url: options.url,
        method: options.method,
        responseType: contentType === "json" ? contentType : undefined,
        followRedirect,
        headers: options.headers,
      };

      if (onRequestInit && !onRequestInit.called) {
        onRequestInit(passOptions, cacheKey);
      }

      function resolvedCallback(err, content, maxAge) {
        requestTimeFn(passOptions, new Date().getTime() - startTime);
        resolveFunction(err, content, maxAge);
      }

      return request(options).then((res) => {
        if (isRedirect(res)) return handleRedirect(cacheKey, res, res.body, resolvedCallback);
        return parseResponse(res.body, contentType, (_, transformed) => {
          return handleSuccess(url, cacheKey, res, transformed, resolvedCallback);
        });
      }).catch((err) => {
        if (err instanceof got.HTTPError) {
          if (err.response.statusCode === 404) {
            return handleNotFound(url, cacheKey, err.response, err.response.body, resolvedCallback);
          } else if (err.response.statusCode > 299) {
            return handleError(url, cacheKey, err.response, err.response.body, resolvedCallback);
          }
        } else if (err instanceof got.TimeoutError) {
          const { message, timings } = err;
          logger.debug(`Message: ${message}`);
          logger.debug(`Timings: ${JSON.stringify(timings, null, 2)}`);
          return resolvedCallback(new VError("ESOCKETTIMEDOUT"));
        }

        return resolvedCallback(err);
      });
    }, (err, response) => {
      if (followRedirect && isRedirect(response)) {
        if (redirectCount++ < maximumNumberOfRedirects) {
          const location = new URL(response.headers.location, url).toString();
          return performRequest(location, headers, explicitTimeout, method, body, redirectCount, callback);
        } else {
          return callback(new VError("Maximum number of redirects exceeded while fetching", url));
        }
      }
      callback(err, (performClone ? clone(response) : response));
    });
  }

  function fetch(method, options, optionalBody, resultCallback) {
    if (typeof optionalBody === "function") {
      resultCallback = optionalBody;
      optionalBody = null;
    }

    try {
      let url = options;

      const extraHeaders = {};

      if (getCorrelationId) {
        const correlationId = getCorrelationId();
        if (correlationId) {
          extraHeaders[correlationIdHeader] = correlationId;
        }
      }

      const headers = Object.assign({}, globalHeaders, options.headers, extraHeaders);
      let explicitTimeout = null;
      if (typeof options === "object") {
        if (options.url) {
          url = options.url;
        }
        if (options.timeout) {
          explicitTimeout = options.timeout;
        }
      }

      if (currentAppConfig.name) {
        headers["x-exp-fetch-appname"] = currentAppConfig.name;
      }

      if (!headers["User-Agent"]) {
        const { name, version } = currentAppConfig || expFetchConfig;
        headers["User-Agent"] = `${name}/${version}`;
      }

      if (resultCallback) {
        performRequest(url, headers, explicitTimeout, method, optionalBody, 0, resultCallback, onRequestInit);
      } else {
        return new Promise((resolve, reject) => {
          performRequest(url, headers, explicitTimeout, method, optionalBody, 0, (err, content) => {
            if (err) return reject(err);
            return resolve(content);
          }, onRequestInit);
        });
      }
    } catch (err) {
      return resultCallback ? resultCallback(err) : Promise.reject(err);
    }

    function onRequestInit() {
      if (behavior.onRequestInit) {
        behavior.onRequestInit.apply(null, arguments);
      }
      onRequestInit.called = true;
    }
  }

  const fetcher = {
    fetch: fetch.bind(null, null),
    del: fetch.bind(null, "DELETE"),
    stats: function () {
      return {
        calls: stats.calls,
        cacheHitRatio: stats.calls > 0 ? (stats.calls - stats.misses) / stats.calls : 0,
      };
    },
  };

  [ "GET", "PUT", "POST", "HEAD", "PATCH", "OPTIONS" ].forEach((verb) => {
    fetcher[verb.toLowerCase()] = fetch.bind(null, verb);
  });

  return fetcher;
}

function passThrough(key) {
  return key;
}

function request({ url, ...options }) {
  return got(url, { cache: false, ...options });
}
