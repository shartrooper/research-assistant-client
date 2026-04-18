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
    if ('method' in message && message.method === 'message/send') {
      const params = message.params as {
        contextId: string;
        taskId: string;
        message: TaskContent
      };

      const { contextId, taskId, message: content } = params;

      set((state) => {
        const context = state.contexts[contextId] || {
          id: contextId,
          tasks: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const existingTask = context.tasks[taskId];

        let progressSteps = existingTask?.progressSteps || [];
        if (content.kind === 'status') {
          progressSteps = [...progressSteps, content.status];
        }

        const updatedTask: Task = {
          id: taskId,
          content: (content.kind === 'status' && existingTask) ? existingTask.content : content,
          timestamp: existingTask?.timestamp || Date.now(),
          progressSteps: progressSteps.length > 0 ? progressSteps : undefined,
        };

        // isBusy logic: 
        // - true if it's a status update
        // - false if it's a final assistant message (heuristic)
        let isBusy = state.isBusy;
        if (content.kind === 'status') {
          isBusy = true;
        } else if (content.kind === 'message' && content.role === 'assistant') {
          isBusy = false;
        }

        return {
          isBusy,
          contexts: {
            ...state.contexts,
            [contextId]: {
              ...context,
              tasks: {
                ...context.tasks,
                [taskId]: updatedTask,
              },
              updatedAt: Date.now(),
            }
          }
        };
      });
    }
  },
}));