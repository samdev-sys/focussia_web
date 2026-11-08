import i18n from '../../i18n';
import React, { useState } from 'react';
import { Plus, FileText, Trash2, Info, ChevronDown, RotateCcw } from 'lucide-react';
import { AccionKanban, Decision, LETTER_COLORS } from './types';

interface KanbanPageProps {
  acciones: AccionKanban[];
  papelera: AccionKanban[];
  loading: boolean;
  onAdd: (texto: string) => Promise<boolean>;
  onClassify: (accion: AccionKanban, decision: Decision) => void;
  onPlan: (accion: AccionKanban) => void;
  onRestore: (id: string) => void;
}

const HELP_TEXT = 'H = Hacer ahora. P = Planificar para otro momento. D = Delegar a otra persona. E = Eliminar o desechar.';

function LetterButton({ letter, title, onClick }: { letter: Decision; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{ background: LETTER_COLORS[letter] }}
      className="w-9 h-9 rounded-full text-white text-sm font-black flex items-center justify-center hover:brightness-110 active:scale-95 transition-all shadow"
    >
      {letter}
    </button>
  );
}

export default function KanbanPage({ acciones, papelera, loading, onAdd, onClassify, onPlan, onRestore }: KanbanPageProps) {
  const safeAcciones = Array.isArray(acciones) ? acciones : [];
  const safePapelera = Array.isArray(papelera) ? papelera : [];
  const [texto, setTexto] = useState('');
  const [adding, setAdding] = useState(false);
  const [similarWarning, setSimilarWarning] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleAdd = async () => {
    const t = texto.trim();
    if (!t || adding) return;
    setAdding(true);
    const flagged = await onAdd(t);
    setSimilarWarning(flagged);
    setTexto('');
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="bg-white rounded-md border border-[#e3e8f5] p-3 sm:p-4 flex items-center gap-3">
        <span className="w-11 h-11 rounded-md bg-[#eef3ff] hidden sm:flex items-center justify-center shrink-0">
          <FileText className="w-6 h-6 text-[#1f6feb]" />
        </span>
        <input
          type="text"
          value={texto}
          onChange={e => { setTexto(e.target.value); setSimilarWarning(false); }}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder={i18n.t('escribe_una_accion_tarea_o_pendiente')}
          className="flex-1 min-w-0 text-base text-[#101433] placeholder:text-[#8a93b2] placeholder:italic border border-[#e3e8f5] rounded-xl px-4 py-3 outline-none focus:border-[#1f6feb] focus:ring-2 focus:ring-[#1f6feb]/20"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!texto.trim() || adding}
          className="shrink-0 flex items-center gap-2 px-5 sm:px-7 py-3 rounded-md bg-gradient-to-r from-[#1f6feb] to-[#a21caf] text-white font-black tracking-wide text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <span className="hidden sm:inline">{i18n.t('agregar_accion')}</span>
          <Plus className="w-5 h-5" strokeWidth={3} />
        </button>
      </div>
      {similarWarning && (
        <p className="text-sm text-amber-600 -mt-2">
          Parece que ya tienes una acción similar. Se guardó de todas formas.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pendientes */}
        <div className="lg:col-span-2 bg-white rounded-md border border-[#e3e8f5] overflow-hidden">
          <div className="flex items-center gap-3 px-5 pt-4 pb-3">
            <h2 className="text-xl sm:text-2xl font-bold text-[#101433]">{i18n.t('acciones_pendientes')}</h2>
            <button
              type="button"
              onClick={() => setShowHelp(v => !v)}
              className="ml-auto flex items-center gap-1.5 text-xs font-bold text-[#101433] border border-[#e3e8f5] rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
            >
              <Info className="w-4 h-4" /> Recordar H/P/D/E <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
          {showHelp && (
            <p className="mx-5 mb-2 text-xs text-[#5b6b8c] bg-[#f2f5fc] rounded-lg px-3 py-2">{HELP_TEXT}</p>
          )}
          <div className="px-3 sm:px-4 pb-2">
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-8">{i18n.t('cargando_acciones')}</p>
            ) : safeAcciones.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{i18n.t('sin_acciones_pendientes_escribe_una_arri')}</p>
            ) : (
              safeAcciones.map(a => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 bg-[#f7f9fe] border border-[#eef1f8] rounded-md px-4 py-3 mb-2"
                >
                  <p className="flex-1 min-w-0 text-[#101433] text-base font-medium truncate" title={a.texto_accion}>
                    {a.texto_accion}
                    {a.origen === 'RUEDA_VIDA' && (
                      <span className="ml-2 text-[11px] font-bold text-[#1f6feb] bg-[#e3edff] px-2 py-0.5 rounded-full whitespace-nowrap">
                        Desde Rueda de la Vida
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <LetterButton letter="H" title={i18n.t('hacer')} onClick={() => onClassify(a, 'H')} />
                    <LetterButton letter="P" title={i18n.t('planificar')} onClick={() => onPlan(a)} />
                    <LetterButton letter="D" title={i18n.t('delegar')} onClick={() => onClassify(a, 'D')} />
                    <LetterButton letter="E" title={i18n.t('eliminar_fbf2')} onClick={() => onClassify(a, 'E')} />
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex items-center gap-2 px-5 py-3 text-[11px] text-[#8a93b2] border-t border-[#eef1f8] flex-wrap">
            <Trash2 className="w-3.5 h-3.5" />
            <span>{i18n.t('ideas_desechadas')}</span>
            <span className="mx-1">·</span>
            <span>Atajos: <b>{i18n.t('h_agge')}</b> Hacer <b className="ml-1">{i18n.t('p')}</b> Planificar <b className="ml-1">{i18n.t('d')}</b> Delegar <b className="ml-1">{i18n.t('e')}</b> Eliminar</span>
          </div>
        </div>

        {/* Ideas desechadas */}
        <div className="bg-white rounded-md border border-[#e3e8f5] p-5">
          <div className="flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-[#101433]" />
            <h2 className="text-xl font-bold text-[#101433]">{i18n.t('ideas_desechadas_9ztt')}</h2>
          </div>
          <p className="text-sm text-[#5b6b8c] mt-1">{i18n.t('puedes_recuperar_estas_acciones_cuando_l')}</p>
          <div className="w-10 h-1 rounded-full bg-gradient-to-r from-[#1f6feb] to-[#a21caf] mt-2 mb-4" />
          <div className="space-y-3">
            {safePapelera.length === 0 && (
              <p className="text-sm text-gray-400">{i18n.t('sin_ideas_desechadas')}</p>
            )}
            {safePapelera.map(a => (
              <div key={a.id} className="border border-[#e3e8f5] rounded-md p-4">
                <p className="text-[#101433] font-bold text-base">{a.texto_accion}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="w-8 h-8 rounded-full bg-black text-white text-sm font-black flex items-center justify-center">{i18n.t('e')}</span>
                  <span className="text-xs font-bold text-[#5b6b8c] bg-gray-100 px-2.5 py-1 rounded-full">{i18n.t('desechada')}</span>
                  <button
                    type="button"
                    onClick={() => onRestore(a.id)}
                    className="ml-auto flex items-center gap-1.5 text-xs font-black text-[#4f46e5] border-2 border-[#4f46e5] rounded-lg px-3 py-1.5 hover:bg-[#eef2ff] transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> RECUPERAR
                  </button>
                </div>
                <p className="text-xs text-[#8a93b2] mt-2">{i18n.t('esta_accion_no_se_ha_eliminado_permanent')}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
