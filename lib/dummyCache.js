"use strict";

var dummyCache = {
  lookup: function (url, resolve, callback) { return resolve(callback); }
};

module.exports = dummyCache;
