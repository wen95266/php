// server/socket/auth.socket.js
const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth.config.js");
const db = require("../models");
const User = db.User;

module.exports = async (socket, next) => {
    const token = socket.handshake.auth.token; // Client should send token in auth object

    if (!token) {
        console.log(`Socket Auth: No token for socket ${socket.id}`);
        return next(new Error("Authentication error: No token provided"));
    }

    try {
        const decoded = jwt.verify(token, authConfig.secret);
        const user = await User.findByPk(decoded.id, {
            attributes: ['id', 'username', 'nickname', 'is_bot_admin', 'total_score'] // Fetch needed data
        });

        if (!user) {
            console.log(`Socket Auth: User ${decoded.id} not found for socket ${socket.id}`);
            return next(new Error("Authentication error: User not found or invalid token"));
        }

        socket.userData = user.toJSON(); // Attach user data (plain object) to socket
        console.log(`Socket Auth: User ${socket.userData.username} (ID: ${socket.userData.id}) authenticated for socket ${socket.id}`);
        next(); // Proceed with connection
    } catch (err) {
        console.error(`Socket Auth: Token verification failed for socket ${socket.id}`, err.message);
        next(new Error("Authentication error: Token invalid or expired"));
    }
};
