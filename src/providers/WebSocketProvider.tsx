import { createContext, useCallback, useContext, useEffect } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useChatStore } from '@/store/useChatStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

interface WebSocketContextType {
  canSendMessages: boolean;
  sendMessage: (params: unknown) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const {
    sendMessage: sm,
    lastMessage,
    readyState,
  } = useWebSocket(SOCKET_URL, {
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
  });

  const canSendMessages = readyState === ReadyState.OPEN;

  useEffect(() => {
    if (lastMessage && lastMessage.data) {
      try {
        const parsed = JSON.parse(lastMessage.data);
        // Notify the Chat Store (The Observer Port)
        useChatStore.getState().onMessageReceived(parsed);
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    }
  }, [lastMessage]);

  const rawSendMessage = useCallback(
    (method: string, params: unknown) => {
      if (!canSendMessages) {
        console.warn('Cannot send message, socket not open');
        return;
      }
      
      const payload = {
        jsonrpc: '2.0',
        id: `req-${Date.now()}`,
        method,
        params,
      };
      
      sm(JSON.stringify(payload));
    },
    [canSendMessages, sm]
  );

  const contextValue: WebSocketContextType = {
    canSendMessages,
    sendMessage: (params) => rawSendMessage('message/send', params),
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useWebSocketProvider = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketProvider must be used within a WebSocketProvider');
  }
  return context;
};