import { useState, useRef, useEffect } from 'react';
import { X, ChevronRight, Check, AlertCircle, HelpCircle, ArrowRight } from 'lucide-react';
import { matrizEisenhowerService } from '../services/api';

interface MatrizEisenhowerProps {
  onClose: () => void;
  onGoKanban: () => void;
}

type Paso = 1 | 2 | 3 | 4;

const CUADRANTES = [
  { id: 'hacer', label: 'HACER', sub: 'Urgente e Importante', color: 'bg-red-500', hover: 'bg-red-600', text: 'text-red-50', desc: 'Tareas críticas que requieren acción inmediata. Son tus prioridades absolutas del día.', fila: 0, col: 0 },
  { id: 'planificar', label: 'PLANIFICAR', sub: 'No Urgente pero Importante', color: 'bg-blue-500', hover: 'bg-blue-600', text: 'text-blue-50', desc: 'Actividades estratégicas que definen tu crecimiento a medio y largo plazo. Programa un tiempo para ellas.', fila: 0, col: 1 },
  { id: 'delegar', label: 'DELEGAR', sub: 'Urgente pero No Importante', color: 'bg-amber-500', hover: 'bg-amber-600', text: 'text-amber-50', desc: 'Interrupciones que otros pueden resolver. Pregúntate: ¿realmente necesitas hacerlo tú?', fila: 1, col: 0 },
  { id: 'eliminar', label: 'ELIMINAR', sub: 'No Urgente y No Importante', color: 'bg-gray-400', hover: 'bg-gray-500', text: 'text-gray-50', desc: 'Distracciones que consumen tiempo sin aportar valor. Elimínalas o redúcelas al mínimo.', fila: 1, col: 1 },
];

const EJEMPLOS_TRIVIA = [
  { tarea: 'Entregar informe urgente que vence hoy', correcto: 'hacer' },
  { tarea: 'Planificar curso de capacitación para el próximo mes', correcto: 'planificar' },
  { tarea: 'Responder correo masivo sin prioridad', correcto: 'delegar' },
  { tarea: 'Revisar redes sociales durante el horario laboral', correcto: 'eliminar' },
];

