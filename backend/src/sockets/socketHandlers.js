// backend/src/sockets/socketHandlers.js
const gameState = require('../game/GameState');
const { Card } = require('../game/Card'); // For reconstructing card objects from client

function registerSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        const emitRoomUpdate = (roomId) => {
            const room = gameState.getSanitizedRoom(roomId);
            if (room) {
                // Customize what each player sees (e.g., only their own cards before showdown)
                room.players.forEach(playerInRoom => {
                    const playerSpecificRoomView = JSON.parse(JSON.stringify(room)); // Deep clone
                    if (room.status === 'playing' || room.status === 'dealing') {
                        playerSpecificRoomView.players.forEach(p => {
                            if (p.id !== playerInRoom.id) {
                                p.cards = p.cards.map(() => ({ facedown: true })); // Show facedown for others
                            }
                        });
                    }
                    // Ensure playerHands are visible at correct stages
                    if (room.status !== 'comparing' && room.status !== 'finished') {
                         Object.keys(playerSpecificRoomView.playerHands).forEach(pid => {
                            if (pid !== playerInRoom.id && !playerSpecificRoomView.playerHands[pid].submitted) {
                                // Hide non-submitted hands of others
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

        socket.on('playerReady', ({ roomId, isReady }, callback) => {
            const result = gameState.setPlayerReady(roomId, socket.id, isReady);
            if (result.error) {
                return callback({ success: false, message: result.error });
            }
            emitRoomUpdate(roomId);
            if (result.gameStarted) {
                // gameStart logic is handled inside setPlayerReady which calls startGame
                // startGame will modify room status and deal cards
                console.log(`Game starting in room ${roomId}`);
            }
            callback({ success: true });
        });

        socket.on('submitHand', ({ roomId, front, middle, back }, callback) => {
            // Reconstruct Card objects from plain data sent by client
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
                emitRoomUpdate(roomId); // This will eventually show all hands if allSubmitted
                callback({ success: true });

                if (result.allSubmitted) {
                    console.log(`All hands submitted in room ${roomId}. Comparing.`);
                    // Comparison happens in submitPlayerHand, emitRoomUpdate will send new state
                }

            } catch (e) {
                 console.error("Error processing submitHand:", e);
                 callback({ success: false, message: "Invalid card data submitted." });
            }
        });
        
        socket.on('requestNextRound', ({roomId}, callback) => {
            const room = gameState.getRoom(roomId);
            if (!room || room.hostId !== socket.id) { // Only host can start next round for simplicity
                return callback({success: false, message: "Only host can start next round or room not found."});
            }
            if (room.status !== 'finished') {
                 return callback({success: false, message: "Current round not finished."});
            }
            
            // Reset for next round (simplified: essentially calls startGame again on existing players)
            room.status = 'waiting'; // Set to waiting, players need to ready up again
            room.players.forEach(p => p.isReady = false); // Reset ready status
            // Scores are persistent across rounds
            
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
            // Find which room the player was in and remove them
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
