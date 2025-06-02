// server/controllers/lobby.controller.js
const db = require("../models");
const User = db.User;
const GameTable = db.GameTable;
const GameRound = db.GameRound;
const RoundPlayerData = db.RoundPlayerData;
const { Op } = db.Sequelize;
const cardService = require('../services/card.service'); // For getSpecialHandName

exports.getLeaderboard = async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    try {
        const leaderboard = await User.findAll({
            attributes: ['nickname', 'total_score', 'games_played', 'games_won'],
            order: [
                ['total_score', 'DESC'],
                ['games_won', 'DESC'],
                ['games_played', 'ASC']
            ],
            limit: Math.min(limit, 50) // Max limit
        });
        res.status(200).send({ success: true, leaderboard });
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        res.status(500).send({ success: false, message: "Failed to fetch leaderboard." });
    }
};

exports.getGameHistory = async (req, res) => {
    if (!req.userId) { // userId should be set by authJwt.verifyToken
        return res.status(403).send({ success: false, message: "Authentication required." });
    }
    const limit = parseInt(req.query.limit) || 10;
    try {
        const roundsData = await RoundPlayerData.findAll({
            where: { user_id: req.userId },
            include: [{
                model: db.GameRound,
                as: 'round',
                required: true,
                where: { end_time: { [Op.ne]: null } }, // Only finished rounds
                include: [
                    { model: db.GameTable, as: 'table', attributes: ['table_code'] },
                    { // Include other players in the same round
                        model: db.RoundPlayerData,
                        as: 'playerDataEntries',
                        where: { user_id: { [Op.ne]: req.userId } }, // Opponents
                        include: [{ model: db.User, as: 'player', attributes: ['nickname'] }],
                        required: false // Use left join for opponents
                    }
                ]
            }],
            order: [['createdAt', 'DESC']], // Assuming RoundPlayerData createdAt is close to round start
            limit: Math.min(limit, 30)
        });

        const history = roundsData.map(rpd => {
            const round = rpd.round;
            const opponents = round.playerDataEntries.map(oppRpd => ({
                nickname: oppRpd.player.nickname,
                score_change: oppRpd.score_change
            }));
            
            return {
                round_id: round.id,
                table_code: round.table.table_code,
                end_time: round.end_time,
                my_score_change: rpd.score_change,
                my_special_hand_name: cardService.getSpecialHandName(rpd.special_hand_type),
                opponents_nicknames: opponents.map(o => o.nickname).join(', ') || 'N/A',
                opponents_score_changes: opponents.map(o => o.score_change).join(', ') || 'N/A',
            };
        });

        res.status(200).send({ success: true, history });
    } catch (error) {
        console.error("Error fetching game history:", error);
        res.status(500).send({ success: false, message: "Failed to fetch game history." });
    }
};
