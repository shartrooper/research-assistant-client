import { createContext, useCallback, useContext, useEffect } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

const SOCKET_URL = 'ws://localhost:8080/ws';

interface WebSocketContextType {
  canSendMessages: boolean;
  sendMessage: (method: string, params: unknown) => void;
  streamMessage: (method: string, params: unknown) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const {
    sendMessage: sM,
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
        console.log('WS Message received:', parsed);
        // Additional handling logic here, e.g., integrating with react-query
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
      
      console.log('Sending WS payload:', payload);
      sM(JSON.stringify(payload));
    },
    [canSendMessages, sM]
  );

  const contextValue: WebSocketContextType = {
    canSendMessages,
    sendMessage: (method, params) => rawSendMessage(method || 'message/send', params),
    streamMessage: (method, params) => rawSendMessage(method || 'message/stream', params),
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
