// Default config — points to testing environment.
// For other environments use:
//   pm2 start ecosystem/ecosystem.staging.config.js
//   pm2 start ecosystem/ecosystem.production.config.js
module.exports = require("./ecosystem/ecosystem.testing.config.js");
