import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, MessagePart, ErrorMetadata, isTextPart, isDataPart, isErrorMeta } from '@/domain/models';

const WaitCountdown = ({ seconds }: { seconds: number }) => {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);
  if (remaining <= 0) return <span className="text-green-400 text-xs">You can try again now.</span>;
  return <span className="text-yellow-400 text-xs">Retry available in {remaining}s</span>;
};

const ErrorMessageView = ({ parts }: { parts: MessagePart[] }) => {
  const textPart = parts.find(isTextPart);
  const dataPart = parts.find(isDataPart);
  const meta: ErrorMetadata | null =
    dataPart && isErrorMeta(dataPart.data) ? (dataPart.data as ErrorMetadata) : null;

  const getInstructions = (code: string) => {
    switch (code) {
      case 'POLICY_VIOLATION':
        return 'Please review our usage guidelines and ensure your prompt complies with safety standards.';
      case 'VAGUE_PROMPT':
        return 'Try providing more specific details or context to help the assistant understand your request.';
      case 'QUOTA_EXCEEDED':
        return 'You have reached your daily limit. Please wait or upgrade your plan to continue.';
      case 'CONTEXT_TOO_LARGE':
        return 'The conversation is too long. Try starting a new chat or summarizing previous points.';
      default:
        return null;
    }
  };

  const instruction = meta ? getInstructions(meta.code) : null;

  return (
    <div className="p-4 rounded-lg border border-red-700 bg-red-950 text-red-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-red-400 text-xs font-bold uppercase tracking-wide">Error</span>
        {meta && <span className="text-red-500 text-xs">{meta.code}</span>}
      </div>
      {textPart && <p className="text-sm whitespace-pre-wrap">{textPart.text}</p>}
      
      {instruction && (
        <div className="mt-3 pt-3 border-t border-red-900/50">
          <p className="text-xs font-semibold text-red-400 uppercase mb-1">How to fix</p>
          <p className="text-sm text-red-300 italic">{instruction}</p>
        </div>
      )}

      {meta?.recovery && (
        <div className="mt-2 text-xs text-gray-400">
          {meta.recovery.type === 'wait' && meta.recovery.wait_after != null && (
            <WaitCountdown seconds={meta.recovery.wait_after} />
          )}
          {(meta.recovery.type === 'rephrase' || meta.recovery.type === 'retry') &&
            meta.recovery.suggestion && (
              <p className="italic">{meta.recovery.suggestion}</p>
          )}
          {meta.recovery.type === 'contact' && (
            <p>Please contact support.</p>
          )}
          {meta.recovery.type === 'upgrade' && (
            <p>Upgrade your plan to continue.</p>
          )}
        </div>
      )}
    </div>
  );
};

export const TaskRenderer = ({ task }: { task: Task }) => {
  const { content } = task;

  if (content.kind === 'message') {
    const hasError = content.parts.some(p => isDataPart(p) && isErrorMeta(p.data));

    if (hasError) {
      return (
        <div className="mb-4 max-w-2xl mr-auto">
          <ErrorMessageView parts={content.parts} />
          <div className="mt-1 text-xs text-gray-500 uppercase font-semibold">assistant</div>
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        <div className={`mb-4 max-w-2xl ${content.role === 'user' ? 'ml-auto' : 'mr-auto'}`}>
          <div className={`p-4 rounded-lg shadow-sm ${
            content.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200 border border-gray-700'
          }`}>
            {content.parts.map((part, i) => {
              if (part.kind === 'text') {
                return (
                  <div key={i} className="prose prose-invert prose-blue max-w-none text-inherit">
                    <ReactMarkdown>{part.text}</ReactMarkdown>
                  </div>
                );
              }
              if (part.kind === 'data') {
                return (
                  <div key={i} className="mt-2 p-2 bg-black bg-opacity-30 rounded text-xs font-mono overflow-x-auto">
                    <div className="text-blue-400 mb-1 font-bold uppercase tracking-tighter text-[10px]">Data Attachment</div>
                    <pre>{JSON.stringify(part.data, null, 2)}</pre>
                  </div>
                );
              }
              return null;
            })}
          </div>
          <div className="mt-1 text-xs text-gray-500 uppercase font-semibold">
            {content.role}
          </div>
        </div>
      </div>
    );
  }

  if (content.kind === 'status') {
    const isCompleted = content.statusType === 'COMPLETED';
    return (
      <div className="mb-1 flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isCompleted ? 'bg-green-500' : 'bg-gray-600'}`} />
        <span className={isCompleted ? 'text-green-400' : 'text-gray-500'}>{content.status}</span>
      </div>
    );
  }

  if (content.kind === 'artifact') {
    const isMarkdown = content.mimeType === 'text/markdown' || content.mimeType === 'text/x-markdown';
    return (
      <div className="mb-6 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-xl">
        <div className="px-4 py-2 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{content.title}</h4>
          <span className="text-[10px] text-gray-500 font-mono uppercase">{content.mimeType}</span>
        </div>
        <div className="p-6 prose prose-invert prose-blue max-w-none">
          {isMarkdown ? (
            <ReactMarkdown>{content.content}</ReactMarkdown>
          ) : (
            <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap">{content.content}</pre>
          )}
        </div>
      </div>
    );
  }

  return null;
};
