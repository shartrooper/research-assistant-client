import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { MessageTask, StatusTask } from '@/domain/models';
import { JSONRPCRequest } from '@/domain/ports';


describe('Integration: WebSocket to Store Flow', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  it('should update the store when a new message is received via the observer', () => {
    const store = useChatStore.getState();

    const mockMessage: JSONRPCRequest = {
      jsonrpc: '2.0' as const,
      method: 'message/send',
      params: {
        contextId: 'ctx-1',
        taskId: 'task-1',
        message: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'assistant',
          parts: [{ kind: 'text', text: 'Hello, I am processing your request.' }]
        }
      }
    };

    act(() => {
      store.onMessageReceived(mockMessage);
    });

    const updatedState = useChatStore.getState();
    const context = updatedState.contexts['ctx-1'];

    expect(context).toBeDefined();
    const task = context.tasks['task-1'];
    expect(task).toBeDefined();
    expect(task.content.kind).toBe('message');
    if (task.content.kind === 'message') {
      expect(task.content.parts[0].text).toContain('Hello');
    }
  });

  it('should update an existing task in-place for status updates and set isBusy', () => {
    const store = useChatStore.getState();

    const initialStatus = {
      jsonrpc: '2.0' as const,
      method: 'message/send',
      params: {
        contextId: 'ctx-1',
        taskId: 'task-1',
        message: {
          kind: 'status',
          status: 'Searching...',
        } as StatusTask
      }
    };

    act(() => {
      store.onMessageReceived(initialStatus);
    });

    expect(useChatStore.getState().isBusy).toBe(true);

    const finalReply = {
      jsonrpc: '2.0' as const,
      method: 'message/send',
      params: {
        contextId: 'ctx-1',
        taskId: 'task-1',
        message: {
          kind: 'message',
          messageId: 'msg-final',
          role: 'assistant',
          parts: [{ kind: 'text', text: 'Here is your answer.' }]
        } as MessageTask
      }
    };

    act(() => {
      store.onMessageReceived(finalReply);
    });

    expect(useChatStore.getState().isBusy).toBe(false);
  });
});
