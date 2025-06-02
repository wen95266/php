// server/models/gameTable.model.js
module.exports = (sequelize, Sequelize) => {
    const GameTable = sequelize.define("game_table", { // Sequelize pluralizes to 'game_tables'
        table_code: {
            type: Sequelize.STRING(10),
            allowNull: false,
            unique: true
        },
        host_user_id: { // Foreign key is defined by association
            type: Sequelize.INTEGER,
            allowNull: false
        },
        status: {
            type: Sequelize.ENUM('waiting', 'playing', 'finished'),
            defaultValue: 'waiting'
        },
        max_players: {
            type: Sequelize.TINYINT,
            defaultValue: 2
        },
        current_round_id: { // Stores the ID of the active GameRound
            type: Sequelize.INTEGER,
            allowNull: true
        }
    });
    return GameTable;
};
