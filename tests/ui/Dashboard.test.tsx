import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '@/App';
import { useChatStore } from '@/store/useChatStore';
import { WebSocketProvider } from '@/providers/WebSocketProvider';

// Mock the store for UI testing
vi.mock('@/store/useChatStore', () => ({
  useChatStore: Object.assign(
    vi.fn((selector) => {
      // Default state for components that use the hook
      const state = {
        contexts: {},
        activeContextId: null,
        isBusy: false,
        setSendMessage: vi.fn(),
        addContext: vi.fn(),
        setActiveContext: vi.fn(),
      };
      return selector ? selector(state) : state;
    }),
    {
      getState: vi.fn(() => ({
        onMessageReceived: vi.fn(),
        setSendMessage: vi.fn(),
      })),
    }
  ),
}));

describe('Dashboard UI', () => {
  it('should render the sidebar and the main chat area', () => {
    (useChatStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
      const state = {
        contexts: {
          'ctx-1': { id: 'ctx-1', tasks: {}, createdAt: Date.now(), updatedAt: Date.now() },
        },
        activeContextId: 'ctx-1',
        isBusy: false,
        setSendMessage: vi.fn(),
        addContext: vi.fn(),
        setActiveContext: vi.fn(),
      };
      return selector ? selector(state) : state;
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
    (useChatStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
      const state = {
        contexts: {
          'ctx-1': { id: 'ctx-1', tasks: {}, createdAt: Date.now(), updatedAt: Date.now() },
        },
        activeContextId: 'ctx-1',
        isBusy: true,
        setSendMessage: vi.fn(),
        addContext: vi.fn(),
        setActiveContext: vi.fn(),
      };
      return selector ? selector(state) : state;
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
