const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// ✅ ROOT ROUTE - THIS MUST BE FIRST!
// ============================================
app.get('/', (req, res) => {
  res.send('🚀 GhostNet Signaling Server is LIVE! This is the WebSocket backend.');
});

// ============================================
// ✅ HEALTH CHECK ROUTE
// ============================================
app.get('/health', (req, res) => {
  res.json({ 
    status: '🟢 Running', 
    message: 'GhostNet server is active'
  });
});

// ============================================
// ✅ TEST ROUTE - To confirm it's working
// ============================================
app.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is responding!',
    timestamp: new Date().toISOString()
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store active rooms
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`🟢 User connected: ${socket.id}`);

  socket.on('create-room', (roomCode) => {
    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, {
        creator: socket.id,
        participants: [socket.id]
      });
      socket.join(roomCode);
      socket.emit('room-created', { roomCode, success: true });
      console.log(`📦 Room created: ${roomCode}`);
    } else {
      socket.emit('room-error', { message: 'Room already exists' });
    }
  });

  socket.on('join-room', (roomCode) => {
    const room = rooms.get(roomCode);
    if (room) {
      room.participants.push(socket.id);
      socket.join(roomCode);
      socket.emit('room-joined', { roomCode, success: true });
      socket.to(roomCode).emit('user-joined', { userId: socket.id });
      console.log(`👤 User joined room: ${roomCode}`);
    } else {
      socket.emit('room-error', { message: 'Room not found' });
    }
  });

  socket.on('signal', ({ roomCode, signal, to }) => {
    io.to(to).emit('signal', { 
      from: socket.id, 
      signal: signal,
      roomCode: roomCode
    });
  });

  socket.on('leave-room', (roomCode) => {
    const room = rooms.get(roomCode);
    if (room) {
      room.participants = room.participants.filter(id => id !== socket.id);
      socket.leave(roomCode);
      socket.to(roomCode).emit('user-left', { userId: socket.id });
      if (room.participants.length === 0) {
        rooms.delete(roomCode);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔴 User disconnected: ${socket.id}`);
    for (const [roomCode, room] of rooms.entries()) {
      if (room.participants.includes(socket.id)) {
        room.participants = room.participants.filter(id => id !== socket.id);
        socket.to(roomCode).emit('user-left', { userId: socket.id });
        if (room.participants.length === 0) {
          rooms.delete(roomCode);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 8081;
server.listen(PORT, () => {
  console.log(`🚀 GhostNet Signaling Server running on port ${PORT}`);
  console.log(`✅ Test the server at: https://ghostnet-messenger.onrender.com/test`);
});
