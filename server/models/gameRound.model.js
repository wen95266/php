// server/models/gameRound.model.js
module.exports = (sequelize, Sequelize) => {
    const GameRound = sequelize.define("game_round", {
        // table_id is a foreign key
        start_time: { // Handled by createdAt
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
        },
        end_time: {
            type: Sequelize.DATE,
            allowNull: true
        },
        game_state_snapshot: { // Stores final results or key events
            type: Sequelize.TEXT('long'), // Use TEXT or JSON if DB supports
            allowNull: true
        },
        winner_user_id: { // Foreign key, allowNull true
            type: Sequelize.INTEGER,
            allowNull: true
        }
    });
    return GameRound;
};
