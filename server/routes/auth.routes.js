// server/routes/auth.routes.js
const { verifySignUp, authJwt } = require("../middleware");
const controller = require("../controllers/auth.controller");

module.exports = function(app) {
    app.use((req, res, next) => { res.header( "Access-Control-Allow-Headers", "x-access-token, Origin, Content-Type, Accept"); next(); });
    app.post("/api/auth/register", [verifySignUp.checkDuplicateUsernameOrEmail], controller.register);
    app.post("/api/auth/login", controller.login);
    app.post("/api/auth/logout", controller.logout); // Client-side token removal primarily
    app.get("/api/auth/checkAuth", [authJwt.verifyTokenOptional], controller.checkAuth);
};
