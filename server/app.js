// server/app.js
require('dotenv').config(); // Load environment variables from .env file first

const express = require('express');
const http = require('http');
const { Server } = require("socket.io"); // Correct import for Socket.IO v3+
const cors = require('cors');
const db = require("./models"); // Sequelize instance and models

const app = express();
const server = http.createServer(app); // Create HTTP server for Express and Socket.IO

// --- CORS Configuration ---
// Define allowed origins based on your frontend URL and development environment
const allowedOrigins = [
    process.env.FRONTEND_URL || "https://mm.9525.ip-ddns.com", // Your production frontend
    "http://localhost:8080", // Common local dev server for frontend
    "http://127.0.0.1:8080",
    "http://localhost:3000"  // If frontend runs on 3000 sometimes (though backend is 3001)
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`CORS: Origin ${origin} not allowed.`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true // Important for cookies/sessions across domains
};

app.use(cors(corsOptions));

// --- Middleware for parsing request bodies ---
app.use(express.json()); // Parses incoming requests with JSON payloads
app.use(express.urlencoded({ extended: true })); // Parses incoming requests with URL-encoded payloads

// --- Database Synchronization ---
// db.sequelize.sync({ force: true }) // WARNING: { force: true } will drop and re-create tables. Use only in development.
db.sequelize.sync()
    .then(() => {
        console.log("Database synchronized successfully.");
        // You can add initial data seeding here if needed
        // initialRoles(); // Example if you have a role system
    })
    .catch((err) => {
        console.error("Failed to synchronize database: ", err.message);
        // process.exit(1); // Optionally exit if DB sync fails critically
    });

// --- HTTP Routes ---
app.get("/", (req, res) => {
    res.json({ message: "Welcome to the Thirteen Water (Node.js & Socket.IO) Backend!" });
});

// Import and use authentication routes
require('./routes/auth.routes')(app);
// Import and use lobby routes (for leaderboard, game history via HTTP)
require('./routes/lobby.routes')(app);
// You can add more HTTP routes here (e.g., user profile, game settings)


// --- Socket.IO Server Setup ---
const io = new Server(server, {
    cors: corsOptions, // Apply CORS options to Socket.IO server as well
    // path: "/socket.io", // Default path, can be customized if needed
    // transports: ['websocket', 'polling'], // Default transports
});

// Import and initialize Socket.IO event handlers (pass 'io' instance)
require('./socket')(io);


// --- Server Listening ---
const PORT = process.env.PORT || 3001; // Default to 3001 if PORT env var is not set
server.listen(PORT, () => {
    console.log(`Node.js HTTP server is running on port ${PORT}.`);
    console.log(`Socket.IO server is attached and listening on the same port.`);
});

// Optional: Graceful shutdown (example)
process.on('SIGTERM', () => {
    console.info('SIGTERM signal received: closing HTTP server')
    server.close(() => {
        console.log('HTTP server closed')
        db.sequelize.close().then(() => { // Close DB connection
            console.log('Database connection closed');
            process.exit(0)
        })
    })
})
