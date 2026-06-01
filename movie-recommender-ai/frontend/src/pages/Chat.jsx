import React, { useState, useEffect, useRef } from 'react';
import { movieService } from '../services/api';
import { MessageSquare, Send, Sparkles, User, Bot, HelpCircle } from 'lucide-react';

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Hello! I am **CineMate**, your AI movie recommendations guide. Ask me to recommend movies by genre, find titles similar to your watchlist, or detail cast members. How can I help you find your next watch?",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    // Add user message
    const userMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const data = await movieService.sendChatMessage(text);
      
      const botMsg = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: data.response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg = {
        id: `err_${Date.now()}`,
        sender: 'bot',
        text: "I apologize, but I encountered an error connecting to the recommendations core. Please try again in a few moments.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Recommend some mind-bending Sci-Fi movies",
    "What are the best Action movies to watch?",
    "Suggest a movie similar to Interstellar",
    "Recommend a family comedy"
  ];

  // Helper to render markdown bold elements simple formatting
  const formatText = (text) => {
    if (!text) return '';
    // Replace **bold** with <strong>bold</strong>
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-netflix-red font-bold text-glow">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="pb-16 px-4 md:px-8 max-w-4xl mx-auto mt-6 flex flex-col h-[75vh] gap-4">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border border-white/10 rounded-2xl bg-white/[0.02] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-netflix-red to-red-500 flex items-center justify-center shadow-lg shadow-netflix-red/20 text-white">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-1.5">
              CineMate Chatbot
            </h2>
            <p className="text-[11px] text-gray-500">Gemini AI Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-netflix-red/10 border border-netflix-red/20 text-[10px] text-netflix-red font-bold uppercase tracking-wider">
          Online
        </div>
      </div>

      {/* Suggestion Chips */}
      {messages.length === 1 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider pl-1">Need inspiration? Try asking:</span>
          <div className="flex flex-wrap gap-2.5">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(s)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-netflix-red/50 hover:bg-netflix-red/5 transition-all text-left"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Terminal box */}
      <div className="flex-grow overflow-y-auto p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col gap-4">
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';
          return (
            <div 
              key={msg.id}
              className={`flex items-start gap-3 max-w-[80%] ${isBot ? 'self-start' : 'self-end flex-row-reverse'}`}
            >
              {/* Icon */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white ${
                isBot ? 'bg-netflix-red/25 border border-netflix-red/30' : 'bg-purple-600/25 border border-purple-500/30'
              }`}>
                {isBot ? <Bot className="w-4 h-4 text-netflix-red" /> : <User className="w-4 h-4 text-purple-400" />}
              </div>

              {/* Speech bubble */}
              <div className={`p-4 rounded-2xl text-sm leading-relaxed border ${
                isBot 
                  ? 'bg-netflix-darkGray/60 border-white/5 text-gray-300 rounded-tl-none' 
                  : 'bg-netflix-red text-white border-netflix-red/20 rounded-tr-none shadow-md shadow-netflix-red/10'
              }`}>
                <p className="whitespace-pre-wrap">{formatText(msg.text)}</p>
                <span className="text-[9px] text-gray-500 font-medium block mt-2 text-right">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        
        {/* Typing indicator */}
        {loading && (
          <div className="flex items-start gap-3 self-start max-w-[80%]">
            <div className="w-8 h-8 rounded-lg bg-netflix-red/25 border border-netflix-red/30 flex items-center justify-center text-white">
              <Bot className="w-4 h-4 text-netflix-red" />
            </div>
            <div className="p-4 rounded-2xl border border-white/5 bg-netflix-darkGray/60 text-gray-300 rounded-tl-none flex items-center gap-1.5 min-w-[70px]">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input controls */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
        className="w-full flex gap-3.5"
      >
        <input
          type="text"
          placeholder="Ask CineMate for movie suggestions (e.g. Give me 3 action dramas)..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-grow px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-netflix-red/50 transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || loading}
          className="px-5 py-3.5 rounded-xl bg-netflix-red hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm transition flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-netflix-red/20"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </form>

    </div>
  );
}
