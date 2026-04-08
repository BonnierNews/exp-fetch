Changelog
=========

# 7.0.0

## Breaking Changes

* **Replaced `got` with Node.js native `fetch`** — removes `got` dependency entirely. The library now
  uses the built-in `fetch` API available in Node.js 18+.
* **Requires Node.js >= 18** — needed for native `fetch` support. Node 20+ is recommended.
* **Timeout error messages are now descriptive** — instead of the opaque `ESOCKETTIMEDOUT` message,
  timeout errors now include the URL and configured timeout value.
  Example: `"Request to https://example.com/api timed out after 5000ms"`.
  Timeout errors have `error.code = "TIMEOUT"` and `error.timeout` (the configured timeout in ms).
* **`hooks` are now executed natively** — the `hooks` behavior option (`beforeRequest`, `afterResponse`,
  `beforeRetry`, `beforeError`) is still supported but is now executed by exp-fetch itself instead of
  being forwarded to `got`. Hook signatures are compatible with got v11.
* **Removed `agent` option** — native `fetch` does not use `http.Agent`. Node.js native fetch uses
  keep-alive by default.
* **Removed `verror` dependency** — errors are now plain `Error` instances.
* **Removed `got` dependency** — reduces transitive dependency count significantly.

## Other Changes

* Upgraded `nock` from v13 to v14 (supports native `fetch` interception via `@mswjs/interceptors`).
* Retry mechanism is now built-in (previously delegated to `got`). Supports the same configuration:
  `retry: 0` (default), `retry: N`, or `retry: { limit, retries, methods, statusCodes, calculateDelay }`.
* Added `engines` field to `package.json`: `"node": ">=18"`.

# 6.0.0

* No changelog entry — bumped from 5.x with deepFreeze support.

# 5.5.0

* Added a third argument to `cacheKeyFn` containing the headers to enable using headers as part
  of the cache key.
* Removed unused `url` param from `handleRedirect`.

# 5.4.2
* Ignore .DS_Store and document fetch retry and timeout config in README.
* Bump deps to fix security audit.

# 5.4.1

* Bump deps to fix security audit.

# 5.4.0

* Default to seting User-Agent to calling application to play nice with generic logging tools

# 5.3.3

* Bump dependencies

# 5.3.2

* Catch and forward internal errors to callback or return as rejected promise
* Bump node from 14 to 16
* Bump eslint from 8.3.0 to 8.26.0
* Bump eslint-config-exp from 0.2.0 to 0.5.0 and obey the new linting rules
* Bump mocha from 9.2.0 to 10.1.0
* Bump nock from 13.2.2 to 13.2.9
* Bump exp-asynccache from 2.0.0 to 3.2.0

# 5.3.1

Add _got_ `hooks` to behaviour

# 5.2.1

* Bump got from 11.8.3 to 11.8.5
* Bump eslint and eslint-config-exp and obey the new linting rules

# 5.2.0

Added the following methods to the object returned from `fetchBuilder`:

* `get` - makes a GET request using the behavior passed to fetchBuilder
* `post` - makes a POST request using the behavior passed to fetchBuilder
* `put` - makes a PUT request using the behavior passed to fetchBuilder
* `patch` - makes a PATCH request using the behavior passed to fetchBuilder
* `head` - makes a HEAD request using the behavior passed to fetchBuilder
* `options` - makes an OPTIONS request using the behavior passed to fetchBuilder
* `del` - makes a DELETE request using the behavior passed to fetchBuilder

Already existing methods are:

* `fetch` - makes a request using the default method specified in behavior (defaults to GET)
* `stats` - get stats for cached requests

# 5.1.1

Bump deps.

# 5.1.0

Allow passing correlation id function to pass correlation id when making requests.

# 5.0.2

Allow loggers that use the name `warn` in addition to `warning` functions.

# 5.0.1

Add `eslint-config-exp` as linting config.

# 5.0.0

Replace [request](https://github.com/request/request/issues/3142) with [got](https://www.npmjs.com/package/got).

## Breaking

Maybe!? Since passed options are forwarded to `got`. Timeout behavior differs - `got` timeout is only for timing of response. Though it can be handled using an [timeout object](https://www.npmjs.com/package/got#timeout) for socket timeout etc.
