import i18n from './i18n';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUiStore } from './stores/uiStore';
import { useNotificationStore } from './stores/notificationStore';
import { createPortal } from 'react-dom';
import {
  workspaceService, invitationService, delegationService, authService, notificationService, kanbanService, recordatorioService, ruedaService, timeBlockService, objetivoSemanaService, keepNotaService, misionHoyService, matrixService, configuracionService, agentService, motivationalService,
  InvitationData, DelegationData, NotificationData, WorkspaceData, WorkspaceMemberData, RuedaCategoria, ResumenRuedaDashboard, TimeBlockData, ObjetivoSemanaData, KeepNotaData, MisionHoyData, RecordatorioData, MatrixItemData, KanbanTaskData, api, monthlyService, progresoService, ProgresoData, granMetaAnualService, FocusiaReportData, DailyPhraseData, reportService,
  horaOroService, HoraOroDia
} from './services/api';
import { AVATAR_FILES } from './constants/avatars';


import { KanbanBoard } from './components/KanbanBoard';
import { KanbanBacklog } from './components/KanbanBacklog';
import FocusiaTourLauncher from './components/FocusiaTour';
import { NotificationToast } from './components/NotificationToast';
import { FormularioRueda } from './components/FormularioRueda';
import DiagnosticoRueda from './components/DiagnosticoRueda';
import MatrizEisenhower from './components/MatrizEisenhower';
import { useReminderToasts } from './hooks/useReminderToasts';
import { ActionButton } from './components/ActionButton';
import CyberButton from './components/CyberButton';
import CyberToggle from './components/CyberToggle';
import CyberProgressBar from './components/CyberProgressBar';
import AvatarGreeting from './components/AvatarGreeting';
import WeeklyMissionWidget from './components/WeeklyMissionWidget';
import FocusIAFeedback from './components/FocusIAFeedback';


import { MetaAnualForm } from './components/MetaAnualForm';
import { GranMetaAnualModal } from './components/GranMetaAnualModal';
import MonthlyWizard from './components/MonthlyWizard';
import AgendaDiaria from './components/AgendaDiaria';
import TimeBlockingCard from './components/TimeBlockingCard';
import MonthlyCalendar from './components/MonthlyCalendar';
import KanbanModule, { KanbanVistaInicial } from './components/kanban/KanbanModule';
import DelegarModule from './components/DelegarModule';
import FloatingAssistant from './components/FloatingAssistant';
import HelpChat from './components/HelpChat';
import { PlanificarModal } from './components/PlanificarModal';

import { MicroFlujoAjuste } from './components/MicroFlujoAjuste';
import { ConfiguracionPanel } from './components/ConfiguracionPanel';
import ConfiguracionModule from './components/ConfiguracionModule';
import type { Screen as ConfigScreen } from './components/ConfiguracionModule';
import RedesSocialesScreen from './components/RedesSocialesScreen';
import CuentasScreen from './components/CuentasScreen';
import HoraDeOroScreen from './components/HoraDeOroScreen';
import SuplementosScreen from './components/SuplementosScreen';
import GratitudScreen from './components/GratitudScreen';
import CumpleanosScreen from './components/CumpleanosScreen';
import EditGoalWarningModal from './components/EditGoalWarningModal';
import { ReportsListScreen } from './components/ReportsListScreen';
import { ReportDetailScreen } from './components/ReportDetailScreen';
import { ReportNotificationBanner } from './components/ReportNotificationBanner';
import CoachingScreen from './components/CoachingScreen';
import TribuScreen from './components/TribuScreen';
import CursosScreen from './components/CursosScreen';
import AnnualModuleView from './components/AnnualModuleView';

import AgentSettings from './components/AgentSettings';
import FocusModeScreen, { type FocusConfig, type FocusHerramienta } from './components/FocusModeScreen';
import FocusWidget, {
  type FocusSesionLocal, type FocusFinData, type FocusHerramientaSesion,
  guardarSesionLocal, leerSesionLocal, guardarMinimizadoLocal, leerMinimizadoLocal,
} from './components/FocusWidget';
import { FocusModales } from './components/FocusWidget';
import { focusService } from './services/api';

import {   X, LogOut, User, Plus, ArrowRight, Calendar, Edit3, CheckCircle2, Play, ChevronRight, Target, TrendingUp, CalendarDays, CheckCircle, CreditCard, Landmark, Receipt, AlertCircle, CheckSquare, Pill, Clock, Edit, Check, Zap, Trophy, Star, Shield, Flame, Users, Settings, Mail, Copy, Crown, ShieldCheck, UserPlus, Trash2, Send, Briefcase, Bell, MessageSquare, Sparkles, RefreshCw, Lightbulb, RotateCcw, LayoutGrid, Upload, BarChart3, Bot, Loader2, CircleHelp, Info } from 'lucide-react';


interface DashboardProps {
  onLogout: () => void;
  onBackToHub?: () => void;
  onShowOnboarding?: () => void;
}
interface FechasImportantesProps {
  dayActive?: number;
  recordatorios?: RecordatorioData[];
  onDayClick?: (dia: number) => void;
  onAddRecordatorio?: (dia: number) => void;
  onEditRecordatorio?: (r: RecordatorioData) => void;
  onDeleteRecordatorio?: (id: string | number) => void;
}
interface XPStats {
  totalXP: number;
  level: number;
  streak: number;
  lastActiveDate: string;
  todayXP: number;
  tasksCompleted: number;
  kanbanCompleted: number;
  ruedaCompleted: number;
  medicationsTaken: number;
  unlockedBadges: string[];
}

const XP_CONFIG = {
  DAILY_GOAL: 10,
  WEEKLY_GOAL: 50,
  MONTHLY_GOAL: 200,
  COMPLETE_TASK: 15,
  COMPLETE_KANBAN: 20,
  TIME_BLOCK_FINISH: 25,
  MEDICATION_TAKEN: 5,
  RUEDA_COMPLETE: 50,
  STREAK_BONUS: 10,
};

const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800,
  4700, 5700, 6800, 8000, 9300, 10700, 12200, 13800, 15500, 17300,
  19200, 21200, 23300, 25500, 27800, 30200, 32700, 35300, 38000, 40800,
  43700, 46700, 49800, 53000, 56300, 59700, 63200, 66800, 70500, 74300
];

const BADGES = [
  { id: 'first_task', name: 'Primer Paso', desc: 'Completa tu primera tarea', icon: Star, xpRequired: 50, condition: (stats: any) => stats.tasksCompleted >= 1 },
  { id: 'streak_3', name: 'Racha x3', desc: '3 días consecutivos', icon: Flame, xpRequired: 100, condition: (stats: any) => stats.streak >= 3 },
  { id: 'level_5', name: 'Nivel 5', desc: 'Alcanza el nivel 5', icon: Shield, xpRequired: 500, condition: (_: any, level: number) => level >= 5 },
  { id: 'kanban_master', name: 'Maestro Kanban', desc: 'Completa 20 tareas Kanban', icon: Trophy, xpRequired: 1000, condition: (stats: any) => stats.kanbanCompleted >= 20 },
  { id: 'streak_7', name: 'Semana Perfecta', desc: '7 días consecutivos', icon: Zap, xpRequired: 500, condition: (stats: any) => stats.streak >= 7 },
  { id: 'rueda_complete', name: 'Rueda Completa', desc: 'Completa tu Rueda de la Vida', icon: Target, xpRequired: 300, condition: (stats: any) => stats.ruedaCompleted >= 1 },
];

const getLevelFromXP = (xp: number): { level: number; currentXP: number; nextLevelXP: number; progress: number } => {
  let level = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i;
    } else {
      const currentThreshold = LEVEL_THRESHOLDS[i];
      const prevThreshold = LEVEL_THRESHOLDS[i - 1] || 0;
      const xpInLevel = xp - prevThreshold;
      const xpNeeded = currentThreshold - prevThreshold;
      return {
        level,
        currentXP: xpInLevel,
        nextLevelXP: xpNeeded,
        progress: (xpInLevel / xpNeeded) * 100
      };
    }
  }
  return { level, currentXP: xp - LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1], nextLevelXP: 0, progress: 100 };
};

const espaciosVacios = [''];
  const diasMes = Array.from({ length: 30 }, (_, i) => i + 1);

/** «hace 5 min», «ayer», «12 oct»… para la lista de notificaciones. */
const fechaNotificacion = (iso: string): string => {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const minutos = Math.floor((Date.now() - fecha.getTime()) / 60000);
  if (minutos < 1) return 'ahora';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
};


