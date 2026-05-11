export type TaskKind = 'message' | 'status' | 'artifact';

export interface TextPart {
  kind: 'text';
  text: string;
  data?: never;
}

export interface DataPart {
  kind: 'data';
  data: Record<string, unknown>;
  text?: never;
}

export type MessagePart = TextPart | DataPart;

export const isTextPart = (part: MessagePart): part is TextPart => part.kind === 'text';
export const isDataPart = (part: MessagePart): part is DataPart => part.kind === 'data';

export type ErrorCode =
  | 'QUOTA_EXCEEDED'
  | 'POLICY_VIOLATION'
  | 'PROVIDER_UNAVAILABLE'
  | 'CONTEXT_TOO_LARGE'
  | 'INTERNAL_FAILURE'
  | 'QUERY_INVALID';

export type ErrorSource = 'llm' | 'search' | 'concierge' | 'researcher';

export type RecoveryType = 'retry' | 'wait' | 'rephrase' | 'contact' | 'upgrade';

export interface ErrorMetadata {
  kind: 'error_meta';
  code: ErrorCode;
  source: ErrorSource;
  recovery?: {
    type: RecoveryType;
    wait_after?: number;
    suggestion?: string;
  };
  telemetry?: Record<string, unknown>;
}

export function isErrorMeta(data: unknown): data is ErrorMetadata {
  return typeof data === 'object' && data !== null && (data as Record<string, unknown>)['kind'] === 'error_meta';
}

export interface MessageTask {
  kind: 'message';
  messageId: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
  state?: 'failed';
}

export interface StatusTask {
  kind: 'status';
  status: string;
}

export interface ArtifactTask {
  kind: 'artifact';
  artifactId: string;
  title: string;
  content: string;
  mimeType: string;
}

export type TaskContent = MessageTask | StatusTask | ArtifactTask;

export interface Task {
  id: string;
  content: TaskContent;
  timestamp: number;
  progressSteps?: string[];
}

export interface Context {
  id: string;
  tasks: Record<string, Task>;
  createdAt: number;
  updatedAt: number;
}
