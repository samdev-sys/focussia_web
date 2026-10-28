import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { agentService } from '../services/api';

interface HelpChatMessage {
  id: string;
  rol: 'USER' | 'ASSISTANT';
  mensaje: string;
}

interface HelpChatProps {
  open: boolean;
  onClose: () => void;
  pasoLabel: string;
  titulo: string;
  bienvenida: string;
  contextoAyuda: string;
}

const ERROR_FALLBACK = 'No pude contactar con el asistente en este momento. Revisa tu conexión e inténtalo de nuevo.';

export default function HelpChat({ open, onClose, pasoLabel, titulo, bienvenida, contextoAyuda }: HelpChatProps) {
  const [messages, setMessages] = useState<HelpChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMessages([{ id: 'welcome', rol: 'ASSISTANT', mensaje: bienvenida }]);
      setSessionId(undefined);
      setInput('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, bienvenida, contextoAyuda]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, rol: 'USER', mensaje: text }]);

    try {
      const res = await agentService.chat(text, sessionId, contextoAyuda);
      if (res.session_id) setSessionId(res.session_id);
      setMessages(prev => [...prev, { id: `bot-${Date.now()}`, rol: 'ASSISTANT', mensaje: res.respuesta || ERROR_FALLBACK }]);
    } catch {
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, rol: 'ASSISTANT', mensaje: ERROR_FALLBACK }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId, contextoAyuda]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[250] w-[380px] max-w-[calc(100vw-2rem)] bg-[#0c0b24]/95 backdrop-blur-xl rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] border border-white/10 flex flex-col overflow-hidden font-montserrat">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1d2fdc] to-[#7c3aed] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-white leading-tight flex items-center gap-1">
              Ayuda con IA <Sparkles className="w-3 h-3 text-white/80" />
            </p>
            <p className="text-[11px] text-white/70 leading-tight truncate">{pasoLabel} · {titulo}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors shrink-0" title="Cerrar chat">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[380px] min-h-[200px]">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.rol === 'USER' ? 'justify-end' : 'justify-start'}`}>
            {msg.rol !== 'USER' && (
              <div className="w-6 h-6 rounded-full bg-[#7c3aed]/20 border border-[#7c3aed]/30 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-3.5 h-3.5 text-[#a78bfa]" />
              </div>
            )}
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[12.5px] leading-relaxed whitespace-pre-wrap ${
              msg.rol === 'USER'
                ? 'bg-gradient-to-r from-[#1d2fdc] to-[#7c3aed] text-white rounded-br-sm'
                : 'bg-white/[0.06] border border-white/[0.07] text-white/85 rounded-bl-sm'
            }`}>
              {msg.mensaje}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-[#7c3aed]/20 border border-[#7c3aed]/30 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-[#a78bfa]" />
            </div>
            <div className="bg-white/[0.06] border border-white/[0.07] rounded-xl px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#a78bfa]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/[0.07] shrink-0">
        <div className="flex items-center gap-2 bg-white/[0.05] rounded-xl border border-white/10 px-3 py-2 focus-within:border-[#7c3aed]/60 transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pregunta sobre estas opciones..."
            className="flex-1 bg-transparent outline-none text-[12.5px] text-white placeholder:text-white/30"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="p-1.5 rounded-lg bg-gradient-to-r from-[#1d2fdc] to-[#7c3aed] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Enviar"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
