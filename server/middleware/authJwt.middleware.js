// server/middleware/authJwt.middleware.js
const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");

const verifyToken = (req, res, next) => { /* ... (与之前版本相同) ... */ 
    let token = req.headers["x-access-token"] || req.headers["authorization"];
    if (!token) { return res.status(403).send({ success: false, message: "No token provided!" });}
    if (token.startsWith('Bearer ')) { token = token.slice(7, token.length); }
    jwt.verify(token, config.secret, (err, decoded) => {
        if (err) { console.error("JWT verification error:", err.message); return res.status(401).send({ success: false, message: "Unauthorized! Invalid or expired token." });}
        req.userId = decoded.id; next();
    });
};

const verifyTokenOptional = (req, res, next) => { /* ... (与之前版本相同) ... */ 
    let token = req.headers["x-access-token"] || req.headers["authorization"]; req.userId = null;
    if (token) {
        if (token.startsWith('Bearer ')) { token = token.slice(7, token.length); }
        jwt.verify(token, config.secret, (err, decoded) => {
            if (!err && decoded && decoded.id) { req.userId = decoded.id;} 
            else { console.warn("Optional token provided but invalid:", err ? err.message : "No ID in token");}
            next(); 
        });
    } else { next(); }
};

module.exports = { verifyToken, verifyTokenOptional };
