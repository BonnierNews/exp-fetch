Changelog
=========

# 4.0.0

Replace [request](https://github.com/request/request/issues/3142) with [got](https://www.npmjs.com/package/got).

## Breaking

Maybe!? Since passed options are forwarded to `got`. Timeout behavior differs - `got` timeout is only for timing of response. Though it can be handled using an [timeout object](https://www.npmjs.com/package/got#timeout) for socket timeout etc.
