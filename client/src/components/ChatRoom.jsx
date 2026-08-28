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
  const peerRefs = useRef({});

  // ============================================
  // ✅ ULTIMATE STUN/TURN CONFIGURATION
  // ============================================
  const peerConfig = {
    iceServers: [
      // Google STUN (always reliable)
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      
      // Public STUN servers
      { urls: 'stun:stun.ekiga.net' },
      { urls: 'stun:stun.ideasip.com' },
      { urls: 'stun:stun.schlund.de' },
      { urls: 'stun:stun.stunprotocol.org:3478' },
      { urls: 'stun:stun.voiparound.com' },
      { urls: 'stun:stun.voipbuster.com' },
      
      // TURN servers (for strict firewalls)
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:5349',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ],
    iceTransportPolicy: 'all',
    iceCandidatePoolSize: 10
  };

  useEffect(() => {
    if (!socket || !roomCode) return;

    socket.on('user-joined', ({ userId }) => {
      console.log('👤 User joined:', userId);
      if (userId !== myPeerId.current) {
        initiatePeerConnection(userId);
      }
    });

    socket.on('signal', ({ from, signal }) => {
      console.log('📡 Signal received from:', from);
      if (from !== myPeerId.current) {
        handleSignal(from, signal);
      }
    });

    socket.on('user-left', ({ userId }) => {
      console.log('👋 User left:', userId);
      handlePeerDisconnect(userId);
    });

    return () => {
      socket.off('user-joined');
      socket.off('signal');
      socket.off('user-left');
      
      Object.values(peerConnections).forEach(peer => {
        try { peer.destroy(); } catch (e) {}
      });
      setPeerConnections({});
    };
  }, [socket, roomCode]);

  const initiatePeerConnection = (userId) => {
    if (peerConnections[userId]) return;
    if (userId === myPeerId.current) return;

    console.log(`🔧 Creating peer connection (initiator) to: ${userId}`);
    
    const peer = new Peer({
      initiator: true,
      trickle: true,
      config: peerConfig,
      objectMode: true
    });

    peerRefs.current[userId] = peer;
    setPeerConnections(prev => ({ ...prev, [userId]: peer }));

    peer.on('signal', (signal) => {
      console.log(`📤 Sending signal to ${userId}`);
      socket.emit('signal', {
        roomCode,
        signal,
        to: userId
      });
    });

    peer.on('connect', () => {
      console.log(`✅ CONNECTED to peer: ${userId}`);
      setIsConnected(true);
      setPeers(prev => {
        if (!prev.includes(userId)) return [...prev, userId];
        return prev;
      });
      
      // Send welcome message
      try {
        peer.send(JSON.stringify({
          type: 'system',
          text: `👻 User ${myPeerId.current?.slice(0, 4)} joined the ghost network`
        }));
      } catch (e) {
        console.error('Error sending welcome:', e);
      }
    });

    peer.on('data', (data) => {
      handlePeerData(data, userId);
    });

    peer.on('error', (err) => {
      console.error(`❌ Peer error (${userId}):`, err);
    });

    peer.on('close', () => {
      console.log(`🔌 Peer closed: ${userId}`);
      handlePeerDisconnect(userId);
    });
  };

  const handleSignal = (from, signal) => {
    if (from === myPeerId.current) return;
    
    let peer = peerConnections[from];
    
    if (!peer) {
      console.log(`🔧 Creating peer connection (receiver) from: ${from}`);
      
      peer = new Peer({
        initiator: false,
        trickle: true,
        config: peerConfig,
        objectMode: true
      });

      peerRefs.current[from] = peer;
      setPeerConnections(prev => ({ ...prev, [from]: peer }));

      peer.on('signal', (signal) => {
        console.log(`📤 Sending signal back to ${from}`);
        socket.emit('signal', {
          roomCode,
          signal,
          to: from
        });
      });

      peer.on('connect', () => {
        console.log(`✅ CONNECTED to peer: ${from}`);
        setIsConnected(true);
        setPeers(prev => {
          if (!prev.includes(from)) return [...prev, from];
          return prev;
        });
      });

      peer.on('data', (data) => {
        handlePeerData(data, from);
      });

      peer.on('error', (err) => {
        console.error(`❌ Peer error (${from}):`, err);
      });

      peer.on('close', () => {
        console.log(`🔌 Peer closed: ${from}`);
        handlePeerDisconnect(from);
      });
    }

    try {
      peer.signal(signal);
    } catch (e) {
      console.error(`❌ Error signaling peer ${from}:`, e);
    }
  };

  const handlePeerData = (data, userId) => {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (parsed.type === 'system') {
        setMessages(prev => [...prev, parsed]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: parsed.text || parsed.message || 'Message',
          sender: parsed.sender || userId.slice(0, 4),
          timestamp: new Date().toLocaleTimeString(),
          isFile: parsed.isFile || false,
          fileName: parsed.fileName || null,
          fileData: parsed.fileData || null
        }]);
      }
    } catch (e) {
      console.error('Error parsing peer data:', e);
    }
  };

  const handlePeerDisconnect = (userId) => {
    setPeers(prev => prev.filter(id => id !== userId));
    setPeerConnections(prev => {
      if (prev[userId]) {
        try { prev[userId].destroy(); } catch (e) {}
        delete prev[userId];
      }
      return prev;
    });
    delete peerRefs.current[userId];
    
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: `👋 User ${userId.slice(0, 4)} left the chat`,
      type: 'system',
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const sendMessage = (text) => {
    if (!text.trim()) return;
    
    const message = {
      type: 'message',
      text: text,
      sender: 'You',
      timestamp: new Date().toLocaleTimeString(),
      isFile: false
    };

    const messageStr = JSON.stringify(message);
    const peerIds = Object.keys(peerConnections);
    
    if (peerIds.length === 0) {
      console.warn('No peers connected to send message');
      return;
    }

    peerIds.forEach(id => {
      try {
        const peer = peerConnections[id];
        if (peer && peer.connected) {
          peer.send(messageStr);
        }
      } catch (e) {
        console.error(`Error sending to ${id}:`, e);
      }
    });

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

      const messageStr = JSON.stringify(message);
      Object.values(peerConnections).forEach(peer => {
        if (peer && peer.connected) {
          try {
            peer.send(messageStr);
          } catch (e) {
            console.error('Error sending file:', e);
          }
        }
      });

      setMessages(prev => [...prev, message]);
    };
    reader.readAsDataURL(file);
  };

  const handleLeave = () => {
    socket.emit('leave-room', roomCode);
    Object.values(peerConnections).forEach(peer => {
      try { peer.destroy(); } catch (e) {}
    });
    setPeerConnections({});
    onLeave();
  };

  // Debug helper to log peer status
  useEffect(() => {
    console.log(`📍 Room ${roomCode} - Peers connected: ${peers.length}`);
    console.log('📋 Peer connections:', Object.keys(peerConnections));
  }, [peers, peerConnections, roomCode]);

  return (
    <div className="max-w-4xl mx-auto bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden">
      <div className="p-4 bg-gray-900/50 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Room: <span className="text-indigo-400">{roomCode}</span></h2>
          <p className="text-sm text-gray-400">
            {peers.length} peer{peers.length !== 1 ? 's' : ''} connected • 
            <span className={isConnected ? 'text-green-400' : 'text-yellow-400'}>
              {isConnected ? ' Online ✅' : ' Connecting...'}
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

      <MessageList messages={messages} />

      <div className="p-4 border-t border-gray-700 bg-gray-900/30">
        <FileShare onFileSelect={handleFileShare} />
        <MessageInput onSendMessage={sendMessage} disabled={!isConnected} />
      </div>
    </div>
  );
};

export default ChatRoom;
