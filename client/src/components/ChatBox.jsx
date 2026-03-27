import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { Send, X, ShieldAlert } from 'lucide-react';

export default function ChatBox({ incidentId, user, onClose }) {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (socket && incidentId) {
      socket.emit('join_incident', incidentId);
      socket.on('new_message', (msg) => {
        setMessages(prev => [...prev, msg]);
      });
      // Optionally fetch past messages from REST endpoint here if built later
    }
    return () => {
      if (socket) socket.off('new_message');
    };
  }, [socket, incidentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;

    socket.emit('send_message', {
      incidentId,
      sender: user?._id || 'Anonymous', // We can upgrade this to full name when backend merges populated array natively
      message: input.trim()
    });

    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 relative shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 absolute top-0 w-full z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-white">Direct Dispatch Chat</h3>
            <p className="text-xs text-slate-400">Incident #{incidentId.substring(0, 8)}...</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-24 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
        <div className="text-center pb-8 border-b border-slate-800/50 mb-8">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest bg-slate-900 inline-block px-4">Secure Room Created</p>
        </div>
        
        {messages.map((msg, i) => {
          const isMe = msg.sender === user?._id;
          return (
            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${isMe ? 'bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-900/20' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'}`}>
                <p className="text-xs font-medium text-slate-300 mb-1 opacity-70">{isMe ? 'You (Dispatcher)' : 'Responder Agent'}</p>
                <p className="text-sm leading-relaxed">{msg.message}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 absolute bottom-0 w-full">
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Relay message to assigned responders..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-500"
          />
          <button 
            type="submit"
            disabled={!input.trim()}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl font-medium transition-all flex items-center justify-center h-[50px] w-[50px]"
          >
             <Send size={20} className={input.trim() ? "translate-x-0.5" : ""} />
          </button>
        </form>
      </div>
    </div>
  );
}
