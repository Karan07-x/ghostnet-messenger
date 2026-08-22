const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ ADD THIS HEALTH CHECK ROUTE
app.get('/', (req, res) => {
  res.json({ 
    status: '🟢 GhostNet Signaling Server is LIVE!',
    message: 'This is the backend for GhostNet messenger. WebSocket connections are active.',
    rooms: rooms?.size || 0,
    connections: io?.sockets?.sockets?.size || 0
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ... rest of your code (rooms logic, socket events)