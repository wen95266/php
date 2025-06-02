// server/routes/lobby.routes.js
const controller = require("../controllers/lobby.controller");
const { authJwt } = require("../middleware");

module.exports = function(app) {
    app.use((req, res, next) => { res.header( "Access-Control-Allow-Headers", "x-access-token, Origin, Content-Type, Accept"); next(); });
    
    // Publicly accessible leaderboard
    app.get("/api/lobby/leaderboard", controller.getLeaderboard);

    // Requires authentication to get personal game history
    app.get("/api/lobby/history", [authJwt.verifyToken], controller.getGameHistory);
};
