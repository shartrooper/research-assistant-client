import { useState, useEffect } from 'react';
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

  return (
    <div className="p-4 rounded-lg border border-red-700 bg-red-950 text-red-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-red-400 text-xs font-bold uppercase tracking-wide">Error</span>
        {meta && <span className="text-red-500 text-xs">{meta.code}</span>}
      </div>
      {textPart && <p className="text-sm whitespace-pre-wrap">{textPart.text}</p>}
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
                return <p key={i} className="whitespace-pre-wrap">{part.text}</p>;
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
