// server/controllers/auth.controller.js
const db = require("../models");
const config = require("../config/auth.config");
const User = db.User;
const Op = db.Sequelize.Op;
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

exports.register = async (req, res) => { /* ... (与之前版本类似，但使用User.create等Sequelize方法) ... */ 
    try {
        if (!req.body.username || !req.body.password) { return res.status(400).send({ success: false, message: "Username and password are required!" });}
        // Add more validation as needed (length, characters etc.)
        const user = await User.create({
            username: req.body.username,
            email: req.body.email,
            password_hash: bcrypt.hashSync(req.body.password, 8),
            nickname: req.body.nickname || req.body.username,
        });
        res.send({ success: true, message: "User registered successfully!" });
    } catch (error) {
        // Sequelize validation errors might come here or duplicate errors
        if (error.name === 'SequelizeUniqueConstraintError' || error.name === 'SequelizeValidationError') {
            return res.status(400).send({ success: false, message: error.errors.map(e => e.message).join(', ') });
        }
        console.error("Register error:", error);
        res.status(500).send({ success: false, message: "Failed to register user." });
    }
};

exports.login = async (req, res) => { /* ... (与之前版本类似，但使用User.findOne) ... */ 
    if (!req.body.username || !req.body.password) { return res.status(400).send({ success: false, message: "Please provide username and password!" });}
    try {
        const user = await User.findOne({ where: { username: req.body.username }});
        if (!user) { return res.status(404).send({ success: false, message: "User Not found." }); }
        const passwordIsValid = bcrypt.compareSync(req.body.password, user.password_hash);
        if (!passwordIsValid) { return res.status(401).send({ success: false, accessToken: null, message: "Invalid Password!" });}
        const token = jwt.sign({ id: user.id }, config.secret, { expiresIn: config.jwtExpiration });
        user.last_login_at = new Date(); await user.save();
        res.status(200).send({
            success: true, message: "Login successful!",
            user: { id: user.id, username: user.username, nickname: user.nickname, email: user.email, total_score: user.total_score, games_played: user.games_played, games_won: user.games_won, is_bot_admin: user.is_bot_admin, accessToken: token }
        });
    } catch (error) { console.error("Login error:", error); res.status(500).send({ success: false, message: "Error during login." });}
};
exports.logout = (req, res) => { res.status(200).send({ success: true, message: "Logout successful (client should clear token)." }); };
exports.checkAuth = async (req, res) => { /* ... (与之前版本类似，但使用User.findByPk) ... */ 
    if (req.userId) {
        try {
            const user = await User.findByPk(req.userId, { attributes: ['id', 'username', 'nickname', 'email', 'total_score', 'games_played', 'games_won', 'is_bot_admin']});
            if (!user) { return res.status(200).send({ success: true, isAuthenticated: false, message: "User not found or session invalid." });} // Still success:true for the check itself
            // Optionally, re-issue a token here if you want sliding sessions
            // const newToken = jwt.sign({ id: user.id }, config.secret, { expiresIn: config.jwtExpiration });
            return res.status(200).send({ success: true, isAuthenticated: true, user: user /*, accessToken: newToken */});
        } catch (error) { console.error("CheckAuth error fetching user:", error); return res.status(500).send({ success: false, isAuthenticated: false, message: "Error fetching user information." });}
    } else { return res.status(200).send({ success: true, isAuthenticated: false });}
};
