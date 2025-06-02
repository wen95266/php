// server/middleware/index.js
const authJwt = require("./authJwt.middleware.js");
const verifySignUp = require("./verifySignUp.middleware.js");

module.exports = {
  authJwt,
  verifySignUp
};
