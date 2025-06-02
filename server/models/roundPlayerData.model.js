// server/models/roundPlayerData.model.js
module.exports = (sequelize, Sequelize) => {
    const RoundPlayerData = sequelize.define("round_player_data", {
        // round_id and user_id are foreign keys
        hand_dealt: { // JSON string of card objects
            type: Sequelize.TEXT('medium'),
            allowNull: true
        },
        arranged_hand: { // JSON string of {first, middle, last} with card objects
            type: Sequelize.TEXT('medium'),
            allowNull: true
        },
        score_change: {
            type: Sequelize.INTEGER,
            defaultValue: 0
        },
        special_hand_type: { // Store the ID/constant from game_rules
            type: Sequelize.INTEGER,
            defaultValue: 0 // Corresponds to SPECIAL_HAND_NONE
        }
    });
    return RoundPlayerData;
};
