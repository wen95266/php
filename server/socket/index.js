// server/socket/index.js
const socketAuthMiddleware = require('./auth.socket');
const registerRoomHandlers = require('./roomHandler.socket');
const registerGameHandlers = require('./gameHandler.socket');
const roomService = require('../services/room.service'); // To handle disconnect cleanup

module.exports = function (io) {
    io.use(socketAuthMiddleware); // Apply authentication middleware to all incoming connections

    io.on('connection', (socket) => {
        console.log(`User ${socket.userData.username} (ID: ${socket.userData.id}) connected with socket ID ${socket.id}`);

        // Attach user data to the global users list or manage sessions if needed
        // For simplicity, userData is on socket now.

        registerRoomHandlers(io, socket);
        registerGameHandlers(io, socket);

        socket.on('disconnect', (reason) => {
            console.log(`User ${socket.userData?.username || socket.id} disconnected. Reason: ${reason}. Socket ID: ${socket.id}`);
            // Handle global disconnect logic, e.g., if user was in a room
            if (socket.currentRoomId) {
                const room = roomService.getRoom(socket.currentRoomId);
                if (room) {
                    const updatedRoom = roomService.removePlayerFromRoom(socket.currentRoomId, socket.userData.id);
                    if (updatedRoom) {
                        io.to(socket.currentRoomId).emit('table_state_update', updatedRoom); // Notify remaining players
                        io.emit('update_room_list', roomService.getAllWaitingRooms()); // Update lobby list
                    } else { // Room was removed
                        io.emit('update_room_list', roomService.getAllWaitingRooms());
                    }
                }
            }
        });
    });
};
