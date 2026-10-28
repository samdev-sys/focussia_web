import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { agentService, AgentMessageData } from '../services/api';

interface Props {
  onOpenSettings?: () => void;
}

const AgentChat: React.FC<Props> = ({ onOpenSettings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessageData[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUnread(0);
      setHasNewMessage(false);
      loadHistory();
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async () => {
    try {
      const msgs = await agentService.getConversations(sessionId);
      if (msgs.length > 0) {
        setMessages(msgs.slice(-20));
        setSessionId(msgs[0].session_id);
      } else {
        setMessages([{
          id: 'welcome',
          user: 0,
          session_id: '',
          rol: 'ASSISTANT',
          mensaje: '¡Hola! Soy FocusIA, tu asistente de productividad personal. ¿En qué puedo ayudarte hoy? Puedo revisar tus tareas, darte recomendaciones o simplemente charlar sobre tu progreso.',
          metadata: null,
          created_at: new Date().toISOString(),
        }]);
      }
    } catch {
      // ignore
    }
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);

    const userMsg: AgentMessageData = {
      id: `user-${Date.now()}`,
      user: 0,
      session_id: sessionId || '',
      rol: 'USER',
      mensaje: text,
      metadata: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await agentService.chat(text, sessionId);
      setSessionId(res.session_id);

      const botMsg: AgentMessageData = {
        id: `bot-${Date.now()}`,
        user: 0,
        session_id: res.session_id,
        rol: 'ASSISTANT',
        mensaje: res.respuesta,
        metadata: null,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        user: 0,
        session_id: sessionId || '',
        rol: 'ASSISTANT',
        mensaje: 'Lo siento, tuve un problema al procesar tu mensaje. ¿Puedes intentarlo de nuevo?',
        metadata: null,
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end gap-2">
          {hasNewMessage && (
            <div className="bg-gradient-to-r from-[#3533cd] to-[#040817] text-white text-[10px] px-3 py-1 rounded-full shadow-lg animate-bounce">
              ¡FocusIA tiene algo para ti!
            </div>
          )}
          <button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-[#3533cd] to-[#040817] text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center relative"
          >
            <MessageCircle className="w-6 h-6" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {unread}
              </span>
            )}
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[200] w-[380px] max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-xl rounded-md shadow-2xl border border-white/50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#3533cd] to-[#040817] text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">FocusIA</p>
                <p className="text-[10px] text-white/70 leading-tight">Asistente de productividad</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { onOpenSettings?.(); setIsOpen(false); }}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                title="Configuración"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[400px] scrollbar-hide">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.rol === 'USER' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.rol !== 'USER' && (
                  <div className="w-6 h-6 rounded-full bg-[#3533cd]/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot className={`w-3.5 h-3.5 ${msg.rol === 'SYSTEM' ? 'text-amber-500' : 'text-[#3533cd]'}`} />
                  </div>
                )}
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-md text-[12px] leading-relaxed whitespace-pre-wrap ${
                    msg.rol === 'USER'
                      ? 'bg-[#3533cd] text-white rounded-br-sm'
                      : msg.rol === 'SYSTEM'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200 italic rounded-bl-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {msg.mensaje}
                </div>
                {msg.rol === 'USER' && (
                  <div className="w-6 h-6 rounded-full bg-[#3533cd] flex items-center justify-center shrink-0 mt-1">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-full bg-[#3533cd]/10 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-[#3533cd]" />
                </div>
                <div className="bg-gray-100 rounded-md px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#3533cd]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 shrink-0">
            <div className="flex items-center gap-2 bg-gray-50 rounded-md border border-gray-200 px-3 py-2 focus-within:border-[#3533cd]/50 transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu mensaje..."
                className="flex-1 bg-transparent outline-none text-[12px] placeholder:text-gray-400"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="p-1.5 rounded-md bg-[#3533cd] text-white hover:bg-[#2a28b0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AgentChat;
