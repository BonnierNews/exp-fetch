"use strict";

const path = require("path");
let currentPackage = {};

try {
  currentPackage = require(path.join(process.cwd(), "package.json"));
} catch (err) {
  console.log("WARNING failed to get conf for current app:", err); // eslint-disable-line no-console
}

module.exports = currentPackage;
