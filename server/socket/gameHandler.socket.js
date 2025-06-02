// server/socket/gameHandler.socket.js
const roomService = require('../services/room.service');
const gameLogicService = require('../services/gameLogic.service');
const cardService = require('../services/card.service');
const db = require("../models");
const RoundPlayerData = db.RoundPlayerData;
const User = db.User;
const GameRound = db.GameRound;
const GameTable = db.GameTable;


module.exports = (io, socket) => {
    const { userData } = socket;

    socket.on('submit_arrangement', async (payload, callback) => {
        const { tableId, roundId, arrangedCards } = payload; // arrangedCards = {first:[img..], middle:[], last:[]}
        if (!tableId || !roundId || !arrangedCards) {
            return callback({ success: false, message: "Missing parameters." });
        }
        const room = roomService.getRoom(tableId);
        if (!room || room.status !== 'playing' || room.currentRoundId != roundId) {
            return callback({ success: false, message: "Invalid game/round or not in playing state." });
        }
        const playerInRoom = room.players.find(p => p.id === userData.id);
        if (!playerInRoom) {
            return callback({ success: false, message: "You are not in this game." });
        }
        if (playerInRoom.arrangedHand) { // Already submitted
             return callback({ success: false, message: "You have already submitted your hand." });
        }

        try {
             // 1. Convert image names back to Card objects using player's dealt hand
             const rpd = await RoundPlayerData.findOne({ where: {round_id: roundId, user_id: userData.id }});
             if (!rpd || !rpd.hand_dealt) throw new Error("Dealt hand not found for player.");
             const dealtHandObjects = JSON.parse(rpd.hand_dealt).map(c => new cardService.Card(c.suit, c.rank));
             
             let arrangedHandObjects = { first: [], middle: [], last: [] };
             let usedCardImagesFromDealt = [];
             let isValidSubmission = true;

             for (const segment of ['first', 'middle', 'last']) {
                 if (!arrangedCards[segment]) { isValidSubmission = false; break;}
                 for (const imgName of arrangedCards[segment]) {
                     const cardFromDealt = dealtHandObjects.find(c => c.image === imgName && !usedCardImagesFromDealt.includes(imgName));
                     if (cardFromDealt) {
                         arrangedHandObjects[segment].push(cardFromDealt);
                         usedCardImagesFromDealt.push(imgName);
                     } else {
                         isValidSubmission = false; break;
                     }
                 }
                 if (!isValidSubmission) break;
             }
             if (usedCardImagesFromDealt.length !== 13) isValidSubmission = false;
             if (!isValidSubmission) throw new Error("Invalid cards submitted or not all cards used.");

             // 2. Validate arrangement (倒水)
             if (!cardService.validateArrangement(arrangedHandObjects)) {
                 throw new Error("Invalid arrangement (倒水).");
             }

             // 3. Store arrangement
             playerInRoom.arrangedHand = arrangedHandObjects; // In-memory
             playerInRoom.arrangedEval = { // In-memory evaluation
                 first: cardService.getHandDetails(arrangedHandObjects.first),
                 middle: cardService.getHandDetails(arrangedHandObjects.middle),
                 last: cardService.getHandDetails(arrangedHandObjects.last),
             };
              playerInRoom.specialHandType = cardService.checkOverallSpecialHand(playerInRoom.arrangedEval, dealtHandObjects);


             await RoundPlayerData.update(
                 { 
                     arranged_hand: JSON.stringify(Object.fromEntries(Object.entries(arrangedHandObjects).map(([key, val])=> [key, val.map(c=>c.toArray())]))), // Store as plain objects
                     special_hand_type: playerInRoom.specialHandType
                 },
                 { where: { round_id: roundId, user_id: userData.id } }
             );
             
             console.log(`${userData.username} in room ${tableId} submitted hand for round ${roundId}. Special: ${cardService.getSpecialHandName(playerInRoom.specialHandType)}`);
             callback({ success: true, message: "Hand submitted." });
             io.to(tableId).emit('table_state_update', room); // Notify others about submission status change

             // 4. Check if all players in room have submitted
             const allSubmitted = room.players.every(p => p.arrangedHand);
             if (allSubmitted && room.players.length === room.maxPlayers) { // Assuming maxPlayers for this round
                 console.log(`All players in room ${tableId} submitted for round ${roundId}. Finalizing...`);
                 
                 // Prepare data for scoring (assuming 2 players for now)
                 const p1Data = {
                     user_id: room.players[0].id,
                     arranged_eval: room.players[0].arrangedEval,
                     all_cards: JSON.parse((await RoundPlayerData.findOne({where:{round_id:roundId, user_id:room.players[0].id}})).hand_dealt).map(c=>new cardService.Card(c.suit,c.rank)),
                     special_type: room.players[0].specialHandType
                 };
                 const p2Data = {
                     user_id: room.players[1].id,
                     arranged_eval: room.players[1].arrangedEval,
                     all_cards: JSON.parse((await RoundPlayerData.findOne({where:{round_id:roundId, user_id:room.players[1].id}})).hand_dealt).map(c=>new cardService.Card(c.suit,c.rank)),
                     special_type: room.players[1].specialHandType
                 };

                 const scoreResults = gameLogicService.calculatePlayerScores(p1Data, p2Data);
                 
                 // --- Persist results and update game state ---
                 const transaction = await db.sequelize.transaction();
                 try {
                     await User.increment({ total_score: scoreResults.p1ScoreChange, games_played: 1, games_won: scoreResults.p1ScoreChange > 0 ? 1:0 }, { where: { id: p1Data.user_id }, transaction });
                     await User.increment({ total_score: scoreResults.p2ScoreChange, games_played: 1, games_won: scoreResults.p2ScoreChange > 0 ? 1:0 }, { where: { id: p2Data.user_id }, transaction });
                     
                     await RoundPlayerData.update({ score_change: scoreResults.p1ScoreChange }, { where: { round_id: roundId, user_id: p1Data.user_id }, transaction });
                     await RoundPlayerData.update({ score_change: scoreResults.p2ScoreChange }, { where: { round_id: roundId, user_id: p2Data.user_id }, transaction });

                     const winnerId = scoreResults.p1ScoreChange > scoreResults.p2ScoreChange ? p1Data.user_id : (scoreResults.p2ScoreChange > scoreResults.p1ScoreChange ? p2Data.user_id : null);
                     
                     await GameRound.update(
                         { end_time: new Date(), game_state_snapshot: JSON.stringify(scoreResults), winner_user_id: winnerId },
                         { where: { id: roundId }, transaction }
                     );
                     await GameTable.update( // Mark table as finished for this round
                         { status: 'finished' /* current_round_id: null  -- or keep for history */}, 
                         { where: { id: room.dbTableId || (await GameRound.findByPk(roundId)).table_id }, transaction} // Need to get table_id if not stored in room
                     ); 
                      // Reset player readiness in table_players for the next game on this table
                     await db.TablePlayer.update({ is_ready: false }, { where: { table_id: room.dbTableId || (await GameRound.findByPk(roundId)).table_id }, transaction });


                     await transaction.commit();
                     console.log(`Round ${roundId} finalized and results saved.`);
                     
                     // Prepare full results for clients
                     const p1User = await User.findByPk(p1Data.user_id);
                     const p2User = await User.findByPk(p2Data.user_id);

                     const finalResultsBroadcast = {
                         ...scoreResults,
                         player_details: {
                             [p1Data.user_id]: { 
                                 arranged_hand_for_display: Object.fromEntries(Object.entries(room.players[0].arrangedHand).map(([k,v])=>[k,v.map(c=>c.toArray())])), 
                                 cards_eval_display: Object.fromEntries(Object.entries(p1Data.arranged_eval).map(([k,v])=>[k,{name:v.name,primary_value:v.primary_value}])),
                                 special_hand_type_name: scoreResults.p1SpecialName,
                                 score_change: scoreResults.p1ScoreChange,
                                 total_score: p1User.total_score // Fetch updated total score
                             },
                             [p2Data.user_id]: { 
                                 arranged_hand_for_display: Object.fromEntries(Object.entries(room.players[1].arrangedHand).map(([k,v])=>[k,v.map(c=>c.toArray())])), 
                                 cards_eval_display: Object.fromEntries(Object.entries(p2Data.arranged_eval).map(([k,v])=>[k,{name:v.name,primary_value:v.primary_value}])),
                                 special_hand_type_name: scoreResults.p2SpecialName,
                                 score_change: scoreResults.p2ScoreChange,
                                 total_score: p2User.total_score
                             },
                         }
                     };
                     io.to(tableId).emit('round_over_results', finalResultsBroadcast);
                     roomService.updateRoomStatus(tableId, 'finished'); // Update in-memory status
                     io.to(tableId).emit('table_state_update', roomService.getRoom(tableId)); // Send updated room state
                     io.emit('update_room_list', roomService.getAllWaitingRooms()); // Update lobby


                 } catch (dbError) {
                     await transaction.rollback();
                     console.error("Error finalizing round in DB:", dbError);
                     io.to(tableId).emit('game_error', { message: "结算时发生数据库错误。" });
                 }
             }

        } catch (error) {
            console.error(`Error submitting arrangement for ${userData.username} in ${tableId}:`, error);
            callback({ success: false, message: error.message || "Failed to submit hand." });
        }
    });

    socket.on('request_suggestion', async (payload, callback) => {
         const { tableId, roundId } = payload;
         // Fetch player's current dealt hand for this round
         // const dealtHand = roomService.getRoom(tableId)?.gameSpecificState?.hands?.[userData.id];
         const rpd = await RoundPlayerData.findOne({ where: {round_id: roundId, user_id: userData.id }});
         if (!rpd || !rpd.hand_dealt) {
             return callback({success: false, message: "Cannot find your hand for suggestion."});
         }
         const dealtHandObjects = JSON.parse(rpd.hand_dealt).map(c => new cardService.Card(c.suit, c.rank));

         if (dealtHandObjects && dealtHandObjects.length === 13) {
             const suggestion = gameLogicService.runAIArrangementLogic(dealtHandObjects); // Use the AI logic
             if (suggestion) {
                 callback({ success: true, suggestion: Object.fromEntries(Object.entries(suggestion).map(([key, val])=> [key, val.map(c=>c.image)])) });
             } else {
                 callback({ success: false, message: "Could not generate a suggestion." });
             }
         } else {
             callback({ success: false, message: "Your hand is not available for suggestion." });
         }
    });
};
