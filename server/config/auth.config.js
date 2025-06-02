// server/config/auth.config.js
require('dotenv').config();

module.exports = {
    secret: process.env.JWT_SECRET || "fallback-super-secret-key",
    jwtExpiration: 3600,          // 1 hour in seconds
    // jwtRefreshExpiration: 86400, // 24 hours for refresh token (if implemented)
};
