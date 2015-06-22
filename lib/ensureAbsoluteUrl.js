"use strict";
var url = require("url");
var util = require("util");

function ensureAbsoluteUrl(headers, uri) {
  var path = url.parse(headers.location).path;
  var parsed = url.parse(uri);
  return util.format("%s//%s%s", parsed.protocol, parsed.host, path);
}

module.exports = ensureAbsoluteUrl;
