// frontend/src/services/socketService.js
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_BACKEND_WS_URL;
console.log("Attempting to connect to WebSocket at:", SOCKET_URL);

const socket = io(SOCKET_URL, {
    autoConnect: false, // Connect manually when needed
    transports: ['websocket'], // Prioritize WebSocket
    // path: "/socket.io", // If your backend socket.io server uses a custom path
});

socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
});

socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message, err.data || '');
});

export default socket;
