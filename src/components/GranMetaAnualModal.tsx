import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X, Send, Check, Edit3, ChevronLeft, Trophy, Target, Loader2,
  HeartPulse, Coins, Users, Briefcase, TrendingUp, Flower2, Heart,
  Home, PartyPopper, HandHeart, Dumbbell,
} from 'lucide-react';
import { granMetaAnualService, RuedaCategoria } from '../services/api';
import { AnualShell } from './AnualShell';

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

type Stage = 'intro' | 'p1' | 'p2' | 'p3' | 'preSmart' | 'generating' | 'smart' | 'edit' | 'approved';

type IconComp = React.ComponentType<{ className?: string }>;

const AREA_ICONS: Record<string, IconComp> = {
  salud: HeartPulse,
  dinero: Coins,
  pareja: Heart,
  familia: Users,
  trabajo: Briefcase,
  desarrollo: TrendingUp,
  espiritualidad: Flower2,
  diversion: PartyPopper,
  entorno: Home,
  contribucion: HandHeart,
};

function areaIcon(nombre: string): IconComp {
  const key = (nombre || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(' ')[0];
  if (key.includes('salud')) return Dumbbell;
  return AREA_ICONS[key] || Target;
}

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

  const avatarSrc = avatarUrl || '/avatars/Sophya.jpeg';

  // Tres focos = áreas con puntaje más bajo (foto 4: chips con icono)
  const focosTop = useMemo(() => {
    if (!ruedaData || ruedaData.length === 0) return [];
    return [...ruedaData].sort((a, b) => a.puntaje - b.puntaje).slice(0, 3);
  }, [ruedaData]);

  useEffect(() => {
    if (isOpen) {
      if (editMode && existingMeta) {
        setStage('generating');
        setError('');
        granMetaAnualService.guardarBorrador({
          texto_meta: existingMeta.generated_goal_text || '',
          frase_resumen: existingMeta.smart_breakdown?.frase_resumen || '',
          desglose_smart: {
            S: existingMeta.smart_breakdown?.S || '',
            M: existingMeta.smart_breakdown?.M || '',
            A: existingMeta.smart_breakdown?.A || '',
            R: existingMeta.smart_breakdown?.R || '',
            T: existingMeta.smart_breakdown?.T || '',
          },
          respuestas: existingMeta.raw_responses || {},
        }).then(saved => {
          setSavedMetaId(saved.id);
          setStage('edit');
        }).catch(() => {
          setError('Error al preparar la edición.');
          setStage('edit');
        });
      } else {
        setStage(editMode ? 'edit' : 'intro');
        setP1('');
        setP2('');
        setP3('');
        setSmartData(null);
        setEditComment('');
        setSavedMetaId(null);
        setError('');
      }
    }
  }, [isOpen, editMode, existingMeta]);

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
      setStage('preSmart');
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

  useEffect(() => {
    if (stage !== 'preSmart') return;
    const t = setTimeout(() => {
      callSmartMeta(p3);
    }, 2400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const handleEditSubmit = async () => {
    if (!editComment.trim()) return;
    const metaId = savedMetaId || existingMeta?.id;
    if (!metaId) {
      setError('No se encontró la meta. Vuelve a intentarlo.');
      return;
    }
    setStage('generating');
    setError('');
    try {
      const result = await granMetaAnualService.editarSmart(metaId, editComment);
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
        respuestas: (p1 || p2 || p3)
          ? { p1, p2, p3 }
          : (existingMeta?.raw_responses || {}),
      });
      await granMetaAnualService.aprobar(saved.id);
      setSavedMetaId(saved.id);
      setStage('approved');
    } catch (e) {
      setError('Error al aprobar la meta. Intenta de nuevo.');
      setStage('smart');
    }
  };

  const handleStartEdit = async () => {
    if (!smartData) return;
    if (!savedMetaId && !existingMeta?.id) {
      setStage('generating');
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
        setSavedMetaId(saved.id);
      } catch {
        setError('Error al guardar el borrador. Intenta de nuevo.');
        return;
      }
    }
    setStage('edit');
    setEditComment('');
  };

  if (!isOpen) return null;

  const shellTitle = stage === 'smart' ? 'Gran Meta Anual propuesta' : 'Gran Meta Anual';

  const AvatarPanel = () => (
    <div className="relative rounded-2xl overflow-hidden min-h-[300px] lg:min-h-[480px] bg-gradient-to-b from-[#2b3fd4] via-[#4b3fd6] to-[#7a5af8]">
      <img
        src={avatarSrc}
        alt="Avatar"
        className="absolute inset-0 w-full h-full object-cover object-top"
        onError={(e) => { const t = e.target as HTMLImageElement; if (!t.src.includes('Sophya.jpeg')) t.src = '/avatars/Sophya.jpeg'; }}
      />
    </div>
  );

  const MessageBubble = ({ text }: { text: string }) => (
    <div className="flex justify-start mb-3">
      <div className="max-w-[640px] px-5 py-3.5 rounded-2xl rounded-tl-md bg-[#f4f1ff] border border-[#e5e0ff] text-[15px] leading-relaxed text-indigo-950 shadow-sm">
        {text}
      </div>
    </div>
  );

  const QuestionStage = ({
    kicker, question, value, onChange, onSubmit, placeholder,
  }: {
    kicker?: string; question: string; value: string; onChange: (v: string) => void;
    onSubmit: () => void; placeholder: string;
  }) => (
    <div className="grid lg:grid-cols-[320px_1fr] gap-5 items-start">
      <AvatarPanel />
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
        {kicker && (
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#f1eaff] text-[#7c3aed] text-sm font-bold mb-4">
            {kicker}
          </span>
        )}
        <div className="rounded-2xl border border-[#d9ccff] bg-[#fbfaff] px-6 py-8 text-center mb-4 shadow-sm">
          <h2 className="text-2xl sm:text-[34px] font-black leading-tight">
            <span className="bg-gradient-to-r from-[#2b5cff] to-[#7c3aed] bg-clip-text text-transparent">{question.split('?')[0]}?</span>
            {question.includes('?') && question.split('?').slice(1).join('?') && (
              <span className="block text-[#1a1446]">{question.split('?').slice(1).join('?')}</span>
            )}
          </h2>
        </div>
        <textarea
          id="gma-q-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={5}
          className="w-full px-4 py-3 rounded-xl border border-[#c4b5fd] bg-white text-[15px] outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed] placeholder:text-[#a5b4fc] resize-y"
        />
        <button
          id="gma-q-send"
          onClick={onSubmit}
          disabled={!value.trim()}
          className="w-full mt-3 py-3.5 bg-gradient-to-r from-[#2b5cff] to-[#7c3aed] text-white text-[15px] font-medium rounded-xl hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 shadow-lg"
        >
          Enviar respuesta
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (stage === 'intro') {
      return (
        <div className="grid lg:grid-cols-[320px_1fr] gap-5 items-start">
          <AvatarPanel />
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
            <MessageBubble text="Llegó el momento de convertir tu Rueda de la Vida en una Gran Meta Anual clara, poderosa y alcanzable. Comencemos con tres preguntas." />
            <button
              onClick={() => setStage('p1')}
              className="w-full mt-2 py-3.5 bg-gradient-to-r from-[#2b5cff] to-[#7c3aed] text-white text-[15px] font-medium rounded-xl hover:brightness-110 active:scale-[0.99] transition-all shadow-lg"
            >
              Comenzar
            </button>
          </div>
        </div>
      );
    }

    if (stage === 'p1') {
      return (
        <>
          <div className="grid lg:grid-cols-[320px_1fr] gap-5 items-start">
            <AvatarPanel />
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
              <QuestionStage
                kicker="Pregunta 1 de 3"
                question="Tomando en cuenta los resultados de tu Rueda de la Vida, ¿qué área o aspecto de tu vida sientes que necesita mayor transformación este año?"
                value={p1}
                onChange={setP1}
                onSubmit={() => handleAnswer('p1', p1)}
                placeholder="Escribe aquí tu respuesta..."
              />
            </div>
          </div>
        </>
      );
    }

    if (stage === 'p2') {
      return (
        <div className="grid lg:grid-cols-[320px_1fr] gap-5 items-start">
          <AvatarPanel />
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
            <MessageBubble text={`Gracias, ${username}. Esta respuesta nos ayuda a construir una meta más clara y conectada contigo.`} />
            <QuestionStage
              kicker="Pregunta 2 de 3"
              question="¿Qué gran resultado te gustaría alcanzar antes de terminar este año?"
              value={p2}
              onChange={setP2}
              onSubmit={() => handleAnswer('p2', p2)}
              placeholder="Escribe aquí tu respuesta..."
            />
          </div>
        </div>
      );
    }

    if (stage === 'p3') {
      return (
        <div className="grid lg:grid-cols-[320px_1fr] gap-5 items-start">
          <AvatarPanel />
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
            <MessageBubble text={`Gracias, ${username}. Esta respuesta nos ayuda a construir una meta más clara y conectada contigo.`} />
            <QuestionStage
              kicker="Pregunta 3 de 3"
              question="¿Qué cambiaría en tu vida si lograras ese resultado?"
              value={p3}
              onChange={setP3}
              onSubmit={() => handleAnswer('p3', p3)}
              placeholder="Escribe aquí tu respuesta..."
            />
          </div>
        </div>
      );
    }

    if (stage === 'preSmart') {
      return (
        <div className="grid lg:grid-cols-[320px_1fr] gap-5 items-start">
          <AvatarPanel />
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
            <MessageBubble text={`Gracias, ${username}. Esta respuesta nos ayuda a construir una meta más clara y conectada contigo.`} />
            <div className="rounded-2xl border border-[#d9ccff] bg-[#fbfaff] px-6 py-10 text-center shadow-sm">
              <h2 className="text-2xl sm:text-4xl font-black text-[#1a1446] leading-tight">
                Ya tengo la información<br />necesaria.
              </h2>
              <p className="text-xl sm:text-3xl text-[#1a1446] leading-snug mt-6">
                Ahora transformaré tus respuestas<br />
                en una <span className="font-black bg-gradient-to-r from-[#2b5cff] to-[#7c3aed] bg-clip-text text-transparent">Gran Meta Anual</span><br />
                usando el modelo <span className="font-black bg-gradient-to-r from-[#2b5cff] to-[#7c3aed] bg-clip-text text-transparent">SMART.</span>
              </p>
              <div className="flex items-center justify-center gap-3 mt-8">
                <div className="w-8 h-8 border-4 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
                <p className="text-base text-[#2b5cff] font-medium">Construyendo tu Gran Meta Anual...</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (stage === 'generating') {
      return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-12 h-12 border-4 border-[#2b5cff] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-gray-500 font-medium">
            {editMode && !savedMetaId
              ? 'Preparando edición...'
              : savedMetaId
                ? 'Aprobando meta...'
                : editMode
                  ? 'Reconstruyendo meta...'
                  : 'La IA está analizando tus respuestas y generando tu meta SMART...'}
          </p>
          {error && <p className="text-red-500 text-xs text-center mt-2">{error}</p>}
        </div>
      );
    }

    if (stage === 'smart' && smartData) {
      const items = [
        { label: 'Específica', key: 'S', color: 'from-blue-500 to-blue-600' },
        { label: 'Medible', key: 'M', color: 'from-indigo-500 to-indigo-600' },
        { label: 'Alcanzable', key: 'A', color: 'from-purple-500 to-purple-600' },
        { label: 'Relevante', key: 'R', color: 'from-fuchsia-500 to-fuchsia-600' },
        { label: 'Temporal', key: 'T', color: 'from-purple-500 to-purple-600' },
      ];
      return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
          <div className="grid lg:grid-cols-[300px_1fr] gap-5 items-start">
            <div className="relative rounded-2xl overflow-hidden min-h-[300px] lg:min-h-[460px] bg-[#101331]">
              <img
                src={avatarSrc}
                alt="Avatar"
                className="absolute inset-0 w-full h-full object-cover object-top"
                onError={(e) => { const t = e.target as HTMLImageElement; if (!t.src.includes('Sophya.jpeg')) t.src = '/avatars/Sophya.jpeg'; }}
              />
            </div>
            <div>
              <div className="rounded-2xl bg-[#f4f1ff] border border-[#e5e0ff] px-5 py-4 mb-3">
                <p className="text-[17px] sm:text-lg font-bold text-[#2b2a6b] leading-relaxed">{smartData.texto_meta}</p>
                {smartData.frase_resumen && (
                  <p className="text-sm italic text-[#6d5bd0] mt-2">&ldquo;{smartData.frase_resumen}&rdquo;</p>
                )}
              </div>
              <div className="space-y-2.5">
                {items.map(item => smartData[item.key] && (
                  <div key={item.key} className="flex items-center gap-3 bg-[#f4f1ff]/60 rounded-xl px-3 py-2.5">
                    <span className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.color} text-white text-xl font-black shrink-0 flex items-center justify-center shadow`}>
                      {item.key}
                    </span>
                    <span className="font-bold text-[#1a1446] text-[15px] shrink-0 w-24">{item.label}</span>
                    <span className="w-px self-stretch bg-[#c9bdf5]" />
                    <p className="text-[14px] text-[#2b2a6b] leading-snug flex-1">{smartData[item.key]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-red-500 text-xs text-center mt-3">{error}</p>}
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-5">
            <button
              onClick={handleStartEdit}
              className="px-10 py-3.5 rounded-xl border-2 border-[#5b5bd6] text-[#4f46e5] font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
            >
              <Edit3 className="w-4 h-4" /> Editar esta meta
            </button>
            <button
              onClick={handleApprove}
              className="px-10 py-3.5 rounded-xl bg-gradient-to-r from-[#2b5cff] to-[#7c3aed] text-white font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Check className="w-5 h-5" /> Aprobar Gran Meta Anual
            </button>
          </div>
        </div>
      );
    }

    if (stage === 'edit') {
      return (
        <div className="grid lg:grid-cols-[320px_1fr] gap-5 items-start">
          <AvatarPanel />
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
            <MessageBubble text="Vamos a mejorarla. Escríbeme qué quieres cambiar y reconstruiré tu meta con esa nueva dirección." />
            <textarea
              id="gma-edit-input"
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
              placeholder="Escribe aquí tu respuesta..."
              rows={7}
              className="w-full px-4 py-3 rounded-xl border border-[#c4b5fd] bg-white text-[15px] outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed] placeholder:text-[#a5b4fc] resize-y"
            />
            <button
              id="gma-edit-send"
              onClick={handleEditSubmit}
              disabled={!editComment.trim()}
              className="w-full mt-3 py-3.5 bg-gradient-to-r from-[#2b5cff] to-[#7c3aed] text-white text-[15px] font-medium rounded-xl hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 shadow-lg"
            >
              Enviar respuesta
            </button>
            {error && <p className="text-red-500 text-xs text-center mt-2">{error}</p>}
          </div>
        </div>
      );
    }

    return (
      <div className="grid lg:grid-cols-[320px_1fr] gap-5 items-stretch">
        <AvatarPanel />
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-10 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-60" style={{ background: 'radial-gradient(ellipse 60% 45% at 50% 18%, rgba(124,58,237,0.16), transparent)' }} />
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-[#2b9fff] to-[#7c3aed] flex items-center justify-center shadow-xl mb-2 ring-8 ring-[#efe9ff]">
            <Check className="w-14 h-14 text-white" strokeWidth={3} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#1a1446] mt-4">Felicitaciones, {username}.</h2>
          <p className="text-lg text-[#2b2a6b] leading-relaxed mt-3 max-w-xl">
            Acabas de definir una dirección clara para tu año. Focusia usará esta meta para ayudarte a avanzar con foco.
          </p>
          {focosTop.length > 0 && (
            <div className="flex items-center justify-center gap-0 mt-8 w-full max-w-xl">
              {focosTop.map((f, i) => {
                const Icon = areaIcon(f.nombre);
                return (
                  <React.Fragment key={f.nombre}>
                    {i > 0 && <div className="flex-1 h-0.5 bg-gradient-to-r from-[#c4b5fd] to-[#c4b5fd] mx-1 rounded" />}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <span className="w-16 h-16 rounded-full bg-white border-2 border-[#e5e0ff] shadow-md flex items-center justify-center">
                        <Icon className="w-8 h-8 text-[#2b5cff]" />
                      </span>
                      <span className="text-sm font-extrabold text-[#1a1446]">{f.nombre}</span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
          <button
            onClick={onApproved}
            className="relative mt-8 w-full max-w-xl py-3.5 bg-gradient-to-r from-[#2b5cff] to-[#7c3aed] text-white text-[15px] font-medium rounded-xl hover:brightness-110 active:scale-[0.99] transition-all shadow-lg"
          >
            Volver al dashboard principal
          </button>
        </div>
      </div>
    );
  };

  return (
    <AnualShell
      userName={username}
      avatarImg={avatarSrc}
      title={shellTitle}
      onClose={onClose}
    >
      <div ref={chatRef} className="max-w-[1100px] mx-auto">
        {renderContent()}
      </div>
    </AnualShell>
  );
}
