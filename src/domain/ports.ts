export interface JSONRPCResponse<P = unknown> {
  jsonrpc: '2.0';
  id: string | number;
  result?: P;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface JSONRPCRequest<P = unknown> {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params: P;
}

export interface IncomingMessageObserver {
  onMessageReceived: (message: JSONRPCRequest | JSONRPCResponse) => void;
}
