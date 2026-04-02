import React, { useRef, useEffect } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { TaskRenderer } from './TaskRenderer';

export const ChatArea = () => {
  const { contexts, activeContextId } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeContext = activeContextId ? contexts[activeContextId] : null;
  const tasks = activeContext ? Object.values(activeContext.tasks).sort((a, b) => a.timestamp - b.timestamp) : [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [tasks]);

  if (!activeContextId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-500">
        <div className="text-center">
          <h3 className="text-2xl font-semibold mb-2">Research Assistant</h3>
          <p>Select a conversation from the sidebar to begin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
          Context: <span className="text-blue-400 font-mono">{activeContextId}</span>
        </h2>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
      >
        <div className="max-w-4xl mx-auto w-full">
          {tasks.length === 0 ? (
            <div className="text-center text-gray-600 mt-20 italic">
              No messages in this context yet.
            </div>
          ) : (
            tasks.map((task) => (
              <TaskRenderer key={task.id} task={task} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
