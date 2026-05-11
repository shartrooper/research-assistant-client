import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { JSONRPCRequest } from '@/domain/ports';


describe('Integration: WebSocket to Store Flow', () => {
  beforeEach(()=> {
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
    act(() => {
      store.setActiveContext('ctx-1');
      store.addContext('ctx-1');
    });

    const initialStatus = {
      jsonrpc: '2.0' as const,
      id: 'req-1',
      result: {
        kind: 'status',
        message: 'Searching...',
      }
    };

    act(() => {
      store.onMessageReceived(initialStatus);
    });

    expect(useChatStore.getState().isBusy).toBe(true);

    const finalReply = {
      jsonrpc: '2.0' as const,
      id: 'req-1',
      result: {
        kind: 'status-update',
        contextId: 'ctx-1',
        taskId: 'task-1',
        final: true,
        status: {
          state: 'completed',
          message: {
            kind: 'message',
            messageId: 'msg-final',
            role: 'assistant',
            parts: [{ kind: 'text', text: 'Here is your answer.' }]
          }
        }
      }
    };

    act(() => {
      store.onMessageReceived(finalReply);
    });

    expect(useChatStore.getState().isBusy).toBe(false);
  });

  it('should set state: "failed" on MessageTask when TaskStatusUpdateEvent has state failed', () => {
    const store = useChatStore.getState();
    act(() => {
      store.setActiveContext('ctx-1');
      store.addContext('ctx-1');
    });

    const failedEvent = {
      jsonrpc: '2.0' as const,
      id: 'req-2',
      result: {
        kind: 'status-update',
        contextId: 'ctx-1',
        taskId: 'task-err',
        final: true,
        status: {
          state: 'failed',
          message: {
            kind: 'message',
            messageId: 'msg-err',
            role: 'assistant',
            parts: [
              { kind: 'text', text: 'Daily request limit reached.' },
              { kind: 'data', data: { kind: 'error_meta', code: 'QUOTA_EXCEEDED', source: 'llm', recovery: { type: 'wait', wait_after: 60 } } }
            ]
          }
        }
      }
    };

    act(() => { store.onMessageReceived(failedEvent); });

    const task = useChatStore.getState().contexts['ctx-1'].tasks['task-err'];
    expect(task.content.kind).toBe('message');
    if (task.content.kind === 'message') {
      expect(task.content.state).toBe('failed');
      expect(task.content.parts).toHaveLength(2);
    }
    expect(useChatStore.getState().isBusy).toBe(false);
  });

  it('should overwrite status updates in progressSteps and preserve the latest in the final message', () => {
    const store = useChatStore.getState();
    act(() => {
      store.setActiveContext('ctx-1');
      store.addContext('ctx-1');
    });

    const status1 = {
      jsonrpc: '2.0' as const,
      id: 'req-1',
      result: { kind: 'status', message: 'Searching...' }
    };

    const status2 = {
      jsonrpc: '2.0' as const,
      id: 'req-1',
      result: { kind: 'status', message: 'Structuring...' }
    };

    act(() => {
      store.onMessageReceived(status1);
      store.onMessageReceived(status2);
    });

    const stateAfterStatus = useChatStore.getState();
    const taskAfterStatus = stateAfterStatus.contexts['ctx-1'].tasks['assistant-ctx-1'];
    expect(taskAfterStatus.progressSteps).toEqual(['Structuring...']);

    const finalMessage = {
      jsonrpc: '2.0' as const,
      id: 'req-1',
      result: {
        kind: 'status-update',
        contextId: 'ctx-1',
        taskId: 'assistant-ctx-1',
        final: true,
        status: {
          state: 'completed',
          message: {
            kind: 'message',
            messageId: 'msg-1',
            role: 'assistant',
            parts: [{ kind: 'text', text: 'Result' }]
          }
        }
      }
    };

    act(() => {
      store.onMessageReceived(finalMessage);
    });

    const stateFinal = useChatStore.getState();
    const taskFinal = stateFinal.contexts['ctx-1'].tasks['assistant-ctx-1'];
    expect(taskFinal.content.kind).toBe('message');
    expect(taskFinal.progressSteps).toEqual(['Structuring...']);
  });
});
