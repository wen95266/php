// server/models/index.js
const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");

const sequelize = new Sequelize( /* ... (与之前版本相同) ... */
    dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD,
    { host: dbConfig.HOST, dialect: dbConfig.dialect, pool: dbConfig.pool, logging: process.env.NODE_ENV === 'development' ? console.log : false }
);

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require("./user.model.js")(sequelize, Sequelize);
db.GameTable = require("./gameTable.model.js")(sequelize, Sequelize);
db.TablePlayer = require("./tablePlayer.model.js")(sequelize, Sequelize);
db.GameRound = require("./gameRound.model.js")(sequelize, Sequelize);
db.RoundPlayerData = require("./roundPlayerData.model.js")(sequelize, Sequelize);

// --- Define relationships ---
// User and GameTable (host)
db.User.hasMany(db.GameTable, { as: "hostedTables", foreignKey: "host_user_id" });
db.GameTable.belongsTo(db.User, { as: "host", foreignKey: "host_user_id" });

// GameTable and TablePlayer
db.GameTable.hasMany(db.TablePlayer, { as: "playersOnTable", foreignKey: "table_id" });
db.TablePlayer.belongsTo(db.GameTable, { as: "table", foreignKey: "table_id" });

// User and TablePlayer
db.User.hasMany(db.TablePlayer, { as: "tableSessionsAsPlayer", foreignKey: "user_id" }); // Renamed for clarity
db.TablePlayer.belongsTo(db.User, { as: "player", foreignKey: "user_id" }); // Renamed for clarity

// GameTable and GameRound
db.GameTable.hasMany(db.GameRound, { as: "rounds", foreignKey: "table_id" });
db.GameRound.belongsTo(db.GameTable, { as: "table", foreignKey: "table_id" });

// GameRound and RoundPlayerData
db.GameRound.hasMany(db.RoundPlayerData, { as: "playerDataEntries", foreignKey: "round_id" }); // Renamed for clarity
db.RoundPlayerData.belongsTo(db.GameRound, { as: "round", foreignKey: "round_id" });

// User and RoundPlayerData
db.User.hasMany(db.RoundPlayerData, { as: "roundGameData", foreignKey: "user_id" }); // Renamed for clarity
db.RoundPlayerData.belongsTo(db.User, { as: "player", foreignKey: "user_id" }); // Renamed for clarity

// User and GameRound (winner)
db.User.hasMany(db.GameRound, {as: "wonRounds", foreignKey: "winner_user_id", constraints: false, allowNull: true}); // constraints: false for optional FK
db.GameRound.belongsTo(db.User, {as: "winner", foreignKey: "winner_user_id", allowNull: true});

module.exports = db;
