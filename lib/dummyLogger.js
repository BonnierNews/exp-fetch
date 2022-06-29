"use strict";

function dummyLogger() {
  return {
    debug: function () {},
    error: function () {},
    info: function () {},
    warning: function () {},
  };
}

module.exports = dummyLogger;
