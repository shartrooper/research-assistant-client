import '@testing-library/jest-dom/vitest';

class MockWebSocket {
  constructor() {}
  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
  get readyState() { return 0; }
}
Object.assign(global, { WebSocket: MockWebSocket });
