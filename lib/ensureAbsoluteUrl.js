"use strict";
const url = require("url");
const util = require("util");

function ensureAbsoluteUrl(headers, uri) {
  const newLocation = url.parse(headers.location);
  const oldLocation = url.parse(uri);
  const protocol = newLocation.protocol || oldLocation.protocol;
  const host = newLocation.host || oldLocation.host;

  return util.format("%s//%s%s", protocol, host, newLocation.path);
}

module.exports = ensureAbsoluteUrl;
