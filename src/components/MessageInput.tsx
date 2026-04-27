import React, { useState } from 'react';
import { useWebSocketProvider } from '@/providers/WebSocketProvider';
import { useChatStore } from '@/store/useChatStore';

export const MessageInput = () => {
  const [text, setText] = useState('');
  const { sendMessage } = useWebSocketProvider();
  const { isBusy, activeContextId, onMessageReceived } = useChatStore();

  const handleSend = () => {
    if (!text.trim() || isBusy || !activeContextId) return;

    const taskId = `user-${Date.now()}`;
    const message = {
      kind: 'message' as const,
      messageId: `msg-${Date.now()}`,
      role: 'user' as const,
      parts: [{ kind: 'text' as const, text: text.trim() }],
    };

    onMessageReceived({
      method: 'message/send',
      params: { contextId: activeContextId, taskId, message },
      jsonrpc: '2.0'
    });

    sendMessage({ contextId: activeContextId, taskId, message });

    setText('');
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
