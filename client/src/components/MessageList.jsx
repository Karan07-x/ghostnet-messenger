import React, { useRef, useEffect } from 'react';

const MessageList = ({ messages }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="h-96 overflow-y-auto p-4 space-y-2">
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 mt-32">
          <div className="text-4xl mb-3">👻</div>
          <p>No messages yet</p>
          <p className="text-sm">Share the room code to start chatting</p>
        </div>
      ) : (
        messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg ${
              msg.sender === 'You' || msg.type === 'system'
                ? 'bg-indigo-500/20 ml-auto max-w-[70%]'
                : 'bg-gray-700/50 max-w-[70%]'
            } ${msg.type === 'system' ? 'text-center text-gray-400 text-sm bg-transparent max-w-full' : ''}`}
          >
            {msg.type === 'system' ? (
              <span>{msg.text}</span>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-indigo-300 text-sm">
                    {msg.sender}
                  </span>
                  <span className="text-xs text-gray-400">{msg.timestamp}</span>
                </div>
                {msg.isFile ? (
                  <div className="mt-1">
                    {msg.fileData && msg.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img 
                        src={msg.fileData} 
                        alt={msg.fileName}
                        className="max-w-xs rounded-lg max-h-48 object-cover"
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-gray-800/50 rounded-lg">
                        <span className="text-2xl">📁</span>
                        <span className="text-sm">{msg.fileName}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-1">{msg.text}</p>
                )}
              </>
            )}
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;