Changelog
=========

# 5.4.0

* Pass the original error as cause when a timeout occurs
* Add the url that triggers a timeout in the timeout error message

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
