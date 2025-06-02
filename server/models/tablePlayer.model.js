// server/models/tablePlayer.model.js
module.exports = (sequelize, Sequelize) => {
    const TablePlayer = sequelize.define("table_player", {
        // table_id and user_id are foreign keys defined by associations
        seat_number: {
            type: Sequelize.TINYINT,
            allowNull: false
        },
        is_ready: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        }
        // joined_at is createdAt
    });
    // Unique constraints for (table_id, user_id) and (table_id, seat_number)
    // should be defined in migrations or directly in the DB schema if not handled by Sequelize associations
    // For now, rely on associations and application logic to enforce this.
    // Or, you can add them here:
    // {
    //     indexes: [
    //         { unique: true, fields: ['table_id', 'user_id'] },
    //         { unique: true, fields: ['table_id', 'seat_number'] }
    //     ]
    // }
    return TablePlayer;
};
