"use strict";

function isNumber(o) {
  return !isNaN(o - 0) && o !== null && o !== "" && o !== false;
}

module.exports = isNumber;
