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

export interface MessageTask {
  kind: 'message';
  messageId: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
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
