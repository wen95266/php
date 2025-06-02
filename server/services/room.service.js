// server/services/room.service.js
// This service will manage the in-memory state of rooms and players within them.
// For persistence, it would interact with db.GameTable and db.TablePlayer.
// For simplicity, we'll use an in-memory object for active rooms.

let activeRooms = {}; // { roomId: { id, code, host, players: [socketUserData], status, maxPlayers, currentRoundId, gameData: {} }}

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function createRoom(hostUserData, settings = {}) {
    const roomCode = generateRoomCode();
    const roomId = `room_${roomCode}`; // Or use UUID
    const maxPlayers = settings.maxPlayers || 2;

    const room = {
        id: roomId,
        code: roomCode,
        host: hostUserData, // { id, username, nickname }
        players: [{ ...hostUserData, socketId: hostUserData.socketId, isReady: false, seat: 1 }], // Host is player 1
        status: 'waiting', // 'waiting', 'playing', 'finished'
        maxPlayers: maxPlayers,
        currentRoundId: null,
        gameSpecificState: null, // To store cards, current turn etc. during a game
        createdAt: new Date()
    };
    activeRooms[roomId] = room;
    console.log(`Room created: ${roomId} by ${hostUserData.username}`);
    
    // TODO: Persist to GameTable and TablePlayer in DB if needed for long-term rooms or recovery
    // const gameTable = await db.GameTable.create({ table_code: roomCode, host_user_id: hostUserData.id, max_players: maxPlayers });
    // await db.TablePlayer.create({ table_id: gameTable.id, user_id: hostUserData.id, seat_number: 1 });
    // room.dbTableId = gameTable.id; // Store DB ID if created

    return room;
}

function getRoom(roomId) {
    return activeRooms[roomId];
}

function getAllWaitingRooms() {
    return Object.values(activeRooms).filter(room => room.status === 'waiting');
}

function addPlayerToRoom(roomId, playerUserData, socketId) {
    const room = activeRooms[roomId];
    if (!room) throw new Error("Room not found");
    if (room.players.length >= room.maxPlayers) throw new Error("Room is full");
    if (room.status !== 'waiting') throw new Error("Game already started or finished");
    if (room.players.find(p => p.id === playerUserData.id)) throw new Error("Player already in room");

    let seat = 1;
    const existingSeats = room.players.map(p => p.seat);
    while(existingSeats.includes(seat)) {
        seat++;
    }
    if (seat > room.maxPlayers) throw new Error("Could not find a seat (should not happen if not full)");


    room.players.push({ ...playerUserData, socketId: socketId, isReady: false, seat: seat });
    console.log(`${playerUserData.username} joined room ${roomId}`);
    // TODO: Persist to TablePlayer in DB
    return room;
}

function removePlayerFromRoom(roomId, userId) {
     const room = activeRooms[roomId];
     if (!room) return null; // Room might have been removed

     const playerIndex = room.players.findIndex(p => p.id === userId);
     if (playerIndex === -1) return room; // Player not in room

     const removedPlayer = room.players.splice(playerIndex, 1)[0];
     console.log(`${removedPlayer.username} left room ${roomId}`);

     if (room.players.length === 0) {
         console.log(`Room ${roomId} is empty, removing.`);
         delete activeRooms[roomId];
         // TODO: Delete from GameTable in DB
         return null; // Room is removed
     }

     // If host left, assign new host (e.g., first player remaining)
     if (room.host.id === userId && room.players.length > 0) {
         room.host = room.players[0]; // Simplistic new host assignment
         console.log(`New host for room ${roomId}: ${room.host.username}`);
         // TODO: Update host_user_id in GameTable DB
     }
     // TODO: Delete from TablePlayer in DB
     return room;
}

function setPlayerReady(roomId, userId, isReady) {
    const room = activeRooms[roomId];
    if (!room) throw new Error("Room not found");
    const player = room.players.find(p => p.id === userId);
    if (!player) throw new Error("Player not in this room");
    player.isReady = isReady;
    return room;
}

function updateRoomStatus(roomId, newStatus) {
    const room = activeRooms[roomId];
    if (room) {
        room.status = newStatus;
        if (newStatus === 'finished') { // Reset readiness for next game
            room.players.forEach(p => p.isReady = false);
        }
        return room;
    }
    return null;
}

function setRoomGameData(roomId, gameData) {
    const room = activeRooms[roomId];
    if (room) {
        room.gameSpecificState = gameData; // e.g., { roundId, hands, turn, etc. }
        return room;
    }
    return null;
}


module.exports = {
    createRoom,
    getRoom,
    getAllWaitingRooms,
    addPlayerToRoom,
    removePlayerFromRoom,
    setPlayerReady,
    updateRoomStatus,
    setRoomGameData,
    activeRooms // Exposing for direct manipulation in handlers (can be refactored)
};
