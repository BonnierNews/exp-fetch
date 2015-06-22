"use strict";
var crypto = require("crypto");

function calculateCacheKey(url, body) {
  if (!body || body.length === 0) {
    return url;
  }

  if (typeof body === "object") {
    return url + " " + stringHash(JSON.stringify(body));
  }

  return url + " " + stringHash(String(body));
}

function stringHash(str) {
  return crypto.createHash("md5").update(str).digest("hex");
}

module.exports = calculateCacheKey;
