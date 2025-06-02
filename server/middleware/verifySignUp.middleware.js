// server/middleware/verifySignUp.middleware.js
const db = require("../models");
const User = db.User;

checkDuplicateUsernameOrEmail = async (req, res, next) => {
    try {
        // Username
        let user = await User.findOne({ where: { username: req.body.username } });
        if (user) {
            return res.status(400).send({ success: false, message: "Failed! Username is already in use!" });
        }
        // Email
        if (req.body.email) {
            user = await User.findOne({ where: { email: req.body.email } });
            if (user) {
                return res.status(400).send({ success: false, message: "Failed! Email is already in use!" });
            }
        }
        next();
    } catch (error) {
        console.error("checkDuplicateUsernameOrEmail error:", error);
        return res.status(500).send({ success: false, message: "Error checking for duplicates." });
    }
};

// Możesz dodać więcej walidacji, np. ról, jeśli masz system ról

const verifySignUp = {
    checkDuplicateUsernameOrEmail: checkDuplicateUsernameOrEmail,
};

module.exports = verifySignUp;
