import { create } from 'zustand';
import { Context, Task, TaskContent } from '@/domain/models';
import { IncomingMessageObserver } from '@/domain/ports';

interface ChatState {
  contexts: Record<string, Context>;
  activeContextId: string | null;
  isBusy: boolean;
  sendMessage?: (method: string, params: unknown) => string | undefined;
  /** Internal tracking for pending deletions to map request IDs back to context IDs */
  pendingDeletions: Record<string, string>;

  setSendMessage: (fn: (method: string, params: unknown) => string | undefined) => void;
  addContext: (id: string) => void;
  setActiveContext: (id: string) => void;
  deleteContext: (id: string) => void;
  reset: () => void;
}

type ChatStore = ChatState & IncomingMessageObserver;


const assertIsString = (val: unknown): string | null => {
  if (typeof val !== "string") {
    return null;
  }
  return val;
}

export const useChatStore = create<ChatStore>(set => ({
  contexts: {},
  activeContextId: null,
  isBusy: false,
  pendingDeletions: {},

  addContext: (id) => set((state) => ({
    contexts: {
      ...state.contexts,
      [id]: {
        id,
        tasks: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    }
  })),

  setActiveContext: (id) => set({ activeContextId: id }),

  setSendMessage: (fn) => set({ sendMessage: fn }),

  deleteContext: (id) => {
    const { sendMessage } = useChatStore.getState();
    if (sendMessage) {
      const requestId = sendMessage('session/delete', { contextId: id });
      
      set(state => ({
        pendingDeletions: {
          ...state.pendingDeletions,
          ...(requestId ? { [requestId]: id } : { [id]: id })
        }
      }));
    }
  },

  reset: () => set({ contexts: {}, activeContextId: null, isBusy: false, pendingDeletions: {} }),

  onMessageReceived: (message) => {
    // ── Outgoing user message (optimistic write) ──────────────────────────
    // MessageInput calls onMessageReceived directly with the JSONRPCRequest
    // shape so the user's message appears immediately in ChatArea.
    if ('method' in message && message.method === 'message/send') {
      const params = message.params as {
        contextId: string;
        taskId: string;
        message: TaskContent;
      };
      const { contextId, taskId, message: content } = params;
      set((state) => upsertTask(state, contextId, taskId, content));
      return;
    }

    // ── Incoming server response frame ────────────────────────────────────
    // Server sends: { jsonrpc, id, result: <event | task> }
    const messageId = 'id' in message ? String(message.id) : null;
    
    if (!('result' in message) || !message.result) return;

    const result = message.result as Record<string, unknown>;

    // 1. Redis pub sub status update: { kind: 'status', type, message }
    // Each frame creates a new individual task so progress accumulates in the chat.
    if (result['kind'] === 'status') {
      const msg = assertIsString(result['message']);
      const type = assertIsString(result['type']);

      const statusLabels: Record<string, string> = {
        SEARCH_REQUESTED: msg ? `Searching: ${msg}` : 'Searching…',
        STRUCTURED_DATA_READY: 'Data structured',
        SUMMARY_REQUESTED: 'Generating summary…',
        SUMMARY_COMPLETE: 'Summary complete',
      };
      const statusText = (type && statusLabels[type]) ?? msg ?? type ?? 'Working…';

      set((state) => {
        if (!state.activeContextId) return {};
        const contextId = state.activeContextId;
        const taskId = `status-${type ?? 'update'}-${Date.now()}`;
        const content: TaskContent = { kind: 'status', status: statusText, statusType: type ?? undefined };
        return { ...upsertTask(state, contextId, taskId, content), isBusy: true };
      });
      return;
    }

    // 2. A2A TaskStatusUpdateEvent: { type: 'TaskStatusUpdateEvent', contextId, taskId, status, final }
    // Non-final frames are skipped — they duplicate what kind:'status' frames already showed.
    // Only the final frame is handled: it posts the artifact data and a "Research completed" message.
    if (result['type'] === 'TaskStatusUpdateEvent' || result['kind'] === 'status-update') {
      const isFinal = Boolean(result['final']);
      if (!isFinal) return;

      const contextId = String(result['contextId'] ?? '');
      const taskId = String(result['taskId'] ?? `assistant-${contextId}`);
      const status = result['status'] as Record<string, unknown> | undefined;
      const statusState = String(status?.['state'] ?? '');
      const statusMsg = status?.['message'] as Record<string, unknown> | undefined;
      const reportKey = status?.['report_md_key'] as string | undefined;

      set((state) => {
        const artifactContent: TaskContent = statusMsg
          ? mapA2AMessage(statusMsg, 'assistant', statusState === 'failed' ? 'failed' : undefined)
          : { kind: 'status', status: statusState };
        const base = upsertTask(state, contextId, taskId, artifactContent);

        const completedContent: TaskContent = { kind: 'status', status: 'Research completed', statusType: 'COMPLETED' };
        const withCompleted = upsertTask(
          { contexts: base.contexts },
          contextId,
          `completed-${Date.now()}`,
          completedContent,
        );
        return { ...withCompleted, isBusy: false };
      });

      if (statusState === 'completed' && reportKey) {
        fetch(`http://localhost:8080/artifacts/${reportKey}`)
          .then((res) => (res.ok ? res.text() : Promise.reject('Failed to fetch artifact')))
          .then((text) => {
            set((state) =>
              upsertTask(state, contextId, `report-${reportKey}`, {
                kind: 'artifact',
                artifactId: reportKey,
                title: 'Research Report',
                content: text,
                mimeType: 'text/markdown',
              }),
            );
          })
          .catch((err) => console.error('[Artifact] Fetch error:', err));
      }
      return;
    }

    // 3. A2A TaskArtifactUpdateEvent: { type: 'TaskArtifactUpdateEvent', contextId, taskId, artifact }
    if (result['type'] === 'TaskArtifactUpdateEvent') {
      const contextId = String(result['contextId'] ?? '');
      const taskId = String(result['taskId'] ?? `artifact-${Date.now()}`);
      const artifact = result['artifact'] as Record<string, unknown> | undefined;
      if (!artifact) return;
      const parts = (artifact['parts'] as unknown[]) ?? [];
      const text = parts
        .map((p) => (p as Record<string, unknown>)['text'] ?? '')
        .join('');
      const content: TaskContent = {
        kind: 'artifact',
        artifactId: String(artifact['artifactId'] ?? artifact['id'] ?? taskId),
        title: String(artifact['name'] ?? 'Artifact'),
        content: text,
        mimeType: String(artifact['mimeType'] ?? 'text/plain'),
      };
      set((state) => upsertTask(state, contextId, taskId, content));
      return;
    }

    // 4. Final a2a.Task result (message/send non-streaming): { id, contextId, status, history }
    if (result['contextId'] && result['status']) {
      const contextId = String(result['contextId']);
      const taskId = String(result['id'] ?? `assistant-${contextId}`);
      const status = result['status'] as Record<string, unknown>;
      const finalState = String(status?.['state'] ?? '');
      const statusMsg = status?.['message'] as Record<string, unknown> | undefined;
      if (statusMsg) {
        set((state) => ({
          ...upsertTask(state, contextId, taskId, mapA2AMessage(statusMsg, 'assistant', finalState === 'failed' ? 'failed' : undefined)),
          isBusy: false,
        }));
      }
    }

    // 5. Context Summary Update: { type: 'ContextSummaryUpdate', contextId, summary }
    if (result['type'] === 'ContextSummaryUpdate') {
      const contextId = String(result['contextId'] ?? '');
      const summary = String(result['summary'] ?? '');
      if (contextId && summary) {
        set((state) => {
          const context = state.contexts[contextId];
          if (!context) return {};
          return {
            contexts: {
              ...state.contexts,
              [contextId]: {
                ...context,
                summary,
                updatedAt: Date.now(),
              },
            },
          };
        });
      }
      return;
    }

    // 6. Session Deletion Response: { status: 'deleted', contextId }
    if (result['status'] === 'deleted' || result['type'] === 'SessionDeletedEvent') {
      let contextId = String(result['contextId'] ?? '');
      
      set((state) => {
        // Fallback: If contextId is missing in response, check pendingDeletions by messageId
        if (!contextId && messageId && state.pendingDeletions[messageId]) {
          contextId = state.pendingDeletions[messageId];
        }
        // Second Fallback: If only one deletion is pending, assume it's that one
        if (!contextId && Object.keys(state.pendingDeletions).length === 1) {
          contextId = Object.values(state.pendingDeletions)[0];
        }

        if (!contextId) return {};

        const newContexts = { ...state.contexts };
        delete newContexts[contextId];

        const newPendingDeletions = { ...state.pendingDeletions };
        // Clean up all entries for this contextId (in case of retries or multiple req-ids)
        Object.keys(newPendingDeletions).forEach(key => {
          if (newPendingDeletions[key] === contextId) {
            delete newPendingDeletions[key];
          }
        });

        return {
          contexts: newContexts,
          activeContextId: state.activeContextId === contextId ? null : state.activeContextId,
          pendingDeletions: newPendingDeletions,
        };
      });
    }
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────

function upsertTask(
  state: { contexts: Record<string, Context> },
  contextId: string,
  taskId: string,
  content: TaskContent,
) {
  const context = state.contexts[contextId] ?? {
    id: contextId,
    tasks: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const existingTask = context.tasks[taskId];
  const updatedTask: Task = {
    id: taskId,
    content,
    timestamp: existingTask?.timestamp ?? Date.now(),
  };
  return {
    contexts: {
      ...state.contexts,
      [contextId]: {
        ...context,
        tasks: { ...context.tasks, [taskId]: updatedTask },
        updatedAt: Date.now(),
      },
    },
  };
}

/** Convert a raw A2A Message object (from JSON) into our TaskContent shape. */
function mapA2AMessage(
  msg: Record<string, unknown>,
  fallbackRole: 'user' | 'assistant',
  state?: 'failed',
): TaskContent {
  const role = (msg['role'] as 'user' | 'assistant') ?? fallbackRole;
  const rawParts = (msg['parts'] as unknown[]) ?? [];
  const parts = rawParts
    .map((p) => {
      const part = p as Record<string, unknown>;
      if (part['type'] === 'text' || part['kind'] === 'text') {
        return {
          kind: 'text' as const,
          text: String(part['text'] ?? ''),
        };
      }
      if (part['type'] === 'data' || part['kind'] === 'data') {
        return {
          kind: 'data' as const,
          data: (part['data'] as Record<string, unknown>) ?? {},
        };
      }
      return null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
  return {
    kind: 'message',
    messageId: String(msg['messageId'] ?? `msg-${Date.now()}`),
    role,
    parts,
    state,
  };
}