import React, { useState } from 'react';

const RoomJoiner = ({ socket, onRoomJoined }) => {
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const handleJoinRoom = () => {
    if (!socket) {
      setError('Not connected to server');
      return;
    }

    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setIsJoining(true);
    setError('');

    const code = roomCode.trim().toUpperCase();
    socket.emit('join-room', code);

    socket.once('room-joined', (data) => {
      setIsJoining(false);
      onRoomJoined(code);
    });

    socket.once('room-error', (data) => {
      setIsJoining(false);
      setError(data.message);
    });

    // Timeout fallback
    setTimeout(() => {
      setIsJoining(false);
    }, 5000);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
      <h2 className="text-2xl font-bold mb-4">🔗 Join Room</h2>
      <p className="text-gray-400 text-sm mb-6">
        Enter the room code to join an existing chat
      </p>
      <div className="space-y-4">
        <input
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          placeholder="Enter room code (e.g., GHOST)"
          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors uppercase"
          maxLength={6}
        />
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}
        <button
          onClick={handleJoinRoom}
          disabled={isJoining || !socket || !roomCode.trim()}
          className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isJoining ? 'Joining...' : 'Join Room'}
        </button>
      </div>
    </div>
  );
};

export default RoomJoiner;