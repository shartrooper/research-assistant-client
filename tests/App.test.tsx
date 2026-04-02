import { render, screen } from '@testing-library/react';
import App from '@/App';
import { WebSocketProvider } from '@/providers/WebSocketProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import React from 'react';

// Mock react-use-websocket
vi.mock('react-use-websocket', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    sendMessage: vi.fn(),
    lastMessage: null,
    readyState: 1,
  })),
  ReadyState: { OPEN: 1 },
}));

const queryClient = new QueryClient();

describe('App', () => {
  it('renders without crashing', async () => {
    await act(async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <WebSocketProvider>
            <App />
          </WebSocketProvider>
        </QueryClientProvider>
      );
    });
    expect(screen.getByText('Research Assistant')).toBeDefined();
    expect(screen.getByText('Conversations')).toBeDefined();
  });
});
