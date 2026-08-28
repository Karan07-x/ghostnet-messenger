const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// ✅ HEALTH CHECK ROUTE (ADDED HERE)
// ============================================
app.get('/', (req, res) => {
  res.json({ 
    status: '🟢 GhostNet Signaling Server is LIVE!',
    message: 'This is the backend for GhostNet messenger. WebSocket connections are active.',
    rooms: rooms?.size || 0,
    connections: io?.sockets?.sockets?.size || 0
  });
});
// ============================================

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Store active rooms and their participants
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`🟢 User connected: ${socket.id}`);

  // Create a new room
  socket.on('create-room', (roomCode) => {
    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, {
        creator: socket.id,
        participants: [socket.id]
      });
      socket.join(roomCode);
      socket.emit('room-created', { roomCode, success: true });
      console.log(`📦 Room created: ${roomCode} by ${socket.id}`);
    } else {
      socket.emit('room-error', { message: 'Room already exists' });
    }
  });

  // Join an existing room
  socket.on('join-room', (roomCode) => {
    const room = rooms.get(roomCode);
    if (room) {
      room.participants.push(socket.id);
      socket.join(roomCode);
      socket.emit('room-joined', { roomCode, success: true });
      
      // Notify other participants
      socket.to(roomCode).emit('user-joined', { userId: socket.id });
      console.log(`👤 User ${socket.id} joined room: ${roomCode}`);
    } else {
      socket.emit('room-error', { message: 'Room not found' });
    }
  });

  // WebRTC Signaling
  socket.on('signal', ({ roomCode, signal, to }) => {
    // Relay signal to specific peer
    io.to(to).emit('signal', { 
      from: socket.id, 
      signal: signal,
      roomCode: roomCode
    });
    console.log(`📡 Signal relayed from ${socket.id} to ${to}`);
  });

  // Broadcast to all in room (for group signaling)
  socket.on('broadcast-signal', ({ roomCode, signal }) => {
    socket.to(roomCode).emit('signal', {
      from: socket.id,
      signal: signal,
      roomCode: roomCode
    });
  });

  // Leave room
  socket.on('leave-room', (roomCode) => {
    const room = rooms.get(roomCode);
    if (room) {
      room.participants = room.participants.filter(id => id !== socket.id);
      socket.leave(roomCode);
      socket.to(roomCode).emit('user-left', { userId: socket.id });
      
      // Delete room if empty
      if (room.participants.length === 0) {
        rooms.delete(roomCode);
        console.log(`🗑️ Room deleted: ${roomCode}`);
      }
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`🔴 User disconnected: ${socket.id}`);
    
    // Clean up rooms
    for (const [roomCode, room] of rooms.entries()) {
      if (room.participants.includes(socket.id)) {
        room.participants = room.participants.filter(id => id !== socket.id);
        socket.to(roomCode).emit('user-left', { userId: socket.id });
        
        if (room.participants.length === 0) {
          rooms.delete(roomCode);
          console.log(`🗑️ Room cleaned up: ${roomCode}`);
        }
      }
    }
  });
});

// Additional health check endpoint (optional)
app.get('/health', (req, res) => {
  res.json({ 
    status: '🟢 Running', 
    rooms: rooms.size,
    connections: io.sockets.sockets.size 
  });
});

const PORT = process.env.PORT || 8081;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on http://localhost:${PORT}`);
});
        console.log(`🗑️ Room deleted: ${roomCode}`);
      }
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`🔴 User disconnected: ${socket.id}`);
    
    // Clean up rooms
    for (const [roomCode, room] of rooms.entries()) {
      if (room.participants.includes(socket.id)) {
        room.participants = room.participants.filter(id => id !== socket.id);
        socket.to(roomCode).emit('user-left', { userId: socket.id });
        
        if (room.participants.length === 0) {
          rooms.delete(roomCode);
          console.log(`🗑️ Room cleaned up: ${roomCode}`);
        }
      }
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: '🟢 Running', 
    rooms: rooms.size,
    connections: io.sockets.sockets.size 
  });
});

const PORT = process.env.PORT || 8081;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on http://localhost:${PORT}`);
});
