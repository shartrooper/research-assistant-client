import { useChatStore } from '@/store/useChatStore';

export const Sidebar = () => {
  const { contexts, activeContextId, setActiveContext, addContext } = useChatStore();

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-xl font-bold text-blue-400">Conversations</h2>
        <button 
          onClick={() => addContext(`ctx-${Date.now()}`)}
          className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
        >
          + New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {Object.values(contexts).map((ctx,row) => (
          <button
            key={ctx.id}
            onClick={() => setActiveContext(ctx.id)}
            className={`w-full text-left p-3 rounded mb-1 text-sm truncate ${
              activeContextId === ctx.id ? 'bg-gray-800 text-blue-400 border border-blue-900' : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            Chat Window - {row+1}
          </button>
        ))}
      </div>
    </div>
  );
};
