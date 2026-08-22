import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import RoomCreator from './components/RoomCreator';
import RoomJoiner from './components/RoomJoiner';
import ChatRoom from './components/ChatRoom';

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8081';

function App() {
  const [socket, setSocket] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to signaling server');
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Connection error:', err);
      setError('Failed to connect to server. Make sure the signaling server is running.');
      setIsConnected(false);
    });

    newSocket.on('disconnect', () => {
      console.log('🔴 Disconnected from server');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleRoomCreated = (code) => {
    setRoomCode(code);
  };

  const handleRoomJoined = (code) => {
    setRoomCode(code);
  };

  const handleLeaveRoom = () => {
    setRoomCode(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-10">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            👻 GhostNet
          </h1>
          <p className="text-gray-400 mt-2">Peer-to-Peer Messenger • No Internet Required</p>
          {isConnected ? (
            <span className="inline-block mt-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
              ● Connected to signaling server
            </span>
          ) : (
            <span className="inline-block mt-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
              ● Disconnected
            </span>
          )}
          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 max-w-2xl mx-auto">
              {error}
            </div>
          )}
        </header>

        {/* Main Content */}
        {!roomCode ? (
          <div className="max-w-2xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <RoomCreator socket={socket} onRoomCreated={handleRoomCreated} />
              <RoomJoiner socket={socket} onRoomJoined={handleRoomJoined} />
            </div>
            
            {/* Features Section */}
            <div className="mt-12 grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-gray-800/50 rounded-lg backdrop-blur-sm">
                <div className="text-3xl mb-2">📡</div>
                <h3 className="font-semibold text-sm">P2P Direct</h3>
                <p className="text-xs text-gray-400">Messages go device-to-device</p>
              </div>
              <div className="p-4 bg-gray-800/50 rounded-lg backdrop-blur-sm">
                <div className="text-3xl mb-2">📁</div>
                <h3 className="font-semibold text-sm">File Sharing</h3>
                <p className="text-xs text-gray-400">Send images & files instantly</p>
              </div>
              <div className="p-4 bg-gray-800/50 rounded-lg backdrop-blur-sm">
                <div className="text-3xl mb-2">🔒</div>
                <h3 className="font-semibold text-sm">End-to-End Encrypted</h3>
                <p className="text-xs text-gray-400">Only you and recipient see messages</p>
              </div>
            </div>
          </div>
        ) : (
          <ChatRoom 
            socket={socket} 
            roomCode={roomCode} 
            onLeave={handleLeaveRoom}
          />
        )}
      </div>
    </div>
  );
}

export default App;