import { useWebSocketProvider } from '@/providers/WebSocketProvider';

function App() {
  const { sendMessage } = useWebSocketProvider();

  const handleTestMessage = () => {
    sendMessage("message/send", {
      contextId: "ctx-test",
      taskId: "task-test",
      message: {
        kind: "message",
        messageId: "msg-123",
        role: "user",
        parts: [{ kind: "text", text: "Hello Concierge from App!" }]
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-4 text-blue-400">Research Assistant</h1>
      <p className="text-gray-300 mb-8">Client connected to Concierge WebSocket.</p>
      
      <button 
        onClick={handleTestMessage}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow transition-colors"
      >
        Send Test WS Message
      </button>
    </div>
  );
}

export default App;
