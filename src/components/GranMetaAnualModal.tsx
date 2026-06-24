import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Check, Edit3, ChevronLeft, Trophy, Target } from 'lucide-react';
import { granMetaAnualService, RuedaCategoria } from '../services/api';

interface GranMetaAnualModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  avatarUrl?: string;
  ruedaData?: RuedaCategoria[];
  onApproved: () => void;
  existingMeta?: any;
  editMode?: boolean;
}

type Stage = 'intro' | 'p1' | 'p2' | 'p3' | 'generating' | 'smart' | 'edit' | 'approved';

export function GranMetaAnualModal({
  isOpen,
  onClose,
  username,
  avatarUrl,
  ruedaData,
  onApproved,
  existingMeta,
  editMode,
}: GranMetaAnualModalProps) {
  const [stage, setStage] = useState<Stage>('intro');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [p3, setP3] = useState('');
  const [smartData, setSmartData] = useState<Record<string, string> | null>(null);
  const [editComment, setEditComment] = useState('');
  const [savedMetaId, setSavedMetaId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  const avatarSrc = avatarUrl || '/avartars/Ashley.jpeg';

  useEffect(() => {
    if (isOpen) {
      setStage(editMode ? 'edit' : 'intro');
      setP1('');
      setP2('');
      setP3('');
      setSmartData(null);
      setEditComment('');
      setSavedMetaId(null);
      setError('');
    }
  }, [isOpen, editMode]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [stage, smartData]);

  const handleAnswer = (question: string, value: string) => {
    if (!value.trim()) return;
    if (question === 'p1') {
      setP1(value);
      setStage('p2');
    } else if (question === 'p2') {
      setP2(value);
      setStage('p3');
    } else if (question === 'p3') {
      setP3(value);
      callSmartMeta(value);
    }
  };

  const callSmartMeta = async (impacto: string) => {
    setStage('generating');
    setError('');
    try {
      const ruedaPayload = ruedaData?.map(r => ({ nombre: r.nombre, puntaje: r.puntaje })) || [];
      const result = await granMetaAnualService.generarSmart({
        area: p1,
        resultado: p2,
        impacto,
        rueda_data: ruedaPayload,
      });
      setSmartData(result);
      setStage('smart');
    } catch (e) {
      setError('Error al generar la meta. Intenta de nuevo.');
      setStage('p3');
    }
  };

  const handleEditSubmit = async () => {
    if (!editComment.trim()) return;
    setStage('generating');
    setError('');
    try {
      const result = await granMetaAnualService.editarSmart(
        savedMetaId || existingMeta?.id || 0,
        editComment
      );
      setSmartData(result);
      setEditComment('');
      setStage('smart');
    } catch (e) {
      setError('Error al editar la meta. Intenta de nuevo.');
      setStage('edit');
    }
  };

  const handleApprove = async () => {
    if (!smartData) return;
    setStage('generating');
    setError('');
    try {
      const saved = await granMetaAnualService.guardarBorrador({
        texto_meta: smartData.texto_meta || '',
        frase_resumen: smartData.frase_resumen || '',
        desglose_smart: {
          S: smartData.S || '',
          M: smartData.M || '',
          A: smartData.A || '',
          R: smartData.R || '',
          T: smartData.T || '',
        },
        respuestas: { p1, p2, p3 },
      });
      await granMetaAnualService.aprobar(saved.id);
      setSavedMetaId(saved.id);
      setStage('approved');
      onApproved();
    } catch (e) {
      setError('Error al aprobar la meta. Intenta de nuevo.');
      setStage('smart');
    }
  };

  const handleStartEdit = () => {
    setStage('edit');
    setEditComment('');
  };

  if (!isOpen) return null;

  const MessageBubble = ({ text, isUser }: { text: string; isUser?: boolean }) => (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <img src={avatarSrc} alt="avatar" className="w-8 h-8 rounded-full object-cover mr-2 shrink-0" />
      )}
      <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
        isUser
          ? 'bg-gradient-to-r from-[#2b44ff] to-[#0b153a] text-white rounded-br-md'
          : 'bg-gray-100 text-gray-800 rounded-bl-md'
      }`}>
        {text}
      </div>
    </div>
  );

  const QuestionInput = ({ value, onChange, onSubmit, placeholder, disabled }: {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    placeholder: string;
    disabled?: boolean;
  }) => (
    <div className="flex gap-2 mt-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && onSubmit()}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus
        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#2b44ff]/30 focus:border-[#2b44ff] disabled:opacity-50"
      />
      <button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className="px-4 py-2.5 bg-gradient-to-r from-[#2b44ff] to-[#0b153a] text-white rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );

  const SmartBreakdown = ({ data }: { data: Record<string, string> }) => {
    const items = [
      { label: 'S (Específica)', key: 'S', color: 'from-blue-500 to-blue-600' },
      { label: 'M (Medible)', key: 'M', color: 'from-green-500 to-green-600' },
      { label: 'A (Alcanzable)', key: 'A', color: 'from-amber-500 to-amber-600' },
      { label: 'R (Relevante)', key: 'R', color: 'from-purple-500 to-purple-600' },
      { label: 'T (Temporal)', key: 'T', color: 'from-rose-500 to-rose-600' },
    ];

    return (
      <div className="space-y-2">
        {data.frase_resumen && (
          <div className="bg-gradient-to-r from-[#2b44ff]/10 to-[#0b153a]/10 rounded-xl p-3 border border-[#2b44ff]/20">
            <p className="text-sm font-bold text-[#0b153a] text-center italic">
              &ldquo;{data.frase_resumen}&rdquo;
            </p>
          </div>
        )}
        {data.texto_meta && (
          <div className="bg-white rounded-xl p-3 border border-gray-200">
            <p className="text-sm text-gray-700">{data.texto_meta}</p>
          </div>
        )}
        {items.map(item => data[item.key] && (
          <div key={item.key} className={`bg-gradient-to-r ${item.color} rounded-xl p-3 text-white`}>
            <p className="text-xs font-bold uppercase tracking-wider mb-0.5">{item.label}</p>
            <p className="text-sm">{data[item.key]}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-2">
      <div className="bg-white rounded-3xl shadow-2xl border border-white/50 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-[#2b44ff] to-[#0b153a] shrink-0">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white">Gran Meta Anual</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
          {stage === 'intro' && (
            <>
              <MessageBubble text={`¡Hola, ${username}! Llegó el momento de convertir tu Rueda de la Vida en una Gran Meta Anual clara, poderosa y alcanzable. Comencemos con tres preguntas.`} />
              <div className="flex justify-center mt-2">
                <button
                  onClick={() => setStage('p1')}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#2b44ff] to-[#0b153a] text-white font-bold rounded-xl hover:brightness-110 transition-all"
                >
                  Comenzar
                </button>
              </div>
            </>
          )}

          {stage === 'p1' && (
            <>
              <MessageBubble text="Pregunta 1: ¿Cuál es el área de tu vida que más necesita transformación según los resultados de tu Rueda de la Vida?" />
              <QuestionInput
                value={p1}
                onChange={setP1}
                onSubmit={() => handleAnswer('p1', p1)}
                placeholder="Ej: Mi salud física y bienestar..."
              />
            </>
          )}

          {stage === 'p2' && (
            <>
              <MessageBubble text={`Gracias, ${username}. Esta respuesta nos ayuda a construir una meta más clara y conectada contigo.`} isUser={false} />
              <MessageBubble text="Pregunta 2: ¿Qué gran resultado deseas lograr antes de que termine este año?" />
              <QuestionInput
                value={p2}
                onChange={setP2}
                onSubmit={() => handleAnswer('p2', p2)}
                placeholder="Ej: Correr mi primera maratón..."
              />
            </>
          )}

          {stage === 'p3' && (
            <>
              <MessageBubble text={`Gracias, ${username}. Esta respuesta nos ayuda a construir una meta más clara y conectada contigo.`} isUser={false} />
              <MessageBubble text="Pregunta 3: ¿Qué impacto o cambio emocional generarás al lograr ese resultado? ¿Cómo te hará sentir?" />
              <QuestionInput
                value={p3}
                onChange={setP3}
                onSubmit={() => handleAnswer('p3', p3)}
                placeholder="Ej: Me sentiré orgulloso, lleno de energía..."
              />
            </>
          )}

          {stage === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-[#2b44ff] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-500 font-medium">
                {savedMetaId ? 'Aprobando meta...' : editMode ? 'Reconstruyendo meta...' : 'La IA está analizando tus respuestas y generando tu meta SMART...'}
              </p>
            </div>
          )}

          {stage === 'smart' && smartData && (
            <>
              <MessageBubble text="He analizado tus respuestas y tu Rueda de la Vida. Aquí está tu propuesta de Gran Meta Anual estructurada con metodología SMART:" />
              <SmartBreakdown data={smartData} />
              {error && <p className="text-red-500 text-xs text-center">{error}</p>}
              <div className="flex flex-col gap-2 mt-4">
                <button
                  onClick={handleApprove}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" /> Aprobar Gran Meta Anual
                </button>
                <button
                  onClick={handleStartEdit}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-5 h-5" /> Editar esta meta
                </button>
              </div>
            </>
          )}

          {stage === 'edit' && (
            <>
              <MessageBubble text="Vamos a mejorarla. Escríbeme qué quieres cambiar y reconstruiré tu meta con esa nueva dirección." />
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit()}
                  placeholder="Describe qué deseas cambiar..."
                  autoFocus
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#2b44ff]/30 focus:border-[#2b44ff]"
                />
                <button
                  onClick={handleEditSubmit}
                  disabled={!editComment.trim()}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#2b44ff] to-[#0b153a] text-white rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {error && <p className="text-red-500 text-xs text-center mt-2">{error}</p>}
            </>
          )}

          {stage === 'approved' && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">¡Felicidades, {username}!</h3>
              <p className="text-sm text-gray-500 mb-4">
                Has definido tu Gran Meta Anual. Este es el primer paso para transformar tu visión en realidad.
                Tu meta ya está guardada y disponible en el botón ANUAL del dashboard.
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-gradient-to-r from-[#2b44ff] to-[#0b153a] text-white font-bold rounded-xl hover:brightness-110 transition-all"
              >
                Volver al Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
