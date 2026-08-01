import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../api';

export default function FollowUpChat({ workspaceId, initialHistory = [], idea, primaryModel }) {
  const [messages, setMessages] = useState(initialHistory);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);

  // Sync with workspace changes/reopens
  useEffect(() => {
    setMessages(initialHistory || []);
    setError(null);
  }, [workspaceId, initialHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input.trim();
    if (!text || isLoading) return;

    if (!textToSend) {
      setInput('');
    }
    
    setError(null);
    setIsLoading(true);

    // Append user message immediately
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await sendChatMessage(workspaceId, text);
      // Backend returns the updated chat history
      if (res && res.chat_history) {
        setMessages(res.chat_history);
      } else if (res && res.message) {
        setMessages((prev) => [...prev, res.message]);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to get response from AI consultant.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    `Suggest tech stack alternatives for ${idea?.substring(0, 15)}...`,
    `What are the major security risks for this?`,
    `Propose a monetization strategy for this idea.`,
    `Draft the initial tasks list for the first milestone.`
  ];

  const activeModelDisplay = primaryModel === 'grok' ? 'xAI Grok' : 'Gemini 1.5 Flash';

  return (
    <div className="w-full theme-card flex flex-col transition-all h-[550px] mt-8">
      {/* Chat Header */}
      <div className="flex justify-between items-center pb-4 border-b border-[var(--color-border)] mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-border-hover)] rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742a3 3 0 110-5.484m0 5.484a3 3 0 112.528 4.713M8.684 10.742A9.75 9.75 0 003 19.76m8.228-4.306A9.75 9.75 0 0118.75 19.76m-7.5-4.306a7.5 7.5 0 01-6 0M18 9v3m0 0v3m0-3h3" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold theme-text-title">Agentic Follow-Up & Consulting</h3>
            <p className="theme-text-muted text-xs mt-0.5 font-medium">Brainstorm, refine features, or critique execution plans in real-time</p>
          </div>
        </div>

        {/* Model Indicator Badge */}
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[var(--color-accent)] bg-[var(--color-accent-bg)] border border-[var(--color-border-hover)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse"></span>
          {activeModelDisplay}
        </span>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
            <span className="text-4xl mb-3">💬</span>
            <h4 className="font-bold theme-text-title text-base">Start a follow-up conversation</h4>
            <p className="theme-text-body text-xs max-w-sm mt-1">
              Ask questions about the research findings, request stack variations, or ask the consultant to detail your development steps.
            </p>
            
            {/* Suggestions list for empty state */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl w-full mt-6">
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(sug)}
                  className="text-left p-3 border border-[var(--color-border)] rounded-xl text-xs theme-text-body bg-[var(--color-accent-bg)]/30 hover:border-[var(--color-border-hover)] hover:bg-[var(--color-accent-bg)] transition-all font-medium cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                    isUser 
                      ? 'bg-[var(--color-accent)] text-[#0A0E0C] rounded-br-none font-semibold' 
                      : 'bg-[var(--bg-surface)] border border-[var(--color-border)] text-slate-700 dark:text-slate-300 rounded-bl-none shadow-inner'
                  }`}>
                    {/* Role Header */}
                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70 ${isUser ? 'text-[#0A0E0C]/75 font-extrabold' : 'text-[var(--color-accent)]'}`}>
                      {isUser ? 'You' : 'AI Consultant'}
                    </div>
                    
                    {/* Message Content */}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            })}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl p-4 bg-[var(--bg-surface)] border border-[var(--color-border)] text-slate-500 rounded-bl-none shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-[var(--color-accent)] opacity-70">
                    AI Consultant
                  </div>
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="w-2 h-2 bg-[var(--color-accent)] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-[var(--color-accent)] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-[var(--color-accent)] rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold">
                ⚠️ {error}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input Bar */}
      {messages.length > 0 && (
        <div className="flex items-center gap-2 mb-2 overflow-x-auto py-1 shrink-0 scrollbar-none">
          {suggestions.map((sug, i) => (
            <button
              key={i}
              onClick={() => handleSend(sug)}
              className="px-3 py-1 border border-[var(--color-border)] hover:border-[var(--color-border-hover)] rounded-full text-[11px] theme-text-body bg-[var(--color-accent-bg)]/20 hover:bg-[var(--color-accent-bg)] hover:text-[var(--color-accent)] whitespace-nowrap transition-all font-medium cursor-pointer"
            >
              {sug.length > 35 ? sug.substring(0, 35) + '...' : sug}
            </button>
          ))}
        </div>
      )}
      
      <div className="flex items-center gap-3 border border-[var(--color-border)] rounded-2xl p-2 bg-[var(--bg-surface)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/20 focus-within:border-[var(--color-border-focus)] transition-all shrink-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a follow-up question..."
          rows="1"
          className="flex-1 px-3 py-2 bg-transparent theme-text-body placeholder-slate-500 focus:outline-none resize-none text-sm max-h-24 scrollbar-none"
          disabled={isLoading}
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="w-10 h-10 theme-btn-primary rounded-xl flex items-center justify-center transition-all shrink-0 active:scale-95 cursor-pointer hover:translate-y-0"
        >
          <svg className="w-5 h-5 transform rotate-90 text-[#0A0E0C]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
