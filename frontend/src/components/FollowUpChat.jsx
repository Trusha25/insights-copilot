import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../api';

export default function FollowUpChat({ workspaceId, initialHistory = [], idea, primaryModel, activePanel }) {
  const [messages, setMessages] = useState(initialHistory);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(initialHistory && initialHistory.length > 0);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages(initialHistory || []);
    if (initialHistory && initialHistory.length > 0) {
      setIsExpanded(true);
    } else {
      setIsExpanded(false);
    }
    setError(null);
  }, [workspaceId, initialHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom();
    }
  }, [messages, isLoading, isExpanded]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input.trim();
    if (!text || isLoading) return;

    if (!textToSend) {
      setInput('');
    }
    
    setIsExpanded(true);
    setError(null);
    setIsLoading(true);

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await sendChatMessage(workspaceId, text);
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
    `What are the major security risks?`,
    `Propose a monetization strategy.`,
    `Draft the initial milestone tasks.`
  ];

  const activeModelDisplay = primaryModel === 'grok' ? 'xAI Grok' : 'Gemini 1.5 Flash';

  // If right DetailPanel is open, hide chat pill to avoid overlay/clipping
  if (activePanel) {
    return null;
  }

  return (
    <div className="sticky bottom-4 z-30 w-full max-w-3xl mx-auto select-none print:hidden mt-6">
      <div className="flex flex-col items-center w-full">
        
        {/* Expanded Chat Messages Drawer (Floating Above Input Pill) */}
        {isExpanded && (
          <div className="w-full bg-[var(--bg-surface)]/95 backdrop-blur-2xl border border-[var(--border-strong)] rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.35)] p-4 mb-2 animate-fade-in transition-all">
            
            {/* Drawer Header */}
            <div className="flex justify-between items-center pb-2.5 mb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <span className="text-sm">💬</span>
                <h4 className="text-xs font-extrabold theme-text-title">AI Consultant Chat</h4>
                {messages.length > 0 && (
                  <span className="bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--border-subtle)] text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {messages.length} message{messages.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-[var(--color-accent)] bg-[var(--color-accent-bg)] border border-[var(--border-subtle)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse"></span>
                  {activeModelDisplay}
                </span>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] theme-text-muted hover:theme-text-title transition-colors cursor-pointer"
                  title="Minimize Chat"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Message List */}
            <div className="max-h-[300px] sm:max-h-[360px] overflow-y-auto space-y-3 pr-1 mb-2 scrollbar-thin scrollbar-thumb-[var(--border-subtle)]">
              {messages.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="theme-text-muted text-xs font-medium">Ask any question to start consulting with the AI agent.</p>
                  
                  {/* Suggestions list for empty state */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full mt-3">
                    {suggestions.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSend(sug)}
                        className="text-left p-2 border border-[var(--border-subtle)] rounded-xl text-xs theme-text-body bg-[var(--bg-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--color-accent-bg)]/30 transition-all font-medium cursor-pointer truncate"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, index) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                        <div className={`max-w-[88%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed shadow-xs ${
                          isUser 
                            ? 'bg-[var(--color-accent)] text-white font-semibold rounded-br-none' 
                            : 'bg-[var(--bg-secondary)] border border-[var(--border-subtle)] theme-text-body rounded-bl-none'
                        }`}>
                          <div className={`text-[9px] font-bold uppercase tracking-wider mb-1 opacity-75 ${isUser ? 'text-white/90 font-extrabold' : 'text-[var(--color-accent)]'}`}>
                            {isUser ? 'You' : 'AI Consultant'}
                          </div>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-2xl p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] theme-text-muted rounded-bl-none shadow-xs">
                        <div className="text-[9px] font-bold uppercase tracking-wider mb-1 text-[var(--color-accent)]">
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

                  {error && (
                    <div className="p-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs font-semibold">
                      ⚠️ {error}
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sleek ChatGPT / Claude Style Pinned Input Pill Bar */}
        <div className="w-full bg-[var(--chat-pill-bg)] border-2 border-[var(--chat-pill-border)] rounded-2xl shadow-[0_16px_45px_rgba(0,0,0,0.4)] p-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-[var(--color-accent)] focus-within:border-[var(--color-accent)]">
          <div className="flex items-center gap-2">
            
            {/* History Toggle Button if messages exist */}
            {messages.length > 0 && !isExpanded && (
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--border-subtle)] text-xs font-bold shrink-0 hover:bg-[var(--color-accent)] hover:text-white transition-all cursor-pointer"
                title="View Chat History"
              >
                <span>💬</span>
                <span>{messages.length}</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
              </button>
            )}

            {/* Input Textarea */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (messages.length > 0 && !isExpanded) {
                  setIsExpanded(true);
                }
              }}
              placeholder="Ask a follow-up question..."
              rows="1"
              className="flex-1 px-3 py-1.5 bg-transparent theme-text-title placeholder-[var(--text-muted)] focus:outline-none resize-none text-xs sm:text-sm max-h-20 scrollbar-none font-medium"
              disabled={isLoading}
            />

            {/* Model Badge (Desktop) */}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold text-[var(--color-accent)] bg-[var(--color-accent-bg)] border border-[var(--chat-pill-border)] shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse"></span>
              {activeModelDisplay}
            </span>

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="w-9 h-9 bg-[var(--color-accent)] text-white rounded-xl flex items-center justify-center transition-all shrink-0 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-accent-hover)] shadow-md"
              title="Send message"
            >
              <svg className="w-4 h-4 transform rotate-90 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
