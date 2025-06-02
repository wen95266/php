// backend/src/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const registerSocketHandlers = require('./sockets/socketHandlers');

const app = express();

// CORS configuration
const allowedOrigins = [
    'http://localhost:5173', // Vite dev server
    'https://mm.9525.ip-ddns.com' // Your frontend domain
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
    // path: "/socket.io", // Optional: if your reverse proxy needs a specific path
});

app.get('/', (req, res) => {
    res.send('十三水后端服务正在运行! Backend domain: wenge.cloudns.ch');
});

registerSocketHandlers(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`后端服务运行在 http://localhost:${PORT}`);
    console.log(`期望的前端访问域名: https://mm.9525.ip-ddns.com`);
    console.log(`期望的后端Socket.IO域名 (通过反向代理): wss://wenge.cloudns.ch`);
});
