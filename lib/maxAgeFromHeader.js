var maxAgeRexExp = /max-age=\s*\d+/;
var maxAgeValueRexExp = /\d+/;

function getMaxAge(cacheHeader) {
  if (!cacheHeader) {
    return null;
  }

  if (cacheHeader.indexOf("no-cache") !== -1) {
    return -1;
  }

  var maxAge = null;
  var maxAgeStringMatch = maxAgeRexExp.exec(cacheHeader);
  if (maxAgeStringMatch) {
    maxAgeStringMatch = maxAgeValueRexExp.exec(maxAgeStringMatch[0]);
    if (maxAgeStringMatch) {
      maxAge = Number(maxAgeStringMatch[0]) * 1000;
    }
  }

  return maxAge;
}

module.exports = getMaxAge;
