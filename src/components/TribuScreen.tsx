import React, { useState, useEffect } from 'react';
import {
  Home, CircleDot, LayoutGrid, Calendar, CalendarDays, Kanban,
  CalendarRange, CalendarCheck, Users, Target, Clock, Pill, Cake,
  UserCheck, MessageSquare, Heart, Smile, GraduationCap, MoreHorizontal,
  ChevronDown, ChevronLeft, BookOpen, Pencil, Send, Star, Lightbulb,
  Check, HeartHandshake, Baby, Briefcase, UsersRound, Trophy, HandHeart, Plus,
} from 'lucide-react';
import { NAV_ICONS } from './navIcons';
import { ModuleHeader } from './ModuleHeader';
import {
  tribuService, motivationalService,
  TribuTemaData, TribuCompromisoData,
} from '../services/api';

const NAV_ITEMS = [
  { icon: Home, label: 'Inicio', section: 'inicio' },
  { icon: CircleDot, label: 'Rueda', section: 'rueda' },
  { icon: Calendar, label: 'Anual', section: 'anual' },
  { icon: CalendarDays, label: 'Mensual', section: 'mensual' },
  { icon: LayoutGrid, label: 'Matriz', section: 'matriz' },
  { icon: Kanban, label: 'Kanban', section: 'kanban' },
  { icon: CalendarRange, label: 'Semanal', section: 'semanal' },
  { icon: CalendarCheck, label: 'Diaria', section: 'diaria' },
  { icon: NAV_ICONS.delegar, label: 'Delegar', section: 'delegar' },
  { icon: Target, label: 'Misión', section: 'mision' },
  { icon: Clock, label: 'Fechas', section: 'fechas' },
  { icon: Pill, label: 'Suplementos', section: 'suplementos' },
  { icon: Cake, label: 'Cumpleaños', section: 'cumple' },
  { icon: UserCheck, label: 'Tribu', section: 'tribu' },
  { icon: Heart, label: 'Gratitud', section: 'gratitud' },
  { icon: Smile, label: 'Focus', section: 'focus' },
  { icon: GraduationCap, label: 'Cursos', section: 'cursos' },
  { icon: MessageSquare, label: 'Coaching', section: 'coaching' },
];

const TRIBUS: { key: string; label: string; Icon: React.ComponentType<{ className?: string }>; tint: string; icon: string }[] = [
  { key: 'FAMILIA', label: 'Familia', Icon: Heart, tint: 'bg-pink-50', icon: 'text-pink-500' },
  { key: 'PAREJA', label: 'Pareja', Icon: HeartHandshake, tint: 'bg-rose-50', icon: 'text-rose-500' },
  { key: 'HIJOS', label: 'Hijos', Icon: Baby, tint: 'bg-orange-50', icon: 'text-orange-500' },
  { key: 'AMIGOS', label: 'Amigos', Icon: Users, tint: 'bg-blue-50', icon: 'text-blue-500' },
  { key: 'TRABAJO', label: 'Trabajo', Icon: ({ className }: { className?: string }) => <img src="./bag.png" alt="kanban" className={className} /> , tint: 'bg-indigo-50', icon: 'text-indigo-500' },
  { key: 'COMUNIDAD', label: 'Comunidad', Icon: UsersRound, tint: 'bg-green-50', icon: 'text-green-600' },
  { key: 'CLUB_DEPORTE', label: 'Club / Deporte', Icon: Trophy, tint: 'bg-sky-50', icon: 'text-sky-500' },
  { key: 'JUNTA_EDUCATIVA', label: 'Junta educativa', Icon: ({ className }: { className?: string }) => <img src="./college.png" alt="kanban" className={className} /> , tint: 'bg-indigo-50', icon: 'text-indigo-500' },
  { key: 'VOLUNTARIADO', label: 'Voluntariado', Icon: HandHeart, tint: 'bg-orange-50', icon: 'text-orange-600' },
  { key: 'OTRO', label: 'Otro', Icon: Plus, tint: 'bg-purple-50 border border-dashed border-purple-300', icon: 'text-purple-500' },
];

const TRIBU_LABEL: Record<string, string> = {
  FAMILIA: 'mi familia', PAREJA: 'mi pareja', HIJOS: 'mis hijos',
  AMIGOS: 'mis amigos', TRABAJO: 'mi trabajo', COMUNIDAD: 'mi comunidad',
  CLUB_DEPORTE: 'mi club', JUNTA_EDUCATIVA: 'mi junta educativa',
  VOLUNTARIADO: 'mi voluntariado',
};