export default function MatrizEisenhower({ onClose, onGoKanban }: MatrizEisenhowerProps) {
  const [paso, setPaso] = useState<Paso>(1);
  const [videoEnded, setVideoEnded] = useState(false);
  const [popover, setPopover] = useState<string | null>(null);
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});
  const [enviado, setEnviado] = useState(false);
  const [errores, setErrores] = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    matrizEisenhowerService.getProgress().catch(() => {});
  }, []);

  const handleVideoEnd = () => {
    setVideoEnded(true);
  };

  const marcarVideoVisto = async () => {
    try {
      await matrizEisenhowerService.updateProgress({ video_watched: true });
    } catch {}
  };

  const irPaso2 = () => {
    marcarVideoVisto();
    setPaso(2);
  };

  const handleClasificar = (idx: number, cuadrante: string) => {
    setRespuestas(prev => ({ ...prev, [idx]: cuadrante }));
  };

  const handleEnviarTrivia = async () => {
    const nuevosErrores: Record<number, string> = {};
    EJEMPLOS_TRIVIA.forEach((ej, idx) => {
      const r = respuestas[idx];
      if (!r) {
        nuevosErrores[idx] = 'No seleccionaste ninguna opción.';
      } else if (r !== ej.correcto) {
        nuevosErrores[idx] = `Clasificaste como "${r}" pero es "${ej.correcto}". ${ej.tarea}`;
      }
    });
    setErrores(nuevosErrores);
    setEnviado(true);
    if (Object.keys(nuevosErrores).length === 0) {
      await completar();
    }
  };

  const completar = async () => {
    setCargando(true);
    try {
      await matrizEisenhowerService.updateProgress({
        status: 'COMPLETADO',
        completed_at: new Date().toISOString(),
      });
    } catch {}
    setCargando(false);
    setPaso(4);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-[#f8fafc] rounded-md shadow-2xl border border-white/50 w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 flex items-center justify-between p-4 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1e3a5f] rounded-md flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Aprende la Matriz Eisenhower</h2>
          </div>
          {paso < 4 && (
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        <div className="p-6">
          {paso === 1 && (
            <div className="space-y-6">
              <p className="text-xl font-bold text-gray-800 text-center">
                ¿Sabes distinguir lo urgente de lo importante?
              </p>
              <div className="bg-gradient-to-br from-[#1a0a2e] via-[#16213e] to-[#0f3460] rounded-md p-6 text-center">
                <p className="text-white/80 text-sm leading-relaxed mb-4">
                  Hola, soy tu asistente de productividad. La Matriz Eisenhower es una herramienta 
                  creada por el presidente Dwight D. Eisenhower para priorizar tareas según su 
                  urgencia e importancia. En los próximos minutos aprenderás a usarla para 
                  organizar tu día y enfocarte en lo que realmente importa.
                </p>
              </div>
              <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-2 font-semibold">Video explicativo (45s)</p>
                <div className="aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoRef}
                    className="w-full h-full"
                    src="https://cdn.pixabay.com/video/2015/11/09/24-129028718_large.mp4"
                    onEnded={handleVideoEnd}
                    controls
                  />
                </div>
              </div>
              <button
                onClick={irPaso2}
                disabled={!videoEnded}
                className={`w-full py-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  videoEnded
                    ? 'bg-[#1e3a5f] text-white hover:bg-[#2d4a6f]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {paso === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 text-center">
                Toca cada cuadrante para conocer su significado
              </p>
              <div className="grid grid-cols-2 gap-3">
                {CUADRANTES.map(c => (
                  <div key={c.id} className="relative">
                    <button
                      onClick={() => setPopover(popover === c.id ? null : c.id)}
                      className={`w-full p-6 ${c.color} ${c.hover} rounded-md text-white font-bold text-sm transition-all min-h-[100px] flex flex-col items-center justify-center gap-1`}
                    >
                      <span className="text-lg">{c.label}</span>
                      <span className="text-[10px] opacity-80">{c.sub}</span>
                    </button>
                    {popover === c.id && (
                      <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-md p-3 shadow-xl text-xs text-gray-700 animate-in fade-in">
                        {c.desc}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setPaso(3)}
                className="w-full py-3 bg-[#1e3a5f] text-white rounded-md font-bold text-sm hover:bg-[#2d4a6f] transition-all flex items-center justify-center gap-2"
              >
                Entendido, vamos a practicar <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {paso === 3 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">
                Clasifica cada tarea en el cuadrante correcto:
              </p>
              {EJEMPLOS_TRIVIA.map((ej, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-md p-4">
                  <p className="text-sm font-semibold text-gray-800 mb-3">{ej.tarea}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CUADRANTES.map(c => {
                      const sel = respuestas[idx] === c.id;
                      const err = enviado && errores[idx]?.includes(c.id);
                      const ok = enviado && !errores[idx] && respuestas[idx] === c.id;
                      let borderColor = 'border-gray-200 hover:border-gray-400';
                      if (sel && !enviado) borderColor = 'border-[#1e3a5f]';
                      if (err) borderColor = 'border-red-400 bg-red-50';
                      if (ok) borderColor = 'border-green-400 bg-green-50';
                      return (
                        <button
                          key={c.id}
                          onClick={() => handleClasificar(idx, c.id)}
                          disabled={enviado}
                          className={`p-2 rounded-md border-2 text-xs font-semibold ${borderColor} transition-all disabled:opacity-70 ${sel ? 'bg-gray-50' : ''}`}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                  {enviado && errores[idx] && (
                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errores[idx]}
                    </p>
                  )}
                  {enviado && !errores[idx] && (
                    <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Correcto
                    </p>
                  )}
                </div>
              ))}

              {!enviado && (
                <button
                  onClick={handleEnviarTrivia}
                  disabled={Object.keys(respuestas).length < 4}
                  className={`w-full py-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    Object.keys(respuestas).length < 4
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-[#1e3a5f] text-white hover:bg-[#2d4a6f]'
                  }`}
                >
                  Revisar respuestas
                </button>
              )}

              {enviado && Object.keys(errores).length > 0 && (
                <button
                  onClick={() => { setEnviado(false); setErrores({}); }}
                  className="w-full py-3 bg-amber-500 text-white rounded-md font-bold text-sm hover:bg-amber-600 transition-all"
                >
                  Intentar de nuevo
                </button>
              )}

              {enviado && Object.keys(errores).length === 0 && (
                <button
                  onClick={completar}
                  disabled={cargando}
                  className="w-full py-3 bg-green-600 text-white rounded-md font-bold text-sm hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                >
                  {cargando ? 'Completando...' : 'Continuar'}
                </button>
              )}
            </div>
          )}

          {paso === 4 && (
            <div className="text-center space-y-6 py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">¡Excelente trabajo!</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Ahora sabes distinguir lo urgente de lo importante. 
                Aplica este conocimiento organizando tus tareas reales en el tablero Kanban.
              </p>
              <button
                onClick={onGoKanban}
                className="px-8 py-3 bg-[#1e3a5f] text-white rounded-md font-bold text-sm hover:bg-[#2d4a6f] transition-all inline-flex items-center gap-2"
              >
                Continuar con mi planificación
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
