"use strict";
var xml2js = require("xml2js");

function parseResponse(content, contentType, callback) {
  if (contentType === "xml") {
    return xml2js.parseString(content, {explicitArray: false}, callback);
  }
  return callback(null, content);
}

module.exports = parseResponse;
