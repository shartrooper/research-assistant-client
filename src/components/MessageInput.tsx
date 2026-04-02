import React, { useState } from 'react';
import { useWebSocketProvider } from '@/providers/WebSocketProvider';
import { useChatStore } from '@/store/useChatStore';

export const MessageInput = () => {
  const [text, setText] = useState('');
  const { sendMessage } = useWebSocketProvider();
  const { isBusy, activeContextId } = useChatStore();

  const handleSend = () => {
    if (!text.trim() || isBusy || !activeContextId) return;

    // Send via WebSocket
    sendMessage('message/send', {
      contextId: activeContextId,
      taskId: `user-${Date.now()}`,
      message: {
        kind: 'message',
        messageId: `msg-${Date.now()}`,
        role: 'user',
        parts: [{ kind: 'text', text: text.trim() }]
      }
    });

    setText('');
    // Note: The store should probably be set to busy here, 
    // or when the first 'status' or 'response' comes back.
    // For now, let's just let the flow continue.
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t border-gray-800 bg-gray-900">
      <div className="max-w-4xl mx-auto flex gap-2">
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isBusy || !activeContextId}
          placeholder={activeContextId ? "Type a message..." : "Select a conversation to start"}
          className="flex-1 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
        />
        <button
          onClick={handleSend}
          disabled={isBusy || !text.trim() || !activeContextId}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
};
