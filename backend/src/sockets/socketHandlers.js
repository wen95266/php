// backend/src/sockets/socketHandlers.js
const gameState = require('../game/GameState');
const { Card } = require('../game/Card'); // For reconstructing card objects from client

function registerSocketHandlers(io) {
    // 定时推送倒计时
    gameState.onTimeLeftUpdate = (roomId, timeLeftObj) => {
        const room = gameState.getSanitizedRoom(roomId);
        if (!room) return;
        room.players.forEach(player => {
            io.to(player.id).emit('timeLeftUpdate', { playerId: player.id, timeLeft: timeLeftObj[player.id] });
        });
    };

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        const emitRoomUpdate = (roomId) => {
            const room = gameState.getSanitizedRoom(roomId);
            if (room) {
                room.players.forEach(playerInRoom => {
                    const playerSpecificRoomView = JSON.parse(JSON.stringify(room));
                    if (room.status === 'playing' || room.status === 'dealing') {
                        playerSpecificRoomView.players.forEach(p => {
                            if (p.id !== playerInRoom.id) {
                                p.cards = p.cards.map(() => ({ facedown: true }));
                            }
                        });
                    }
                    if (room.status !== 'comparing' && room.status !== 'finished') {
                        Object.keys(playerSpecificRoomView.playerHands).forEach(pid => {
                            if (pid !== playerInRoom.id && !playerSpecificRoomView.playerHands[pid].submitted) {
                                playerSpecificRoomView.playerHands[pid] = { submitted: false };
                            }
                        });
                    }
                    io.to(playerInRoom.id).emit('roomUpdate', playerSpecificRoomView);
                });
            }
        };

        socket.on('createRoom', ({ playerName }, callback) => {
            const room = gameState.createRoom(socket.id, playerName);
            socket.join(room.id);
            callback({ success: true, room: gameState.getSanitizedRoom(room.id) });
            emitRoomUpdate(room.id);
        });

        socket.on('joinRoom', ({ roomId, playerName }, callback) => {
            const result = gameState.addPlayerToRoom(roomId, socket.id, playerName);
            if (result.error) {
                return callback({ success: false, message: result.error });
            }
            socket.join(roomId);
            callback({ success: true, room: gameState.getSanitizedRoom(roomId) });
            emitRoomUpdate(roomId);
        });

        socket.on('addAIPlayer', ({ roomId }, callback) => {
            const result = gameState.addAIPlayer(roomId);
            if (result.error) return callback({ success: false, message: result.error });
            emitRoomUpdate(roomId);
            callback({ success: true });
        });

        socket.on('playerReady', ({ roomId, isReady }, callback) => {
            const result = gameState.setPlayerReady(roomId, socket.id, isReady);
            if (result.error) {
                return callback({ success: false, message: result.error });
            }
            emitRoomUpdate(roomId);
            if (result.gameStarted) {
                console.log(`Game starting in room ${roomId}`);
            }
            callback({ success: true });
        });

        socket.on('submitHand', ({ roomId, front, middle, back }, callback) => {
            const reconstructCards = (cardDataArray) => cardDataArray.map(cd => new Card(cd.suit, cd.rank));
            try {
                const hand = {
                    front: reconstructCards(front),
                    middle: reconstructCards(middle),
                    back: reconstructCards(back)
                };
                const result = gameState.submitPlayerHand(roomId, socket.id, hand);
                if (result.error) {
                    return callback({ success: false, message: result.error });
                }
                emitRoomUpdate(roomId);
                callback({ success: true });
                if (result.allSubmitted) {
                    console.log(`All hands submitted in room ${roomId}. Comparing.`);
                }
            } catch (e) {
                 console.error("Error processing submitHand:", e);
                 callback({ success: false, message: "Invalid card data submitted." });
            }
        });

        socket.on('requestNextRound', ({roomId}, callback) => {
            const room = gameState.getRoom(roomId);
            if (!room || room.hostId !== socket.id) {
                return callback({success: false, message: "Only host can start next round or room not found."});
            }
            if (room.status !== 'finished') {
                 return callback({success: false, message: "Current round not finished."});
            }
            room.status = 'waiting';
            room.players.forEach(p => p.isReady = false);
            emitRoomUpdate(roomId);
            callback({success: true});
            console.log(`Room ${roomId} ready for players to signal 'ready' for next round.`);
        });

        socket.on('leaveRoom', ({ roomId }, callback) => {
            const result = gameState.removePlayerFromRoom(roomId, socket.id);
            socket.leave(roomId);
            if (result && !result.roomDeleted) {
                emitRoomUpdate(roomId);
            }
            console.log(`User ${socket.id} left room ${roomId}`);
            if (callback) callback({ success: true });
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
            for (const roomId in gameState.rooms) {
                const room = gameState.getRoom(roomId);
                if (room.players.some(p => p.id === socket.id)) {
                    const result = gameState.removePlayerFromRoom(roomId, socket.id);
                    if (result && !result.roomDeleted) {
                        emitRoomUpdate(roomId);
                    }
                    break;
                }
            }
        });
    });
}

module.exports = registerSocketHandlers;
