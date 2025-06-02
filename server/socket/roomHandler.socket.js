// server/socket/roomHandler.socket.js
const roomService = require('../services/room.service');
const gameService = require('../services/gameLogic.service'); // For starting game
const cardService = require('../services/card.service');   // For dealing cards
const db = require('../models');
const GameRound = db.GameRound; // For creating game round record

module.exports = (io, socket) => {
    const { userData } = socket; // User data from auth middleware

    socket.on('create_room', async (settings, callback) => {
        console.log(`${userData.username} requests to create room with settings:`, settings);
        try {
            const room = await roomService.createRoom(userData, settings);
            socket.join(room.id); // Join Socket.IO room
            socket.currentRoomId = room.id; // Store room ID on socket
            
            callback({ success: true, roomDetails: room });
            io.emit('update_room_list', roomService.getAllWaitingRooms()); // Notify lobby
        } catch (error) {
            console.error(`Error creating room for ${userData.username}:`, error);
            callback({ success: false, message: error.message || "Failed to create room." });
        }
    });

    socket.on('join_room', async ({ tableCode }, callback) => {
        console.log(`${userData.username} requests to join room with code: ${tableCode}`);
        try {
            const roomToJoin = Object.values(roomService.activeRooms).find(r => r.code === tableCode && r.status === 'waiting');
            if (!roomToJoin) {
                return callback({ success: false, message: "Room not found or not available." });
            }
            if (roomToJoin.players.length >= roomToJoin.maxPlayers) {
                return callback({ success: false, message: "Room is full." });
            }
            if (roomToJoin.players.find(p => p.id === userData.id)) {
                 // Already in room, just re-join socket to room and send state
                 socket.join(roomToJoin.id);
                 socket.currentRoomId = roomToJoin.id;
                 return callback({ success: true, roomDetails: roomToJoin, message: "Rejoined room." });
            }

            const updatedRoom = roomService.addPlayerToRoom(roomToJoin.id, userData, socket.id);
            socket.join(updatedRoom.id);
            socket.currentRoomId = updatedRoom.id;

            callback({ success: true, roomDetails: updatedRoom });
            io.to(updatedRoom.id).emit('table_state_update', updatedRoom); // Notify everyone in room
            io.emit('update_room_list', roomService.getAllWaitingRooms()); // Notify lobby
        } catch (error) {
            console.error(`Error joining room for ${userData.username}:`, error);
            callback({ success: false, message: error.message || "Failed to join room." });
        }
    });
    
    socket.on('get_room_list', (callback) => { // Client requests room list
         callback(roomService.getAllWaitingRooms());
    });

    socket.on('get_table_state', ({tableId}, callback) => { // Client requests specific table state
        const room = roomService.getRoom(tableId);
        if (room) {
            // Ensure socket is in this room if they claim to be
            if (room.players.find(p => p.id === userData.id)) {
                socket.join(room.id); // Re-join just in case (e.g. after refresh)
                socket.currentRoomId = room.id;
            }
            callback(room);
        } else {
            callback(null); // Room not found
        }
    });

    socket.on('player_ready_toggle', async ({ tableId, isReady }, callback) => {
        console.log(`${userData.username} in room ${tableId} ready status: ${isReady}`);
        try {
            const room = roomService.setPlayerReady(tableId, userData.id, isReady);
            io.to(tableId).emit('table_state_update', room); // Notify all in room

            // Check if all players are ready to start the game
            const allReady = room.players.length === room.maxPlayers && room.players.every(p => p.isReady);
            if (allReady && room.status === 'waiting') {
                console.log(`All players ready in room ${tableId}. Starting game...`);
                roomService.updateRoomStatus(tableId, 'playing');
                
                // Create GameRound in DB
                const dbTable = await db.GameTable.findOne({where: {table_code: room.code}}); // find by code or store db id in room object
                if (!dbTable) throw new Error("Associated DB table not found for room code " + room.code);

                const gameRound = await GameRound.create({ table_id: dbTable.id });
                room.currentRoundId = gameRound.id; // Store DB round ID
                roomService.setRoomGameData(tableId, { roundId: gameRound.id, turn: null, hands: {} }); // Init game data
                
                // Deal cards
                const deck = cardService.shuffleDeck(cardService.createDeck());
                const hands = cardService.dealCards(deck, room.players.length, 13);
                
                room.players.forEach((player, index) => {
                    const playerSocket = io.sockets.sockets.get(player.socketId); // Get specific player's socket
                    if (playerSocket) {
                        // Store dealt hand in DB (and in memory room state)
                        const handToStore = hands[index].map(c => c.toArray());
                        room.gameSpecificState.hands[player.id] = handToStore; // Store in memory
                        
                        RoundPlayerData.create({
                            round_id: gameRound.id,
                            user_id: player.id,
                            hand_dealt: JSON.stringify(handToStore)
                        });
                        
                        playerSocket.emit('deal_cards', { roundId: gameRound.id, hand: handToStore });
                    }
                });
                io.to(tableId).emit('game_started_on_table', { tableId: tableId, roundId: gameRound.id, tableState: room });
            }
            callback({success: true});
        } catch (error) {
            console.error(`Error setting player ready for ${userData.username} in ${tableId}:`, error);
            callback({ success: false, message: error.message || "Failed to set ready status." });
        }
    });
    
    socket.on('leave_room', (payload, callback) => {
        if (!socket.currentRoomId) {
            return callback({success: false, message: "You are not in a room."});
        }
        const roomId = socket.currentRoomId;
        const updatedRoom = roomService.removePlayerFromRoom(roomId, userData.id);
        socket.leave(roomId);
        socket.currentRoomId = null;
        
        if (updatedRoom) {
            io.to(roomId).emit('table_state_update', updatedRoom);
        }
        io.emit('update_room_list', roomService.getAllWaitingRooms());
        callback({success: true});
    });
};
