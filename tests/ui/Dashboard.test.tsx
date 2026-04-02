import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '@/App';
import { useChatStore } from '@/store/useChatStore';
import { WebSocketProvider } from '@/providers/WebSocketProvider';
import React from 'react';

// Mock the store for UI testing
vi.mock('@/store/useChatStore', () => ({
  useChatStore: vi.fn(),
}));

// Mock react-use-websocket for the provider
vi.mock('react-use-websocket', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    sendMessage: vi.fn(),
    lastMessage: null,
    readyState: 1,
  })),
  ReadyState: { OPEN: 1 },
}));

describe('Dashboard UI', () => {
  it('should render the sidebar and the main chat area', () => {
    (useChatStore as any).mockReturnValue({
      contexts: {
        'ctx-1': { id: 'ctx-1', tasks: {}, createdAt: Date.now(), updatedAt: Date.now() },
      },
      activeContextId: 'ctx-1',
      isBusy: false,
    });

    render(
      <WebSocketProvider>
        <App />
      </WebSocketProvider>
    );

    expect(screen.getByText(/Conversations/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Type a message/i)).toBeDefined();
  });

  it('should disable input when isBusy is true', () => {
    (useChatStore as any).mockReturnValue({
      contexts: {
        'ctx-1': { id: 'ctx-1', tasks: {}, createdAt: Date.now(), updatedAt: Date.now() },
      },
      activeContextId: 'ctx-1',
      isBusy: true,
    });

    render(
      <WebSocketProvider>
        <App />
      </WebSocketProvider>
    );

    const input = screen.getByPlaceholderText(/Type a message/i) as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
