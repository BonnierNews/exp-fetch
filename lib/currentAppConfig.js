"use strict";

var path = require("path");
var currentPackage = {};

try {
  currentPackage = require(path.join(process.cwd(), "package.json"));
} catch (err) {
  console.log("WARNING failed to get conf for current app:", err);
}

module.exports = currentPackage;
