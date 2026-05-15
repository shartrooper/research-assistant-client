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

  it('should create a new task per status frame and a completed task on final', () => {
    const store = useChatStore.getState();
    act(() => {
      store.setActiveContext('ctx-1');
      store.addContext('ctx-1');
    });

    const status1 = {
      jsonrpc: '2.0' as const,
      id: 'req-1',
      result: { kind: 'status', type: 'SEARCH_REQUESTED', message: 'chess players' }
    };

    const status2 = {
      jsonrpc: '2.0' as const,
      id: 'req-1',
      result: { kind: 'status', type: 'STRUCTURED_DATA_READY', message: '' }
    };

    act(() => {
      store.onMessageReceived(status1);
      store.onMessageReceived(status2);
    });

    const stateAfterStatus = useChatStore.getState();
    const tasks = Object.values(stateAfterStatus.contexts['ctx-1'].tasks);
    // Each status frame creates its own task
    expect(tasks.length).toBe(2);
    expect(tasks.every(t => t.content.kind === 'status')).toBe(true);

    const finalMessage = {
      jsonrpc: '2.0' as const,
      id: 'req-1',
      result: {
        kind: 'status-update',
        contextId: 'ctx-1',
        taskId: 'task-final',
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
    const tasksFinal = Object.values(stateFinal.contexts['ctx-1'].tasks);
    // 2 status tasks + 1 artifact task + 1 completed task
    expect(tasksFinal.length).toBe(4);

    const artifactTask = stateFinal.contexts['ctx-1'].tasks['task-final'];
    expect(artifactTask.content.kind).toBe('message');

    const completedTask = tasksFinal.find(
      t => t.content.kind === 'status' && (t.content as { statusType?: string }).statusType === 'COMPLETED'
    );
    expect(completedTask).toBeDefined();
    expect(useChatStore.getState().isBusy).toBe(false);
  });

  it('should update context summary when receiving a summary update', () => {
    const store = useChatStore.getState();
    act(() => {
      store.addContext('ctx-summary');
    });

    const summaryMessage = {
      jsonrpc: '2.0' as const,
      result: {
        type: 'ContextSummaryUpdate',
        contextId: 'ctx-summary',
        summary: 'This is an executive summary of the research.'
      }
    };

    act(() => store.onMessageReceived(summaryMessage));

    const context = useChatStore.getState().contexts['ctx-summary'];
    expect(context.summary).toBe('This is an executive summary of the research.');
  });

  it('should send session/delete and remove context on success', () => {
    const store = useChatStore.getState();
    const mockSendMessage = vi.fn();
    
    act(() => {
      store.addContext('ctx-to-delete');
      store.setSendMessage(mockSendMessage);
    });

    act(() => {
      store.deleteContext('ctx-to-delete');
    });

    expect(mockSendMessage).toHaveBeenCalledWith('session/delete', { contextId: 'ctx-to-delete' });
    
    // Context should still be there until success message
    expect(useChatStore.getState().contexts['ctx-to-delete']).toBeDefined();

    const successMessage = {
      jsonrpc: '2.0' as const,
      result: {
        status: 'deleted',
        contextId: 'ctx-to-delete' // Assuming the backend returns the contextId
      }
    };

    act(() => {
      store.onMessageReceived(successMessage);
    });

    expect(useChatStore.getState().contexts['ctx-to-delete']).toBeUndefined();
  });

  it('should fetch artifact when report_md_key is present in final status update', async () => {
    const store = useChatStore.getState();
    const mockArtifactContent = '# Research Report\n\nThis is the content of the report.';
    
    // Mock global fetch
    vi.stubGlobal('fetch', vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockArtifactContent),
        })
    ));
    act(() => {
      store.addContext('ctx-artifact');
    });

    const finalReply = {
      jsonrpc: '2.0' as const,
      result: {
        kind: 'status-update',
        contextId: 'ctx-artifact',
        taskId: 'task-artifact',
        final: true,
        status: {
          state: 'completed',
          report_md_key: 'report-123'
        }
      }
    };

    await act(async () => {
      await store.onMessageReceived(finalReply);
    });

    const state = useChatStore.getState();
    const tasks = Object.values(state.contexts['ctx-artifact'].tasks);
    const artifactTask = tasks.find(t => t.content.kind === 'artifact');
    
    expect(artifactTask).toBeDefined();
    if (artifactTask?.content.kind === 'artifact') {
      expect(artifactTask.content.content).toBe(mockArtifactContent);
    }
    
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('report-123'));
    
    vi.unstubAllGlobals();
  });
});
