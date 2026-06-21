import React, { useState } from 'react';
import { X, Sparkles, RefreshCw, Send, Lightbulb, Target, Check } from 'lucide-react';
import { api } from '../services/api';

interface AiMissionAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  metaAnual: string[];
  metaSemanal: string[];
  metaDiaria: string[];
  onSelectMission: (mission: string) => void;
}

export const AiMissionAssistant: React.FC<AiMissionAssistantProps> = ({
  isOpen,
  onClose,
  metaAnual,
  metaSemanal,
  metaDiaria,
  onSelectMission,
}) => {
  const [ideas, setIdeas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'ai' | 'user'; content: string }>>([]);
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null);

  const buildGoalsContext = () => [
    `Metas Anuales: ${metaAnual.join(', ')}`,
    `Metas Semanales: ${metaSemanal.join(', ')}`,
    `Metas Diarias: ${metaDiaria.join(', ')}`,
  ].join('\n');

  const generateIdeas = async (customPrompt?: string) => {
    setLoading(true);
    try {
      const goalsContext = buildGoalsContext();

      const prompt = customPrompt || `Eres un coach personal experto en productividad. Basado en los siguientes objetivos de un usuario, genera 3 ideas específicas, concretas y ACCIONABLES para su MISIÓN DE HOY (la tarea más importante que debe realizar hoy). Cada idea debe poder completarse en un solo día y estar alineada con sus metas.

Objetivos del usuario:
${goalsContext}

Instrucciones:
- Cada idea debe ser una tarea concreta (ej: "Escribir el primer borrador del informe", no "Trabajar en el proyecto")
- Debe estar vinculada claramente a al menos uno de sus objetivos
- Debe ser realista para completar en un día

Responde ÚNICAMENTE con 3 ideas numeradas (1., 2., 3.), una por línea. Sin saludos, sin introducciones, sin texto adicional.`;

      const response = await api.post('/api/ai/mission/', { prompt });
      const text = response.data.text;
      const lines = text.split('\n')
        .filter((line: string) => /^\d+[\.\)]/.test(line.trim()))
        .map((line: string) => line.replace(/^\d+[\.\)]\s*/, '').trim())
        .filter(Boolean);

      const result = lines.length >= 3 ? lines.slice(0, 3) : text.split('\n').filter(Boolean).slice(0, 3);

      setIdeas(result);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `Aquí tienes 3 ideas para tu misión de hoy:\n${result.map((l: string, i: number) => `${i + 1}. ${l}`).join('\n')}`
      }]);
    } catch (err) {
      console.error('Error generating ideas:', err);
      setMessages(prev => [...prev, { role: 'ai', content: 'Lo siento, ocurrió un error al generar ideas. Verifica tu conexión e intenta de nuevo.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    await generateIdeas(`Basado en los mismos objetivos, pero considerando este comentario: "${userMsg}". Genera 3 nuevas ideas específicas para la misión de hoy.`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold uppercase text-white">Asistente IA - Misión de Hoy</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/30 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
            <h3 className="text-xs font-bold text-purple-700 uppercase mb-2 flex items-center gap-1">
              <Target className="w-3 h-3" /> Mis Objetivos
            </h3>
            <div className="space-y-1 text-[11px] text-gray-600">
              <p><span className="font-semibold">Anual:</span> {metaAnual.join(', ')}</p>
              <p><span className="font-semibold">Semanal:</span> {metaSemanal.join(', ')}</p>
              <p><span className="font-semibold">Diaria:</span> {metaDiaria.join(', ')}</p>
            </div>
          </div>

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-[#7c3aed] text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }`}>
                {msg.content.split('\n').map((line, j) => (
                  <p key={j}>{line}</p>
                ))}
              </div>
            </div>
          ))}

          {ideas.length > 0 && !loading && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> Selecciona una misión:
              </h3>
              {ideas.map((idea, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedIdea(idea);
                    onSelectMission(idea);
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedIdea === idea
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold text-sm mt-0.5">{i + 1}.</span>
                    <span className="text-sm text-gray-700 flex-1">{idea}</span>
                    {selectedIdea === idea && <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />}
                  </div>
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-purple-600">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Analizando tus objetivos y generando ideas...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50/50 shrink-0 space-y-2">
          <button
            onClick={() => {
              setSelectedIdea(null);
              generateIdeas();
            }}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {ideas.length === 0 ? 'Generar 3 Ideas de Misión' : 'Regenerar Ideas'}
          </button>

          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Pide un ajuste o nueva idea..."
              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !chatInput.trim()}
              className="p-2 rounded-xl bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
