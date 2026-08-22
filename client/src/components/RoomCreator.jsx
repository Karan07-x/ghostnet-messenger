import React, { useState } from 'react';
import { generateRoomCode } from '../utils/peer';

const RoomCreator = ({ socket, onRoomCreated }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = () => {
    if (!socket) {
      setError('Not connected to server');
      return;
    }

    setIsCreating(true);
    setError('');

    const roomCode = generateRoomCode();
    socket.emit('create-room', roomCode);

    socket.once('room-created', (data) => {
      setIsCreating(false);
      onRoomCreated(roomCode);
    });

    socket.once('room-error', (data) => {
      setIsCreating(false);
      setError(data.message);
    });

    // Timeout fallback
    setTimeout(() => {
      setIsCreating(false);
    }, 5000);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
      <h2 className="text-2xl font-bold mb-4">🚀 Create Room</h2>
      <p className="text-gray-400 text-sm mb-6">
        Start a new chat room and share the code with others
      </p>
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      <button
        onClick={handleCreateRoom}
        disabled={isCreating || !socket}
        className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCreating ? 'Creating...' : 'Create Room'}
      </button>
    </div>
  );
};

export default RoomCreator;