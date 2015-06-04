fetch
=====

A small and pluggable lib to fetch a resource and cache the result.

### Usage
By default fetch will treat all response codes expect 200 and 404 as errors. 404 will yield `null` and 200 the body

#### Caching

Fetch will parse the `cache-control` header. If fetch encounters `private`, `no-cache`, `max-age=0` or `must-revalidate` it wont cache. Otherwise
it will respect the `max-age` header.

#### Callback usage:

```javascript
var behavior = {};
var fetch = fetchBuilder(behavior);
fetch("http://example.com/resource.json", function (err, content) {
    // Do something with the result
});
```

#### Promise usage:

```javascript
var behavior = {};
var fetch = fetchBuilder(behavior);
fetch("http://example.com/resource.json").then(function (content) {
    // Do something with the result
});
```

### Allowed behavior options

* `freeze`: (default:`true`). When this option is set to false it will not freeze the response so it can be modified. ("use strict" is needed)
* `cache`: (default: `an instance of AsyncCache`) (https://github.com/ExpressenAB/exp-asynccache). To disable caching set `{cache: null}`
* `cacheKeyFn`: (default: caches on the url) An optional formatting function for finding the cache-key. One might, for example, want to cache on an url with the get params stripped.
* `cacheValueFn`: (default: caches the response body) An optional function for change what will be returned and cached from fetch.
* `maxAgeFn`: (default: respects the `cache-control` header)
* `onNotFound`: If given a function, it will be called each time fetch encounters a 404
* `onError`: If given a function, it will be called each time fetch encounters a non 200 nor 404 response
* `onSuccess`: If given a function, it will be called each time fetch encounters a 200
* `logger`: A logger object implementing `error`, `warning`, `info`, `debug` for example https://github.com/tj/log.js
* `cacheNotFound`: (default: false). If set it will cache 404s, if given a number it will cache the 404 for that time. If the `maxAgeFn` is given, it will get this time as the first parameter.
* `errorOnRemoteError`: (default: true). If set it will treat a remote > 200 statusCode as an error.
* `contentType`: (default: `json`), expected content type. Fetch will try to parse the given content type. (supported: `xml`|`json`)
* `agentOptions`: (default: `{}`), options passed to the keepAliveAgent.
* `followRedirect`: (default: true), should fetch follow redirects (and cache the redirect chain)

#### CacheKeyFn

```javascript
var keyFinder = function (url) {
    return url.replace(/\//g, "");
}
var fetch = fetchBuilder({cacheKeyFn: keyFinder});
Promise.all([
   fetch("http://example.com/foo/bar")
   fetch("http://example.com/foobar")
]).then(function (result) {
   result[0] === result[1];
});
```

#### CacheValueFn


```javascript
var valueFn  = function (body, headers, statusCode) {
    return {
        body: body,
        headers: headers,
        statusCode: statusCode
    };
}
var fetch = fetchBuilder({cacheValueFn: valueFn});
fetch("http://example.com/resource.json", function (err, value) {
  // value will be something like:
  // { statusCode: 200, header: { "content-type": "application/json" }, body: { "resource": "body" } }
})
```

#### maxAgeFn

```javascript
function cacheNothing(maxAge, key, res, content) {
    return -1;
}
var fetch = fetchBuilder({maxAgeFn: cacheNothing});
```

#### Hooks

They are: `onError`, `onNotFound` and `onSuccess`. Signature:

```javascript
function onError(url, cacheKey, res, content) {
    //
}
```

## Init cache function

The fetch lib provides a convenient initLRUCache-method which sets up a cache purging it's expired content.

```javascript

var initLRUCache = require("exp-fetch").initLRUCache;
var cache = new AsyncCache(initLRUCache({ age: 60, size: 2000});
```

### Allowed params:

* `size` or `max`: the max allowed size, the unit is set by the `length` method. Default is `value.length`. Default: 2000000
* `length`: the length function, default is `v && v.length || 1`
* `age` or `maxAge`: the maximum number of seconds a key will be kept in the cache. Default `60`
