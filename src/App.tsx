import React from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { MessageInput } from './components/MessageInput';

function App() {
  return (
    <div className="flex h-screen bg-black text-gray-100 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ChatArea />
        <MessageInput />
      </div>
    </div>
  );
}

export default App;
