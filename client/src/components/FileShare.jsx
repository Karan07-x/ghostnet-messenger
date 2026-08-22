import React, { useRef } from 'react';

const FileShare = ({ onFileSelect }) => {
  const fileInputRef = useRef(null);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelect(file);
    }
    e.target.value = ''; // Reset input
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleFileClick}
        className="px-3 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors text-sm"
        title="Share file"
      >
        📎
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt"
      />
      <span className="text-xs text-gray-400">Share files (images, docs)</span>
    </div>
  );
};

export default FileShare;