const Dashboard: React.FC<DashboardProps> = ({ onLogout, onBackToHub, onShowOnboarding }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const uiStore = useUiStore();
  const kanbanRef = useRef<HTMLDivElement>(null);
  const [ruedaCompleta, setRuedaCompleta] = useState<RuedaCategoria[]>([]);
  const [showDelegarModal, setShowDelegarModal] = useState(false);
  const showUserMenu = uiStore.showUserMenu; const setShowUserMenu = uiStore.setShowUserMenu;
  const showRecordatorioModal = uiStore.showRecordatorioModal; const setShowRecordatorioModal = uiStore.setShowRecordatorioModal;
  const showRuedaModal = uiStore.showRuedaModal; const setShowRuedaModal = uiStore.setShowRuedaModal;
  const [showRuedaVideoModal, setShowRuedaVideoModal] = useState(false);
  const [showDiagnosticoRueda, setShowDiagnosticoRueda] = useState(false);
  const [resumenRueda, setResumenRueda] = useState<ResumenRuedaDashboard | null>(null);
  const [selectedFocusArea, setSelectedFocusArea] = useState<string | null>(null);
  const [showMatrizEisenhower, setShowMatrizEisenhower] = useState(false);
  const [showMatrizVideoModal, setShowMatrizVideoModal] = useState(false);
  const showMatrizFormModal = uiStore.showMatrizFormModal; const setShowMatrizFormModal = uiStore.setShowMatrizFormModal;
  const handleGoKanban = () => {
    setShowMatrizEisenhower(false);
    navigate('/app/kanban');
  };
  // Sidebar del Coaching: cierra coaching y abre el destino directo.
  const handleCoachingNavigate = async (section: string) => {
    setShowCoaching(false);
    switch (section) {
      case 'inicio':
      case 'coaching':
        navigate('/app/coaching');
        break;
      case 'mas':
      case 'mision':
        break;
      case 'gratitud':
        navigate('/app/gratitud');
        break;
      case 'cumple':
        navigate('/app/cumpleanos');
        break;
      case 'focus':
        navigate('/app/focus');
        break;
      case 'rueda':
        navigate('/app/rueda');
        break;
      case 'matriz':
        navigate('/app/matriz');
        break;
      case 'anual':
        navigate('/app/anual');
        break;
      case 'mensual': {
        try {
          const status = await monthlyService.checkStatus();
          if (status.status === 'APROBADA') navigate('/app/calendario-mensual');
          else navigate('/app/mensual');
        } catch {
          navigate('/app/mensual');
        }
        break;
      }
      case 'kanban':
        openKanban();
        break;
      case 'semanal':
        openKanban('semanal');
        break;
      case 'diaria':
        openKanban('diaria');
        break;
      case 'delegar':
        navigate('/app/delegar');
        break;
      case 'fechas':
        setShowRecordatorioModal(true);
        break;
      case 'suplementos':
        navigate('/app/suplementos');
        break;
      case 'hora-oro':
        navigate('/app/hora-oro');
        break;
      case 'tribu':
        navigate('/app/tribu');
        break;
      case 'inspiracion':
        navigate('/app/inspiracion');
        break;
      case 'cursos':
        navigate('/app/cursos');
        break;
      case 'redes':
      case 'rrss':
        navigate('/app/redes');
        break;
      default:
        break;
    }
  };
  // Sidebar del módulo de Suplementos: cierra la pantalla y abre el destino.
  // Sidebar del módulo de Suplementos: cierra la pantalla y abre el destino.
  const handleSuplementosNavigate = (section: string) => {
    navigate('/app');
    if (section === 'coaching') { navigate('/app/coaching'); return; }
    if (section === 'cumple') { navigate('/app/cumpleanos'); return; }
    if (section === 'redes' || section === 'rrss') { navigate('/app/redes'); return; }
    if (['inicio', 'suplementos', 'mas', 'mision'].includes(section)) return;
    goSection(section);
  };
  // Sidebar del módulo Hora de Oro Familiar: cierra la pantalla y abre el destino.
  const handleHoraOroNavigate = (section: string) => {
    navigate('/app');
    setHoraOroSlot(null);
    setHoraOroKey(k => k + 1);
    if (section === 'coaching') { navigate('/app/coaching'); return; }
    if (section === 'cumple') { navigate('/app/cumpleanos'); return; }
    if (section === 'redes' || section === 'rrss') { navigate('/app/redes'); return; }
    if (['inicio', 'hora-oro', 'mas', 'mision'].includes(section)) return;
    goSection(section);
  };
  // Sidebar del módulo Gratitud: cierra la pantalla y abre el destino.
  const handleGratitudNavigate = (section: string) => {
    navigate('/app');
    if (section === 'coaching') { navigate('/app/coaching'); return; }
    if (section === 'cumple') { navigate('/app/cumpleanos'); return; }
    if (section === 'redes' || section === 'rrss') { navigate('/app/redes'); return; }
    if (['inicio', 'gratitud', 'mas', 'mision'].includes(section)) return;
    goSection(section);
  };
  // Sidebar del módulo Cumpleaños: cierra la pantalla y abre el destino.
  const handleCumpleanosNavigate = (section: string) => {
    navigate('/app');
    if (section === 'coaching') { navigate('/app/coaching'); return; }
    if (section === 'redes' || section === 'rrss') { navigate('/app/redes'); return; }
    if (['inicio', 'cumple', 'mas', 'mision'].includes(section)) return;
    goSection(section);
  };
  // ── Doc 23 · Modo Focus ────────────────────────────────────────────────
  // Ciclo único para todas las herramientas: iniciar → widget flotante →
  // finalización → registro automático. Solo una herramienta activa a la vez.
  useEffect(() => {
    const state = location.state as any;
    if (state?.iniciarFocus) {
      iniciarFocusSesion(state.iniciarFocus.herramienta, state.iniciarFocus.config || {});
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const iniciarFocusSesion = async (
    herramienta: FocusHerramienta | FocusHerramientaSesion,
    config: FocusConfig,
    forzar = false,
  ) => {
    setFocusOcupado(true);
    try {
      const sesion = await focusService.iniciar({ herramienta, config, origin: 'dashboard', forzar });
      const local: FocusSesionLocal = {
        id: sesion.id,
        herramienta,
        config,
        startedAtMs: new Date(sesion.started_at).getTime(),
        planoMin: sesion.planned_minutes,
        pausedAt: null,
        pausedAccum: 0,
      };
      setFocusSesion(local);
      guardarSesionLocal(local);
      guardarMinimizadoLocal(false);
      setFocusMinimizado(false);
      setFocusGuardNueva(null);
      setFocusFin(null);
      setFocusConfirmCerrar(false);
      setShowFocusScreen(false);
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status;
      if (status === 409) {
        // Ya existe una sesión de enfoque en ejecución (Doc 23 §III).
        setShowFocusScreen(false);
        setFocusGuardNueva({ herramienta, config });
      } else {
        console.error('No se pudo iniciar la sesión de Focus', e);
      }
    } finally {
      setFocusOcupado(false);
    }
  };

  const cerrarSesionFocus = async (completada: boolean, minutosEnfocado?: number) => {
    const actual = focusSesion;
    if (!actual) return;
    setFocusOcupado(true);
    try {
      if (actual.id) {
        await focusService.finalizar(actual.id, {
          completada,
          ...(minutosEnfocado !== undefined ? { minutos_enfocado: minutosEnfocado } : {}),
        });
      }
    } catch (e) {
      console.error('No se pudo registrar el cierre de la sesión de Focus', e);
    } finally {
      setFocusOcupado(false);
    }
    setFocusSesion(null);
    setFocusConfirmCerrar(false);
    guardarSesionLocal(null);
  };

  // Fin natural (cuenta en cero / alarma / fin de ciclos): registrar y celebrar.
  const finalizoFocusNatural = async (minutosEnfocado: number) => {
    const actual = focusSesion;
    if (!actual) return;
    setFocusSesion(null);
    guardarSesionLocal(null);
    setFocusFin({ herramienta: actual.herramienta, minutos: minutosEnfocado, hora: actual.config.hora });
    if (actual.id) {
      try { await focusService.finalizar(actual.id, { completada: true, minutos_enfocado: minutosEnfocado }); }
      catch (e) { console.error('No se pudo registrar la sesión de Focus', e); }
    }
  };

  // Restaurar la sesión en curso tras recargar la página (mismo dispositivo).
  useEffect(() => {
    let vivo = true;
    focusService.activa().then(({ activa, sesion }) => {
      if (!vivo) return;
      const local = leerSesionLocal();
      if (activa && sesion) {
        const restaurada: FocusSesionLocal = {
          id: sesion.id,
          herramienta: sesion.herramienta,
          config: sesion.config || {},
          startedAtMs: new Date(sesion.started_at).getTime(),
          planoMin: sesion.planned_minutes,
          pausedAt: local?.pausedAt ?? null,
          pausedAccum: local?.pausedAccum || 0,
        };
        setFocusSesion(restaurada);
        guardarSesionLocal(restaurada);
        setFocusMinimizado(leerMinimizadoLocal());
      } else if (local) {
        setFocusSesion(local);
        setFocusMinimizado(leerMinimizadoLocal());
      }
    }).catch(() => {
      const local = leerSesionLocal();
      if (local) { setFocusSesion(local); setFocusMinimizado(leerMinimizadoLocal()); }
    });
    return () => { vivo = false; };
  }, []);

  const handleFocusNavigate = (section: string) => {
    navigate('/app');
    if (section === 'coaching') { navigate('/app/coaching'); return; }
    if (section === 'cumple') { navigate('/app/cumpleanos'); return; }
    if (section === 'redes' || section === 'rrss') { navigate('/app/redes'); return; }
    if (['inicio', 'focus', 'mas', 'mision'].includes(section)) return;
    goSection(section);
  };

  // El widget actualiza la sesión (pausa/reinicio) y se persiste en el dispositivo.
  const actualizarFocusSesion = (s: FocusSesionLocal) => {
    setFocusSesion(s);
    guardarSesionLocal(s);
  };
  // Destino único para sidebars de módulos: abre la pantalla pedida.
  const goSection = async (section: string) => {
    switch (section) {
      case 'rueda':
        navigate('/app/rueda');
        break;
      case 'matriz':
        navigate('/app/matriz');
        break;
      case 'anual':
        navigate('/app/anual');
        break;
      case 'mensual': {
        try {
          const status = await monthlyService.checkStatus();
          if (status.status === 'APROBADA') navigate('/app/calendario-mensual');
          else navigate('/app/mensual');
        } catch {
          navigate('/app/mensual');
        }
        break;
      }
      case 'kanban':
        navigate('/app/kanban');
        break;
      case 'semanal':
        navigate('/app/kanban');
        break;
      case 'diaria':
        navigate('/app/kanban');
        break;
      case 'delegar':
        navigate('/app/delegar');
        break;
      case 'fechas':
        setShowRecordatorioModal(true);
        break;
      case 'suplementos':
        navigate('/app/suplementos');
        break;
      case 'focus':
        navigate('/app/focus');
        break;
      case 'hora-oro':
        navigate('/app/hora-oro');
        break;
      case 'tribu':
        navigate('/app/tribu');
        break;
      case 'inspiracion':
        navigate('/app/inspiracion');
        break;
      case 'cursos':
        navigate('/app/cursos');
        break;
      case 'coaching':
        navigate('/app/coaching');
        break;
      case 'redes':
      case 'rrss':
        handleOpenRrss();
        break;
      default:
        break;
    }
  };
  // Sidebar del módulo mensual: cierra el mensual y abre el destino.
  const handleMonthlyNavigate = (key: string) => {
    setShowMonthlyWizard(false);
    setShowMonthlyCalendar(false);
    switch (key) {
      case 'inicio':
      case 'mensual':
        break;
      case 'rueda':
        navigate('/app/rueda');
        break;
      case 'matriz':
        navigate('/app/matriz');
        break;
      case 'anual':
        navigate('/app/anual');
        break;
      case 'kanban':
        openKanban();
        break;
      case 'semanal':
        openKanban('semanal');
        break;
      case 'diaria':
        openKanban('diaria');
        break;
      case 'delegar':
        navigate('/app/delegar');
        break;
      case 'fechas':
        setShowRecordatorioModal(true);
        break;
      case 'suplementos':
        navigate('/app/suplementos');
        break;
      case 'hora-oro':
        navigate('/app/hora-oro');
        break;
      case 'tribu':
        navigate('/app/tribu');
        break;
      case 'inspiracion':
        navigate('/app/inspiracion');
        break;
      case 'cuentas':
        navigate('/app/cuentas');
        break;
      case 'cursos':
        navigate('/app/cursos');
        break;
      case 'coaching':
        navigate('/app/coaching');
        break;
      case 'focus':
        navigate('/app/focus');
        break;
      case 'gratitud':
        navigate('/app/gratitud');
        break;
      case 'cumpleanos':
      case 'cumple':
        navigate('/app/cumpleanos');
        break;
      case 'mision':
      case 'mas':
        break;
      case 'redes':
      case 'rrss':
        handleOpenRrss();
        break;
      default:
        break;
    }
  };
  // Módulo Redes Sociales (doc 16 + pantalla digitalizada): abre la pantalla
  // completa; si no hay redes configuradas, baja directo a la configuración.
  const handleOpenRrss = async () => {
    try {
      const config = await configuracionService.getMiConfig().catch(() => null);
      const links = (config?.redes_sociales || {}) as Record<string, string>;
      setRedesLinks(links);
      const hay = Object.values(links).some(v => (v || '').trim() !== '');
      setRedesIrAConfig(!hay);
      navigate('/app/redes');
    } catch {
      setRedesIrAConfig(true);
      navigate('/app/redes');
    }
  };
  const [showMetaAnualModal, setShowMetaAnualModal] = useState(false);
  const [showMetaMensualModal, setShowMetaMensualModal] = useState(false);
  const [showMonthlyWizard, setShowMonthlyWizard] = useState(false);
  const [showMonthlyCalendar, setShowMonthlyCalendar] = useState(false);
  const [showKanbanModule, setShowKanbanModule] = useState(false);
  const [kanbanVistaInicial, setKanbanVistaInicial] = useState<KanbanVistaInicial | undefined>(undefined);
  const [kanbanWidgetRefresh, setKanbanWidgetRefresh] = useState(0);
  const openKanban = (vista?: KanbanVistaInicial) => {
    setKanbanVistaInicial(vista);
    if (vista) {
      navigate(`/app/kanban?vista=${vista}`);
    } else {
      navigate('/app/kanban');
    }
  };
  const [showDelegarModule, setShowDelegarModule] = useState(false);
  const [showMetaSemanalModal, setShowMetaSemanalModal] = useState(false);
  const [showPlanRapido, setShowPlanRapido] = useState(false);
  const [showMetaDiariaModal, setShowMetaDiariaModal] = useState(false);
  const [showMetaAnualForm, setShowMetaAnualForm] = useState(false);
  const showGranMetaAnual = uiStore.showGranMetaAnual; const setShowGranMetaAnual = uiStore.setShowGranMetaAnual;
  const [editGranMetaMode, setEditGranMetaMode] = useState(false);
  const [existingGranMeta, setExistingGranMeta] = useState<any>(null);
  const [showEditGoalWarning, setShowEditGoalWarning] = useState(false);
  const [showAnnualView, setShowAnnualView] = useState(false);
  const showBuzonPropuestas = uiStore.showBuzonPropuestas; const setShowBuzonPropuestas = uiStore.setShowBuzonPropuestas;
  const showConfigPanel = uiStore.showConfigPanel; const setShowConfigPanel = uiStore.setShowConfigPanel;
  const showAyuda = uiStore.showAyuda; const setShowAyuda = uiStore.setShowAyuda;
  const [configPantalla, setConfigPantalla] = useState<ConfigScreen>('menu');
  const [showRedes, setShowRedes] = useState(false);
  const [redesIrAConfig, setRedesIrAConfig] = useState(false);
  const [redesLinks, setRedesLinks] = useState<Record<string, string>>({});
  const [showReportsList, setShowReportsList] = useState(false);
  const [selectedReport, setSelectedReport] = useState<FocusiaReportData | null>(null);
  const [showCoaching, setShowCoaching] = useState(false);
  const [showTribu, setShowTribu] = useState(false);
  const [showCursos, setShowCursos] = useState(false);
  const [showMicroFlujo, setShowMicroFlujo] = useState(false);
  const [microFlujoPropuesta, setMicroFlujoPropuesta] = useState<any>(null);
  const [showSuplementosScreen, setShowSuplementosScreen] = useState(false);
  const [showHoraDeOro, setShowHoraDeOro] = useState(false);
  const [showGratitud, setShowGratitud] = useState(false);
  const [showCumpleanos, setShowCumpleanos] = useState(false);
  const [horaOroSlot, setHoraOroSlot] = useState<{ dia: string; posicion: number } | null>(null);
  const [horaOroKey, setHoraOroKey] = useState(0);
  const [showBillModal, setShowBillModal] = useState(false);
  // Doc 23 · Modo Focus: pantalla, sesión activa (widget flotante) y modales.
  const [showFocusScreen, setShowFocusScreen] = useState(false);
  const [focusSesion, setFocusSesion] = useState<FocusSesionLocal | null>(null);
  const [focusMinimizado, setFocusMinimizado] = useState(false);
  const [focusConfirmCerrar, setFocusConfirmCerrar] = useState(false);
  const [focusGuardNueva, setFocusGuardNueva] = useState<{ herramienta: FocusHerramientaSesion; config: FocusConfig } | null>(null);
  const [focusFin, setFocusFin] = useState<FocusFinData | null>(null);
  const [focusOcupado, setFocusOcupado] = useState(false);
  const showWorkspaceSelector = uiStore.showWorkspaceSelector; const setShowWorkspaceSelector = uiStore.setShowWorkspaceSelector;
  const showCreateWorkspaceModal = uiStore.showCreateWorkspaceModal; const setShowCreateWorkspaceModal = uiStore.setShowCreateWorkspaceModal;
  const showWorkspaceSettingsModal = uiStore.showWorkspaceSettingsModal; const setShowWorkspaceSettingsModal = uiStore.setShowWorkspaceSettingsModal;
  const showInviteModal = uiStore.showInviteModal; const setShowInviteModal = uiStore.setShowInviteModal;
  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceData | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberData[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<InvitationData[]>([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLink, setInviteLink] = useState('');
  const showInviteLink = uiStore.showInviteLink; const setShowInviteLink = uiStore.setShowInviteLink;
  const showNotifications = uiStore.showNotifications; const setShowNotifications = uiStore.setShowNotifications;
  // Doc 25.1 §11: la frase bajo el logo sale de la Tabla Maestra según el
  // ciclo personal (Mes/Día del programa). Si la consulta falla se muestra este
  // respaldo fijo: una frase que cambia cada pocos segundos no puede ser «la
  // frase del día» y confunde.
  const fraseRespaldo = 'Empieza el día con foco y energía.';
  const [dailyPhrase, setDailyPhrase] = useState<DailyPhraseData | null>(null);

  useEffect(() => {
    motivationalService.getToday()
      .then(setDailyPhrase)
      .catch(() => setDailyPhrase(null));
  }, []);

  const objetivoAnimRef = useRef<number>(0);

  useEffect(() => {
    const canvas = objetivoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#3c4043'];
    const PARTICLE_COUNT = 25;
    const particles: {
      x: number; y: number; vx: number; vy: number;
      radius: number; color: string; phase: number;
    }[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 1.5 + Math.random() * 2.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        phase: Math.random() * Math.PI * 2,
      });
    }

    let mouseTarget = { x: canvas.width / 2, y: canvas.height / 2 };
    let mouseSmooth = { x: canvas.width / 2, y: canvas.height / 2 };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (objetivoMouseRef.current) {
        mouseTarget.x = objetivoMouseRef.current.x;
        mouseTarget.y = objetivoMouseRef.current.y;
      }
      mouseSmooth.x += (mouseTarget.x - mouseSmooth.x) * 0.08;
      mouseSmooth.y += (mouseTarget.y - mouseSmooth.y) * 0.08;

      const time = Date.now() * 0.001;

      for (const p of particles) {
        const dx = p.x - mouseSmooth.x;
        const dy = p.y - mouseSmooth.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 120;

        if (dist < maxDist && dist > 0.1) {
          const force = (1 - dist / maxDist) * 0.6;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        p.vx += Math.sin(time * 0.5 + p.phase) * 0.02;
        p.vy += Math.cos(time * 0.7 + p.phase) * 0.02;

        p.vx *= 0.98;
        p.vy *= 0.98;

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -p.radius) p.x = canvas.width + p.radius;
        if (p.x > canvas.width + p.radius) p.x = -p.radius;
        if (p.y < -p.radius) p.y = canvas.height + p.radius;
        if (p.y > canvas.height + p.radius) p.y = -p.radius;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.7 + Math.sin(time + p.phase) * 0.2;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      objetivoAnimRef.current = requestAnimationFrame(animate);
    };
    objetivoAnimRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(objetivoAnimRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // notifications now from store
  const showUserSettingsModal = uiStore.showUserSettingsModal; const setShowUserSettingsModal = uiStore.setShowUserSettingsModal;
  const showDelegationModal = uiStore.showDelegationModal; const setShowDelegationModal = uiStore.setShowDelegationModal;
  const [delegationTask, setDelegationTask] = useState<KanbanTaskData | null>(null);
  const [delegationEmail, setDelegationEmail] = useState('');
  const [delegationMessage, setDelegationMessage] = useState('');
  const [delegationLink, setDelegationLink] = useState('');
  const [delegations, setDelegations] = useState<{ sent: DelegationData[]; received: DelegationData[] }>({ sent: [], received: [] });
  const [delegationTab, setDelegationTab] = useState<'create' | 'received'>('create');
  const showAccionesDelegarModal = uiStore.showAccionesDelegarModal; const setShowAccionesDelegarModal = uiStore.setShowAccionesDelegarModal;
  const [editingDelegarId, setEditingDelegarId] = useState<number | null>(null);
  const [editDelegarText, setEditDelegarText] = useState('');

  const [userData, setUserData] = useState({ username: 'Brenda', email: '', avatar_url: '', avatar_index: 0, voz_genero: '' as string });
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const objetivoCardRef = useRef<HTMLDivElement>(null);
  const objetivoCanvasRef = useRef<HTMLCanvasElement>(null);
  const objetivoMouseRef = useRef<{ x: number; y: number } | null>(null);
  const [objetivoGradientPos, setObjetivoGradientPos] = useState({ x: 50, y: 50, show: false });
  const [matrixItems, setMatrixItems] = useState<MatrixItemData[]>([]);
  const [savedRecordatorios, setSavedRecordatorios] = useState<RecordatorioData[]>([]);
  const [editingRecordatorio, setEditingRecordatorio] = useState<RecordatorioData | null>(null);
  const [fechasDayActive, setFechasDayActive] = useState<number>(16);

  const showAgentSettings = uiStore.showAgentSettings; const setShowAgentSettings = uiStore.setShowAgentSettings;
  const [showFocusIAFeedback, setShowFocusIAFeedback] = useState(false);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockData[]>([]);
  const [objetivo, setObjetivo] = useState<ObjetivoSemanaData | null>(null);
  const [keepNota, setKeepNota] = useState<KeepNotaData | null>(null);
  const [misionHoy, setMisionHoy] = useState<MisionHoyData | null>(null);
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTaskData[]>([]);
  const [progreso, setProgreso] = useState<ProgresoData | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const [tbError, setTbError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<string>('');
  const [diariaBannerText, setDiariaBannerText] = useState<string | null>(null);
  const [diariaBannerActionId, setDiariaBannerActionId] = useState<string | null>(null);
  const [clima, setClima] = useState<{
    temp: number;
    sensacion: number;
    humedad: number;
    descripcion: string;
    icono: string;
    lugar: string;
    loading: boolean;
    error: string;
    actualizado: number;
    lat: number | null;
    lon: number | null;
  }>({
    temp: 0, sensacion: 0, humedad: 0,
    descripcion: '', icono: '🌤️', lugar: '',
    loading: true, error: '',
    actualizado: 0, lat: null, lon: null
  });
  // Modal del pronóstico completo al hacer clic en la tarjeta «Clima en mi comuna».
  const [showClimaDetalle, setShowClimaDetalle] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return {
      dia: now.toLocaleDateString('es-CO', { weekday: 'long' }).toUpperCase(),
      numero: now.getDate(),
      mes: now.toLocaleDateString('es-CO', { month: 'long' }).toUpperCase(),
      anio: now.getFullYear()
    };
  });

  const [xpStats, setXpStats] = useState<XPStats>(() => {
    const saved = localStorage.getItem('focusia_xp_stats');
    if (saved) {
      const parsed = JSON.parse(saved);
      const today = new Date().toDateString();
      if (parsed.lastActiveDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (parsed.lastActiveDate === yesterday) {
          parsed.streak = (parsed.streak || 0) + 1;
        } else {
          parsed.streak = 1;
        }
        parsed.lastActiveDate = today;
        parsed.todayXP = 0;
      }
      return parsed;
    }
    return {
      totalXP: 0,
      level: 0,
      streak: 1,
      lastActiveDate: new Date().toDateString(),
      todayXP: 0,
      tasksCompleted: 0,
      kanbanCompleted: 0,
      ruedaCompleted: 0,
      medicationsTaken: 0,
      unlockedBadges: [] as string[],
    };
  });
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState({ level: 0, newBadge: null as typeof BADGES[0] | null });
  const [xpPopUp, setXpPopUp] = useState<{ amount: number; message: string } | null>(null);
  const [showGreeting, setShowGreeting] = useState(() => {
    try {
      if (typeof window === 'undefined') return true;
      return sessionStorage.getItem('focusia_greeting_shown') !== '1';
    } catch {
      return true;
    }
  });

  const addXP = (amount: number, reason: string, badgeCondition?: (stats: any, level: number) => boolean) => {
    const newXP = xpStats.totalXP + amount;
    const newTodayXP = xpStats.todayXP + amount;
    const newLevel = getLevelFromXP(newXP).level;
    const oldLevel = getLevelFromXP(xpStats.totalXP).level;

    let newBadge: typeof BADGES[0] | null = null;
    let newUnlockedBadges = [...xpStats.unlockedBadges];

    if (badgeCondition) {
      for (const badge of BADGES) {
        if (!newUnlockedBadges.includes(badge.id) && badge.condition({ ...xpStats, tasksCompleted: xpStats.tasksCompleted + 1 }, newLevel)) {
          newUnlockedBadges.push(badge.id);
          newBadge = badge;
          break;
        }
      }
    }

    const newStats = {
      ...xpStats,
      totalXP: newXP,
      level: newLevel,
      todayXP: newTodayXP,
      unlockedBadges: newUnlockedBadges,
    };

    setXpStats(newStats);
    localStorage.setItem('focusia_xp_stats', JSON.stringify(newStats));

    setXpPopUp({ amount, message: reason });
    setTimeout(() => setXpPopUp(null), 2000);

    if (newLevel > oldLevel) {
      setLevelUpData({ level: newLevel, newBadge });
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 3000);
    }
  };

  const [metaAnual, setMetaAnual] = useState<string[]>([
    'Viajar a Europa con mi familia',
    'Aumentar ingresos un 30%',
    'Finalizar proyecto de certificación'
  ]);
  const [metaMensual, setMetaMensual] = useState<string[]>([
    'Leer 4 libros de desarrollo personal',
    'Ahorrar $500 USD',
    'Mejorar hábitos de sueño'
  ]);
  const [metaSemanal, setMetaSemanal] = useState<string[]>([
    'Ejercicio 4 veces',
    'Terminar módulo de curso online',
    'Llamar a mis padres 2 veces'
  ]);
  const [metaDiaria, setMetaDiaria] = useState<string[]>([
    'Meditar 10 minutos',
    'Beber 2 litros de agua',
    'Revisar pendientes del día'
  ]);
  const [accionesClasificadas, setAccionesClasificadas] = useState<any[]>([]);
  const [hasGranMetaActiva, setHasGranMetaActiva] = useState(false);
  const [editingMetaIndex, setEditingMetaIndex] = useState<number | null>(null);
  const [editingMetaType, setEditingMetaType] = useState<string | null>(null);
  const [newMetaText, setNewMetaText] = useState('');

  const handleAddMeta = (type: string) => {
    setEditingMetaType(type);
    setEditingMetaIndex(-1);
    setNewMetaText('');
  };

  const handleSaveMeta = () => {
    if (newMetaText.trim()) {
      if (editingMetaType === 'anual') {
        if (editingMetaIndex === -1) {
          setMetaAnual([...metaAnual, newMetaText.trim()]);
        } else {
          setMetaAnual(metaAnual.map((m: string, i: number) => i === editingMetaIndex ? newMetaText.trim() : m));
        }
      } else if (editingMetaType === 'mensual') {
        if (editingMetaIndex === -1) {
          setMetaMensual([...metaMensual, newMetaText.trim()]);
        } else {
          setMetaMensual(metaMensual.map((m: string, i: number) => i === editingMetaIndex ? newMetaText.trim() : m));
        }
      } else if (editingMetaType === 'semanal') {
        if (editingMetaIndex === -1) {
          setMetaSemanal([...metaSemanal, newMetaText.trim()]);
        } else {
          setMetaSemanal(metaSemanal.map((m: string, i: number) => i === editingMetaIndex ? newMetaText.trim() : m));
        }
      } else if (editingMetaType === 'diaria') {
        if (editingMetaIndex === -1) {
          setMetaDiaria([...metaDiaria, newMetaText.trim()]);
        } else {
          setMetaDiaria(metaDiaria.map((m: string, i: number) => i === editingMetaIndex ? newMetaText.trim() : m));
        }
      }
    }
    setEditingMetaType(null);
    setEditingMetaIndex(null);
    setNewMetaText('');
  };

  const handleDeleteMeta = (type: string, index: number) => {
    if (type === 'anual') setMetaAnual(metaAnual.filter((_: string, i: number) => i !== index));
    else if (type === 'mensual') setMetaMensual(metaMensual.filter((_: string, i: number) => i !== index));
    else if (type === 'semanal') setMetaSemanal(metaSemanal.filter((_: string, i: number) => i !== index));
    else if (type === 'diaria') setMetaDiaria(metaDiaria.filter((_: string, i: number) => i !== index));
  };

  const handleEditMeta = (type: string, index: number, currentText: string) => {
    setEditingMetaType(type);
    setEditingMetaIndex(index);
    setNewMetaText(currentText);
  };

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Weather code to emoji/description
  const getWeatherInfo = (code: number): { icono: string; descripcion: string } => {
    if (code === 0) return { icono: '☀️', descripcion: 'Despejado' };
    if (code <= 2) return { icono: '⛅', descripcion: 'Parcialmente nublado' };
    if (code === 3) return { icono: '☁️', descripcion: 'Nublado' };
    if (code <= 49) return { icono: '🌫️', descripcion: 'Niebla' };
    if (code <= 57) return { icono: '🌦️', descripcion: 'Llovizna' };
    if (code <= 67) return { icono: '🌧️', descripcion: 'Lluvia' };
    if (code <= 77) return { icono: '❄️', descripcion: 'Nevada' };
    if (code <= 82) return { icono: '🌧️', descripcion: 'Chubascos' };
    if (code <= 86) return { icono: '🌨️', descripcion: 'Nieve intensa' };
    if (code <= 99) return { icono: '⛈️', descripcion: 'Tormenta' };
    return { icono: '🌤️', descripcion: 'Variable' };
  };
  const Card: React.FC<{ title?: string; children?: React.ReactNode; className?: string }> = ({ title, children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col ${className}`}>
    {title && (
      <div className="bg-gradient-to-r from-[#193EC4]  to-[#18033A] text-white text-center py-1.5 text-[10px] sm:text-xs font-black tracking-widest uppercase rounded-md select-nonep-3.5 space-y-3 bg-white flex items-center justify-center h-[30px]">
        {title}
      </div>
    )}
    <div className="p-3 flex-1">{children}</div>
  </div>
);


  useEffect(() => {
    // Sin internet no se intenta geocodificar (evita el error en consola).
    if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
      setClima((prev: typeof clima) => ({ ...prev, loading: false, error: 'Sin conexión' }));
      return;
    }
    const controller = new AbortController();
    const fetchClima = async (lat: number, lon: number) => {
      try {
        // Reverse geocoding con Nominatim
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=es`,
          { signal: controller.signal }
        );
        const geoData = await geoRes.json();
        const lugar =
          geoData.address?.suburb ||
          geoData.address?.neighbourhood ||
          geoData.address?.town ||
          geoData.address?.city ||
          geoData.address?.county ||
          'Mi ubicación';

        // Clima con Open-Meteo (sin API key)
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code&timezone=auto`,
          { signal: controller.signal }
        );
        const weatherData = await weatherRes.json();
        const c = weatherData.current;
        const { icono, descripcion } = getWeatherInfo(c.weather_code);

        setClima({
          temp: Math.round(c.temperature_2m),
          sensacion: Math.round(c.apparent_temperature),
          humedad: c.relative_humidity_2m,
          descripcion,
          icono,
          lugar,
          loading: false,
          error: '',
          actualizado: Date.now(),
          lat,
          lon,
        });
      } catch (e) {
        setClima((prev: typeof clima) => ({ ...prev, loading: false, error: 'Sin datos' }));
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchClima(pos.coords.latitude, pos.coords.longitude),
        () => setClima((prev: typeof clima) => ({ ...prev, loading: false, error: 'Permiso denegado' }))
      );
    } else {
      setClima((prev: typeof clima) => ({ ...prev, loading: false, error: 'No disponible' }));
    }
    return () => controller.abort();
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const data = await workspaceService.getAll();
        setWorkspaces(data);
        if (data.length > 0 && !currentWorkspace) {
          setCurrentWorkspace(data[0]);
        }
      } catch (err) {
        console.error('Error loading workspaces:', err);
      }
    };
    loadWorkspaces();
  }, []);

  useEffect(() => {
    const loadInvitations = async () => {
      try {
        const data = await invitationService.getPending();
        setPendingInvitations(data);
      } catch (err) {
        console.error('Error loading invitations:', err);
      }
    };
    loadInvitations();
  }, []);

  const loadWorkspaceMembers = async (workspaceId: number) => {
    try {
      const data = await workspaceService.get(workspaceId);
      setWorkspaceMembers(data.members || []);
    } catch (err) {
      console.error('Error loading workspace members:', err);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    try {
      const newWs = await workspaceService.create({
        name: newWorkspaceName,
        description: newWorkspaceDescription
      });
      setWorkspaces([...workspaces, newWs]);
      setCurrentWorkspace(newWs);
      setNewWorkspaceName('');
      setNewWorkspaceDescription('');
      setShowCreateWorkspaceModal(false);
      addXP(100, 'Workspace creado');
    } catch (err) {
      console.error('Error creating workspace:', err);
    }
  };

  const handleInvite = async () => {
    if (!currentWorkspace || !inviteEmail.trim()) return;
    try {
      const result = await workspaceService.invite(currentWorkspace.id, inviteEmail, inviteRole);
      setInviteLink(`${window.location.origin}/invite/${result.token}`);
      setShowInviteLink(true);
      setInviteEmail('');
    } catch (err) {
      console.error('Error sending invitation:', err);
    }
  };

  const handleAcceptInvitation = async (token: string) => {
    try {
      const result = await workspaceService.acceptInvitation(token);
      const updatedWorkspaces = await workspaceService.getAll();
      setWorkspaces(updatedWorkspaces);
      const newWs = updatedWorkspaces.find(w => w.id === result.workspace_id);
      if (newWs) setCurrentWorkspace(newWs);
      setPendingInvitations(pendingInvitations.filter((i: InvitationData) => i.token !== token));
      addXP(50, 'Te uniste a un workspace');
    } catch (err) {
      console.error('Error accepting invitation:', err);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!currentWorkspace) return;
    try {
      await workspaceService.removeMember(currentWorkspace.id, userId);
      loadWorkspaceMembers(currentWorkspace.id);
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  const handleUpdateMemberRole = async (userId: number, newRole: string) => {
    if (!currentWorkspace) return;
    try {
      await workspaceService.updateMemberRole(currentWorkspace.id, userId, newRole);
      loadWorkspaceMembers(currentWorkspace.id);
    } catch (err) {
      console.error('Error updating member role:', err);
    }
  };

  useEffect(() => {
    const loadDelegations = async () => {
      try {
        const data = await delegationService.getAll();
        setDelegations(data);
      } catch (err) {
        console.error('Error loading delegations:', err);
      }
    };
    loadDelegations();
  }, []);

  const handleDelegation = async () => {
    if (!delegationTask || !delegationEmail.trim()) return;
    try {
      const result = await delegationService.create({
        task_id: delegationTask.id,
        email: delegationEmail,
        message: delegationMessage
      });
      setDelegationLink(result.delegation_link);
      setDelegationEmail('');
      setDelegationMessage('');
      addXP(15, 'Tarea delegada');
    } catch (err) {
      console.error('Error creating delegation:', err);
    }
  };

  const handleAcceptDelegation = async (token: string) => {
    try {
      await delegationService.accept(token);
      const data = await delegationService.getAll();
      setDelegations(data);
      addXP(25, 'Aceptaste una tarea');
    } catch (err) {
      console.error('Error accepting delegation:', err);
    }
  };

  const handleRejectDelegation = async (token: string) => {
    try {
      await delegationService.reject(token);
      const data = await delegationService.getAll();
      setDelegations(data);
    } catch (err) {
      console.error('Error rejecting delegation:', err);
    }
  };

  const openDelegationModal = async (task: KanbanTaskData) => {
    setDelegationTask(task);
    if (currentWorkspace) {
      try {
        const members = await delegationService.getWorkspaceMembers(currentWorkspace.id);
        setWorkspaceMembers(members as WorkspaceMemberData[]);
      } catch (err) {
        console.error('Error loading workspace members for delegation:', err);
      }
    }
    setShowDelegationModal(true);
  };

  const { activeReminder, dismissReminder, markAsTaken } = useReminderToasts();

  const fetchSavedRecordatorios = useCallback(async () => {
    try {
      const data = await recordatorioService.getAll();
      const list = Array.isArray(data) ? data : Array.isArray((data as any)?.results) ? (data as any).results : [];
      setSavedRecordatorios(list);
    } catch (err) {
      console.error('Error fetching saved recordatorios:', err);
    }
  }, []);

  useEffect(() => {
    fetchSavedRecordatorios();
  }, [fetchSavedRecordatorios]);

  // Lo creado por voz (recordatorios, planificación, backlog) aparece sin recargar.
  useEffect(() => {
    const alActualizar = () => {
      fetchSavedRecordatorios();
      refreshTimeBlocks();
      refreshAccionesClasificadas();
      refreshKanbanTasks();
      setKanbanWidgetRefresh((n) => n + 1);
    };
    window.addEventListener('focusia:datos-actualizados', alActualizar);
    return () => window.removeEventListener('focusia:datos-actualizados', alActualizar);
  }, [fetchSavedRecordatorios]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await authService.getCurrentUser();
        const config = await configuracionService.getMiConfig();
        const avatarIdx = config.avatar_index || 0;
        const resolvedAvatar = avatarIdx > 0 && AVATAR_FILES[avatarIdx]
          ? AVATAR_FILES[avatarIdx]
          : data.avatar_url || `https://ui-avatars.com/api/?name=${data.username}&background=f4d2d2&color=000`;
        setUserData({
          username: data.username,
          email: data.email,
          avatar_url: resolvedAvatar,
          avatar_index: avatarIdx,
          voz_genero: config.voz_genero || '',
        });
        setNewUsername(data.username);
        setNewAvatarUrl(resolvedAvatar);
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };
    fetchUserData();
  }, []);

  const seenCallNotificationIds = useRef<Set<string>>(new Set());
  const [incomingCall, setIncomingCall] = useState<{ id: string; title: string; message: string } | null>(null);

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getAll();
      const list = Array.isArray(data) ? data : Array.isArray((data as any)?.results) ? (data as any).results : [];
      useNotificationStore.getState().setNotifications(list as any);

      // Auto-detectar llamadas simuladas nuevas no leídas para mostrar overlay
      const calls = list.filter((n: any) => !n?.is_read && ((n?.channel === 'calls') || (n?.data?.kind === 'llamada_simulada')));
      const fresh = calls.find((n: any) => n?.id && !seenCallNotificationIds.current.has(String(n.id)));
      if (fresh) {
        seenCallNotificationIds.current.add(String(fresh.id));
        setIncomingCall({
          id: String(fresh.id),
          title: fresh?.data?.titulo || fresh?.title || 'Llamada simulada',
          message: fresh?.message || '',
        });
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const notificationsState: any[] = useNotificationStore((s: any) => s.notifications || []);
  const noLeidas = (notificationsState || []).filter((n: any) => !n.is_read).length;

  const abrirNotificaciones = async () => {
    const abrir = !showNotifications;
    setShowNotifications(abrir);
    if (!abrir) return;
    // Al abrir el panel se marcan como leídas: el contador de la campana es de
    // no leídas y si no, nunca bajaría.
    try {
      await notificationService.flush();
    } catch {}
    await fetchNotifications();
    try {
      await notificationService.marcarTodasLeidas();
      const current = useNotificationStore.getState().notifications as any[];
      useNotificationStore.getState().setNotifications((current || []).map((n: any) => ({ ...n, is_read: true })));
    } catch {
      /* si falla, se reintenta en la próxima apertura */
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // 1 min
    return () => clearInterval(interval);
  }, []);

  // Doc 27 §3.5: la notificación del reporte abre ese reporte específico.
  const abrirNotificacion = async (n: NotificationData) => {
    const kind = (n as any)?.data?.kind;
    const isCallSim = (n as any)?.channel === 'calls' || kind === 'llamada_simulada';
    const isWhatsAppSim = (n as any)?.channel === 'whatsapp' || kind === 'whatsapp_simulado';

    if (!n.is_read && n.id) {
      try { await notificationService.marcarLeida(String(n.id)); fetchNotifications(); } catch {}
    }

    if (isCallSim) {
      setShowNotifications(false);
      setIncomingCall({
        id: String(n.id),
        title: (n as any)?.data?.titulo || n.title || 'Llamada simulada',
        message: n.message || '',
      });
      return;
    }

    if (isWhatsAppSim) {
      setShowNotifications(false);
      return;
    }

    const reportId = n.data?.report_id;
    if (n.type !== 'report' || !reportId) return;
    try {
      const report = await reportService.getDetail(Number(reportId));
      navigate('/app/reportes', { state: { report } });
      setShowNotifications(false);
    } catch {
      /* el reporte puede haberse eliminado; se mantiene la campana */
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const updated = await authService.updateProfile({
        username: newUsername,
        avatar_url: newAvatarUrl
      });
      setUserData(prev => ({
        ...prev,
        username: updated.username,
        avatar_url: updated.avatar_url || `//ui-avatars.com/api/?name=${encodeURIComponent(updated.username || '')}&background=f4d2d2&color=000`,
      }));
      setNewAvatarUrl(updated.avatar_url || '');
      setShowUserSettingsModal(false);
      addXP(50, 'Perfil actualizado');
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm('¿Estás seguro de que deseas eliminar tu cuenta? Esta acción es irreversible.')) {
      try {
        await authService.deleteAccount();
        onLogout();
      } catch (err) {
        console.error('Error deleting account:', err);
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ruedaCompletaRes, tbRes, objRes, keepRes, misRes, matrixRes, kanbanRes, resumenRuedaRes, classifiedRes] = await Promise.all([
          ruedaService.getCompleta().catch(() => []),
          timeBlockService.getAll().catch(() => []),
          objetivoSemanaService.get().catch(() => null),
          keepNotaService.get().catch(() => null),
          misionHoyService.get().catch(() => null),
          matrixService.getAll().catch(() => []),
          kanbanService.getAll().catch(() => []),
          ruedaService.resumenDashboard().catch(() => null),
          api.get('/api/acciones-kanban/clasificadas/').catch(() => ({ data: [] }))
        ]);

        setRuedaCompleta(ruedaCompletaRes);
        setResumenRueda(resumenRuedaRes as ResumenRuedaDashboard | null);
        setTimeBlocks(Array.isArray(tbRes) ? tbRes : []);
        setObjetivo(Array.isArray(objRes) ? objRes[0] : objRes);
        setKeepNota(Array.isArray(keepRes) ? keepRes[0] : keepRes);
        setMisionHoy(Array.isArray(misRes) ? misRes[0] : misRes);
        setMatrixItems(Array.isArray(matrixRes) ? matrixRes : []);
        setKanbanTasks(Array.isArray(kanbanRes) ? kanbanRes : []);
        setAccionesClasificadas(Array.isArray(classifiedRes?.data) ? classifiedRes.data : []);

        const progRes = await progresoService.get().catch(() => null);
        setProgreso(progRes);

        const granMetaRes = await api.get('/api/gran-meta-anual/').catch(() => ({ data: [] }));
        const granMetaActiva = Array.isArray(granMetaRes.data)
          ? granMetaRes.data.some((m: any) => m.is_active && m.status === 'APROBADA')
          : false;
        setHasGranMetaActiva(granMetaActiva);

      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };
    fetchData();
  }, []);

  const refreshProgreso = async () => {
    const res = await progresoService.get().catch(() => null);
    setProgreso(res);
  };

  // Nivel XP (gamificación) y progreso real de actividades para la barra.
  // La barra muestra el avance real del backend (kanban + timeblock + acciones);
  // si el backend no responde, cae al avance de XP acumulado.
  const nivelXP = getLevelFromXP(xpStats.totalXP);
  const progresoBarra = progreso ? Math.round(progreso.porcentaje) : nivelXP.progress;

  const refreshTimeBlocks = async () => {
    try {
      const data = await timeBlockService.getAll().catch(() => []);
      setTimeBlocks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error refreshing time blocks:', err);
    }
  };

  const refreshKanbanTasks = async () => {
    try {
      const data = await kanbanService.getAll();
      setKanbanTasks(Array.isArray(data) ? data : []);
      await refreshProgreso();
    } catch (err) {
      console.error('Error refreshing kanban tasks:', err);
    }
  };

  const refreshAccionesClasificadas = async () => {
    try {
      const res = await api.get('/api/acciones-kanban/clasificadas/');
      setAccionesClasificadas(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error refreshing classified actions:', err);
    }
  };

  const showSaving = () => {

    setSavingStatus('Guardando...');
    setTimeout(() => setSavingStatus(''), 1500);
  };

  const findBlock = (hora: number) =>
    timeBlocks.find((t: TimeBlockData) => t.fecha === todayStr && t.hora === hora)
    || timeBlocks.find((t: TimeBlockData) => t.hora === hora);

  const handleTimeBlockBlur = async (hora: number, value: string) => {
    const block = findBlock(hora);
    if (block && block.tarea === value) return;
    try {
      if (block) {
        if (hora === block.hora) {
          await timeBlockService.update(block.id, { tarea: value });
          setTimeBlocks(prev => prev.map(t => t.id === block.id ? { ...t, tarea: value } : t));
          return;
        } else {
          await timeBlockService.delete(block.id);
          const newBlock = await timeBlockService.create({
            fecha: block.fecha,
            hora,
            tarea: value,
            estado: block.estado,
          });
          setTimeBlocks(prev => {
            const newPrev = prev.filter(t => t.id !== block.id);
            return [...newPrev, newBlock];
          });
        }
      } else {
        const newBlock = await timeBlockService.create({
          fecha: todayStr,
          hora,
          tarea: value,
          estado: 'pending',
        });
        setTimeBlocks(prev => {
          return [...prev, newBlock];
        });
      }
      showSaving();
      setTbError(null);
    } catch (e) {
      if (block) {
        setTimeBlocks(prev => prev.map(t => t.id === block.id ? { ...t, tarea: block.tarea } : t));
      }
      setTbError('Error al guardar bloque horario');
      setTimeout(() => setTbError(null), 3000);
      console.error("Error saving timeblock", e);
    }
  };

  const handleTimeBlockStatus = async (hora: number, estado: 'pending' | 'doing' | 'done') => {
    const block = findBlock(hora);
    try {
      if (block) {
        await timeBlockService.update(block.id, { estado, fecha: block.fecha || todayStr });
        setTimeBlocks(prev => prev.map(t => t.id === block.id ? { ...t, estado } : t));
      } else {
        const newBlock = await timeBlockService.create({ fecha: todayStr, hora, tarea: '', estado });
        setTimeBlocks(prev => [...prev, newBlock]);
      }
      // La barra de progreso también cuenta timeblocks: reflejar el cambio.
      refreshProgreso();
      showSaving();
      setTbError(null);
    } catch (e) {
      if (block) {
        setTimeBlocks(prev => prev.map(t => t.id === block.id ? { ...t, estado: block.estado } : t));
      }
      setTbError('Error al actualizar estado');
      setTimeout(() => setTbError(null), 3000);
      console.error(e);
    }
  };

  const handleObjetivoBlur = async (field: keyof ObjetivoSemanaData, value: string) => {
    if (objetivo && objetivo[field] === value) return;
    try {
      if (objetivo?.id) {
        await objetivoSemanaService.update(objetivo.id, { [field]: value });
      } else {
        const res = await objetivoSemanaService.create({ texto1: '', texto2: '', texto3: '', [field]: value } as any);
        setObjetivo(res);
      }
      showSaving();
    } catch (error) {
      console.error(error);
    }
  };

  const handleObjetivoMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setObjetivoGradientPos(prev => ({ ...prev, x, y }));
    if (objetivoCardRef.current) {
      const rotX = ((y - 50) / 50) * -10;
      const rotY = ((x - 50) / 50) * 10;
      objetivoCardRef.current.style.transform = `perspective(500px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      objetivoCardRef.current.style.transition = 'transform 0.05s ease-out';
    }
    if (objetivoCanvasRef.current) {
      const canvasRect = objetivoCanvasRef.current.getBoundingClientRect();
      objetivoMouseRef.current = {
        x: e.clientX - canvasRect.left,
        y: e.clientY - canvasRect.top,
      };
    }
  };

  const handleObjetivoMouseLeave = () => {
    setObjetivoGradientPos(prev => ({ ...prev, show: false }));
    objetivoMouseRef.current = null;
    if (objetivoCardRef.current) {
      objetivoCardRef.current.style.transform = 'perspective(500px) rotateX(0deg) rotateY(0deg)';
      objetivoCardRef.current.style.transition = 'transform 0.4s ease-out';
    }
  };

  const handleKeepNotaBlur = async (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (keepNota && keepNota.contenido === val) return;
    try {
      if (keepNota?.id) {
        await keepNotaService.update(keepNota.id, { contenido: val });
      } else {
        const res = await keepNotaService.create({ contenido: val } as any);
        setKeepNota(res);
      }
      showSaving();
    } catch (err) {
      console.error(err);
    }
  };

  // Helper para generar el gradiente dinámico de la Rueda de la vida
  const getConicGradient = () => {
    const fallback = 'conic-gradient(#eb97a4 0 90deg, #9ac1cf 90deg 180deg, #c795b5 180deg 270deg, #dfb48b 270deg 360deg)';

    if (ruedaCompleta.length === 0) return fallback;

    const colors = ['#eb97a4', '#9ac1cf', '#c795b5', '#dfb48b', '#a8d5a2', '#f9c89b', '#b8a9c9', '#8ecae6'];
    const total = ruedaCompleta.reduce((sum: number, cat: RuedaCategoria) => sum + cat.puntaje, 0);
    if (total === 0) return fallback;

    let currentDeg = 0;
    const gradientParts: string[] = [];

    ruedaCompleta.forEach((cat: RuedaCategoria, index: number) => {
      const degrees = (cat.puntaje / total) * 360;
      const nextDeg = currentDeg + degrees;
      const color = colors[index % colors.length];
      gradientParts.push(`${color} ${currentDeg}deg ${nextDeg}deg`);
      currentDeg = nextDeg;
    });

    return `conic-gradient(${gradientParts.join(', ')})`;
  };

  const defaultHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#eef1f6] dark:bg-[#050104] bg-cover bg-center bg-no-repeat bg-blend-soft-light text-[#2d2f33] dark:text-[#f5e9f0] font-montserrat transition-colors duration-300">
      {/* Salvavidas: driver.js (tour) bloquea el scroll del body mientras está
          activo; si la clase queda tras cerrarlo, la página quedaría cortada.
          El scroll de página SIEMPRE queda habilitado. */}
      <style>{`body.driver-active { overflow-y: auto !important; }`}</style>
      {/* Indicador de Auto-guardado global */}
      {savingStatus && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-1.5 rounded-full shadow-lg text-xs  z-50 animate-bounce">
          {savingStatus}
        </div>
      )}
      {/* Background blobs for pastel feel (light mode) */}
      <div className="dark:hidden fixed top-[0%] left-[-5%] w-[40%] h-[40%] bg-green-200/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 z-0 pointer-events-none"></div>
      <div className="dark:hidden fixed bottom-[-5%] left-[10%] w-[30%] h-[30%] bg-blue-200/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 z-0 pointer-events-none"></div>
      <div className="dark:hidden fixed top-[5%] right-[-5%] w-[40%] h-[40%] bg-pink-200/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 z-0 pointer-events-none"></div>
      <div className="dark:hidden fixed bottom-[10%] right-[10%] w-[35%] h-[35%] bg-yellow-100/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 z-0 pointer-events-none"></div>

      {/* Dark mode crimson/wine nebula glow */}
      <div
        className="hidden dark:block fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 62% 55% at 50% 62%, rgba(136, 12, 54, 0.45) 0%, rgba(74, 4, 28, 0.30) 48%, rgba(5, 1, 4, 0.96) 100%)',
        }}
      />

      {/* MAIN CONTENT responsive — el lienzo escalado FitStage queda reemplazado
          por este grid fluido; MobileOrientationPrompt (envoltorio de la ruta)
          se encarga de tablet/vertical. */}
      {/* MAIN CONTENT AREA — responsive fluido: las columnas reparten el
          ancho real de la ventana con las proporciones del mockup
          (146/295/432/268/299 sobre 1440). Fila 1: franja superior.
          Fila 2: columnas con el GAP constante y ALTURA NATURAL — si el
          contenido es más alto que la ventana, la página scrollea
          (se acepta scroll; el espacio se distribuye de forma simétrica
          con el mismo gap en las cinco columnas). 
          En tablet / ventana < 1024 u orientación vertical, MobileOrientationPrompt
          muestra la pantalla de rotación antes de llegar aquí. */}
      <div className="relative z-10 w-full grid grid-rows-[auto_auto] grid-cols-[146fr_295fr_432fr_268fr_299fr] gap-2 px-2 pb-2 pt-1 [&>*]:min-w-0">

      {/* FRANJA SUPERIOR · centro: logo Focusia */}
      <div className="col-start-3 row-start-1 flex justify-center items-center py-1 ml-8">
        <div className="flex flex-col items-center justify-center dark:px-3.5 dark:py-1.5 dark:rounded-md dark:shadow-[0_4px_24px_rgba(129,75,141,0.45)] transition-all">
          <img src="/focussia.png" alt={i18n.t('focusia_logo_47mm')} className="h-[40px] w-[40px] object-contain" />
          <span className="-mt-1 text-lg font-bold text-focusia-gradient">{i18n.t('Focusia')}</span>
        </div>
      </div>

      {/* FRANJA SUPERIOR · derecha: CURSOS / R.R.S.S. / CUENTAS alineados sobre
          el BLOCK DE NOTAS (inicio de la col 4); avatar anclado al borde derecho */}
      <div className="col-start-4 col-span-2 -mt-6 row-start-1 flex items-center justify-between gap-2 z-20 ml-20 ">
    <div className="flex items-center gap-2">
    <span id="tour-cursos-btn" className="contents"><ActionButton label={i18n.t('cursos_2jiy')} color=
    "bg-gradient-to-r from-[#000000] to-[#3533cd] text-white py-1 px-3 rounded-md text-[9px] sm:text-xs font-semibold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-18 " onClick={() => navigate('/app/cursos')} /></span>
    <span id="tour-rrss-btn" className="contents"><ActionButton label={i18n.t('rrss')} color="bg-gradient-to-r from-[#000000] to-[#3533cd] text-white py-1 px-3 rounded-md text-[10px] sm:text-xs font-semibold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-18" onClick={handleOpenRrss} /></span>
    <span id="tour-cuentas-btn" className="contents"><ActionButton label={i18n.t('cuentas_e8n1')} color="bg-gradient-to-r from-[#000000] to-[#3533cd] text-white py-1 px-3 rounded-md text-[10px] sm:text-xs font-semibold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-18" onClick={() => navigate('/app/cuentas')} /></span>
    </div>

    {/* User Menu */}
    <div className="relative shrink-0">
      <CyberButton
        onClick={() => setShowUserMenu(!showUserMenu)}
        className="flex items-center gap-1.5 bg-[#0a0a0f] bg-opacity-80 dark:bg-[linear-gradient(90deg,#9333ea_0%,#4f46e5_55%,#17153b_100%)] backdrop-blur-md rounded-full px-3 py-1.5  hover:bg-[#0a0a0f] hover:bg-opacity-60 transition-colors shadow-sm active:scale-95 border border-white/5 dark:border-purple-400/40"
      >
        <div className="w-7 h-7 rounded-full overflow-hidden shadow-sm border-2 border-white/30">
          <img src={userData.avatar_url || undefined} alt={i18n.t('profile_r4x9')} className="w-full h-full object-cover" />
        </div>
        <span className="font-bold text-xs text-white/80 dark:text-white dark:italic hidden sm:block">{userData.username}</span>
      </CyberButton>

      {/* Dropdown Usuario */}
      {showUserMenu && (
        <div className="absolute top-full mt-2 right-0 bg-white/95 dark:bg-[#140711]/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 dark:border-purple-500/30 p-4 w-48 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-2">
            <button
              onClick={() => {
                setShowUserSettingsModal(true);
                setShowUserMenu(false);
              }}
              className="w-full text-left p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2 dark:text-gray-100"
            >
              <User className="w-4 h-4" />
              <span className="text-sm">{i18n.t('perfil_pcz5')}</span>
            </button>
            <button
              onClick={onBackToHub}
              className="w-full text-left p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2 dark:text-gray-100"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-sm">{i18n.t('centro_de_inicio')}</span>
            </button>
            <button
              onClick={() => { navigate('/app/reportes'); setShowUserMenu(false); }}
              className="w-full text-left p-2 rounded-md hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2 dark:text-gray-100"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">{i18n.t('reportes_gtji')}</span>
            </button>
            <button
              onClick={onShowOnboarding}
              className="w-full text-left p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2 dark:text-gray-100"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">{i18n.t('tutorial_onboarding')}</span>
            </button>
            <button
              onClick={onLogout}
              className="w-full text-left p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/15 transition-colors flex items-center gap-2 text-red-600 dark:text-rose-400"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">{i18n.t('cerrar_sesion_z0bx')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
      
        {/* FRANJA SUPERIOR · izquierda: modo oscuro, ajustes, notificaciones y REPORTES */}
        <div className="col-start-1 row-start-1 flex items-center gap-2 z-20 -mt-12 ">
    {/* Botón Modo Oscuro */}
    <CyberToggle checked={isDarkMode} onChange={setIsDarkMode} />

  
    {/* Configuración */}
    <button
      onClick={() => navigate('/app/configuracion')}
      className="flex items-center justify-center w-8 h-8 rounded-full bg-black/20 dark:bg-[#1c0913] hover:bg-black/30 dark:hover:bg-[#2d0f1f] transition-all border border-black/40 dark:border-[#fb923c]/50 shadow-sm active:scale-95"
      title={i18n.t('configuracion_del_sistema_3eb6')}
    >
      <Settings className="w-4 h-4 text-white dark:text-[#fbbf24]" />
    </button>

    {/* Ayuda de IA */}
   
    {/* Centro de Notificaciones */}
    <div className="relative ml-2">
      <button
        onClick={abrirNotificaciones}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-black/20 dark:bg-[#1c0913] hover:bg-black/30 dark:hover:bg-[#2d0f1f] transition-all border border-black/40 dark:border-[#fb923c]/50 shadow-sm relative group active:scale-95"
        title={i18n.t('notificaciones_uud3')}
      >
        <Bell className="w-4 h-4 text-white dark:text-[#fbbf24]" />
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
            {noLeidas}
          </span>
        )}
      </button>

      {showNotifications && (
        <>
          {/* Backdrop para cerrar al hacer clic fuera del dropdown */}
          <div className="fixed inset-0 z-[239] bg-black/20" onClick={() => setShowNotifications(false)} />
          <div className="absolute left-0 mt-2 z-[240] w-80 max-h-[80vh] overflow-y-auto rounded-md border border-white/50 dark:border-purple-500/30 shadow-xl bg-white/95 dark:bg-[#140711]/95 backdrop-blur-xl p-4 animate-in fade-in slide-in-from-top-2" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3">
              <ReportNotificationBanner onOpen={(r) => { setSelectedReport(r); setShowNotifications(false); }} />
            </div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">{i18n.t('notificaciones_uud3')}</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {(notificationsState as any[]).length === 0 && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center py-4">{i18n.t('no_tenes_notificaciones')}</p>
              )}
              {(notificationsState as any[]).map((n: any) => {
                const isWhatsAppSim = n?.channel === 'whatsapp' || n?.data?.kind === 'whatsapp_simulado';
                const isCallSim = n?.channel === 'calls' || n?.data?.kind === 'llamada_simulada';
                const Icono = isCallSim ? Bell
                  : isWhatsAppSim ? MessageSquare
                  : n.type === 'invitation' ? Mail
                  : n.type === 'delegation' ? Briefcase
                  : n.type === 'report' ? BarChart3
                  : Clock;
                const cardClass = isCallSim
                  ? (n.is_read ? 'bg-orange-50/60 dark:bg-orange-900/10 border-orange-200 dark:border-orange-500/20' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-500/30')
                  : isWhatsAppSim
                    ? (n.is_read ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-500/20' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/30')
                    : (n.is_read ? 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10' : 'bg-indigo-50/70 dark:bg-purple-900/30 border-indigo-100 dark:border-purple-500/30');
                const iconClass = isCallSim
                  ? (n.is_read ? 'bg-orange-100 text-orange-500' : 'bg-orange-500/15 text-orange-600')
                  : isWhatsAppSim
                    ? (n.is_read ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/15 text-emerald-600')
                    : (n.is_read ? 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400' : 'bg-[#6236FF]/10 text-[#6236FF] dark:text-purple-300');
                const clickable = (n.type === 'report' && n.data?.report_id) || isCallSim || isWhatsAppSim;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => abrirNotificacion(n)}
                    className={`flex w-full items-start gap-2 rounded-md border p-2.5 text-left ${clickable ? 'cursor-pointer hover:brightness-95' : 'cursor-default'} ${cardClass}`}
                  >
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
                      <Icono className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[12px] font-semibold leading-tight text-gray-800 dark:text-gray-100">{n.title}</p>
                        {isCallSim && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold shrink-0">Llamada</span>}
                        {isWhatsAppSim && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold shrink-0">WhatsApp</span>}
                      </div>
                      {n.message && (
                        <p className={`mt-0.5 text-[11px] leading-snug ${isWhatsAppSim ? 'text-emerald-900/80 dark:text-emerald-100/80 whitespace-pre-wrap' : 'text-gray-600 dark:text-gray-300 whitespace-pre-wrap'}`}>{n.message}</p>
                      )}
                      <p className="mt-1 text-[10px] text-gray-400">{fechaNotificacion(n.created_at)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {incomingCall && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setIncomingCall(null)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-2xl border border-white/10 overflow-hidden">
            <div className="px-6 pt-8 pb-5 text-center">
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-orange-500/20 border border-orange-400/30 flex items-center justify-center">
                <Bell className="h-9 w-9 text-orange-300" />
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-orange-300/90 font-semibold">Llamada simulada</p>
              <h3 className="mt-2 text-xl font-bold">{incomingCall.title}</h3>
              <p className="mt-3 text-sm text-white/80 whitespace-pre-wrap max-h-40 overflow-y-auto">{incomingCall.message || 'Focusia tiene un recordatorio para ti.'}</p>
            </div>
            <div className="px-5 pb-6 flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  const id = incomingCall.id;
                  setIncomingCall(null);
                  try { await notificationService.marcarLeida(id); } catch {}
                  fetchNotifications();
                }}
                className="flex-1 rounded-2xl border border-white/15 bg-white/10 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
              >
                Después
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = incomingCall.id;
                  setIncomingCall(null);
                  try { await notificationService.marcarLeida(id); } catch {}
                  fetchNotifications();
                  try { window.navigator?.vibrate?.(50); } catch {}
                }}
                className="flex-1 rounded-2xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
              >
                Atender
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    {/* Visita guiada Focusia (driver.js) */}
    <FocusiaTourLauncher autoStart />
  </div>

      {/* FRANJA SUPERIOR · columna 2: INICIO / RUEDA / MATRIZ */}
      <div className="col-start-2 row-start-1 flex items-center gap-1.5 w-60 -mt-6 ml-15">
                <button
                  id="tour-inicio-btn"
                  onClick={onBackToHub}
                  className="bg-gradient-to-r from-[#000000] to-[#3533cd] dark:bg-[linear-gradient(90deg,#ec4899_0%,#fb923c_55%,#fde047_100%)] text-white dark:!text-[#14050c] dark:border dark:border-orange-300/40 py-1 rounded-md text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full"
                >
                  INICIO
                </button>
                <button
                  id="tour-rueda-btn"
                  onClick={() => navigate('/app/rueda')}
                  className="bg-gradient-to-r from-[#000000] to-[#3533cd] dark:bg-[linear-gradient(90deg,#ec4899_0%,#fb923c_55%,#fde047_100%)] text-white dark:!text-[#14050c] dark:border dark:border-orange-300/40 py-1 rounded-md text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full"
                  >
                   RUEDA
                </button>
                <button
                  onClick={() => navigate('/app/matriz')}
                  className="bg-gradient-to-r from-[#000000] to-[#3533cd] dark:bg-[linear-gradient(90deg,#ec4899_0%,#fb923c_55%,#fde047_100%)] text-white dark:!text-[#14050c] dark:border dark:border-orange-300/40 py-1 rounded-md text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full"
                >
                  MATRIZ
                </button>
      </div>

        {/* COLUMNA 1 — COACHING / TRIBU / GRATITUD + KANBAN BACKLOG + ACCIONES POR DELEGAR */}
        <div className="col-start-1 row-start-2 flex flex-col gap-2">
          <div className="bg-white dark:bg-transparent backdrop-blur-md dark:backdrop-blur-none border border-white/20 dark:border-transparent rounded-md p-1 flex flex-col gap-5 w-40 shadow-[0_4px_10px_rgba(0,0,0,0.02)] dark:shadow-none justify-between items-center shrink-0">
    {/* 1. COACHING */}
    <span id="tour-coaching-btn" className="contents">
    <ActionButton 
      label={i18n.t('coaching_os1m')} 
      color="bg-gradient-to-r from-[#3533cd] to-[#040817] dark:from-[#ec4899] dark:via-[#fb923c] dark:to-[#fde047] dark:!text-[#14050c] text-white py-2 rounded-md text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full" 
      onClick={() => navigate('/app/coaching')}
    />
    </span>
    {/* 2. TRIBU (Movido a la segunda posición) */}
    <span id="tour-tribu-btn" className="contents">
    <ActionButton 
      label={i18n.t('tribu_nyvh')} 
      color="bg-gradient-to-r from-[#3533cd] to-[#040817] dark:from-[#ec4899] dark:via-[#fb923c] dark:to-[#fde047] dark:!text-[#14050c] text-white py-2 rounded-md text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full" 
      onClick={() => navigate('/app/tribu')}
    />
    </span>
    {/* 3. GRATITUD (Movido a la tercera posición) */}
    <span id="tour-gratitud-btn" className="contents">
    <ActionButton 
      label={i18n.t('gratitud')} 
      color="bg-gradient-to-r from-[#3533cd] to-[#040817] dark:from-[#ec4899] dark:via-[#fb923c] dark:to-[#fde047] dark:!text-[#14050c] text-white py-2 rounded-md text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full" 
      onClick={() => navigate('/app/gratitud')}
    />
    </span>


  </div>

        <div ref={kanbanRef} className="shrink-0">
          <div id="tour-kanban" className="w-60 h-[430px] mt-2"><KanbanBacklog refreshTrigger={kanbanWidgetRefresh} onExpand={() => openKanban()} onClassified={async (clasificacion, texto) => {
          await refreshAccionesClasificadas();
          setKanbanWidgetRefresh((n) => n + 1);
        }} /></div>
        </div>

          {/* Bottom Left - Acciones por Delegar */}
          <div id="tour-delegar" className="shrink-0">
          <AccionesPorDelegarInline kanbanTasks={kanbanTasks} onOpenDelegation={(task) => { openDelegationModal(task); }} onRefresh={refreshKanbanTasks} onOpenModule={() => navigate('/app/delegar')} />
          </div>
        </div>

        {/* COLUMNA 2 — RUEDA DE LA VIDA + OBJETIVO MENSUAL + FECHAS IMPORTANTES */}
        <div className="col-start-2 row-start-2 flex flex-col gap-2">
             

            <div className="bg-white/60 dark:bg-transparent backdrop-blur-sm dark:backdrop-blur-none border border-white/30 dark:border-transparent rounded-md p-2 flex flex-col gap-3 w-60 h-40 shadow-[0_8px_32px_rgba(31,38,135,0.03)] dark:shadow-none shrink-0 -mt-10 ml-15">
              
              
              
              <div
  onClick={() => navigate('/app/rueda')}
  className="bg-white dark:bg-[linear-gradient(45deg,#143CCC_0%,#581c87_55%,#200013_100%)] rounded-md border border-black-200 dark:border-[#7c3aed]/60 shadow-sm dark:shadow-[0_0_24px_rgba(124,58,237,0.25)] overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
>
  <div className="bg-gradient-to-r from-[#2b44ff] via-[#0b153a] to-[#040817] dark:bg-none dark:bg-[#070309] dark:border dark:border-white/10 text-white dark:text-[#e4f34a] text-center py-1.5 rounded-md text-[10px] sm:text-xs font-bold tracking-widest uppercase mt-2 mx-2"> RUEDA DE LA VIDA
  </div>

  <div className="p-3 sm:p-4 flex items-center justify-between gap-4 flex-1 bg-white dark:bg-transparent">
    <div className="w-[100px] h-[100px] shrink-0 relative flex items-center justify-center">
      
        <img src="/rueda.png" alt={i18n.t('rueda_de_la_vida_h3h3')} className="w-full h-full object-contain -ml-4 -mt-5" />
      </div>

    <div className="flex flex-col gap-2 flex-1 -mt-8">
      <p className="text-[8px] text-gray-400 uppercase tracking-widest font-bold -mt-2-ml-6"></p>
      {resumenRueda && resumenRueda.tiene_diagnostico && resumenRueda.foco_1 ? (
        [resumenRueda.foco_1, resumenRueda.foco_2, resumenRueda.foco_3].filter(Boolean).map((foco, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setSelectedFocusArea(foco ?? null); }}
            className="text-[9px] sm:text-[9px] py-1 px-1 rounded-md text-center font-bold tracking-widest uppercase shadow-sm transition-all hover:scale-[1.03] hover:shadow-md active:scale-[0.98] w-25 cursor-pointer bg-gradient-to-r from-[#ff7c90] to-[#ffe1a4] text-black-800 border border-black/80 dark:bg-none dark:bg-[#070309] dark:text-white dark:border-white/15 -ml-6"
          >
            {foco}
          </button>
        ))
      ) : (
        <div className="text-[10px] text-gray-400 dark:text-purple-200/80 text-center py-4">
          {resumenRueda === null ? 'Cargando...' : 'Completa tu diagnóstico para ver tus focos estratégicos'}
        </div>
      )}
    </div>
  </div>
            </div>
            </div>

  <div
    className="backdrop-blur-sm dark:backdrop-blur-none rounded-md flex flex-col w-50 shadow-[0_0_0px_rgb(255,255,255)] dark:shadow-none relative overflow-hidden shrink-0 ml-30 mt-8"
  >
    <div className="bg-white dark:bg-transparent shadow-[0_2px_4px_rgb(247,243,243)] dark:shadow-none rounded-md overflow-hidden flex flex-col mt-2 w-45 h-40">
      
      <div className="bg-[linear-gradient(90deg,#000000,#3533cd)] dark:bg-none dark:bg-[#070309] dark:border dark:border-white/10 text-white dark:text-[#fdba74]  text-center px-1 py-1 rounded-md text-[10px] sm:text-[10px]  font-bold tracking-widest uppercase mx-2 mt-2 select-none shrink-0 h-[25px] w-40">
        OBJETIVO MENSUAL
      </div>
      
      <div className="bg-[linear-gradient(135deg,#200013,#814B8D,#143CCC)] dark:bg-[linear-gradient(135deg,#1d4ed8_0%,#6d28d9_50%,#3b0724_100%)] dark:border dark:border-purple-400/40 text-white text-center p-3 text-[11px] font-medium italic rounded-md mx-2 mt-2 mb-2 flex-1 flex flex-col justify-center relative overflow-hidden w-40 h-35">
        <div className="w-35 relative z-10 rounded-md">
          <textarea
          className="w-30 flex-1 bg-transparent text-[11px] font-medium text-white italic placeholder:text-slate-300/70 focus:outline-none resize-none leading-relaxed scrollbar-hide"
            placeholder={i18n.t('escriba_aqui_el_objetivo_primario')}
            rows={6}
            defaultValue={objetivo?.texto1 || ''} 
            onBlur={(e) => handleObjetivoBlur('texto1', e.target.value)} 
          />
        </div>
      </div>

    </div>
  </div>

        <div id="tour-fechas" className="rounded-md w-full shrink-0">
            <FechasImportantesCard
              dayActive={fechasDayActive}
              recordatorios={savedRecordatorios}
              onAddRecordatorio={(dia) => {
                setFechasDayActive(dia);
                setShowRecordatorioModal(true);
              }}
              onEditRecordatorio={(r) => {
                setEditingRecordatorio(r);
                setFechasDayActive(new Date(r.fecha_hora).getDate());
                setShowRecordatorioModal(true);
              }}
              onDeleteRecordatorio={async (id) => {
                try {
                  const recordatorioId = typeof id === 'string' ? Number(id) : id;
                  if (Number.isNaN(recordatorioId)) return;
                  await recordatorioService.delete(recordatorioId);
                  fetchSavedRecordatorios();
                } catch (err) {
                  console.error('Error deleting recordatorio:', err);
                }
              }}
            />
          </div>
        </div>

        {/* CENTER COLUMN */}
<div className="col-start-3 row-start-2 flex flex-col gap-3 w-full relative ml-9">
          <div className="bg-white/60 dark:bg-[#080206]/90 backdrop-blur-sm border border-white/30 dark:border-[#4c1127] rounded-md p-3 flex flex-col gap-3 w-full shadow-[0_8px_32px_rgba(31,38,135,0.03)] dark:shadow-[0_0_20px_rgba(122,8,38,0.2)]">
            <p className="text-[14px] font-semibold text-[#1e293b] dark:text-[#fce7f3] dark:italic text-center leading-tight">
              {dailyPhrase?.phrase || fraseRespaldo}
            </p>
            {dailyPhrase && (
              <p className="text-[10px] text-gray-400 dark:text-[#f9a8d4]/80 text-center -mt-2">
                {dailyPhrase.month_theme} · Día {dailyPhrase.day_number}
              </p>
            )}
          </div>
          {/* Tabs */}
<div className="flex justify-between items-center gap-3 w-full mt-1 shrink-0">
  
  {/* BOTÓN ANUAL → Gran Meta Anual */}
  <button 
    id="tour-anual-btn"
    onClick={async () => {
      try {
        const current = await granMetaAnualService.current();
        if (current && current.is_active) {
          navigate('/app/anual');
          return;
        }
      } catch { /* sin meta vigente: verificar elegibilidad abajo */ }
      // Spec §3/§22: sin diagnóstico completado, el flujo lleva a la Rueda
      try {
        const elig = await granMetaAnualService.eligibility();
        if (elig.eligible) {
          setShowGranMetaAnual(true);
        } else {
          setSavingStatus(elig.message || 'Completa el diagnóstico de la Rueda de la Vida primero.');
          setTimeout(() => setSavingStatus(''), 6000);
          navigate('/app/rueda');
        }
      } catch {
        setShowGranMetaAnual(true);
      }
    }} 
    className="flex-1 bg-[#171e3b] dark:bg-[linear-gradient(90deg,#1d4ed8_0%,#17153b_55%,#060309_100%)] dark:border dark:border-blue-500/30 text-white py-1.5 px-5 rounded-md text-[10px] sm:text-xs font-bold tracking-wider shadow-md transition hover:brightness-110 active:scale-[0.98]"
  >
    Anual
  </button>

  {/* BOTÓN MENSUAL */}
  <button 
    id="tour-mensual-btn"
    onClick={async () => {
      try {
        const status = await monthlyService.checkStatus();
        if (status.status === 'APROBADA') {
          navigate('/app/calendario-mensual');
        } else {
          navigate('/app/mensual');
        }
      } catch {
        navigate('/app/mensual');
      }
    }}
    className="flex-1 bg-gradient-to-r from-[#000000] to-[#3533cd] dark:bg-[linear-gradient(90deg,#1d4ed8_0%,#17153b_55%,#060309_100%)] dark:border dark:border-blue-500/30 text-white py-1.5 px-3 rounded-md text-[10px] sm:text-xs font-bold tracking-wider shadow-md transition hover:brightness-110 active:scale-[0.98]"
  >
    Mensual
  </button>

  {/* BOTÓN SEMANAL */}
  <button 
    id="tour-semanal-btn"
    onClick={() => openKanban('semanal')} 
    className="flex-1 bg-gradient-to-l from-[#000000] via-[#3533cd] to-[#040817] dark:bg-[linear-gradient(90deg,#1d4ed8_0%,#17153b_55%,#060309_100%)] dark:border dark:border-blue-500/30 text-white py-1.5 px-3 rounded-md text-[10px] sm:text-xs font-bold tracking-wider shadow-md transition hover:brightness-110 active:scale-[0.98]"
  >
    Semanal
  </button>

  {/* BOTÓN DIARIA */}
  <button 
    id="tour-diaria-btn"
    onClick={() => openKanban('diaria')} 
    className="flex-1 bg-gradient-to-l from-[#000000] to-[#3533cd] dark:bg-[linear-gradient(90deg,#1d4ed8_0%,#17153b_55%,#060309_100%)] dark:border dark:border-blue-500/30 text-white py-1.5 px-5 rounded-md text-[10px] sm:text-xs font-bold tracking-wider shadow-md transition hover:brightness-110 active:scale-[0.98]"
  >
    Diaria
  </button>


        </div>
          {/* Time Blocking Table (digitalización fotos Time Blocking) */}
        <div id="tour-timeblocking" className="p-3 flex flex-col w-full shrink-0 shadow-[0_8px_32px_rgba(31,38,135,0.03)] dark:shadow-none overflow-hidden">
          <TimeBlockingCard
            todayStr={todayStr}
            refreshTrigger={accionesClasificadas}
          />
        </div>

          {/* Ayuda IA + categorías, debajo de Time Blocking */}
          <div className="shrink-0">
           <CardAyudaIA
              onOpenSettings={() => setShowAgentSettings(true)}
            />
          </div>
          <div id="tour-humor" className="w-full shrink-0"><span id="tour-inspiracion" className="contents"><CategoriasMenu /></span></div>
        </div>

        {/* COLUMNA 4 — BLOCK DE NOTAS (borde izquierdo alineado con CURSOS/RRSS/CUENTAS de la franja superior) */}
        <div className="col-start-4 row-start-2 flex flex-col gap-2">
              <div id="tour-notas" className="bg-white/60 dark:bg-transparent backdrop-blur-sm dark:backdrop-blur-none border border-white/30 dark:border-transparent rounded-md p-2 flex flex-col gap-3 w-60 h-40 shadow-[0_8px_32px_rgba(31,38,135,0.03)] dark:shadow-none -mt-9 ml-19">
                <BlockDeNotas />
              </div>

          {/* Bloque Calendario */}
          <div className="shrink-0 flex flex-col items-center w-full mt-6">
            <CalendarWidget />
          </div>

          {/* Bloque Medio: Misión */}
          <div id="tour-mision-semanal" className="shrink-0 flex flex-col w-full">
            <WeeklyMissionWidget photoUrl={userData.avatar_url} />
          </div>
        </div>

        {/* COLUMNA 5 — PROGRESO XP + SUPLEMENTOS/CUMPLEAÑOS/FOCUS + HORA DE ORO + CLIMA */}
        <div className="col-start-5 row-start-2 flex flex-col gap-2">
          <div className="w-40 shrink-0 ml-35 -mt-8">
          <CyberProgressBar
            level={nivelXP.level}
            currentXP={nivelXP.currentXP}
            nextLevelXP={nivelXP.nextLevelXP}
            progress={progresoBarra}
          />
          </div>
          <div className="bg-white dark:bg-transparent backdrop-blur-sm dark:backdrop-blur-none border border-white/20 dark:border-transparent rounded-md p-1 flex flex-col gap-5 w-40 shadow-[0_4px_10px_rgba(0,0,0,0.02)] dark:shadow-none justify-between items-center shrink-0 ml-35">
              <span id="tour-suplementos-btn" className="contents"><ActionButton label={i18n.t('suplementos')} color="bg-gradient-to-r from-[#3533cd] to-[#040817] dark:from-[#ec4899] dark:via-[#fb923c] dark:to-[#fde047] dark:!text-[#14050c] text-white py-2 rounded-md text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full" variant="modern"  onClick={() => navigate('/app/suplementos')} /></span>
              <span id="tour-cumpleanos-btn" className="contents"><ActionButton label={i18n.t('cumpleanos_n7de')} color="bg-gradient-to-r from-[#3533cd] to-[#040817] dark:from-[#ec4899] dark:via-[#fb923c] dark:to-[#fde047] dark:!text-[#14050c] text-white py-2 rounded-md text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full"  variant="modern" onClick={() => navigate('/app/cumpleanos')} /></span>
              <span id="tour-focus-btn" className="contents"><ActionButton label={i18n.t('focus')} color="bg-gradient-to-r from-[#3533cd] to-[#040817] dark:from-[#ec4899] dark:via-[#fb923c] dark:to-[#fde047] dark:!text-[#14050c] text-white py-2 rounded-md text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full"  variant="modern" onClick={() => navigate('/app/focus')} /></span>
          </div>

          {/* Bloque Hora de Oro Familiar */}
          <div className="shrink-0 w-full rounded-md">
            <HoraDeOroFamiliar
              refreshKey={horaOroKey}
              onOpenModule={() => { setHoraOroSlot(null); navigate('/app/hora-oro'); }}
              onOpenSlot={(dia, posicion) => { setHoraOroSlot({ dia, posicion }); navigate('/app/hora-oro'); }}
            />
          </div>

          {/* Bloque Clima */}
          <div id="tour-clima" className="shrink-0 flex flex-col w-full">
            <ClimaComuna
              temp={clima.temp}
              descripcion={clima.descripcion}
              lugar={clima.lugar}
              loading={clima.loading}
              error={clima.error}
              icono={clima.icono}
              humedad={clima.humedad}
              sensacion={clima.sensacion}
              onAbrir={() => setShowClimaDetalle(true)}
            />
          </div>
   </div>
      </div>

      {/* Modal: Acciones por Delegar */}
      {showDelegarModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={() => setShowDelegarModal(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-xl rounded-md shadow-2xl border border-white/50 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#1e3a5f] to-[#3a5f8a] shrink-0">
              <h2 className="text-lg font-bold uppercase text-white">{i18n.t('mi_agenda_matriz_de_tareas')}</h2>

              <button
                onClick={() => setShowDelegarModal(false)}
                className="p-2 rounded-full hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <KanbanBoard onTaskChange={refreshKanbanTasks} />
            </div>

          </div>
        </div>
      )}

      {/* Modal: Recordatorio Fechas Importantes */}
      {showRecordatorioModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={() => {
            setShowRecordatorioModal(false);
            setEditingRecordatorio(null);
          }}
        >
          <div
            className="bg-white/95 backdrop-blur-xl rounded-md shadow-2xl border border-white/50 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#0d9488] to-[#14b8a6] shrink-0">
              <h2 className="text-lg font-bold uppercase text-white">{editingRecordatorio ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}</h2>
              <button
                onClick={() => {
                  setShowRecordatorioModal(false);
                  setEditingRecordatorio(null);
                }}
                className="p-2 rounded-full hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const titulo = formData.get('titulo') as string;
                const fecha = formData.get('fecha') as string;
                const categoria = formData.get('categoria') as string;

                if (titulo && fecha && categoria) {
                  const payload = { titulo, fecha_hora: fecha, categoria };
                  const action = editingRecordatorio
                    ? recordatorioService.update(editingRecordatorio.id, payload)
                    : recordatorioService.create({ ...payload, activo: true, tomado: false });

                  action.then(() => {
                    setShowRecordatorioModal(false);
                    setEditingRecordatorio(null);
                    fetchSavedRecordatorios();
                  }).catch(console.error);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{i18n.t('titulo')}</label>
                <input
                  type="text"
                  name="titulo"
                  required
                  defaultValue={editingRecordatorio?.titulo || ''}
                  placeholder={i18n.t('ej_cumpleanos_de_mama')}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a5c5ea] bg-white/50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{i18n.t('fecha_y_hora')}</label>
                <input
                  type="datetime-local"
                  name="fecha"
                  required
                  defaultValue={editingRecordatorio 
                    ? new Date(editingRecordatorio.fecha_hora).toISOString().slice(0, 16) 
                    : (() => {
                        const now = new Date();
                        const año = now.getFullYear();
                        const mes = now.getMonth();
                        const d = new Date(año, mes, fechasDayActive || now.getDate(), 9, 0, 0);
                        // Format for datetime-local
                        const pad = (n: number) => String(n).padStart(2, '0');
                        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                      })()}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a5c5ea] bg-white/50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{i18n.t('categoria')}</label>
                <select
                  name="categoria"
                  required
                  defaultValue={editingRecordatorio?.categoria || ''}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a5c5ea] bg-white/50"
                >
                  <option value="">{i18n.t('seleccionar')}</option>
                  <option value="Medicamento">{i18n.t('medicamento')}</option>
                  <option value="Cumpleaños">{i18n.t('cumpleanos')}</option>
                  <option value="HoraOro">{i18n.t('hora_de_oro')}</option>
                  <option value="Otro">{i18n.t('otro')}</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRecordatorioModal(false);
                    setEditingRecordatorio(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-xl bg-[#0d9488] text-white font-bold hover:bg-[#0f766e] transition-colors"
                >
                  {editingRecordatorio ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rueda de la Vida */}
      {showRuedaModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={() => setShowRuedaModal(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-md rounded-md shadow-2xl border border-white/50 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#059669] to-[#0d9488] shrink-0">
              <h2 className="text-lg font-bold uppercase text-white">{i18n.t('mi_rueda_de_la_vida')}</h2>
              <button
                onClick={() => setShowRuedaModal(false)}
                className="p-2 rounded-full hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              <FormularioRueda
                onClose={() => setShowRuedaModal(false)}
                onSaved={() => {
                  ruedaService.getCompleta().then(setRuedaCompleta).catch(console.error);
                  addXP(XP_CONFIG.RUEDA_COMPLETE, 'Rueda de la Vida completada');
                  setXpStats(prev => ({ ...prev, ruedaCompleted: prev.ruedaCompleted + 1 }));
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Video instructivo de la Rueda de la Vida */}
      {showRuedaVideoModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={() => setShowRuedaVideoModal(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-xl rounded-md shadow-2xl border border-white/50 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#059669] to-[#0d9488] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Play className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-bold uppercase text-white">{i18n.t('rueda_de_la_vida_h3h3')}</h2>
              </div>
              <button
                onClick={() => setShowRuedaVideoModal(false)}
                className="p-2 rounded-full hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-[#059669] to-[#0d9488] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Play className="w-12 h-12 text-white ml-1" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{i18n.t('mira_el_video_instructivo')}</h3>
              <p className="text-sm text-gray-500 mb-6">{i18n.t('aprende_como_elaborar_tu_rueda_de_la_vid')}</p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowRuedaVideoModal(false);
                    setShowRuedaModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#059669] text-white font-bold hover:bg-[#047857] transition-colors"
                >
                  <span>{i18n.t('ir_al_formulario')}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowRuedaVideoModal(false)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 text-gray-500 font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Meta Anual */}
       
      {showMetaAnualModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={() => setShowMetaAnualModal(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-xl rounded-md shadow-2xl border border-white/50 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#0d9488] to-[#14b8a6] shrink-0">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold uppercase text-white">{i18n.t('metas_anuales')}</h2>
              </div>
              <button onClick={() => setShowMetaAnualModal(false)} className="p-2 rounded-full hover:bg-white/30 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {accionesClasificadas.filter(a => a.destino_asignado === 'PLAN_ANUAL').map((accion) => (
                  <div key={accion.id} className="flex items-center gap-3 bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-white/40">
                    <div className="w-6 h-6 rounded-full border-2 border-[#0d9488] flex items-center justify-center flex-shrink-0">
                      <Target className="w-3 h-3 text-[#0d9488]" />
                    </div>
                    <span className="flex-1 text-sm text-gray-700">{accion.texto_accion}</span>
                    <span className="text-[10px] bg-[#0d9488]/20 text-[#0d9488] px-2 py-0.5 rounded-full font-medium">{i18n.t('kanban_tcb5')}</span>
                  </div>
                ))}
                {metaAnual.map((meta, index) => (
                  <div key={index} className="flex items-center gap-3 bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-white/40">
                    <button
                      onClick={() => {
                        setXpStats((prev: XPStats) => ({ ...prev, tasksCompleted: prev.tasksCompleted + 1 }));
                        addXP(500, 'Meta anual completada');
                        setMetaAnual(metaAnual.filter((_: string, i: number) => i !== index));
                      }}
                      className="w-6 h-6 rounded-full border-2 border-[#0d9488] flex items-center justify-center hover:bg-[#0d9488]/20 transition-colors flex-shrink-0"
                    >
                      <Check className="w-4 h-4 text-[#0d9488]" />
                    </button>
                    <span className="flex-1 text-sm text-gray-700">{meta}</span>
                    <span className="text-[10px] bg-[#0d9488]/20 text-[#0d9488] px-2 py-0.5 rounded-full font-medium">{i18n.t('500_xp')}</span>
                    <button onClick={() => handleEditMeta('anual', index, meta)} className="text-gray-400 hover:text-[#0d9488] transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteMeta('anual', index)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {editingMetaType === 'anual' && (
                  <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-[#0d9488]">
                    <input
                      type="text"
                      value={newMetaText}
                      onChange={(e) => setNewMetaText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveMeta()}
                      placeholder={i18n.t('escribe_tu_meta')}
                      className="flex-1 text-sm bg-transparent border-none outline-none"
                      autoFocus
                    />
                    <button onClick={handleSaveMeta} className="text-[#0d9488] font-bold text-sm">{i18n.t('guardar_f56y')}</button>
                    <button onClick={() => { setEditingMetaType(null); setNewMetaText(''); }} className="text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => handleAddMeta('anual')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-[#0d9488] hover:text-[#0d9488] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Agregar meta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Meta Mensual */}
      {showMetaMensualModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={() => setShowMetaMensualModal(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-xl rounded-md shadow-2xl border border-white/50 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold uppercase text-white">{i18n.t('metas_mensuales_q088')}</h2>
              </div>
              <button onClick={() => setShowMetaMensualModal(false)} className="p-2 rounded-full hover:bg-white/30 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {accionesClasificadas.filter(a => a.destino_asignado === 'PLAN_MENSUAL').map((accion) => (
                  <div key={accion.id} className="flex items-center gap-3 bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-white/40">
                    <div className="w-6 h-6 rounded-full border-2 border-[#7c3aed] flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-3 h-3 text-[#7c3aed]" />
                    </div>
                    <span className="flex-1 text-sm text-gray-700">{accion.texto_accion}</span>
                    <span className="text-[10px] bg-[#7c3aed]/20 text-[#7c3aed] px-2 py-0.5 rounded-full font-medium">{i18n.t('kanban_tcb5')}</span>
                  </div>
                ))}
                {metaMensual.map((meta, index) => (
                  <div key={index} className="flex items-center gap-3 bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-white/40">
                    <button
                      onClick={() => {
                        setXpStats((prev: XPStats) => ({ ...prev, tasksCompleted: prev.tasksCompleted + 1 }));
                        addXP(XP_CONFIG.MONTHLY_GOAL, 'Meta mensual completada');
                        setMetaMensual(metaMensual.filter((_: string, i: number) => i !== index));
                      }}
                      className="w-6 h-6 rounded-full border-2 border-[#7c3aed] flex items-center justify-center hover:bg-[#7c3aed]/20 transition-colors flex-shrink-0"
                    >
                      <Check className="w-4 h-4 text-[#7c3aed]" />
                    </button>
                    <span className="flex-1 text-sm text-gray-700">{meta}</span>
                    <span className="text-[10px] bg-[#7c3aed]/20 text-[#7c3aed] px-2 py-0.5 rounded-full font-medium">+{XP_CONFIG.MONTHLY_GOAL} XP</span>
                    <button onClick={() => handleEditMeta('mensual', index, meta)} className="text-gray-400 hover:text-[#7c3aed] transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteMeta('mensual', index)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {editingMetaType === 'mensual' && (
                  <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-[#7c3aed]">
                    <input
                      type="text"
                      value={newMetaText}
                      onChange={(e) => setNewMetaText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveMeta()}
                      placeholder={i18n.t('escribe_tu_meta')}
                      className="flex-1 text-sm bg-transparent border-none outline-none"
                      autoFocus
                    />
                    <button onClick={handleSaveMeta} className="text-[#7c3aed] font-bold text-sm">{i18n.t('guardar_f56y')}</button>
                    <button onClick={() => { setEditingMetaType(null); setNewMetaText(''); }} className="text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => handleAddMeta('mensual')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Agregar meta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Meta Semanal */}
      {showMetaSemanalModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={() => setShowMetaSemanalModal(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-xl rounded-md shadow-2xl border border-white/50 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#d97706] to-[#f59e0b] shrink-0">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold uppercase text-white">{i18n.t('metas_semanales')}</h2>
              </div>
              <button onClick={() => setShowMetaSemanalModal(false)} className="p-2 rounded-full hover:bg-white/30 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {accionesClasificadas.filter(a => a.destino_asignado === 'PLAN_SEMANAL').map((accion) => (
                  <div key={accion.id} className="flex items-center gap-3 bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-white/40">
                    <div className="w-6 h-6 rounded-full border-2 border-[#d97706] flex items-center justify-center flex-shrink-0">
                      <CalendarDays className="w-3 h-3 text-[#d97706]" />
                    </div>
                    <span className="flex-1 text-sm text-gray-700">{accion.texto_accion}</span>
                    <span className="text-[10px] bg-[#d97706]/20 text-[#d97706] px-2 py-0.5 rounded-full font-medium">{i18n.t('kanban_tcb5')}</span>
                  </div>
                ))}
                {metaSemanal.map((meta, index) => (
                  <div key={index} className="flex items-center gap-3 bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-white/40">
                    <button
                      onClick={() => {
                        setXpStats((prev: XPStats) => ({ ...prev, tasksCompleted: prev.tasksCompleted + 1 }));
                        addXP(XP_CONFIG.WEEKLY_GOAL, 'Meta semanal completada');
                        setMetaSemanal(metaSemanal.filter((_: string, i: number) => i !== index));
                      }}
                      className="w-6 h-6 rounded-full border-2 border-[#d97706] flex items-center justify-center hover:bg-[#d97706]/20 transition-colors flex-shrink-0"
                    >
                      <Check className="w-4 h-4 text-[#d97706]" />
                    </button>
                    <span className="flex-1 text-sm text-gray-700">{meta}</span>
                    <span className="text-[10px] bg-[#d97706]/20 text-[#d97706] px-2 py-0.5 rounded-full font-medium">+{XP_CONFIG.WEEKLY_GOAL} XP</span>
                    <button onClick={() => handleEditMeta('semanal', index, meta)} className="text-gray-400 hover:text-[#d97706] transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteMeta('semanal', index)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {editingMetaType === 'semanal' && (
                  <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-[#d97706]">
                    <input
                      type="text"
                      value={newMetaText}
                      onChange={(e) => setNewMetaText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveMeta()}
                      placeholder={i18n.t('escribe_tu_meta')}
                      className="flex-1 text-sm bg-transparent border-none outline-none"
                      autoFocus
                    />
                    <button onClick={handleSaveMeta} className="text-[#d97706] font-bold text-sm">{i18n.t('guardar_f56y')}</button>
                    <button onClick={() => { setEditingMetaType(null); setNewMetaText(''); }} className="text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => handleAddMeta('semanal')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-[#d97706] hover:text-[#d97706] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Agregar meta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Planificación Semanal (Full Weekly Planner) */}
      

      {/* Agenda Diaria full-page (foto) */}
      {showMetaDiariaModal && (
        <AgendaDiaria
          todayStr={todayStr}
          username={userData.username}
          avatarUrl={userData.avatar_url}
          onNavigate={(key) => { setShowMetaDiariaModal(false); handleMonthlyNavigate(key); }}
          onClose={() => setShowMetaDiariaModal(false)}
          onBackToKanban={() => { setShowMetaDiariaModal(false); navigate('/app/kanban'); }}
          onOpenHelp={() => setShowAyuda(true)}
          onOpenNotifications={abrirNotificaciones}
          onOpenSettings={() => navigate('/app/configuracion')}
        />
      )}

      {/* M�dulos migrados a rutas: /app/suplementos, /app/focus */}

      {/* Doc 23 · Widget flotante del Modo Focus (flota sobre cualquier módulo) */}
      <FocusWidget
        sesion={focusSesion}
        minimizado={focusMinimizado}
        onMinimizar={() => { setFocusMinimizado(v => { guardarMinimizadoLocal(!v); return !v; }); }}
        onCerrarSolicitado={() => setFocusConfirmCerrar(true)}
        onFinalizoNatural={finalizoFocusNatural}
        onUpdateSesion={actualizarFocusSesion}
      />

      {/* Doc 23 · Modales: sesión en ejecución, cierre del widget y finalización */}
      <FocusModales
        guardNueva={focusGuardNueva}
        sesionActual={focusSesion}
        confirmCerrar={focusConfirmCerrar}
        fin={focusFin}
        ocupado={focusOcupado}
        onGuardarCancelar={() => setFocusGuardNueva(null)}
        onGuardarFinalizarNueva={() => {
          if (focusGuardNueva) iniciarFocusSesion(focusGuardNueva.herramienta, focusGuardNueva.config, true);
        }}
        onCerrarConfirm={() => setFocusConfirmCerrar(false)}
        onSegundoPlano={() => { setFocusConfirmCerrar(false); setFocusMinimizado(true); guardarMinimizadoLocal(true); }}
        onFinalizarConfirm={() => cerrarSesionFocus(false)}
        onFinCerrar={() => setFocusFin(null)}
        onFinOtraSesion={() => { setFocusFin(null); navigate('/app/focus'); }}
        onFinDescanso={() => { setFocusFin(null); iniciarFocusSesion('descanso', { duracion_min: 5 }); }}
      />

      {/* M�dulos migrados a rutas: /app/hora-oro, /app/gratitud, /app/cumpleanos */}

      {/* Pantalla: Gratitud (Doc 19) */}
            {/* M�dulos migrados a rutas */}

      {showBillModal && (
        <div className="fixed inset-0 z-50">
          <CuentasScreen
            userName={userData.username}
            onBack={() => setShowBillModal(false)}
            onNavigate={(s) => { setShowBillModal(false); goSection(s); }}
          />
        </div>
      )}

      {/* Modal: Video instructivo de la Matriz de Eisenhower */}
      {showMatrizVideoModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
          onClick={() => setShowMatrizVideoModal(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-xl rounded-md shadow-2xl border border-white/50 w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Play className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-bold uppercase text-white">{i18n.t('matriz_eisenhower')}</h2>
              </div>
              <button
                onClick={() => setShowMatrizVideoModal(false)}
                className="p-2 rounded-full hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Play className="w-12 h-12 text-white ml-1" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{i18n.t('aprende_a_priorizar')}</h3>
              <p className="text-sm text-gray-500 mb-6">{i18n.t('descubre_como_separar_lo_urgente_de_lo_i')}</p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowMatrizVideoModal(false);
                    setShowMatrizFormModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#1e3a5f] text-white font-bold hover:bg-[#2d4a6f] transition-colors"
                >
                  <span>{i18n.t('realizar_mi_matriz')}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowMatrizVideoModal(false)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 text-gray-500 font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  Más tarde
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Formulario Matriz de Eisenhower */}
      {showMatrizFormModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          onClick={() => setShowMatrizFormModal(false)}
        >
          <div
            className="bg-[#f8fafc] rounded-md shadow-2xl border border-white/50 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 bg-white border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-[#1e3a5f] p-2 rounded-xl text-white">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-gray-800">{i18n.t('mi_matriz_de_prioridades')}</h2>
                  <p className="text-xs text-gray-400 font-medium tracking-tight uppercase">{i18n.t('sistema_de_gestion_del_tiempo_de_eisenho')}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMatrizFormModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                {/* Cuadrante 1: DO (Urgente e Importante) */}
                <div className="bg-gradient-to-br from-red-50/50 to-red-100/30 rounded-3xl p-5 border border-red-100 flex flex-col min-h-[250px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[11px] font-bold text-red-600 uppercase tracking-widest">1. HACER (Urgente)</h3>
                    <div className="bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">{i18n.t('critico')}</div>
                  </div>
                  <div className="flex-1 space-y-2 mb-4">
                    {matrixItems.filter(i => i.quadrant === 'do').map(item => (
                      <div key={item.id} className="group flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-red-100">
                        <input
                          type="checkbox"
                          checked={item.is_done}
                          onChange={async () => {
                            const updated = await matrixService.update(item.id, { is_done: !item.is_done });
                            setMatrixItems(prev => prev.map(i => i.id === item.id ? updated : i));
                          }}
                          className="accent-red-600 w-4 h-4 cursor-pointer"
                        />
                        <span className={`text-xs flex-1 ${item.is_done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.task}</span>
                        <button onClick={async () => {
                          await matrixService.delete(item.id);
                          setMatrixItems(prev => prev.filter(i => i.id !== item.id));
                        }} className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 text-[10px]">✕</button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const input = (e.target as any).task;
                    if (!input.value) return;
                    const res = await matrixService.create({ task: input.value, quadrant: 'do', is_done: false });
                    setMatrixItems(prev => [...prev, res]);
                    input.value = '';
                  }} className="flex gap-2">
                    <input name="task" placeholder={i18n.t('nueva_tarea_clave')} className="flex-1 bg-white/70 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-red-400 outline-none" />
                    <button type="submit" className="bg-red-600 text-white p-2 rounded-xl hover:bg-red-700 transition-colors"><Plus className="w-4 h-4" /></button>
                  </form>
                </div>

                {/* Cuadrante 2: SCHEDULE (No Urgente, Importante) */}
                <div className="bg-gradient-to-br from-blue-50/50 to-blue-100/30 rounded-3xl p-5 border border-blue-100 flex flex-col min-h-[250px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">2. AGENDAR (Visión)</h3>
                    <div className="bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">{i18n.t('crecimiento')}</div>
                  </div>
                  <div className="flex-1 space-y-2 mb-4">
                    {matrixItems.filter(i => i.quadrant === 'schedule').map(item => (
                      <div key={item.id} className="group flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-blue-100">
                        <input
                          type="checkbox"
                          checked={item.is_done}
                          onChange={async () => {
                            const updated = await matrixService.update(item.id, { is_done: !item.is_done });
                            setMatrixItems(prev => prev.map(i => i.id === item.id ? updated : i));
                          }}
                          className="accent-blue-600 w-4 h-4 cursor-pointer"
                        />
                        <span className={`text-xs flex-1 ${item.is_done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.task}</span>
                        <button onClick={async () => {
                          await matrixService.delete(item.id);
                          setMatrixItems(prev => prev.filter(i => i.id !== item.id));
                        }} className="opacity-0 group-hover:opacity-100 text-blue-300 hover:text-blue-500 text-[10px]">✕</button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const input = (e.target as any).task;
                    if (!input.value) return;
                    const res = await matrixService.create({ task: input.value, quadrant: 'schedule', is_done: false });
                    setMatrixItems(prev => [...prev, res]);
                    input.value = '';
                  }} className="flex gap-2">
                    <input name="task" placeholder={i18n.t('agendar_meta')} className="flex-1 bg-white/70 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-400 outline-none" />
                    <button type="submit" className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" /></button>
                  </form>
                </div>

                {/* Cuadrante 3: DELEGATE (Urgente, No Importante) */}
                <div className="bg-gradient-to-br from-orange-50/50 to-orange-100/30 rounded-3xl p-5 border border-orange-100 flex flex-col min-h-[250px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[11px] font-bold text-orange-600 uppercase tracking-widest">3. DELEGAR (Interrupciones)</h3>
                    <div className="bg-orange-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">{i18n.t('interferencias')}</div>
                  </div>
                  <div className="flex-1 space-y-2 mb-4">
                    {matrixItems.filter(i => i.quadrant === 'delegate').map(item => (
                      <div key={item.id} className="group flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-orange-100">
                        <input
                          type="checkbox"
                          checked={item.is_done}
                          onChange={async () => {
                            const updated = await matrixService.update(item.id, { is_done: !item.is_done });
                            setMatrixItems(prev => prev.map(i => i.id === item.id ? updated : i));
                          }}
                          className="accent-orange-600 w-4 h-4 cursor-pointer"
                        />
                        <span className={`text-xs flex-1 ${item.is_done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.task}</span>
                        <button onClick={async () => {
                          await matrixService.delete(item.id);
                          setMatrixItems(prev => prev.filter(i => i.id !== item.id));
                        }} className="opacity-0 group-hover:opacity-100 text-orange-300 hover:text-orange-500 text-[10px]">✕</button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const input = (e.target as any).task;
                    if (!input.value) return;
                    const res = await matrixService.create({ task: input.value, quadrant: 'delegate', is_done: false });
                    setMatrixItems(prev => [...prev, res]);
                    input.value = '';
                  }} className="flex gap-2">
                    <input name="task" placeholder={i18n.t('quien_puede_ayudar')} className="flex-1 bg-white/70 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-orange-400 outline-none" />
                    <button type="submit" className="bg-orange-600 text-white p-2 rounded-xl hover:bg-orange-700 transition-colors"><Plus className="w-4 h-4" /></button>
                  </form>
                </div>

                {/* Cuadrante 4: ELIMINATE (No Urgente, No Importante) */}
                <div className="bg-gradient-to-br from-gray-100/50 to-gray-200/30 rounded-3xl p-5 border border-gray-200 flex flex-col min-h-[250px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">4. ELIMINAR (Distracciones)</h3>
                    <div className="bg-gray-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">{i18n.t('basura')}</div>
                  </div>
                  <div className="flex-1 space-y-2 mb-4">
                    {matrixItems.filter(i => i.quadrant === 'eliminate').map(item => (
                      <div key={item.id} className="group flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                        <input
                          type="checkbox"
                          checked={item.is_done}
                          onChange={async () => {
                            const updated = await matrixService.update(item.id, { is_done: !item.is_done });
                            setMatrixItems(prev => prev.map(i => i.id === item.id ? updated : i));
                          }}
                          className="accent-gray-600 w-4 h-4 cursor-pointer"
                        />
                        <span className={`text-xs flex-1 ${item.is_done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.task}</span>
                        <button onClick={async () => {
                          await matrixService.delete(item.id);
                          setMatrixItems(prev => prev.filter(i => i.id !== item.id));
                        }} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 text-[10px]">✕</button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const input = (e.target as any).task;
                    if (!input.value) return;
                    const res = await matrixService.create({ task: input.value, quadrant: 'eliminate', is_done: false });
                    setMatrixItems(prev => [...prev, res]);
                    input.value = '';
                  }} className="flex gap-2">
                    <input name="task" placeholder={i18n.t('tarea_a_evitar')} className="flex-1 bg-white/70 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-gray-400 outline-none" />
                    <button type="submit" className="bg-gray-600 text-white p-2 rounded-xl hover:bg-gray-700 transition-colors"><Plus className="w-4 h-4" /></button>
                  </form>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowMatrizFormModal(false)}
                className="px-8 py-3 rounded-2xl bg-[#1e3a5f] text-white font-black uppercase tracking-widest text-xs hover:bg-[#2d4a6f] transition-all shadow-lg active:scale-95"
              >
                Finalizar Priorización
              </button>
            </div>
          </div>
        </div>
      )}
      {activeReminder && (
        <NotificationToast
          recordatorio={activeReminder}
          onClose={dismissReminder}
          onMarkTaken={() => markAsTaken(activeReminder.id)}
          showMarkTaken={activeReminder.categoria === 'Medicamento'}
        />
      )}

      {xpPopUp && (
        <div className="fixed bottom-24 right-6 z-[100] animate-[slideInRight_0.3s_ease-out]">
          <div className="bg-gradient-to-r from-[#7c3aed] to-[#059669] text-white px-5 py-3 rounded-md shadow-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-lg">+{xpPopUp.amount} XP</p>
              <p className="text-xs text-white/80">{xpPopUp.message}</p>
            </div>
          </div>
        </div>
      )}

      {showLevelUp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]" onClick={() => setShowLevelUp(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm mx-4 text-center shadow-2xl animate-[scaleIn_0.5s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-[pulse_1s_infinite]">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{i18n.t('level_up')}</h2>
            <p className="text-5xl font-black bg-gradient-to-r from-[#7c3aed] to-[#0d9488] bg-clip-text text-transparent mb-4">
              Nivel {levelUpData.level}
            </p>
            {levelUpData.newBadge && (
              <div className="bg-yellow-100 rounded-xl p-4 mb-4">
                <p className="text-xs text-yellow-600 font-medium mb-1">{i18n.t('nueva_insignia_desbloqueada')}</p>
                <div className="flex items-center justify-center gap-2">
                  <levelUpData.newBadge.icon className="w-6 h-6 text-yellow-600" />
                  <span className="font-bold text-yellow-800">{levelUpData.newBadge.name}</span>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowLevelUp(false)}
              className="px-8 py-3 bg-gradient-to-r from-[#7c3aed] to-[#0d9488] text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              ¡Genial!
            </button>
          </div>
        </div>
      )}

      {showGreeting && userData.avatar_url && userData.avatar_index > 0 && (
        <AvatarGreeting
          avatarUrl={userData.avatar_url}
          avatarIndex={userData.avatar_index}
          userName={userData.username}
          vozGenero={userData.voz_genero as 'masculino' | 'femenino' | undefined}
          onDismiss={() => { try { sessionStorage.setItem('focusia_greeting_shown','1'); } catch {} setShowGreeting(false); }}
        />
      )}

      {/* Create Workspace Modal */}
      {showCreateWorkspaceModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setShowCreateWorkspaceModal(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-[#7c3aed] to-[#059669]">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">{i18n.t('crear_workspace')}</h2>
              </div>
              <button onClick={() => setShowCreateWorkspaceModal(false)} className="p-2 rounded-full hover:bg-white/20 transition-colors">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{i18n.t('nombre_del_workspace')}</label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder={i18n.t('ej_proyecto_personal_trabajo')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Descripción (opcional)</label>
                <textarea
                  value={newWorkspaceDescription}
                  onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                  placeholder={i18n.t('describe_tu_workspace')}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] text-sm resize-none"
                />
              </div>
              <button
                onClick={handleCreateWorkspace}
                disabled={!newWorkspaceName.trim()}
                className="w-full py-3 bg-gradient-to-r from-[#7c3aed] to-[#059669] text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Crear Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Settings Modal */}
      {showWorkspaceSettingsModal && currentWorkspace && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setShowWorkspaceSettingsModal(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-[#7c3aed] to-[#059669]">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{currentWorkspace.name}</h2>
                  <p className="text-xs text-white/80">{i18n.t('configuracion_del_workspace')}</p>
                </div>
              </div>
              <button onClick={() => setShowWorkspaceSettingsModal(false)} className="p-2 rounded-full hover:bg-white/20 transition-colors">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Invite Section */}
              <div className="bg-gradient-to-r from-[#7c3aed]/5 to-[#059669]/5 rounded-2xl p-4">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#7c3aed]" />
                  Invitar miembros
                </h3>
                
                {!showInviteLink ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder={i18n.t('email_del_usuario')}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] text-sm"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] text-sm"
                      >
                        <option value="member">{i18n.t('miembro')}</option>
                        <option value="admin">{i18n.t('admin')}</option>
                      </select>
                    </div>
                    <button
                      onClick={handleInvite}
                      disabled={!inviteEmail.trim()}
                      className="w-full py-2 bg-[#7c3aed] text-white font-bold rounded-xl hover:bg-[#6d28d9] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Enviar invitación
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-600">{i18n.t('comparte_este_enlace_de_invitacion')}</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inviteLink}
                        readOnly
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(inviteLink)}
                        className="px-3 py-2 bg-[#059669] text-white rounded-xl hover:bg-[#047857] transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setShowInviteLink(false);
                        setInviteEmail('');
                      }}
                      className="w-full text-sm text-[#7c3aed] hover:underline"
                    >
                      Enviar otra invitación
                    </button>
                  </div>
                )}
              </div>

              {/* Members List */}
              <div>
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#059669]" />
                  Miembros ({workspaceMembers.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {workspaceMembers.map(member => (
                    <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <img 
                        src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.username}&background=f4d2d2&color=000`} 
                        alt={member.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-800">{member.username}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                      {member.role === 'owner' ? (
                        <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                          <Crown className="w-3 h-3" /> Dueño
                        </span>
                      ) : currentWorkspace.my_role === 'owner' || currentWorkspace.my_role === 'admin' ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateMemberRole(member.user_id, e.target.value)}
                            className="px-2 py-1 text-xs rounded-lg border border-gray-200"
                          >
                            <option value="admin">{i18n.t('admin')}</option>
                            <option value="member">{i18n.t('miembro')}</option>
                            <option value="viewer">{i18n.t('viewer')}</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(member.user_id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          member.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          member.role === 'viewer' ? 'bg-gray-100 text-gray-600' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {member.role === 'admin' ? 'Admin' : member.role === 'viewer' ? 'Viewer' : 'Miembro'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowWorkspaceSettingsModal(false)}
                className="w-full py-2 bg-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Invitations Toast */}
      {pendingInvitations.length > 0 && (
        <div className="fixed bottom-6 left-6 z-[100]">
          <div className="bg-white rounded-md shadow-2xl border border-white/50 p-4 max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#7c3aed] to-[#059669] rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-800">{i18n.t('invitaciones_pendientes')}</p>
                <p className="text-xs text-gray-500">{pendingInvitations.length} solicitud(es)</p>
              </div>
            </div>
            <div className="space-y-2">
              {pendingInvitations.slice(0, 2).map(inv => (
                <div key={inv.id} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm font-medium text-gray-800">{inv.workspace_name}</p>
                  <p className="text-xs text-gray-500 mb-2">Invitado por {inv.invited_by_username}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptInvitation(inv.token)}
                      className="flex-1 py-1.5 bg-[#059669] text-white text-xs font-bold rounded-lg hover:bg-[#047857] transition-colors"
                    >
                      Aceptar
                    </button>
                    <button
                      onClick={() => setPendingInvitations(pendingInvitations.filter((i: InvitationData) => i.id !== inv.id))}
                      className="flex-1 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Ignorar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User Settings Modal */}
      {showUserSettingsModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-2 sm:p-4"
          onClick={() => setShowUserSettingsModal(false)}
        >
          <div 
            className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-gray-800 to-gray-900 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="bg-white/10 p-1.5 sm:p-2 rounded-xl shrink-0">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-white truncate">{i18n.t('ajustes_de_perfil')}</h2>
                  <p className="text-xs text-white/60 truncate">{i18n.t('gestiona_tu_identidad_en_focusia')}</p>
                </div>
              </div>
              <button onClick={() => setShowUserSettingsModal(false)} className="p-2 rounded-full hover:bg-white/10 transition-colors shrink-0">
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-gray-100 shadow-lg">
                    <img 
                      src={newAvatarUrl || `https://ui-avatars.com/api/?name=${newUsername}&background=f4d2d2&color=000`} 
                      alt={i18n.t('avatar_preview')} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 font-medium text-center">{i18n.t('vista_previa_del_avatar')}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">{i18n.t('elige_un_avatar')}</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {['Ashley','conrad','John','Lia','Monroe','Sophya'].map((name) => {
                    const avatarPath = `/avartars/${name}.jpeg`;
                    return (
                      <button
                        key={name}
                        onClick={() => setNewAvatarUrl(avatarPath)}
                        className={`w-full aspect-square rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${
                          newAvatarUrl === avatarPath ? 'border-gray-900 ring-2 ring-gray-900/20' : 'border-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <img src={avatarPath} alt={name} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">{i18n.t('o_sube_tu_propia_foto')}</label>
                  <label className="flex items-center justify-center gap-2 w-full py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-all text-xs sm:text-sm text-gray-500 hover:text-gray-700">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const compressImage = (img: HTMLImageElement): string => {
                            const MAX_SIZE = 200;
                            let { width, height } = img;
                            if (width > MAX_SIZE || height > MAX_SIZE) {
                              if (width > height) { height = Math.round(height * MAX_SIZE / width); width = MAX_SIZE; }
                              else { width = Math.round(width * MAX_SIZE / height); height = MAX_SIZE; }
                            }
                            const canvas = document.createElement('canvas');
                            canvas.width = width;
                            canvas.height = height;
                            canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
                            return canvas.toDataURL('image/jpeg', 0.7);
                          };
                          const img = new Image();
                          img.onload = () => setNewAvatarUrl(compressImage(img));
                          img.src = URL.createObjectURL(file);
                        }
                      }}
                    />
                    <Upload className="w-4 h-4 shrink-0" />
                    <span className="truncate">{newAvatarUrl?.startsWith('data:') ? 'Foto seleccionada' : 'Subir foto'}</span>
                  </label>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">{i18n.t('nombre_de_usuario')}</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                    placeholder={i18n.t('tu_nombre_w8hi')}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">URL de foto de perfil (Avatar)</label>
                  <input
                    type="text"
                    value={newAvatarUrl}
                    onChange={(e) => setNewAvatarUrl(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                    placeholder={i18n.t('https_ejemplo_com_mifoto_jpg')}
                  />
                </div>
                
                <button
                  onClick={handleUpdateProfile}
                  className="w-full py-3 sm:py-3.5 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95 text-sm sm:text-base"
                >
                  Guardar Cambios
                </button>
              </div>

              <div className="pt-4 sm:pt-6 border-t border-gray-100">
                <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3">{i18n.t('zona_de_peligro')}</h3>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full py-3 border-2 border-red-100 text-red-500 font-bold rounded-2xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  Darme de baja / Eliminar cuenta
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-100 flex justify-center shrink-0">
              <p className="text-[10px] text-gray-400 font-medium italic truncate">Correo electrónico: {userData.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Acciones por Delegar */}
      {showAccionesDelegarModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={() => setShowAccionesDelegarModal(false)}
        >
          <div
            className="bg-white/90 backdrop-blur-xl rounded-md shadow-2xl border border-white/50 w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#d97706] to-[#f59e0b]">
              <h2 className="text-lg font-bold uppercase text-white">{i18n.t('acciones_por_delegar_5n3s')}</h2>
              <button
                onClick={() => setShowAccionesDelegarModal(false)}
                className="p-2 rounded-full hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {kanbanTasks
                  .filter(t => t.columna === 'Delegar')
                  .map(task => (
                    <div key={task.id} className="bg-white/60 p-3 rounded-xl border border-white/40 flex items-center justify-between gap-3 hover:bg-white/80 transition-colors">
                      {editingDelegarId === task.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editDelegarText}
                            onChange={(e) => setEditDelegarText(e.target.value)}
                            className="flex-1 text-sm border border-gray-300 rounded-lg p-1.5"
                            autoFocus
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter' && editDelegarText.trim()) {
                                await kanbanService.update(task.id, { titulo: editDelegarText.trim() });
                                refreshKanbanTasks();
                                setEditingDelegarId(null);
                              }
                              if (e.key === 'Escape') setEditingDelegarId(null);
                            }}
                          />
                          <button onClick={async () => {
                            if (!editDelegarText.trim()) return;
                            await kanbanService.update(task.id, { titulo: editDelegarText.trim() });
                            refreshKanbanTasks();
                            setEditingDelegarId(null);
                          }} className="text-green-600 hover:text-green-800" title={i18n.t('guardar_f56y')}><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingDelegarId(null)} className="text-red-600 hover:text-red-800" title={i18n.t('cancelar_0x0e')}><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <span className="font-bold text-gray-700 flex-1 truncate">{task.titulo}</span>
                      )}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setEditingDelegarId(task.id); setEditDelegarText(task.titulo); }}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title={i18n.t('editar_wh40')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm('¿Eliminar esta tarea delegada?')) return;
                            await kanbanService.delete(task.id);
                            refreshKanbanTasks();
                          }}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title={i18n.t('eliminar_nims')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setShowAccionesDelegarModal(false);
                            openDelegationModal(task);
                          }}
                          className="p-2 bg-[#d97706] text-white rounded-lg hover:bg-[#b45309] transition-colors"
                          title={i18n.t('delegar_por_email')}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                {kanbanTasks.filter(t => t.columna === 'Delegar').length === 0 && (
                  <p className="text-sm text-gray-400 text-center italic py-4">{i18n.t('no_hay_tareas_para_delegar')}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowAccionesDelegarModal(false);
                  setDelegationTab('received');
                  setShowDelegationModal(true);
                }}
                className="mt-4 w-full py-3 bg-[#d97706] text-white text-sm font-bold rounded-xl hover:bg-[#b45309] transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Ver Delegaciones
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delegation Modal */}
      {showDelegationModal && delegationTask && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4"
          onClick={() => setShowDelegationModal(false)}
        >
          <div 
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-[#d97706] to-[#f59e0b]">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{i18n.t('delegar_tarea')}</h2>
                  <p className="text-xs text-white/80">{i18n.t('asigna_esta_tarea_a_otro_usuario')}</p>
                </div>
              </div>
              <button onClick={() => setShowDelegationModal(false)} className="p-2 rounded-full hover:bg-white/20 transition-colors">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setDelegationTab('create')}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${delegationTab === 'create' ? 'bg-[#d97706]/10 text-[#d97706] border-b-2 border-[#d97706]' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Delegar
              </button>
              <button
                onClick={() => setDelegationTab('received')}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${delegationTab === 'received' ? 'bg-[#d97706]/10 text-[#d97706] border-b-2 border-[#d97706]' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Recibidas ({delegations.received.length})
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {delegationTab === 'create' ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-[#fef3c7] to-[#fffbeb] rounded-2xl p-4">
                    <p className="text-xs text-orange-600 font-medium mb-1">{i18n.t('tarea_a_delegar')}</p>
                    <p className="font-bold text-gray-800">{delegationTask.titulo}</p>
                  </div>

                  {workspaceMembers.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">{i18n.t('miembros_del_workspace')}</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {workspaceMembers.map(member => (
                          <button
                            key={member.user_id}
                            onClick={() => setDelegationEmail(member.email)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                              delegationEmail === member.email 
                                ? 'bg-[#d97706] text-white' 
                                : 'bg-gray-50 hover:bg-gray-100'
                            }`}
                          >
                            <img 
                              src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.username}&background=f4d2d2&color=000`}
                              alt={member.username}
                              className="w-8 h-8 rounded-full"
                            />
                            <div className="text-left flex-1">
                              <p className={`font-semibold text-sm ${delegationEmail === member.email ? 'text-white' : 'text-gray-800'}`}>
                                {member.username}
                              </p>
                              <p className={`text-xs ${delegationEmail === member.email ? 'text-white/80' : 'text-gray-500'}`}>
                                {member.email}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">{i18n.t('o_ingresa_un_email')}</label>
                    <input
                      type="email"
                      value={delegationEmail}
                      onChange={(e) => setDelegationEmail(e.target.value)}
                      placeholder={i18n.t('email_ejemplo_com')}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#d97706] text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Mensaje (opcional):</label>
                    <textarea
                      value={delegationMessage}
                      onChange={(e) => setDelegationMessage(e.target.value)}
                      placeholder={i18n.t('agrega_un_mensaje_para_el_destinatario')}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#d97706] text-sm resize-none"
                    />
                  </div>

                  {delegationLink ? (
                    <div className="bg-green-50 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-medium text-green-700">{i18n.t('enlace_de_delegacion_creado')}</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={delegationLink}
                          readOnly
                          className="flex-1 px-3 py-2 rounded-lg border border-green-200 bg-white text-sm"
                        />
                        <button
                          onClick={() => navigator.clipboard.writeText(delegationLink)}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-green-600">
                        Comparte este enlace con {delegationEmail} para que pueda ver y aceptar la tarea.
                      </p>
                      <button
                        onClick={() => {
                          setDelegationLink('');
                          setDelegationTask(null);
                          setShowDelegationModal(false);
                        }}
                        className="w-full py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
                      >
                        Delegar otra tarea
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleDelegation}
                      disabled={!delegationEmail.trim()}
                      className="w-full py-3 bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                      Delegar Tarea
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {delegations.received.length === 0 ? (
                    <div className="text-center py-8">
                      <Send className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">{i18n.t('no_hay_tareas_delegadas_para_ti')}</p>
                    </div>
                  ) : (
                    delegations.received.map(delegation => (
                      <div 
                        key={delegation.id}
                        className={`rounded-xl p-4 ${
                          delegation.status === 'pending' ? 'bg-[#fef3c7]' :
                          delegation.status === 'accepted' ? 'bg-green-50' :
                          delegation.status === 'completed' ? 'bg-blue-50' :
                          'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="font-bold text-gray-800">{delegation.task_title}</p>
                            <p className="text-xs text-gray-500">De: {delegation.delegator_username}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            delegation.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            delegation.status === 'accepted' ? 'bg-green-100 text-green-700' :
                            delegation.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {delegation.status === 'pending' ? 'Pendiente' :
                             delegation.status === 'accepted' ? 'Aceptada' :
                             delegation.status === 'completed' ? 'Completada' : 'Rechazada'}
                          </span>
                        </div>
                        {delegation.message && (
                          <p className="text-sm text-gray-600 italic mb-2">"{delegation.message}"</p>
                        )}
                        {delegation.status === 'pending' && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleAcceptDelegation(delegation.token)}
                              className="flex-1 py-2 bg-green-500 text-white text-sm font-bold rounded-lg hover:bg-green-600 transition-colors"
                            >
                              Aceptar
                            </button>
                            <button
                              onClick={() => handleRejectDelegation(delegation.token)}
                              className="flex-1 py-2 bg-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-300 transition-colors"
                            >
                              Rechazar
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => setShowDelegationModal(false)}
                className="w-full py-2 bg-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delegation Notifications Toast */}
      {delegations.received.filter(d => d.status === 'pending').length > 0 && !showDelegationModal && (
        <div className="fixed bottom-6 right-6 z-[100]">
          <div className="bg-white rounded-md shadow-2xl border border-white/50 p-4 max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#d97706] to-[#f59e0b] rounded-xl flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-800">{i18n.t('tareas_delegadas')}</p>
                <p className="text-xs text-gray-500">{delegations.received.filter(d => d.status === 'pending').length} pendiente(s)</p>
              </div>
            </div>
            <button
              onClick={() => {
                setDelegationTab('received');
                setShowDelegationModal(true);
              }}
              className="w-full py-2 bg-[#d97706] text-white font-bold rounded-xl hover:bg-[#b45309] transition-colors"
            >
              Revisar tareas
            </button>
          </div>
        </div>
      )}

      {/* Meta Anual Form */}
      <MetaAnualForm
        isOpen={showMetaAnualForm}
        onClose={() => setShowMetaAnualForm(false)}
      />

      {/* Gran Meta Anual Modal */}
      <GranMetaAnualModal
        isOpen={showGranMetaAnual}
        onClose={() => {
          setShowGranMetaAnual(false);
          setEditGranMetaMode(false);
          setExistingGranMeta(null);
        }}
        username={userData.username}
        avatarUrl={userData.avatar_url}
        ruedaData={ruedaCompleta}
        editMode={editGranMetaMode}
        existingMeta={existingGranMeta}
        onApproved={() => {
          setShowGranMetaAnual(false);
          setEditGranMetaMode(false);
          setExistingGranMeta(null);
          setSavingStatus('Tu Gran Meta Anual ya fue creada y guardada. Podrás verla cada vez que ingreses al botón ANUAL.');
          setTimeout(() => setSavingStatus(''), 6000);
          refreshAccionesClasificadas();
        }}
        onOpenHelp={() => setShowAyuda(true)}
        onOpenNotifications={() => abrirNotificaciones()}
        onOpenSettings={() => { setShowGranMetaAnual(false); navigate('/app/configuracion'); }}
      />

      {/* Monthly Wizard */}
      {/* M�dulos migrados a rutas: /app/mensual, /app/calendario-mensual */}

      {/* Asistente flotante (Fase 1: chat + voz + mic; no reemplaza CardAyudaIA) */}
      <FloatingAssistant
        username={userData.username}
        avatarUrl={userData.avatar_url}
        avatarIndex={userData.avatar_index}
      />

      {/* Pronóstico completo del clima (clic en la tarjeta de Clima en mi comuna) */}
      {showClimaDetalle && (
        <ClimaDetalleModal
          clima={clima}
          onClose={() => setShowClimaDetalle(false)}
        />
      )}

      {/* Ayuda de IA global: se abre desde la cabecera de cualquier módulo */}
      <HelpChat
        open={showAyuda}
        onClose={() => setShowAyuda(false)}
        pasoLabel="Focusia"
        titulo="Ayuda de IA"
        bienvenida="¡Hola! Soy FocusIA, tu asistente de productividad personal. Puedo explicarte cualquier módulo, revisar tus tareas o darte recomendaciones. ¿En qué te ayudo?"
        contextoAyuda="El usuario pidió ayuda desde el icono de interrogación de Focussia."
      />

      {/* M�dulos migrados a rutas: /app/kanban, /app/delegar */}

      {/* M�dulos migrados a rutas: /app/anual */}

      {/* Edit Goal Warning Modal */}
      <EditGoalWarningModal
        isOpen={showEditGoalWarning}
        onClose={() => setShowEditGoalWarning(false)}
        onConfirm={async () => {
          setShowEditGoalWarning(false);
          setShowAnnualView(false);
          const current = await granMetaAnualService.current().catch(() => null);
          if (current) {
            setExistingGranMeta(current);
            setEditGranMetaMode(true);
          }
          setShowGranMetaAnual(true);
        }}
      />


    

      {/* Plan Rápido */}
      {showPlanRapido && (
        <PlanificarModal
          onClose={() => setShowPlanRapido(false)}
          onClassified={() => {
            refreshKanbanTasks();
            refreshAccionesClasificadas();
          }}
        />
      )}

      {/* Microflujo de Ajuste */}
      {microFlujoPropuesta && (
        <MicroFlujoAjuste
          isOpen={showMicroFlujo}
          onClose={() => { setShowMicroFlujo(false); setMicroFlujoPropuesta(null); }}
          propuesta={microFlujoPropuesta}
        />
      )}

      {/* Configuración del Sistema (módulo botón Inicio) */}
      {showConfigPanel && (
        <ConfiguracionModule
          key={configPantalla}
          username={userData.username}
          onClose={() => { setShowConfigPanel(false); setConfigPantalla('menu'); }}
          onLogout={onLogout}
          pantallaInicial={configPantalla}
          avatarIndex={userData.avatar_index}
          avatarUrl={userData.avatar_url}
        />
      )}

      {/* M�dulo migrado a ruta: /app/redes */}

      {/* M�dulos migrados a rutas: /app/matriz, /app/rueda */}

      {/* Focus Area Detail Modal → pantalla ÁREA FOCO (diseño de fotos) */}
      {selectedFocusArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedFocusArea(null)} />
          <div className="relative w-full h-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-md shadow-2xl z-10">
            <DiagnosticoRueda
              key={selectedFocusArea}
              avatarIndex={userData.avatar_index}
              userName={userData.username}
              onClose={() => { setSelectedFocusArea(null); ruedaService.resumenDashboard().then(setResumenRueda).catch(() => {}); }}
              onGoMetaAnual={() => { setSelectedFocusArea(null); setShowGranMetaAnual(true); }}
              pantallaInicial="acciones"
              focoInicial={selectedFocusArea}
              onNavigate={(s) => { if (s === 'rueda') return; setSelectedFocusArea(null); goSection(s); }}
            />
          </div>
        </div>
      )}

      {/* Agent Settings Modal */}
      {showAgentSettings && (
        <AgentSettings onClose={() => setShowAgentSettings(false)} />
      )}

      {/* FocusIA Feedback Popup */}
      {showFocusIAFeedback && (
        <FocusIAFeedback
          userName={userData.username}
          onOpenChat={() => setShowAgentSettings(true)}
          onDismiss={() => setShowFocusIAFeedback(false)}
        />
      )}

      {/* AgentChat removed - now integrated into CardAyudaIA */}
    </div>

  );
};

export default Dashboard;
export const FechasImportantesCard: React.FC<FechasImportantesProps> = ({ dayActive = new Date().getDate(), recordatorios, onAddRecordatorio, onEditRecordatorio, onDeleteRecordatorio }) => {
  const ahora = new Date();
  const añoActual = ahora.getFullYear();
  const mesActual = ahora.getMonth();

  const nombreMeses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  const diasSemana = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const primerDia = new Date(añoActual, mesActual, 1);
  const diasEnMes = new Date(añoActual, mesActual + 1, 0).getDate();
  const diaSemanaInicio = primerDia.getDay();

  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const recordatoriosPorDia = useMemo(() => {
    const map: Record<number, RecordatorioData[]> = {};
    const list = Array.isArray(recordatorios)
      ? recordatorios
      : Array.isArray((recordatorios as any)?.results)
        ? (recordatorios as any).results
        : [];
    list.forEach((r: any) => {
      if (!r?.fecha_hora) return;
      const d = new Date(r.fecha_hora);
      if (Number.isNaN(d.getTime())) return;
      if (d.getMonth() === mesActual && d.getFullYear() === añoActual) {
        const dia = d.getDate();
        if (!map[dia]) map[dia] = [];
        map[dia].push(r);
      }
    });
    return map;
  }, [recordatorios, mesActual, añoActual]);

  const handleDayClick = (dia: number) => {
    setSelectedDay(dia);
    onAddRecordatorio?.(dia);
  };

  const selectedRecordatorios = selectedDay ? recordatoriosPorDia[selectedDay] || [] : [];

  return (
  <div className="flex flex-col h-55 w-50 mt-2 ml-28 rounded-md items-center overflow-hidden">
      <div className="bg-gradient-to-r from-[#2b44ff] via-[#0b153a] to-[#040817] dark:bg-none dark:bg-[#070309] dark:border dark:border-white/10 text-white dark:text-[#fdba74] text-center py-1 text-[11px] font-bold tracking-[0.2em] uppercase mt-1.5 mx-2 w-[186px] rounded-sm select-none shrink-0">
        FECHAS IMPORTANTES
      </div>
       <div className="bg-[#fff2ef] p-1 flex flex-col mt-1.5 mb-1.5 rounded-sm border border-[#b56fdc] dark:border-2 dark:border-[#8b5cf6] dark:shadow-[0_0_15px_rgba(139,92,246,0.25)] w-[186px] h-[200px] flex-1 min-h-0">
        
        <div className="flex items-center justify-between w-full mb-1 shrink-0">
          <span className="bg-[#f7a5a5] text-[#1a2a4f] text-[10px] font-bold px-1.5 py-0.5 rounded-md  w-[35px] h-[20px]">{añoActual}</span>
          <span className="text-[#1a2a4f] text-[12px] font-bold tracking-wide uppercase">{nombreMeses[mesActual]}</span>
        </div>

        <div className="grid grid-cols-7 grid-rows-[auto_repeat(6,1fr)] w-full h-[180px] rounded-sm">
          {diasSemana.map((d) => (
            <div key={d} className="bg-[#f7a5a5] text-[#1a2a4f] text-[8px] font-bold text-center py-0.5 uppercase flex items-center justify-center">{d}</div>
          ))}
          {Array.from({ length: diaSemanaInicio }).map((_, i) => (
            <div key={`pad-${i}`} className="p-[1px]"><div className="bg-[#f5e8e4] w-[2px] h-[2px] rounded-sm" /></div>
          ))}
          {Array.from({ length: diasEnMes }, (_, i) => i + 1).map((dia) => (
            <div
              key={dia}
              onClick={() => handleDayClick(dia)}
              className={`p-[1px] cursor-pointer ${dia === selectedDay ? '' : ''}`}
            >
              <div className={`relative text-center text-[10px] py-1 h-full flex items-center justify-center rounded-sm transition-colors ${
                dia === selectedDay
                  ? 'bg-[#1a2a4f] text-white font-bold'
                  : recordatoriosPorDia[dia]?.length
                    ? 'bg-[#e8a8a0] text-[#1a2a4f] font-bold'
                    : 'bg-[#f5e8e4] text-[#1a2a4f] hover:bg-[#e0c8c0]'
              }`}>
                {dia}
                {recordatoriosPorDia[dia]?.length ? (
                  <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-0.5 rounded-full ${dia === selectedDay ? 'bg-white' : 'bg-[#e05050]'}`} />
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {selectedDay && (
          <div className="mt-1 pt-1 border-t border-[#c8a0c0] w-full shrink-0">
            {selectedRecordatorios.length === 0 ? (
              <div className="text-[7px] text-[#8a6a8a] text-center py-0.5 italic">{i18n.t('sin_recordatorios')}</div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {selectedRecordatorios.map((r) => (
                  <div key={r.id} className="flex items-center gap-0.5 bg-white/70 rounded px-1 py-0.5 border border-[#e8d0e8]/50">
                    <div className={`w-1 h-1 rounded-full shrink-0 ${r.categoria === 'Medicamento' ? 'bg-green-400' : r.categoria === 'Cumpleaños' ? 'bg-pink-400' : r.categoria === 'HoraOro' ? 'bg-yellow-400' : r.categoria === 'Equipo' ? 'bg-blue-400' : 'bg-purple-400'}`} />
                    <span className="text-[#3a1555] font-semibold truncate flex-1 leading-tight text-[8px]">{r.titulo}</span>
                    <button onClick={() => onEditRecordatorio?.(r)} className="text-[#2b44ff] hover:text-[#1a2a6c] shrink-0">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => onDeleteRecordatorio?.(r.id)} className="text-red-400 hover:text-red-600 shrink-0">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => onAddRecordatorio?.(selectedDay)}
              className="mt-0.5 flex items-center justify-center gap-0.5 text-[#2b44ff] hover:text-[#1a2a6c] text-[8px] font-bold transition-colors w-full"
            >
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Agregar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface AccionesPorDelegarInlineProps {
  kanbanTasks: KanbanTaskData[];
  onOpenDelegation: (task: KanbanTaskData) => void;
  onRefresh: () => void;
  onOpenModule?: () => void;
}

const AccionesPorDelegarInline: React.FC<AccionesPorDelegarInlineProps> = ({ kanbanTasks, onOpenDelegation, onRefresh, onOpenModule }) => {
  const delegarTasks = useMemo(
    () => kanbanTasks.filter(t => t.columna === 'Delegar').slice(0, 4),
    [kanbanTasks]
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const handleEdit = (task: KanbanTaskData) => {
    setEditingId(task.id);
    setEditText(task.titulo);
  };

  const handleSave = async (task: KanbanTaskData) => {
    if (!editText.trim()) return;
    try {
      await kanbanService.update(task.id, { titulo: editText.trim() });
      onRefresh();
    } catch (err) {
      console.error('Error editing task:', err);
    }
    setEditingId(null);
  };

  const handleDelete = async (task: KanbanTaskData) => {
    if (!window.confirm('¿Eliminar esta tarea delegada?')) return;
    try {
      await kanbanService.delete(task.id);
      onRefresh();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  return (
    <div
      onClick={() => onOpenModule?.()}
      className="bg-white dark:bg-transparent rounded-md border border-gray-100 dark:border-transparent shadow-md dark:shadow-none overflow-hidden w-70 h-35 mt-2 flex flex-col cursor-pointer hover:shadow-lg transition-shadow "
      title={i18n.t('acciones_por_delegar')}
    >
      <div className="bg-gradient-to-r from-[#2b44ff] via-[#0b153a] to-[#040817] dark:bg-none dark:bg-transparent text-white dark:text-[#fda4af] text-center py-1.5 text-[10px] sm:text-xs font-bold tracking-widest uppercase rounded-md mt-2 mx-2 select-none shrink-0">
        ACCIONES POR DELEGAR
      </div>
      <div className="mx-2 mt-2 mb-2 rounded-md flex-1 flex flex-col overflow-hidden">
        <table className="w-full border-collapse shrink-0">
          <thead>
            <tr>
              <th className="w-2/3 p-1.5">
                <div className="w-full bg-gradient-to-r from-[#ffe29f] to-[#fecaca] dark:from-[#fde68a] dark:to-[#f472b6] text-slate-800 dark:text-[#14050c] text-[10px] py-1 px-1 rounded-md font-bold tracking-wider uppercase text-center">{i18n.t('accion_hwtz')}</div>
              </th>
              <th className="w-1/3 p-1.5">
                <div className="w-full bg-gradient-to-r from-[#ffe29f] to-[#fecaca] dark:from-[#fde68a] dark:to-[#f472b6] text-slate-800 dark:text-[#14050c] text-[10px] py-1 px-1 rounded-md font-bold tracking-wider uppercase text-center">{i18n.t('responsable_x5dn')}</div>
              </th>
            </tr>
          </thead>
        </table>
        <div className="px-2 pb-2 pt-1 flex flex-col gap-1.5 custom-scrollbar">
          {delegarTasks.length === 0 && (
            <p className="text-[9px] text-gray-400 italic text-center py-2">Sin acciones por delegar</p>
          )}
          {delegarTasks.map((task) => (
            <div key={task.id} className="flex gap-1.5 items-center">
              <div className="flex-1 bg-[#f4f5f8] dark:bg-white rounded-md h-5 flex items-center border border-transparent group">
                {editingId === task.id ? (
                  <input
                    type="text"
                    value={editText}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full bg-transparent border-none outline-none focus:ring-0 text-slate-700 dark:text-slate-800 text-[9px] px-1.5"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave(task);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onBlur={() => handleSave(task)}
                  />
                ) : (
                  <span
                    className="w-full text-slate-700 dark:text-slate-800 text-[9px] px-1.5 truncate cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); handleEdit(task); }}
                    title={task.titulo}
                  >
                    {task.titulo}
                  </span>
                )}
              </div>
              <div className="w-[70px] bg-[#f4f5f8] dark:bg-white rounded-md h-5 flex items-center justify-between px-1.5" title={task.responsable || 'Sin responsable'}>
                <span className={`text-[8px] truncate flex-1 ${task.responsable ? 'text-slate-700 dark:text-slate-800 not-italic font-medium' : 'text-slate-600 dark:text-slate-700 italic'}`}>
                  {task.responsable || '-'}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenDelegation(task); }}
                    className="text-blue-600 hover:text-blue-800"
                    title="Delegar"
                  >
                    <Send className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(task); }}
                    className="text-red-500 hover:text-red-700"
                    title="Eliminar"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CategoriasMenu: React.FC = () => {
  const navigate = useNavigate();

  const categorias = [
    { id: 'humor', label: 'HUMOR', esPrimario: false },
    { id: 'salud', label: 'SALUD', esPrimario: true },
    { id: 'hobbies', label: 'HOBBIES', esPrimario: false },
    { id: 'viajes', label: 'VIAJES', esPrimario: false },
    { id: 'diversion', label: 'DIVERSIÓN', esPrimario: true },
    { id: 'reflexion', label: 'REFLEXIÓN', esPrimario: false },
  ] as const;

  const abrir = (id: string) => navigate(`/app/inspiracion?categoria=${id}`);

  return (
    <div className="flex justify-between items-center gap-1.5 w-150 -ml-19">
      {categorias.slice(0, 3).map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => abrir(cat.id)}
          className={`text-[9px] px-1.5 py-2 rounded-md font-bold uppercase whitespace-nowrap transition-colors duration-200 dark:bg-[linear-gradient(90deg,#1d4ed8_0%,#17153b_55%,#060309_100%)] dark:border dark:border-blue-500/30 ${
            cat.esPrimario
              ? 'bg-[linear-gradient(90deg,#000000,#3533cd)] text-white'
              : 'bg-gradient-to-r from-[#040817] via-[#0b153a] to-[#2b44ff] text-white'
          }`}
        >
          {cat.label}
        </button>
      ))}
      <div className="flex-shrink-0 flex items-center justify-center">
        <button
          type="button"
          onClick={() => navigate('/app/inspiracion')}
          title="Centro de Inspiración"
          className="px-1.5 py-2 rounded-full hover:scale-110 active:scale-95 transition-transform"
        >
          <img
            src="/focussia.png"
            alt={i18n.t('focus_jk9t')}
            className="w-6 h-6"
            onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
          />
        </button>
      </div>
      {categorias.slice(3).map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => abrir(cat.id)}
          className={`text-[9px] px-1.5 py-2 rounded-md font-bold uppercase whitespace-nowrap transition-colors duration-200 dark:bg-[linear-gradient(90deg,#1d4ed8_0%,#17153b_55%,#060309_100%)] dark:border dark:border-blue-500/30 ${
            cat.esPrimario
              ? 'bg-[linear-gradient(90deg,#000000,#3533cd)] text-white'
              : 'bg-[linear-gradient(90deg,#000000,#3533cd)] text-white'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
};

const CardAyudaIA: React.FC<{ onOpenSettings?: () => void; open?: boolean; onClose?: () => void }> = ({ onOpenSettings, open, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (open !== undefined) setIsOpen(open);
  }, [open]);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };
  const [messages, setMessages] = useState<Array<{ id: string; rol: string; mensaje: string; created_at: string }>>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
          rol: 'ASSISTANT',
          mensaje: '¡Hola! Soy FocusIA, tu asistente de productividad personal. ¿En qué puedo ayudarte hoy? Puedo revisar tus tareas, darte recomendaciones o simplemente charlar sobre tu progreso.',
          created_at: new Date().toISOString(),
        }]);
      }
    } catch {}
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadHistory();
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);

    const userMsg = { id: `user-${Date.now()}`, rol: 'USER', mensaje: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await agentService.chat(text, sessionId);
      setSessionId(res.session_id);
      const botMsg = { id: `bot-${Date.now()}`, rol: 'ASSISTANT', mensaje: res.respuesta, created_at: new Date().toISOString() };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, rol: 'ASSISTANT', mensaje: 'Lo siento, tuve un problema al procesar tu mensaje. ¿Puedes intentarlo de nuevo?', created_at: new Date().toISOString() }]);
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
    <div className="p-2 rounded-md border border-purple-500/40 bg-white dark:bg-[linear-gradient(90deg,#f472b6_0%,#fb923c_50%,#fef08a_100%)] dark:border-pink-400/50 shadow-[0_18px_40px_rgba(27,20,64,0.18)] flex flex-col w-150 -ml-20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase text-gray-800 dark:text-[#14050c] select-none mb-2"
      >
        <Bot className="w-4 h-4 text-[#3533cd] dark:text-[#14050c]" />
        ¿Necesitas Ayuda?
        <ChevronRight className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {!isOpen && (
        <input
          type="text"
          onClick={() => setIsOpen(true)}
          readOnly
          className="w-full border-none border-b border-dotted border-gray-400 dark:border-[#14050c]/60 text-center text-xs italic text-gray-500 dark:text-[#14050c] py-1 bg-transparent placeholder-gray-400/70 dark:placeholder-[#14050c]/80 outline-none cursor-pointer"
          placeholder={i18n.t('preguntale_a_la_ia')}
        />
      )}

      {isOpen && (
        <>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[250px] scrollbar-hide bg-gray-50/50 dark:bg-white/90 rounded-md mb-2">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.rol === 'USER' ? 'justify-end' : 'justify-start'}`}>
                {msg.rol !== 'USER' && (
                  <div className="w-5 h-5 rounded-full bg-[#3533cd]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-[#3533cd]" />
                  </div>
                )}
                <div className={`max-w-[80%] px-2.5 py-1.5 rounded-md text-[11px] leading-relaxed whitespace-pre-wrap ${
                  msg.rol === 'USER'
                    ? 'bg-[#3533cd] text-white rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200'
                }`}>
                  {msg.mensaje}
                </div>
                {msg.rol === 'USER' && (
                  <div className="w-5 h-5 rounded-full bg-[#3533cd] flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-5 h-5 rounded-full bg-[#3533cd]/10 flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 text-[#3533cd]" />
                </div>
                <div className="bg-white rounded-md px-2.5 py-1.5 border border-gray-200">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3533cd]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-center gap-2 bg-white rounded-md border border-gray-200 px-2.5 py-1.5 focus-within:border-[#3533cd]/50 transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={i18n.t('escribe_tu_mensaje_7pid')}
              className="flex-1 bg-transparent outline-none text-[11px] text-slate-800 placeholder:text-gray-400"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="p-1 rounded-md bg-[#3533cd] text-white hover:bg-[#2a28b0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const BlockDeNotas: React.FC = () => {
  const [lineas, setLineas] = useState<Record<number, string>>({});
  const notaIdRef = useRef<number | null>(null);
  const cargadoRef = useRef(false);

  useEffect(() => {
    if (cargadoRef.current) return;
    cargadoRef.current = true;
    keepNotaService.get().then((data) => {
      if (data.length > 0) {
        const nota = data[0];
        notaIdRef.current = nota.id;
        const partes = (nota.contenido || '').split('\n');
        const obj: Record<number, string> = {};
        partes.forEach((p, i) => { obj[i] = p; });
        setLineas(obj);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const values = Object.keys(lineas).sort((a, b) => Number(a) - Number(b)).map(k => lineas[Number(k)]);
    const contenido = values.join('\n').trim();
    if (contenido === '') return;
    const id = notaIdRef.current;
    const timer = setTimeout(() => {
      if (id !== null) {
        keepNotaService.update(id, { contenido }).catch(() => {});
      } else {
        keepNotaService.create({ contenido } as any).then((res) => {
          notaIdRef.current = res.id;
        }).catch(() => {});
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [lineas]);

  const handleLineChange = (index: number, value: string) => {
    setLineas((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  return (
    <div className="bg-white dark:bg-[linear-gradient(135deg,#2e1065_0%,#6b21a8_50%,#a855f7_100%)] rounded-md border border-black-200 dark:border-2 dark:border-[#c084fc]/80 shadow-sm dark:shadow-[0_0_20px_rgba(168,85,247,0.3)] overflow-hidden cursor-pointer hover:shadow-md transition-shadow w-56 flex-1 h-25 ">
      <div className="bg-gradient-to-r from-[#000000] to-[#3533cd] dark:bg-none dark:bg-[#070309] text-white dark:text-[#fde047] text-center py-1.5 rounded-lg text-[10px] sm:text-xs font-bold tracking-widest uppercase mt-2 mx-2 select-none shrink-0">
        BLOCK DE NOTAS
      </div>
      <div className="px-2 pb-1 pt-1.5 space-y-1.5 relative h-30">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className="w-full bg-[#f4f5f8] dark:bg-white/95 rounded-md h-3 flex items-center border border-transparent focus-within:border-slate-200 transition-all shrink-0"
          >
            <input
              type="text"
              value={lineas[index] || ''}
              onChange={(e) => handleLineChange(index, e.target.value)}
              placeholder={i18n.t('escriba_aqui_1acb')}
              className="w-full bg-transparent border-none outline-none focus:ring-0 text-slate-700 dark:text-slate-800 italic text-[10px] font-normal placeholder-gray-400 px-2"
            />
          </div>
        ))}
        <div className="absolute bottom-0 right-0 w-[55px] h-[55px] pointer-events-none z-10 flex items-center justify-center">
          <img
            alt={i18n.t('bulb')}
            src="public/foco.png"
            className="w-[200px] h-[200px] object-contain select-none filter drop-shadow-sm -mt-18"
          />
        </div>
      </div>
    </div>
  );
};

function HoraDeOroFamiliar({ refreshKey, onOpenSlot, onOpenModule }: {
  refreshKey: number;
  onOpenSlot: (dia: string, posicion: number) => void;
  onOpenModule: () => void;
}): React.ReactElement {
  // Doc 24 §II.3 — los siete días con dos espacios visibles cada uno.
  const goldHours: { label: string; dia: string }[] = [
    { label: 'LUNES', dia: 'Lunes' }, { label: 'LUNES', dia: 'Lunes' },
    { label: 'MARTES', dia: 'Martes' }, { label: 'MARTES', dia: 'Martes' },
    { label: 'MIERCOLES', dia: 'Miércoles' }, { label: 'MIERCOLES', dia: 'Miércoles' },
    { label: 'JUEVES', dia: 'Jueves' }, { label: 'JUEVES', dia: 'Jueves' },
    { label: 'VIERNES', dia: 'Viernes' }, { label: 'VIERNES', dia: 'Viernes' },
    { label: 'SÁBADO', dia: 'Sábado' }, { label: 'SÁBADO', dia: 'Sábado' },
    { label: 'DOMINGO', dia: 'Domingo' }, { label: 'DOMINGO', dia: 'Domingo' },
  ];

  const [dias, setDias] = useState<HoraOroDia[]>([]);

  useEffect(() => {
    let activo = true;
    horaOroService.planificador()
      .then(data => { if (activo) setDias(data.dias); })
      .catch(() => { /* el módulo reporta el error */ });
    return () => { activo = false; };
  }, [refreshKey]);

  const experienciaDe = (dia: string, posicion: number) =>
    dias.find(d => d.dia === dia)?.experiencias[posicion];

  return (
    <div className="bg-white dark:bg-transparent border-2 border-gray-100 dark:border-transparent card-shadow dark:shadow-none overflow-hidden w-full flex flex-col select-none rounded-md mt-2">
      <button
        type="button"
        onClick={onOpenModule}
        title={i18n.t('abrir_el_planificador_semanal')}
        className="bg-[#0b153a] dark:bg-[#070309] dark:border dark:border-white/10 text-white dark:text-[#fdba74] text-center py-2.5 font-bold text-xs uppercase tracking-widest w-full rounded-md hover:brightness-125 transition-all"
      >
        HORA DE ORO FAMILIAR
      </button>
      <div className="grid grid-cols-[1fr_60px] gap-1 text-[10px] font-bold text-center text-slate-800 px-3.5 py-1 bg-transparent select-none -ml-1">
  
  <div className="bg-gradient-to-r from-[#ffe4a0] via-[#ff9b9b] to-[#ff7a7a] dark:from-[#fde68a] dark:to-[#f472b6] py-1 uppercase tracking-wider rounded-md border border-black/80 dark:border-pink-300/40 shadow-sm flex items-center justify-center">
    ACCIÓN
  </div>
  
  <div className="bg-gradient-to-r from-[#ffe4a0] to-[#ff7a7a] dark:from-[#fde68a] dark:to-[#f472b6] py-1 uppercase tracking-wider rounded-md border border-black/80 dark:border-pink-300/40 shadow-sm flex items-center justify-center">
    DÍAS
  </div>

</div>
      <div className="px-2 pb-2 pt-1 space-y-1 flex-1 flex flex-col justify-between">
        {goldHours.map((day, index) => {
          const posicion = index % 2;
          const experiencia = experienciaDe(day.dia, posicion);
          return (
            <div key={index} className="flex gap-1.5 items-center">
              <button
                type="button"
                onClick={() => onOpenSlot(day.dia, posicion)}
                title={experiencia ? `Cambiar «${experiencia.actividad}»` : 'Elegir una experiencia'}
                className={`flex-1 min-w-0 border rounded-md text-[9px] px-2 h-5 text-left truncate focus:ring-0 outline-none font-medium transition-colors ${
                  experiencia
                    ? 'border-[#c7bcff] bg-[#f4f1ff] text-slate-700 hover:border-[#8b7bff] dark:bg-white dark:text-slate-800 dark:border-white/80'
                    : 'border-gray-200 text-gray-400 hover:border-indigo-300 dark:bg-white dark:text-slate-600 dark:border-white/80 dark:italic'
                }`}
              >
                {experiencia ? experiencia.actividad : 'Elegir experiencia'}
              </button>
              <span className="text-[7px] font-bold border border-gray-300 dark:border-white/80 bg-slate-50 dark:bg-white text-slate-600 dark:text-slate-900 rounded-md h-5 px-1 w-[60px] flex items-center justify-center uppercase shrink-0 tracking-tighter leading-none">
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClimaComuna({ temp, descripcion, lugar, loading, error, icono, humedad, sensacion, onAbrir }: {
  temp: number; descripcion: string; lugar: string;
  loading: boolean; error: string; icono: string;
  humedad: number; sensacion: number;
  onAbrir: () => void;
}): React.ReactElement {
  return (
  <div
    className="bg-white dark:bg-transparent rounded-md border-2 border-gray-100 dark:border-transparent shadow-md dark:shadow-none overflow-hidden w-full h-auto mx-0 cursor-pointer hover:shadow-lg transition-shadow"
    onClick={onAbrir}
    title="Ver pronóstico completo"
  >
    <div className="bg-white dark:bg-transparent rounded-md border-2 border-gray-100 dark:border-transparent card-shadow dark:shadow-none overflow-hidden w-full max-w-sm select-none gap-2 flex flex-col mt-2">
      <div className="bg-gradient-to-r from-[#2b44ff] via-[#0b153a] to-[#040817] dark:bg-none dark:bg-transparent text-white dark:text-[#fda4af] text-center py-1.5 text-[10px] sm:text-xs font-bold tracking-widest uppercase rounded-md select-none w-full">
        CLIMA EN MI COMUNA
      </div>
      
      <div className="p-3 text-[10px] font-medium text-slate-700 dark:text-slate-900">
        {loading ? (
          <div className="flex items-center gap-2 justify-center py-2">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-gray-500 dark:text-pink-200 font-bold uppercase tracking-wider">{i18n.t('obteniendo_clima')}</span>
          </div>
        ) : error ? (
          <div className="text-center py-2">
            <span className="text-[9px] text-red-400 font-medium">{error}</span>
          </div>
        ) : (
          <table className="w-full border-separate border-spacing-1 -mt-4">
            <thead>
              <tr>
                <th className="w-1/2 p-0.5">
                  <div className="w-full bg-gradient-to-r from-[#ffe29f] to-[#fecaca] dark:from-[#fde68a] dark:to-[#f472b6] text-slate-800 dark:text-[#14050c] text-[10px] py-1 px-1 rounded-md font-bold tracking-wider uppercase border border-orange-200/40 text-center">{i18n.t('tiempo')}</div>
                </th>
                <th className="w-1/2 p-0.5">
                  <div className="w-full bg-gradient-to-r from-[#ffe29f] to-[#fecaca] dark:from-[#fde68a] dark:to-[#f472b6] text-slate-800 dark:text-[#14050c] text-[10px] py-1 px-1 rounded-md font-bold tracking-wider uppercase border border-orange-200/40 text-center">{i18n.t('detalle')}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-1 dark:bg-white dark:rounded-md">
                  <span className="font-bold text-slate-900">{icono}</span> {descripcion}
                </td>
                <td className="p-1 text-gray-400 dark:text-slate-700 italic dark:bg-white dark:rounded-md">{i18n.t('ahora')}</td>
              </tr>
              <tr>
                <td className="p-1 dark:bg-white dark:rounded-md">
                  <span className="font-black text-slate-900">{temp}°C</span> Temperatura
                </td>
                <td className="p-1 text-gray-400 dark:text-slate-700 italic dark:bg-white dark:rounded-md">{i18n.t('actual_lkfm')}</td>
              </tr>
              <tr>
                <td className="p-1 dark:bg-white dark:rounded-md">
                  <span className="font-black text-slate-900">{humedad}%</span> Humedad
                </td>
                <td className="p-1 text-gray-400 dark:text-slate-700 italic dark:bg-white dark:rounded-md">{lugar}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  </div>
  );
}

/** Mapa compacto weather_code de Open-Meteo → emoji + descripción. */
function infoDeCode(code: number): { icono: string; descripcion: string } {
  if (code === 0) return { icono: '☀️', descripcion: 'Soleado' };
  if (code <= 2) return { icono: '🌤️', descripcion: 'Parcialmente nublado' };
  if (code === 3) return { icono: '☁️', descripcion: 'Nublado' };
  if (code <= 49) return { icono: '🌫️', descripcion: 'Niebla' };
  if (code <= 57) return { icono: '🌦️', descripcion: 'Llovizna' };
  if (code <= 67) return { icono: '🌧️', descripcion: 'Lluvia' };
  if (code <= 77) return { icono: '🌨️', descripcion: 'Nieve' };
  if (code <= 82) return { icono: '🌧️', descripcion: 'Chubascos' };
  if (code <= 86) return { icono: '🌨️', descripcion: 'Nieve intensa' };
  return { icono: '⛈️', descripcion: 'Tormenta' };
}

/** Modal del pronóstico completo (mockup): actual, próximas horas, semana y sugerencia. */
function ClimaDetalleModal({ clima, onClose }: {
  clima: { temp: number; descripcion: string; lugar: string; icono: string;
           humedad: number; sensacion: number; loading: boolean; error: string;
           actualizado: number; lat: number | null; lon: number | null };
  onClose: () => void;
}): React.ReactElement {
  type HoraPrev = { hora: string; icono: string; temp: number; descripcion: string };
  type DiaPrev = { etiqueta: string; icono: string; max: number; min: number; descripcion: string };
  const [tab, setTab] = useState<'hoy' | 'semana'>('hoy');
  const [horas, setHoras] = useState<HoraPrev[] | null>(null);
  const [dias, setDias] = useState<DiaPrev[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);
  const [recargado, setRecargado] = useState<number>(clima.actualizado);

  const haceMin = (ms: number) => {
    const min = Math.floor((Date.now() - ms) / 60000);
    if (min <= 0) return 'hace un momento';
    if (min < 60) return `hace ${min} min`;
    return `hace ${Math.floor(min / 60)} h`;
  };

  const cargar = useCallback(async (pLat: number, pLon: number) => {
    setCargando(true);
    setFallo(false);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${pLat}&longitude=${pLon}` +
        `&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min` +
        `&timezone=auto&forecast_hours=12&forecast_days=7`
      );
      const data = await res.json();
      const tiempos: string[] = data.hourly?.time || [];
      // Primera franja horaria a futuro (timezone=auto devuelve horas locales).
      const ahoraHH = new Date().getHours();
      let base = 0;
      for (let i = 0; i < tiempos.length; i++) {
        const hh = Number(tiempos[i].slice(11, 13));
        if (hh >= ahoraHH) { base = i; break; }
      }
      const proximas: HoraPrev[] = tiempos.slice(base, base + 3).map((t: string, i: number) => {
        const code: number = data.hourly.weather_code[base + i] ?? 0;
        const info = infoDeCode(code);
        return {
          hora: t.slice(11, 16),
          icono: info.icono,
          temp: Math.round(data.hourly.temperature_2m[base + i]),
          descripcion: info.descripcion,
        };
      });
      setHoras(proximas);
      const diasData: DiaPrev[] = (data.daily?.time as string[] || []).slice(0, 7).map((t: string, i: number) => {
        const code: number = data.daily.weather_code[i] ?? 0;
        const info = infoDeCode(code);
        return {
          etiqueta: new Date(t + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }),
          icono: info.icono,
          max: Math.round(data.daily.temperature_2m_max[i]),
          min: Math.round(data.daily.temperature_2m_min[i]),
          descripcion: info.descripcion,
        };
      });
      setDias(diasData);
      setRecargado(Date.now());
    } catch {
      setFallo(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (clima.lat !== null && clima.lon !== null) cargar(clima.lat, clima.lon);
    else setCargando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refrescar = () => {
    if (clima.lat !== null && clima.lon !== null) cargar(clima.lat, clima.lon);
  };

  // Sugerencia de FocusIA según lo que viene: lluvia hoy/mañana o tiempo bueno.
  const sugerencia = useMemo(() => {
    const textoHoy = clima.descripcion.toLowerCase();
    const llueveHoy = /lluv|chubas|tormenta|llovizn/.test(textoHoy);
    const manana = (dias || [])[1];
    const llueveManana = !!manana && /nublado|lluvia|chubas|tormenta|llovizn/i.test(manana.descripcion);
    if (llueveHoy) {
      return 'Está lloviendo en tu zona: si tenías actividades al aire libre, considera alternativas en casa o bajo techo.';
    }
    if (llueveManana && manana) {
      return `Mañana se espera ${manana.descripcion.toLowerCase()}: considera adelantar hoy tus actividades al aire libre.`;
    }
    return 'El clima acompaña: hoy es un buen momento para una actividad al aire libre con tu familia.';
  }, [clima.descripcion, dias]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Clima en mi comuna">
      <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} tabIndex={-1} aria-label="Cerrar" />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Cabecera (mockup) */}
        <div className="bg-[#3533cd] text-white px-5 py-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-black tracking-widest uppercase">
            ☁️ Clima en mi comuna
          </span>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 text-white/80 hover:text-white" aria-label="Cerrar">×</button>
        </div>

        {clima.loading ? (
          <div className="py-14 flex items-center justify-center text-slate-400">
            <div className="w-6 h-6 border-2 border-[#3533cd] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clima.error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-500 font-semibold">{clima.error}</p>
            <p className="text-xs text-slate-400 mt-2">No hay ubicación disponible para calcular el pronóstico.</p>
          </div>
        ) : (
          <>
            {/* Ubicación + actualización */}
            <div className="px-5 pt-3.5 pb-2 flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span>📍</span> {clima.lugar}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">Actualizado {haceMin(recargado || clima.actualizado)}</span>
                <button
                  type="button"
                  onClick={refrescar}
                  disabled={cargando}
                  title="Actualizar"
                  className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Contenido: próximas horas / semana */}
            {cargando || !horas ? (
              fallo ? (
                <p className="px-5 py-6 text-center text-xs text-slate-400">No se pudo cargar el pronóstico. Intenta actualizar.</p>
              ) : (
                <div className="py-8 flex items-center justify-center text-slate-400">
                  <div className="w-5 h-5 border-2 border-[#3533cd] border-t-transparent rounded-full animate-spin" />
                </div>
              )
            ) : tab === 'hoy' ? (
              <div className="px-4 pb-1 grid grid-cols-3 gap-2">
                {horas.map((h, i) => (
                  <div
                    key={h.hora}
                    className={`rounded-2xl flex flex-col items-center gap-1 py-3 ${i === 0 ? 'bg-[#FFF8E1] shadow-sm' : 'bg-slate-50'}`}
                  >
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{h.hora}</span>
                    <span className="text-2xl leading-none">{h.icono}</span>
                    <span className="text-lg font-black text-slate-800 leading-none">{h.temp}°</span>
                    <span className="text-[9px] text-slate-500 text-center px-1 leading-tight">{h.descripcion}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 pb-1 flex flex-col gap-1.5">
                {(dias || []).map(d => (
                  <div key={d.etiqueta} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                    <span className="w-16 text-xs font-bold text-slate-600 capitalize">{d.etiqueta}</span>
                    <span className="text-xl leading-none">{d.icono}</span>
                    <span className="text-xs text-slate-500 flex-1 min-w-0 truncate">{d.descripcion}</span>
                    <span className="text-xs font-black text-slate-700">{d.max}°</span>
                    <span className="text-xs text-slate-400">{d.min}°</span>
                  </div>
                ))}
              </div>
            )}

            {/* Botón alternador de vista */}
            <div className="px-4 py-3">
              <button
                type="button"
                onClick={() => setTab(tab === 'hoy' ? 'semana' : 'hoy')}
                disabled={fallo || !dias}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#F3F0FF] text-[#3533cd] text-sm font-bold py-2.5 hover:bg-[#E8E1FF] disabled:opacity-40 transition"
              >
                📅 {tab === 'hoy' ? 'Ver pronóstico semanal' : 'Volver al pronóstico de hoy'}
              </button>
            </div>

            {/* Sugerencia de FocusIA */}
            <div className="mx-4 mb-2 rounded-xl bg-[#F3F0FF] border border-[#DDD6FE] p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#6236FF] uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5" /> Sugerencia FocusIA
              </p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{sugerencia}</p>
            </div>

            {/* Pie */}
            <p className="px-5 pb-3 pt-1 text-[9px] text-slate-400 flex items-center gap-1.5">
              <Info className="w-3 h-3 shrink-0" /> La información se actualiza al abrir la app y puedes refrescarla con el botón.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function CalendarWidget(): React.ReactElement {
  const ahora = new Date();
  const [hora, setHora] = useState(ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }));
  const nombreMeses = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const mes = nombreMeses[ahora.getMonth()];
  const dia = ahora.getDate();
  const año = ahora.getFullYear();

  useEffect(() => {
    const interval = setInterval(() => {
      setHora(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []); 

  return (
  <div className="bg-white dark:bg-transparent rounded-md border-2 border-gray-100 dark:border-transparent shadow-md dark:shadow-none overflow-hidden w-40 h-45 ml-15 mt-2">
    <div className="bg-white dark:bg-transparent rounded-md  dark:border-transparent shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-none overflow-hidden w-[170px] h-[170px] select-none flex flex-col">
      <div className="bg-gradient-to-r from-[#000000] to-[#3533cd] dark:bg-none dark:bg-[#070309] dark:border dark:border-white/10 px-2 py-2 flex items-center justify-center gap-6 border-b border-white/5 shrink-0 rounded-md ml-2 mt-1 w-35">
                 <img
            alt={i18n.t('calendar2')}
            src="public/calendar2.png"
            className="w-[20px] h-full object-contain select-none filter drop-shadow-sm"
          /><span className="text-white dark:text-[#fde047] font-bold text-[13px] tracking-wide">{hora}</span>
               
      </div>
      
      <div className="bg-[linear-gradient(135deg,#200013,#814B8D,#143CCC)] dark:border dark:border-purple-500/40 p-3 flex flex-col items-center justify-center flex-1 w-35 h-30 mt-2 ml-2 rounded-md">
        <div className="relative flex flex-col items-center justify-center -mt-3">
          <svg viewBox="0 0 90 100" className="w-[80px] h-[90px]" xmlns="http://www.w3.org/2000/svg">
            {/* Hooks */}
            <rect x="22" y="0" width="6" height="14" rx="3" fill="#b0b8c4" stroke="#8a92a0" strokeWidth="0.5"/>
            <rect x="62" y="0" width="6" height="14" rx="3" fill="#b0b8c4" stroke="#8a92a0" strokeWidth="0.5"/>
            <rect x="20" y="8" width="10" height="5" rx="2.5" fill="#9aa3b1" stroke="#7a8290" strokeWidth="0.5"/>
            <rect x="60" y="8" width="10" height="5" rx="2.5" fill="#9aa3b1" stroke="#7a8290" strokeWidth="0.5"/>
            {/* Calendar body */}
            <rect x="4" y="12" width="82" height="84" rx="6" fill="white" stroke="#d1d5db" strokeWidth="1"/>
            {/* Blue header */}
            <rect x="4" y="12" width="82" height="24" rx="6" fill="#3b82f6"/>
            <rect x="4" y="30" width="82" height="6" fill="#3b82f6"/>
            {/* Month text */}
            <text x="45" y="28" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="sans-serif">{mes}</text>
            {/* Grid lines */}
            <line x1="4" y1="42" x2="86" y2="42" stroke="#e5e7eb" strokeWidth="0.5"/>
            <line x1="4" y1="54" x2="86" y2="54" stroke="#e5e7eb" strokeWidth="0.5"/>
            <line x1="4" y1="66" x2="86" y2="66" stroke="#e5e7eb" strokeWidth="0.5"/>
            <line x1="4" y1="78" x2="86" y2="78" stroke="#e5e7eb" strokeWidth="0.5"/>
            <line x1="25" y1="36" x2="25" y2="96" stroke="#e5e7eb" strokeWidth="0.5"/>
            <line x1="45" y1="36" x2="45" y2="96" stroke="#e5e7eb" strokeWidth="0.5"/>
            <line x1="65" y1="36" x2="65" y2="96" stroke="#e5e7eb" strokeWidth="0.5"/>
            {/* Day number */}
            <text x="45" y="74" textAnchor="middle" fill="#1e293b" fontSize="28" fontWeight="bold" fontFamily="sans-serif">{dia}</text>
          </svg>
        </div>
        <span className="text-white font-bold text-[16px] tracking-wide -mt-1">{año}</span>
      </div>
    </div>
  </div>
  );
};
