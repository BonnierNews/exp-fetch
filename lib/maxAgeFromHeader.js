"use strict";

const maxAgeRexExp = /max-age=\s*\d+/;
const maxAgeValueRexExp = /\d+/;

const noCacheKeywords = ["private", "max-age=0", "no-cache", "must-revalidate"];

function containsAny(haystack, listOfHits) {
  for (let i = 0; i < listOfHits.length; i++) {
    if (haystack.indexOf(listOfHits[i]) > -1) {
      return true;
    }
  }
  return false;
}

function getMaxAge(cacheHeader) {
  if (!cacheHeader) {
    return null;
  }

  if (containsAny(cacheHeader, noCacheKeywords)) {
    return -1;
  }

  let maxAge = null;
  let maxAgeStringMatch = maxAgeRexExp.exec(cacheHeader);
  if (maxAgeStringMatch) {
    maxAgeStringMatch = maxAgeValueRexExp.exec(maxAgeStringMatch[0]);
    if (maxAgeStringMatch) {
      maxAge = Number(maxAgeStringMatch[0]) * 1000;
    }
  }

  return maxAge;
}

module.exports = getMaxAge;
