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
          <div key={ctx.id} className="group relative mb-1">
            <button
              onClick={() => setActiveContext(ctx.id)}
              className={`w-full text-left p-3 pr-10 rounded text-sm truncate transition-colors ${
                activeContextId === ctx.id ? 'bg-gray-800 text-blue-400 border border-blue-900' : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              Chat Window - {row+1}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this session?')) {
                  useChatStore.getState().deleteContext(ctx.id);
                }
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete Session"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