const EJEMPLO_DEFAULT = 'Compartir con mi familia una idea sobre cómo proteger mejor mi tiempo.';

export default function TribuScreen({ onBack, userName, onNavigate }: { onBack: () => void; userName?: string; onNavigate?: (section: string) => void }) {
  const [tema, setTema] = useState<TribuTemaData | null>(null);
  const [texto, setTexto] = useState('');
  const [tribu, setTribu] = useState('');
  const [tribuDetalle, setTribuDetalle] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [frase, setFrase] = useState('');

  useEffect(() => {
    tribuService.temaActual().then(setTema).catch(() => {});
    tribuService.compromiso().then(c => {
      setTexto(c.texto || '');
      setTribu(c.tribu || '');
      setTribuDetalle(c.tribu_detalle || '');
      setEnviado(c.enviado_kanban);
    }).catch(() => {});
    motivationalService.getToday().then(d => setFrase(d.phrase || '')).catch(() => {});
  }, []);

  const guardar = async (patch: Partial<Pick<TribuCompromisoData, 'texto' | 'tribu' | 'tribu_detalle'>>) => {
    setSaving(true);
    try {
      const c = await tribuService.guardar(patch);
      setTexto(c.texto || '');
      setTribu(c.tribu || '');
      setTribuDetalle(c.tribu_detalle || '');
      setEnviado(c.enviado_kanban);
    } catch {}
    setSaving(false);
  };

  const elegirTribu = (key: string) => {
    setTribu(key);
    guardar({ texto, tribu: key, tribu_detalle: tribuDetalle });
  };

  const handleEnviar = async () => {
    if (!texto.trim() || sending) return;
    setSending(true);
    try {
      await tribuService.enviarKanban({ texto: texto.trim(), tribu, tribu_detalle: tribuDetalle.trim() });
      setEnviado(true);
      setSentMsg(true);
      setTimeout(() => setSentMsg(false), 4000);
    } catch {}
    setSending(false);
  };

  const conQuien = tribu === 'OTRO'
    ? (tribuDetalle.trim() || 'tu tribu')
    : (TRIBU_LABEL[tribu] || 'tu tribu');
  const ejemplo = texto.trim()
    ? `Compartir con ${conQuien} ${texto.trim()}`
    : EJEMPLO_DEFAULT;

  return (
    <div className="flex h-full overflow-hidden text-slate-800 dark:text-gray-100 bg-[#F8F9FB] dark:bg-[#0A0A26]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0A0A26] h-full hidden md:flex flex-col z-20 shrink-0">
        <div className="h-16 flex items-center px-6 pt-4 pb-2">
          <div className="flex items-center gap-3 text-white">
           <img src="./focussia.png" alt="" className='w-8 h-8' />
            <span className="text-xl font-bold tracking-wide">Focusia</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item, i) => (
            <button
              key={i}
              onClick={() => { if (item.section !== 'tribu') { if (onNavigate) onNavigate(item.section); else onBack(); } }}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors w-full text-left ${
                item.section === 'tribu'
                  ? 'text-white bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5 text-center shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
          <button className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors w-full text-left text-white/60 hover:text-white hover:bg-white/5">
            <MoreHorizontal className="w-5 h-5 text-center shrink-0" />
            <span className="truncate">Más</span>
          </button>
        </nav>
        <div className="p-4">
          <button onClick={onBack} className="flex items-center w-full p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold">
              {userName?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="ml-3 text-left flex-1">
              <p className="text-sm font-semibold text-white">{userName || 'Usuario'}</p>
              <p className="text-xs text-white/50">Ver perfil</p>
            </div>
            <ChevronDown className="w-4 h-4 text-white/50" />
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8F9FB] dark:bg-[#0A0A26] md:rounded-tl-[2rem] md:border-l border-gray-200 dark:border-white/10">
        <ModuleHeader icon={Users} title="Tribu" subtitle="Comparte tu aprendizaje y multiplica tu impacto" onBack={onBack} userName={userName} />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1200px] mx-auto flex flex-col xl:flex-row gap-6">
            <div className="flex-1 flex flex-col gap-5 min-w-0">
              {/* Hero */}
              <section className="bg-gray-100/70 dark:bg-white/5 rounded-xl p-4 md:p-5 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                  <div className="flex flex-col justify-center px-4 py-2">
                    <p className="text-[11px] font-bold tracking-widest text-indigo-600 dark:text-indigo-300 flex items-center gap-2">
                      <Users className="w-4 h-4" /> TEMA DE LA SEMANA
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mt-2">
                      {tema?.titulo || 'Gestión del Tiempo'}
                    </h2>
                    <div className="w-16 h-0.5 bg-indigo-500 my-4" />
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {tema?.descripcion || 'El tiempo es el recurso más valioso.'}
                    </p>
                  </div>
                  <div className="relative rounded-xl overflow-hidden min-h-[200px] md:min-h-[200px] bg-gradient-to-br from-indigo-200 via-purple-100 to-blue-100 dark:from-indigo-900 dark:via-purple-900 dark:to-blue-900">
                     <img src={tema?.imagen_resuelta || './tribu.png'} alt='tribu' className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                </div>
              </section>

              {/* Tres tarjetas */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#F6F4FF] dark:bg-[#1a1440] rounded-2xl p-5 border border-purple-100 dark:border-white/10">
                  <p className="text-[11px] font-bold tracking-wider text-indigo-600 dark:text-indigo-300 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-[#6000FA80] text-white flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    REFLEXIÓN DE LA SEMANA
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mt-2 whitespace-pre-line">
                    {tema?.reflexion || 'Administrar bien el tiempo no significa hacer más, sino elegir lo que realmente importa y compartirlo con quienes nos rodean.'}
                  </p>
                </div>
                <div className="bg-[#F6F4FF] dark:bg-[#1a1440] rounded-2xl p-5 border border-purple-100 dark:border-white/10">
                  <p className="text-[11px] font-bold tracking-wider text-indigo-600 dark:text-indigo-300 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-[#6236FF] text-white flex items-center justify-center text-sm font-bold">?</span>
                    PREGUNTA DE LA SEMANA
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug mt-3">
                    {tema?.pregunta || '¿Qué harás esta semana para compartir con tu tribu una forma más consciente de administrar el tiempo?'}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#14142e] rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm">
                  <p className="text-[11px] font-bold tracking-wider text-indigo-600 dark:text-indigo-300 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-[#6236FF] text-white flex items-center justify-center">
                      <Pencil className="w-4 h-4" />
                    </span>
                    MI COMPROMISO
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Escribe la idea que compartirás esta semana.</p>
                  <div className="relative mt-2">
                    <textarea
                      maxLength={600}
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      onBlur={() => guardar({ texto })}
                      placeholder="Escribe aquí la idea que compartirás..."
                      className="w-full h-28 p-3 bg-white dark:bg-[#0A0A26] text-slate-800 dark:text-gray-100 border border-gray-200 dark:border-white/15 rounded-xl resize-none focus:ring-2 focus:ring-[#6236FF] focus:outline-none text-xs placeholder-gray-400"
                    />
                    <span className="absolute bottom-2 right-3 text-[10px] text-gray-400">{texto.length}/600</span>
                  </div>
                  {saving && <p className="text-[10px] text-gray-400 mt-1">Guardando...</p>}
                </div>
              </section>

              {/* Tribus */}
              <section className="bg-white dark:bg-[#14142e] rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm">
                <p className="text-[11px] font-bold tracking-wider text-indigo-600 dark:text-indigo-300">¿CON QUIÉN LO COMPARTIRÁS?</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Elige tu tribu con la que compartirás tu aprendizaje.</p>
                <div className="flex flex-col lg:flex-row gap-4 mt-3">
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 flex-1">
                    {TRIBUS.map(t => (
                      <button
                        key={t.key}
                        onClick={() => elegirTribu(t.key)}
                        className={`rounded-xl border-2 py-3 px-1 flex flex-col items-center gap-1 transition-all ${
                          tribu === t.key
                            ? 'border-[#6236FF] bg-purple-50 dark:bg-white/10 shadow-sm'
                            : 'border-gray-100 dark:border-white/10 bg-white dark:bg-transparent hover:border-gray-200'
                        }`}
                      >
                        <span className={`w-10 h-10 rounded-full ${t.tint} flex items-center justify-center`}>
                          <t.Icon className={`w-5 h-5 ${t.icon}`} />
                        </span>
                        <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-200 text-center leading-tight">{t.label}</span>
                        {tribu === t.key && <Check className="w-3.5 h-3.5 text-white bg-[#6236FF] rounded-full p-0.5" />}
                      </button>
                    ))}
                  </div>
                  <div className="lg:w-56 shrink-0 bg-gray-50 dark:bg-white/5 rounded-xl p-3 border border-gray-100 dark:border-white/10">
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Especifica tu tribu</p>
                    <input
                      value={tribuDetalle}
                      onChange={(e) => setTribuDetalle(e.target.value)}
                      onBlur={() => guardar({ tribu_detalle: tribuDetalle })}
                      placeholder="Escribe aquí..."
                      className="mt-2 w-full text-xs bg-white dark:bg-[#0A0A26] text-slate-800 dark:text-gray-100 border border-gray-200 dark:border-white/15 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6236FF] placeholder-gray-400"
                    />
                  </div>
                </div>
                <button
                  onClick={handleEnviar}
                  disabled={!texto.trim() || sending}
                  className="mt-4 w-full lg:w-[420px] mx-auto flex items-center justify-center gap-3 py-3.5 rounded-xl text-white font-bold text-base shadow-lg transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #2b1a8f, #7C10D4)' }}
                >
                  <Send className="w-5 h-5" />
                  <span className="text-left leading-tight">
                    {sentMsg ? '¡Enviado a tu Kanban Backlog!' : 'Agregar al Kanban'}
                    {!sentMsg && <span className="block text-[11px] font-normal text-white/70">Focusia convertirá tu intención en una acción</span>}
                  </span>
                </button>
                {enviado && !sentMsg && (
                  <p className="text-center text-[11px] text-green-600 dark:text-green-400 mt-2">Ya enviaste tu compromiso de esta semana al Kanban.</p>
                )}
              </section>

              {/* Cómo funciona */}
              <section className="bg-white dark:bg-[#14142e] rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm">
                <p className="text-[11px] font-bold tracking-wider text-indigo-600 dark:text-indigo-300 mb-3">ASÍ FUNCIONA TRIBU</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { n: '1', t: 'Reflexiono', d: 'Recibes una pregunta semanal desde Focusia para inspirarte.', Icon: Lightbulb },
                    { n: '2', t: 'Comparto con mi tribu', d: 'Escribes qué compartirás y eliges con quién lo harás.', Icon: Users },
                    { n: '3', t: 'Focusia crea la acción', d: 'Se genera automáticamente en tu Kanban Backlog para que la lleves a cabo.', Icon: ({ className }: { className?: string }) => <img src="./task-1.png" alt="kanban" className={className} /> },
                    { n: '4', t: 'Kanban Backlog', d: 'Tu acción aparece en el Kanban para que puedas planificarla y cumplirla.', Icon: ({ className }: { className?: string }) => <img src="./kanban-1.png" alt="kanban" className={className} />  },
                  ].map(s => (
                    <div key={s.n} className="flex items-start gap-2">
                      <span className="w-9 h-9 rounded-full bg-purple-100 dark:bg-white/10 text-[#6236FF] dark:text-purple-300 flex items-center justify-center shrink-0">
                        <s.Icon className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-gray-100">{s.n}. {s.t}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug mt-0.5">{s.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Riel derecho */}
            <aside className="w-full xl:w-[200px] shrink-0 flex flex-col gap-4">
              <div className="bg-white dark:bg-[#14142e] rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm">
                <p className="text-[11px] font-bold tracking-wider text-indigo-600 dark:text-indigo-300 flex items-center gap-2">
                  <Users className="w-4 h-4" /> ¿CÓMO FUNCIONA TRIBU?
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mt-2">
                  Reflexionas sobre un tema, escribes tu idea y eliges con quién compartirla.
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mt-2">
                  Focusia convierte tu intención en una acción concreta en tu Kanban Backlog.
                </p>
              </div>
              <div className="bg-white dark:bg-[#14142e] rounded-xl p-5 border border-gray-100 dark:border-white/10 shadow-sm">
              
               
                 <span><img src="./check.png" alt="Check" className='w-6 h-6' /> <p className="text-[11px] font-bold tracking-wider text-indigo-600 dark:text-indigo-300">¿QUÉ OCURRE CUANDO AGREGAS AL KANBAN?</p></span>
               
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mt-2">
                  Se crea automáticamente una acción con tu idea para que no quede solo en tu mente, sino que se convierta en un paso real.
                </p>
              </div>
              <div className="bg-[#F6F4FF] dark:bg-[#1a1440] rounded-2xl p-5 border border-purple-100 dark:border-white/10">
                <p className="text-[11px] font-bold tracking-wider text-indigo-600 dark:text-indigo-300">EJEMPLO DE ACCIÓN GENERADA</p>
                <p className="text-xs text-gray-700 dark:text-gray-200 italic leading-relaxed mt-2">“{ejemplo}”</p>
              </div>
              <div className="bg-white dark:bg-[#14142e] rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm">
                <p className="text-[11px] font-bold tracking-wider text-indigo-600 dark:text-indigo-300 flex items-center gap-2">
                  <Star className="w-4 h-4" /> FRASE PARA HOY
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mt-2">
                  {frase || 'Lo que compartes hoy, puede transformar el mañana de alguien.'}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">— Desconocido</p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
