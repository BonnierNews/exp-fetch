"use strict";

function isNumber(number) {
  return Number.isFinite(parseFloat(number));
}

module.exports = isNumber;
