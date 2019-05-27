"use strict";
var url = require("url");
var util = require("util");

function ensureAbsoluteUrl(headers, uri) {
  var newLocation = url.parse(headers.location);
  var oldLocation = url.parse(uri);
  var protocol = newLocation.protocol || oldLocation.protocol;
  var host = newLocation.host || oldLocation.host;

  return util.format("%s//%s%s", protocol, host, newLocation.path);
}

module.exports = ensureAbsoluteUrl;
