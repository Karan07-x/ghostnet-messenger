import React, { useState, useEffect, useRef } from 'react';
import Peer from 'simple-peer';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import FileShare from './FileShare';

const ChatRoom = ({ socket, roomCode, onLeave }) => {
  const [peers, setPeers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [peerConnections, setPeerConnections] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const myPeerId = useRef(socket?.id);

  useEffect(() => {
    if (!socket || !roomCode) return;

    // Setup peer connection listeners
    socket.on('user-joined', ({ userId }) => {
      console.log('👤 User joined:', userId);
      initiatePeerConnection(userId);
    });

    socket.on('signal', ({ from, signal }) => {
      console.log('📡 Signal received from:', from);
      handleSignal(from, signal);
    });

    socket.on('user-left', ({ userId }) => {
      console.log('👋 User left:', userId);
      handlePeerDisconnect(userId);
    });

    // Cleanup
    return () => {
      socket.off('user-joined');
      socket.off('signal');
      socket.off('user-left');
      
      // Destroy all peer connections
      Object.values(peerConnections).forEach(peer => peer.destroy());
    };
  }, [socket, roomCode]);

  const initiatePeerConnection = (userId) => {
    if (peerConnections[userId]) return;
    if (userId === myPeerId.current) return;

    const peer = new Peer({
      initiator: true,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    setupPeerEvents(peer, userId);
    setPeerConnections(prev => ({ ...prev, [userId]: peer }));

    // Send the offer through signaling server
    peer.on('signal', (signal) => {
      socket.emit('signal', {
        roomCode,
        signal,
        to: userId
      });
    });
  };

  const handleSignal = (from, signal) => {
    // Check if we already have a connection with this peer
    let peer = peerConnections[from];
    
    if (!peer) {
      // Create a new peer for incoming connection
      peer = new Peer({
        initiator: false,
        trickle: false,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      setupPeerEvents(peer, from);
      setPeerConnections(prev => ({ ...prev, [from]: peer }));
    }

    // Process the signal
    peer.signal(signal);
  };

  const setupPeerEvents = (peer, userId) => {
    peer.on('connect', () => {
      console.log(`🔗 Connected to peer: ${userId}`);
      setIsConnected(true);
      setPeers(prev => [...prev, userId]);
      
      // Send a welcome message
      peer.send(JSON.stringify({
        type: 'system',
        text: `👻 User ${userId.slice(0, 4)} joined the ghost network`
      }));
    });

    peer.on('data', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'system') {
          setMessages(prev => [...prev, message]);
        } else {
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: message.text,
            sender: message.sender || userId,
            timestamp: new Date().toLocaleTimeString(),
            isFile: message.isFile || false,
            fileName: message.fileName || null
          }]);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
    });

    peer.on('close', () => {
      handlePeerDisconnect(userId);
    });
  };

  const handlePeerDisconnect = (userId) => {
    setPeers(prev => prev.filter(id => id !== userId));
    setPeerConnections(prev => {
      if (prev[userId]) {
        prev[userId].destroy();
        delete prev[userId];
      }
      return prev;
    });
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: `👋 User ${userId.slice(0, 4)} left the chat`,
      type: 'system',
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const sendMessage = (text) => {
    const message = {
      type: 'message',
      text: text,
      sender: 'You',
      timestamp: new Date().toLocaleTimeString(),
      isFile: false
    };

    // Send to all connected peers
    const messageStr = JSON.stringify(message);
    Object.values(peerConnections).forEach(peer => {
      if (peer.connected) {
        peer.send(messageStr);
      }
    });

    // Add to local messages
    setMessages(prev => [...prev, message]);
  };

  const handleFileShare = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const message = {
        type: 'message',
        text: `📁 ${file.name}`,
        sender: 'You',
        timestamp: new Date().toLocaleTimeString(),
        isFile: true,
        fileName: file.name,
        fileData: e.target.result
      };

      // Send file to all connected peers
      const messageStr = JSON.stringify(message);
      Object.values(peerConnections).forEach(peer => {
        if (peer.connected) {
          peer.send(messageStr);
        }
      });

      setMessages(prev => [...prev, message]);
    };
    reader.readAsDataURL(file);
  };

  const handleLeave = () => {
    // Notify server
    socket.emit('leave-room', roomCode);
    
    // Close all peer connections
    Object.values(peerConnections).forEach(peer => peer.destroy());
    
    onLeave();
  };

  return (
    <div className="max-w-4xl mx-auto bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-900/50 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Room: <span className="text-indigo-400">{roomCode}</span></h2>
          <p className="text-sm text-gray-400">
            {peers.length} peer{peers.length !== 1 ? 's' : ''} connected • 
            <span className={isConnected ? 'text-green-400' : 'text-yellow-400'}>
              {isConnected ? ' Online' : ' Connecting...'}
            </span>
          </p>
        </div>
        <button
          onClick={handleLeave}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm"
        >
          Leave Room
        </button>
      </div>

      {/* Messages */}
      <MessageList messages={messages} />

      {/* File Share & Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-900/30">
        <FileShare onFileSelect={handleFileShare} />
        <MessageInput onSendMessage={sendMessage} disabled={!isConnected} />
      </div>
    </div>
  );
};

export default ChatRoom;