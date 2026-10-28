import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import AppShell, { MonthlyNavKey } from '../AppShell';
import KanbanPage from './KanbanPage';
import PlanDestinoModal, { Destino } from './PlanDestinoModal';
import AgendaDiariaView from './AgendaDiariaView';
import PlanSemanalView from './PlanSemanalView';
import PlanMensualView from './PlanMensualView';
import PlanAnualView from './PlanAnualView';
import { ConfirmBanner, FloatingToast } from './Notice';
import { AccionKanban, Decision, isoToday, formatLongDate, parseISODate } from './types';

type ViewName = 'kanban' | 'diaria' | 'semanal' | 'mensual' | 'anual';

export type KanbanVistaInicial = ViewName;

const H_TEXT = 'Acción enviada a tu agenda diaria. Puedes fijarla aquí con doble clic o moverla al horario que prefieras.';
const D_TEXT = 'Acción enviada a Acciones por Delegar.';
const E_TEXT = 'Acción enviada a Ideas desechadas.';

export default function KanbanModule({ username, avatarUrl, onNavigate, onClose, vistaInicial }: {
  username?: string;
  avatarUrl?: string;
  onNavigate?: (key: MonthlyNavKey) => void;
  onClose: () => void;
  vistaInicial?: ViewName;
}) {
  const [view, setView] = useState<ViewName>(vistaInicial || 'kanban');
  const [acciones, setAcciones] = useState<AccionKanban[]>([]);
  const [papelera, setPapelera] = useState<AccionKanban[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; actionId: string } | null>(null);
  const [destinoModal, setDestinoModal] = useState<AccionKanban | null>(null);
  const [pickerAction, setPickerAction] = useState<AccionKanban | null>(null);
  const [pickerBanner, setPickerBanner] = useState<{ text: string; actionId: string } | null>(null);
  const [pickerRefresh, setPickerRefresh] = useState(0);
  const [dailyDate, setDailyDate] = useState(isoToday());
  const [dailyFocusId, setDailyFocusId] = useState<string | null>(null);
  const [dailyBanner, setDailyBanner] = useState<{ text: string; actionId: string } | null>(null);
  const [dailyRefresh, setDailyRefresh] = useState(0);

  const refreshAll = useCallback(async () => {
    try {
      const [activeRes, papeleraRes] = await Promise.all([
        api.get('/api/acciones-kanban/'),
        api.get('/api/acciones-kanban/papelera/'),
      ]);
      setAcciones(activeRes.data || []);
      setPapelera(papeleraRes.data || []);
    } catch (err) {
      console.error('Error refreshing kanban:', err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refreshAll();
      setLoading(false);
    })();
  }, [refreshAll]);

  const resetToKanban = () => {
    setView('kanban');
    setDestinoModal(null);
    setPickerAction(null);
    setPickerBanner(null);
    setDailyBanner(null);
    setDailyFocusId(null);
    refreshAll();
  };

  const shellNav = (key: MonthlyNavKey) => {
    if (key === 'kanban') {
      resetToKanban();
      return;
    }
    onNavigate?.(key);
  };

  const addAction = async (texto: string): Promise<boolean> => {
    try {
      const res = await api.post('/api/acciones-kanban/', { texto_accion: texto });
      await refreshAll();
      return !!res.data?.similar_warning;
    } catch (err) {
      console.error('Error adding action:', err);
      return false;
    }
  };

  const classify = async (
    accion: AccionKanban,
    decision: Decision,
    destino?: string,
    fecha?: string,
  ) => {
    const res = await api.patch(`/api/acciones-kanban/${accion.id}/clasificar/`, {
      clasificacion: decision,
      destino_planificacion: destino || null,
      ...(fecha ? { fecha_seleccionada: fecha } : {}),
    });
    await refreshAll();
    return res.data as AccionKanban;
  };

  const deshacer = async (actionId: string) => {
    const res = await api.patch(`/api/acciones-kanban/${actionId}/deshacer/`);
    await refreshAll();
    return res.data as AccionKanban;
  };

  // ── H ──
  const handleClassifyH = async (accion: AccionKanban) => {
    try {
      await classify(accion, 'H');
      setDailyDate(isoToday());
      setDailyFocusId(accion.id);
      setDailyBanner({ text: H_TEXT, actionId: accion.id });
      setView('diaria');
    } catch (err) {
      console.error('Error classifying H:', err);
    }
  };

  // ── D / E ──
  const handleClassifyDE = async (accion: AccionKanban, decision: 'D' | 'E') => {
    try {
      await classify(accion, decision);
      setToast({ msg: decision === 'D' ? D_TEXT : E_TEXT, actionId: accion.id });
    } catch (err) {
      console.error('Error classifying:', err);
    }
  };

  const handleUndoToast = async () => {
    if (!toast) return;
    try {
      await deshacer(toast.actionId);
    } catch (err) {
      console.error('Error deshaciendo:', err);
    } finally {
      setToast(null);
    }
  };

  // ── P: destino → vista de planificación ──
  const chooseDestino = (destino: Destino) => {
    if (!destinoModal) return;
    setPickerAction(destinoModal);
    setPickerBanner(null);
    setDestinoModal(null);
    setView(destino.toLowerCase() as ViewName);
  };

  const bannerForDate = (destino: Destino, iso: string): string => {
    const d = parseISODate(iso);
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    if (destino === 'SEMANAL') return `Acción planificada para el ${formatLongDate(iso)}.`;
    if (destino === 'MENSUAL') return `Acción planificada para el ${d.getDate()} de ${meses[d.getMonth()]}.`;
    return `Acción planificada para el ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}.`;
  };

  const confirmPickerDate = async (destino: Destino, iso: string) => {
    // Modo consulta (sin acción pendiente): pinchar un día baja a la agenda de ese día.
    if (!pickerAction) {
      setDailyDate(iso);
      setDailyFocusId(null);
      setDailyBanner(null);
      setView('diaria');
      return;
    }
    try {
      await classify(pickerAction, 'P', destino, iso);
      setPickerRefresh(r => r + 1);
      setPickerBanner({ text: bannerForDate(destino, iso), actionId: pickerAction.id });
    } catch (err) {
      console.error('Error planning:', err);
    }
  };

  const undoPickerBanner = async () => {
    if (!pickerBanner) return;
    try {
      await deshacer(pickerBanner.actionId);
      setPickerRefresh(r => r + 1);
    } catch (err) {
      console.error('Error deshaciendo:', err);
    } finally {
      setPickerBanner(null);
    }
  };

  const restore = async (id: string) => {
    try {
      await api.patch(`/api/acciones-kanban/${id}/restaurar/`);
      await refreshAll();
    } catch (err) {
      console.error('Error restoring:', err);
    }
  };

  // ── Diaria: fijar / mover ──
  const handlePin = async (accion: AccionKanban, hour: number) => {
    try {
      await api.patch(`/api/acciones-kanban/${accion.id}/fijar/`);
      setDailyRefresh(r => r + 1);
      const hh = String(hour).padStart(2, '0');
      setDailyBanner({ text: `Acción fijada correctamente a las ${hh}:00.`, actionId: accion.id });
    } catch (err) {
      console.error('Error fijando:', err);
    }
  };

  const handleMoveHour = async (accion: AccionKanban, hour: number) => {
    try {
      const hh = `${String(hour).padStart(2, '0')}:00`;
      await api.patch(`/api/acciones-kanban/${accion.id}/`, { hora_seleccionada: hh });
      setDailyRefresh(r => r + 1);
    } catch (err) {
      console.error('Error moviendo:', err);
    }
  };

  const undoDailyBanner = async () => {
    if (!dailyBanner) return;
    try {
      await deshacer(dailyBanner.actionId);
    } catch (err) {
      console.error('Error deshaciendo:', err);
    } finally {
      setDailyBanner(null);
      setDailyFocusId(null);
      resetToKanban();
    }
  };

  const titles: Record<ViewName, { nav: MonthlyNavKey; title: string; subtitle: string }> = {
    kanban: { nav: 'kanban', title: 'KANBAN BACKLOG', subtitle: 'Aterriza tus acciones pendientes y decide qué hacer con cada una.' },
    diaria: { nav: 'diaria', title: 'AGENDA DIARIA', subtitle: 'Organiza tus acciones en bloques de tiempo.' },
    semanal: { nav: 'semanal', title: 'PLANIFICACIÓN SEMANAL', subtitle: 'Organiza tus acciones dentro de la semana.' },
    mensual: { nav: 'mensual', title: 'PLANIFICACIÓN MENSUAL', subtitle: 'Distribuye tus acciones en las fechas más convenientes.' },
    anual: { nav: 'anual', title: 'PLANIFICACIÓN ANUAL', subtitle: 'Visualiza el año y asigna cada acción al momento adecuado.' },
  };
  const meta = titles[view];

  return (
    <AppShell
      activeNav={meta.nav}
      title={meta.title}
      subtitle={meta.subtitle}
      username={username}
      avatarUrl={avatarUrl}
      onNavigate={shellNav}
      onClose={onClose}
    >
      {view === 'kanban' && (
        <KanbanPage
          acciones={acciones}
          papelera={papelera}
          loading={loading}
          onAdd={addAction}
          onClassify={(a, d) => {
            if (d === 'H') handleClassifyH(a);
            else if (d === 'D' || d === 'E') handleClassifyDE(a, d);
          }}
          onPlan={a => setDestinoModal(a)}
          onRestore={restore}
        />
      )}

      {view === 'diaria' && (
        <AgendaDiariaView
          key={dailyRefresh}
          date={dailyDate}
          focusId={dailyFocusId}
          banner={dailyBanner?.text || null}
          onDateChange={iso => { setDailyDate(iso); setDailyBanner(null); }}
          onBack={resetToKanban}
          onUndoBanner={undoDailyBanner}
          onDismissBanner={() => setDailyBanner(null)}
          onPin={handlePin}
          onMoveHour={handleMoveHour}
        />
      )}

      {(view === 'semanal' || view === 'mensual' || view === 'anual') && pickerBanner && (
        <ConfirmBanner
          text={pickerBanner.text}
          onUndo={undoPickerBanner}
          onClose={() => setPickerBanner(null)}
        />
      )}

      {view === 'semanal' && (
        <PlanSemanalView
          highlightActionId={pickerBanner?.actionId || null}
          refreshKey={pickerRefresh}
          onConfirm={iso => confirmPickerDate('SEMANAL', iso)}
          onBack={resetToKanban}
        />
      )}
      {view === 'mensual' && (
        <PlanMensualView
          highlightActionId={pickerBanner?.actionId || null}
          refreshKey={pickerRefresh}
          onConfirm={iso => confirmPickerDate('MENSUAL', iso)}
          onBack={resetToKanban}
        />
      )}
      {view === 'anual' && (
        <PlanAnualView
          highlightActionId={pickerBanner?.actionId || null}
          refreshKey={pickerRefresh}
          onConfirm={iso => confirmPickerDate('ANUAL', iso)}
          onBack={resetToKanban}
        />
      )}

      {destinoModal && (
        <PlanDestinoModal
          accion={destinoModal}
          onPick={chooseDestino}
          onCancel={() => setDestinoModal(null)}
        />
      )}

      {toast && (
        <FloatingToast text={toast.msg} onUndo={handleUndoToast} onClose={() => setToast(null)} />
      )}
    </AppShell>
  );
}
