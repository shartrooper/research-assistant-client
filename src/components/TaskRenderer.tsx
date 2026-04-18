import { Task } from '@/domain/models';

export const TaskRenderer = ({ task }: { task: Task }) => {
  const { content, progressSteps } = task;

  const renderProgress = () => {
    if (!progressSteps || progressSteps.length === 0) return null;

    return (
      <div className="mb-4 space-y-2 p-3 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-400">
        {progressSteps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${
              (i === progressSteps.length - 1 && content.kind === 'status') 
                ? 'bg-blue-400 animate-pulse' 
                : 'bg-gray-600'
            }`}></div>
            <span>{step}</span>
          </div>
        ))}
      </div>
    );
  };

  if (content.kind === 'message') {
    return (
      <div className="flex flex-col">
        {content.role === 'assistant' && renderProgress()}
        <div className={`mb-4 max-w-2xl ${content.role === 'user' ? 'ml-auto' : 'mr-auto'}`}>
          <div className={`p-4 rounded-lg shadow-sm ${
            content.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200 border border-gray-700'
          }`}>
            {content.parts.map((part, i) => (
              <p key={i} className="whitespace-pre-wrap">{part.text}</p>
            ))}
          </div>
          <div className="mt-1 text-xs text-gray-500 uppercase font-semibold">
            {content.role}
          </div>
        </div>
      </div>
    );
  }

  if (content.kind === 'status') {
    return renderProgress();
  }

  if (content.kind === 'artifact') {
    return (
      <div className="mb-4 p-4 bg-gray-900 border border-gray-800 rounded-lg shadow-inner">
        <h4 className="text-sm font-bold text-gray-300 mb-2 uppercase tracking-widest">{content.title}</h4>
        <div className="p-2 bg-black rounded text-xs font-mono text-green-400 overflow-x-auto">
          {content.content}
        </div>
      </div>
    );
  }

  return null;
};
