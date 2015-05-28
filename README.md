fetch
=====

A small and pluggable lib to fetch a resource and cache the result.


### Caching

Fetch will parse the `cache-control` header. I it encounters `private`, `no-cache`, `max-age=0` or `must-revalidate` it wont cache. Otherwise
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

* `freeze`: (default:`false`). When this option is set it will freeze the response so it can't be modified.
* `cache`: (default: `an instance of AsyncCache` (https://github.com/ExpressenAB/exp-asynccache). To disable caching set `{cache: null}`
* `cacheKeyFn`: (default: caches on the url) An optional formatting function for finding the cache-key. One might, for example, want to cache on an url with the get params stripped.
* `maxAgeFn`: (default: respects the `cache-control` header)
* `onNotFound`: If given a function, it will be called each time fetch encounters a 404
* `onError`: If given a function, it will be called each time fetch encounters a non 200 nor 404 response
* `onSuccess`: If given a function, it will be called each time fetch encounters a 200
* `logger`: A logger object implementing `error`, `warning`, `info`, `debug` for example https://github.com/tj/log.js

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

#### maxAgeFn

```javascript
function cacheNothing(maxAge, key, headers, content) {
    return -1;
}
var fetch = fetchBuilder({maxAgeFn: cacheNothing});
```
