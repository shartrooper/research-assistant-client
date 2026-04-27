import { create } from 'zustand';
import { Context, Task, TaskContent } from '@/domain/models';
import { IncomingMessageObserver } from '@/domain/ports';

interface ChatState {
  contexts: Record<string, Context>;
  activeContextId: string | null;
  isBusy: boolean;

  addContext: (id: string) => void;
  setActiveContext: (id: string) => void;
  reset: () => void;
}

type ChatStore = ChatState & IncomingMessageObserver;

export const useChatStore = create<ChatStore>(set => ({
  contexts: {},
  activeContextId: null,
  isBusy: false,

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

  reset: () => set({ contexts: {}, activeContextId: null, isBusy: false }),

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
    if (!('result' in message) || !message.result) return;

    const result = message.result as Record<string, unknown>;

    // 1. Redis pubsub status update: { kind: 'status', type, message }
    if (result['kind'] === 'status') {
      const statusText = String(result['message'] ?? result['type'] ?? 'Working…');
      // We don't have a contextId from this frame — append to whichever
      // task is currently in-flight (identified by isBusy + activeContextId).
      set((state) => {
        if (!state.activeContextId) return {};
        const contextId = state.activeContextId;
        const context = state.contexts[contextId];
        if (!context) return {};
        // Find the most-recent task (in-flight assistant task).
        const taskId = `assistant-${contextId}`;
        const existingTask = context.tasks[taskId];
        const progressSteps = [...(existingTask?.progressSteps ?? []), statusText];
        const updatedTask: Task = {
          id: taskId,
          content: existingTask?.content ?? { kind: 'status', status: statusText },
          timestamp: existingTask?.timestamp ?? Date.now(),
          progressSteps,
        };
        return {
          isBusy: true,
          contexts: {
            ...state.contexts,
            [contextId]: { ...context, tasks: { ...context.tasks, [taskId]: updatedTask }, updatedAt: Date.now() },
          },
        };
      });
      return;
    }

    // 2. A2A TaskStatusUpdateEvent: { type: 'TaskStatusUpdateEvent', contextId, taskId, status, final }
    if (result['type'] === 'TaskStatusUpdateEvent') {
      const contextId = String(result['contextId'] ?? '');
      const taskId = String(result['taskId'] ?? `assistant-${contextId}`);
      const status = result['status'] as Record<string, unknown> | undefined;
      const isFinal = Boolean(result['final']);
      const statusState = String(status?.['state'] ?? '');
      const statusMsg = status?.['message'] as Record<string, unknown> | undefined;

      set((state) => {
        const base = upsertTask(
          state,
          contextId,
          taskId,
          statusMsg
            ? mapA2AMessage(statusMsg, 'assistant')
            : { kind: 'status', status: statusState },
        );
        return { ...base, isBusy: !isFinal };
      });
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
      const statusMsg = status?.['message'] as Record<string, unknown> | undefined;
      if (statusMsg) {
        set((state) => ({
          ...upsertTask(state, contextId, taskId, mapA2AMessage(statusMsg, 'assistant')),
          isBusy: false,
        }));
      }
    }
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────

function upsertTask(
  state: { contexts: Record<string, Context>; isBusy: boolean },
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
  let progressSteps = existingTask?.progressSteps ?? [];
  if (content.kind === 'status') {
    progressSteps = [...progressSteps, content.status];
  }
  const updatedTask: Task = {
    id: taskId,
    content: content.kind === 'status' && existingTask ? existingTask.content : content,
    timestamp: existingTask?.timestamp ?? Date.now(),
    progressSteps: progressSteps.length > 0 ? progressSteps : undefined,
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
function mapA2AMessage(msg: Record<string, unknown>, fallbackRole: 'user' | 'assistant'): TaskContent {
  const role = (msg['role'] as 'user' | 'assistant') ?? fallbackRole;
  const rawParts = (msg['parts'] as unknown[]) ?? [];
  const parts = rawParts
    .filter((p) => (p as Record<string, unknown>)['type'] === 'text' || (p as Record<string, unknown>)['kind'] === 'text')
    .map((p) => ({
      kind: 'text' as const,
      text: String((p as Record<string, unknown>)['text'] ?? ''),
    }));
  return {
    kind: 'message',
    messageId: String(msg['messageId'] ?? `msg-${Date.now()}`),
    role,
    parts,
  };
}