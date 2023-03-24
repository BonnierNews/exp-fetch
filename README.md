fetch
=====
[![Built latest](https://github.com/BonnierNews/exp-fetch/actions/workflows/build-latest.yaml/badge.svg)](https://github.com/BonnierNews/exp-fetch/actions/workflows/build-latest.yaml)

A small and pluggable lib to fetch a resource and cache the result.

### Usage
By default fetch will treat all response codes except 200, 301 and 404 as errors. 404 will yield `null` and 200 the body.

#### Caching

Fetch will parse the `cache-control` header. If fetch encounters `private`, `no-cache`, `max-age=0` or `must-revalidate` it wont cache. Otherwise
it will respect the `max-age` header.

#### Callback usage:

```javascript
var fetchBuilder = require("exp-fetch");
var behavior = {};
var fetch = fetchBuilder(behavior).fetch;
fetch("http://example.com/resource.json", function (err, content) {
    // Do something with the result
});
```

#### Promise usage:

```javascript
var fetchBuilder = require("exp-fetch");
var behavior = {};
var fetch = fetchBuilder(behavior).fetch;
fetch("http://example.com/resource.json").then(function (content) {
    // Do something with the result
});
```

#### Custom request headers

```javascript
var fetchBuilder = require("exp-fetch");
var behavior = {};
var fetch = fetchBuilder(behavior).fetch;
var options = {
  url: "http://example.com/resource.json",
  headers: {
    "User-agent": "exp-fetch"
  }
}
fetch(options, function (err, content) {
    // Do something with the result
});
```

#### Using one build with many verbs

```javascript
const behavior = {};
const request = require("exp-fetch")(behavior);

// using the .get/.post/.etc methods will override httpMethod from behavior with
// the specified verb
const getRes = await request.get("foo.com");
const postRes = await request.post("foo.com/epic-endpoint", {foo: "bar"});
const patchRes = await request.patch("foo.com/epic-endpoint", {foo: "bar"});
const headRes = await request.head("foo.com/epic-endpoint");
const optionsRes = await request.options("foo.com/epic-endpoint");
const putRes = await request.put("foo.com/epic-endpoint", {foo: "bar"});
const deleteRes = await request.del("foo.com/epic-endpoint");
```

#### Issuing POST requests:

```javascript
var fetchBuilder = require("exp-fetch");
var behavior = { httpMethod: "POST"};
var poster = fetchBuilder(behavior).fetch;
var body = {
    "query": "some string"
};

poster("http://example.com/query", body, function (err, content) {
    // Do something with the result
    // The result will be cached by `url` + ` ` + `sha of body`
});
```

### Allowed behavior options

* `agent`: (default: null), keepAlive Agent instance.
* `cache`: (default: `an instance of AsyncCache`) (https://github.com/ExpressenAB/exp-asynccache). To disable caching set `{cache: null}`
* `cacheKeyFn`: (default: caches on the url + sha1 of the body) An optional formatting function for finding the cache-key. One might, for example, want to cache on an url with the get params stripped.
* `cacheNotFound`: (default: false). If set it will cache 404s, if given a number it will cache the 404 for that time. If the `maxAgeFn` is given, it will get this time as the first parameter.
* `cacheValueFn`: (default: caches the response body) An optional function for change what will be returned and cached from fetch.
* `clone`: (default: true), should fetch clone objects before handing them from the cache.
* `contentType`: (default: `json`), expected content type. Fetch will try to parse the given content type. (supported: `xml`|`json`)
* `getCorrelationId`: (default: `null`), for each request call this function to pass as the correlation id header specified below. Does not pass correlation id if function is not defined or if it returns null.
* `correlationIdHeader`: (default: `correlation-id`), header to use when passing correlation id.
* `deepFreeze`: (default:`false`). When this option is set to true it will freeze the response _recursively_ so that it or any objects it contains can't be modified. ("use strict" is needed)
* `errorOnRemoteError`: (default: true). If set it will treat a remote > 200 statusCode as an error.
* `followRedirect`: (default: true), should fetch follow redirects (and cache the redirect chain)
* `freeze`: (default:`true`). When this option is set to false it will not freeze the response so it can be modified. ("use strict" is needed)
* `httpMethod`: (default: `"GET"`), the HTTP-method that should be used to make requests.
* `logger`: A logger object implementing `error`, `warning`, `info`, `debug` for example https://github.com/tj/log.js
* `maxAgeFn`: (default: respects the `cache-control` header)
* `onError`: If given a function, it will be called each time fetch encounters a non 200 nor 404 response
* `onNotFound`: If given a function, it will be called each time fetch encounters a 404
* `onRequestInit`: If given a function, it will be called before the actual request is made, see [Hooks](#hooks) for signature
* `onSuccess`: If given a function, it will be called each time fetch encounters a 200
* `requestTimeFn`: (default log with level `debug`) If given a function, it will be called when the request returned and processed from remote end.
* `retry`: see [got](https://github.com/sindresorhus/got) for details, defaults to 0
* `timeout`: see [got](https://github.com/sindresorhus/got) for details, defaults to 20000ms
* `hooks`: see [got](https://github.com/sindresorhus/got) for details, defaults to empty object

The difference between `freeze` and `deepFreeze` is that `deepFreeze` walks the object graph and freezes any
child objects in the retrieved data. `freeze` only freezes the root object but still allows modifications
to nested objects. `deepFreeze` will be slower since it is recursive.

#### CacheKeyFn

```javascript
var fetchBuilder = require("exp-fetch");
var keyFinder = function (url) {
    return url.replace(/\//g, "");
}
var fetch = fetchBuilder({cacheKeyFn: keyFinder}).fetch;
Promise.all([
   fetch("http://example.com/foo/bar")
   fetch("http://example.com/foobar")
]).then(function (result) {
   result[0] === result[1];
});
```

#### CacheValueFn

```javascript
var fetchBuilder = require("exp-fetch");
var valueFn  = function (body, headers, statusCode) {
    return {
        body: body,
        headers: headers,
        statusCode: statusCode
    };
}
var fetch = fetchBuilder({cacheValueFn: valueFn}).fetch;
fetch("http://example.com/resource.json", function (err, value) {
  // value will be something like:
  // { statusCode: 200, headers: { "content-type": "application/json" }, body: { "resource": "body" } }
})
```

#### maxAgeFn

```javascript
var fetchBuilder = require("exp-fetch");
function cacheNothing(maxAge, key, res, content) {
    return -1;
}
var fetch = fetchBuilder({maxAgeFn: cacheNothing}).fetch;
```

#### Hooks

They are: `onError`, `onNotFound` and `onSuccess`. Signature:

```javascript
function onError(url, cacheKey, res, content) {
    //
}
```

And `onRequestInit` with signature:

```javascript
function onRequestInit(requestOptions, cacheKey) {
    //
}
```

The function will be called once before the actual request is made, i.e. not found in cache. Subsequent redirect requests does not call the function. The `requestOptions` argument is a copy of the request options and will not alter the request.

Useful when mocking requests, e.g:

```javascript
var url = require("url");
var nock = require("nock");

function onRequestInit(requestOptions, cacheKey) {
    var callUrl = url.parse(requestOptions.url);
    var path = callUrl.path;
    var host = callUrl.protocol + "//" + callUrl.host;

    nock(host).get(path).reply(200, {mock: true});
}

var fetch = fetchBuilder({onRequestInit: onRequestInit}).fetch;
```

And `requestTimeFn` with signature:

```javascript
function requestTimeFn(requestOptions, took) {
    console.log("REQUEST", requestOption.method, ":", requestOption.url, "took", took,  "ms");
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

## Stats

Get statistics for number calls and cache hit ratio:

```javascript
var fetchBuilder = require("exp-fetch");
var behavior = {};
var stats = fetchBuilder(behavior).stats;
console.log("Hit ratio", stats().cacheHitRatio);
```


## Timeout
Example:
If you know the server response time is 3 seconds or 3000 ms you can configure exp-fetch timeout the following way.
```
timeout: {
    socket: 3500,
    request: 4000,   
}
```
NOTE: This is a rare case. If have absolute control over responding server and have access to modify the timeout. See examples/timeout.js (to run copy the file to root and run with node). 

NOTE: To fetch will go fine when you run `node timeout.js` in root. But if you lower the timeout options of socket to 3000 ms or 3 s then you will get an `ESOCKETTIMEDOUT` error. This means that the socket option needs to be higher then the server delay and the request option needs to be higher than the timout socket value for the timout options to work. 

In most cases you would not have control over the responding server. In that case you need to add some retry logic see the examples/retry.js
```
  retry: {
    limit: 3,
    methods: [ "POST" ],
    statusCodes: [ 408, 500, 502, 503, 504 ],
    maxRetryAfter: 4000,
  },
```

| property | values | description |
|----------|:------:|-------------|
| limit    |   3    | The maximum amount of times to retry the request. |
| methods | [ "POST" ], | The HTTP methods that should be retried. |
| statusCodes | [ 408, 500, 502, 503, 504 ] | The HTTP status codes that should be retried. |
| maxRetryAfter | 4000 | The maximum amount of time in milliseconds that the request should be retried after. |

These values and property are examples and you can tweek and find other implementations based on your use case.

NOTE: You can copy the examples/retry.js to root and run it with node `node retry.js` In retry.js script the server delay is simulated to be delayed and different timout:s are passed to the server response, which should be a more relastic scenario. 

NOTE: Basically if you have a timout configuration that starts to throw `ESOCKETTIMEDOUT` error you can try to add some retry logic. The timout option can be left in place and will work if server timout does not increase. If server timeout would increase then the retry options would kick in and rescue the fetch.