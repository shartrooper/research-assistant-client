import { render, screen } from '@testing-library/react';
import App from '@/App';
import { WebSocketProvider } from '@/providers/WebSocketProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';

const queryClient = new QueryClient();

describe('App', () => {
  it('renders without crashing', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          <App />
        </WebSocketProvider>
      </QueryClientProvider>
    );
    expect(screen.getByText('Research Assistant')).toBeInTheDocument();
    expect(screen.getByText('Send Test WS Message')).toBeInTheDocument();
  });
});
