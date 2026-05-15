import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { WebSocketProvider } from '@/providers/WebSocketProvider';

// Mock the chat store
const mockOnMessageReceived = vi.fn();
const mockSetSendMessage = vi.fn();

vi.mock('@/store/useChatStore', () => {
  const useChatStore = vi.fn((selector) => {
    const state = {
      onMessageReceived: mockOnMessageReceived,
      setSendMessage: mockSetSendMessage,
    };
    return selector ? selector(state) : state;
  });
  (useChatStore as never).getState = vi.fn(() => ({
    onMessageReceived: mockOnMessageReceived,
    setSendMessage: mockSetSendMessage,
  }));
  return { useChatStore };
});

// Mock react-use-websocket
vi.mock('react-use-websocket', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    sendMessage: vi.fn(),
    lastMessage: { data: JSON.stringify({ jsonrpc: '2.0', method: 'message/send', params: {} }) },
    readyState: 1, // Open
  })),
  ReadyState: {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  },
}));

describe('WebSocketProvider Integration', () => {
  it('should notify the store when a message is received', async () => {
    render(
      <WebSocketProvider>
        <div>Test Child</div>
      </WebSocketProvider>
    );

    await waitFor(() => {
      expect(mockOnMessageReceived).toHaveBeenCalled();
    }, { timeout: 2000 });
  });
});
