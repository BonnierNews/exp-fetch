// Make sure dates are displayed in the correct timezone
process.env.TZ = "Europe/Stockholm";

// Tests should always run in test environment to prevent accidental deletion of
// real elasticsearch indices etc.
// This file is required with ./test/mocha.opts
process.env.NODE_ENV = "test";

// Setup common test libraries
//require("mocha-cakes");

var chai = require("chai");

chai.config.truncateThreshold = 0;
chai.config.includeStack = true;

chai.should();

// Register useful chai plugins that you use
//chai.use(require("chai-as-promised"));
//chai.use(require("chai-string"));
//chai.use(require("chai-datetime"));
