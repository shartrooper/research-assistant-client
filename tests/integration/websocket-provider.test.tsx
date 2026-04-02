import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { WebSocketProvider } from '@/providers/WebSocketProvider';
import { useChatStore } from '@/store/useChatStore';

// Mock the chat store
vi.mock('@/store/useChatStore', () => ({
  useChatStore: {
    getState: vi.fn(() => ({
      onMessageReceived: vi.fn(),
    })),
  },
}));

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
    const mockOnMessageReceived = vi.fn();
    (useChatStore.getState as any).mockReturnValue({
      onMessageReceived: mockOnMessageReceived,
    });

    render(
      <WebSocketProvider>
        <div>Test Child</div>
      </WebSocketProvider>
    );

    await waitFor(() => {
      expect(mockOnMessageReceived).toHaveBeenCalled();
    });
  });
});
