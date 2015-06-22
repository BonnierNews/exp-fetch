"use strict";

function isRedirect(response) {
  if (!response) return false;
  //if (!response.caseless.has("location")) return false;

  return response.statusCode >= 300 && response.statusCode < 400;
}

module.exports = isRedirect;
