// server/models/user.model.js
module.exports = (sequelize, Sequelize) => { /* ... (与之前版本相同) ... */ 
    const User = sequelize.define("user", {
        username: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        password_hash: { type: Sequelize.STRING, allowNull: false },
        nickname: { type: Sequelize.STRING(50) },
        email: { type: Sequelize.STRING(100), unique: true, validate: { isEmail: true }},
        telegram_user_id: { type: Sequelize.BIGINT, unique: true, allowNull: true },
        total_score: { type: Sequelize.INTEGER, defaultValue: 0 },
        games_played: { type: Sequelize.INTEGER, defaultValue: 0 },
        games_won: { type: Sequelize.INTEGER, defaultValue: 0 },
        is_bot_admin: { type: Sequelize.BOOLEAN, defaultValue: false },
        last_login_at: { type: Sequelize.DATE }
    });
    return User;
};
