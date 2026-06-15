import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  workspaceService, invitationService, delegationService, authService, notificationService, kanbanService, recordatorioService, ruedaService, timeBlockService, objetivoSemanaService, keepNotaService, misionHoyService, billService, matrixService,
  InvitationData, DelegationData, NotificationData, WorkspaceData, WorkspaceMemberData, RuedaCategoria, TimeBlockData, ObjetivoSemanaData, KeepNotaData, MisionHoyData, RecordatorioData, FacturaData, MatrixItemData, KanbanTaskData
} from './services/api';


import { KanbanBoard } from './components/KanbanBoard';
import { NotificationToast } from './components/NotificationToast';
import { FormularioRueda } from './components/FormularioRueda';
import { useReminderToasts } from './hooks/useReminderToasts';
import { ActionButton } from './components/ActionButton';
import { AiMissionAssistant } from './components/AiMissionAssistant';
import { X, Moon, Sun, LogOut, User, Plus, ArrowRight, Calendar, Edit3, Info, CheckCircle2, Play, ChevronRight, Target, TrendingUp, CalendarDays, CheckCircle, CreditCard, Landmark, Receipt, AlertCircle, CheckSquare, Pill, Clock, Edit, Check, Zap, Trophy, Star, Shield, Flame, Users, Settings, Mail, Copy, Crown, ShieldCheck, UserPlus, Trash2, Send, Briefcase, Bell, MessageSquare, Sparkles } from 'lucide-react';


interface DashboardProps {
  onLogout: () => void;
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


const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [ruedaCompleta, setRuedaCompleta] = useState<RuedaCategoria[]>([]);
  const [showDelegarModal, setShowDelegarModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRecordatorioModal, setShowRecordatorioModal] = useState(false);
  const [showRuedaModal, setShowRuedaModal] = useState(false);
  const [showRuedaVideoModal, setShowRuedaVideoModal] = useState(false);
  const [showMatrizVideoModal, setShowMatrizVideoModal] = useState(false);
  const [showMatrizFormModal, setShowMatrizFormModal] = useState(false);
  const [showMetaAnualModal, setShowMetaAnualModal] = useState(false);
  const [showMetaMensualModal, setShowMetaMensualModal] = useState(false);
  const [showMetaSemanalModal, setShowMetaSemanalModal] = useState(false);
  const [showMetaDiariaModal, setShowMetaDiariaModal] = useState(false);
  const [showMedicamentosModal, setShowMedicamentosModal] = useState(false);
  const [showInicioModal, setShowInicioModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [showWorkspaceSettingsModal, setShowWorkspaceSettingsModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceData | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberData[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<InvitationData[]>([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLink, setInviteLink] = useState('');
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);

  const phrases = useMemo(
    () => [
      'Empieza el día con foco y energía.',
      'Prioriza lo importante y avanza con calma.',
      'Tus metas de hoy construyen tu éxito de mañana.',
      'Organiza, ejecuta y celebra cada pequeño logro.',
      'Haz de tu jornada una cadena de acciones significativas.'
    ],
    []
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentPhraseIndex((prevIndex) => (prevIndex + 1) % phrases.length);
    }, 8000);

    return () => clearInterval(intervalId);
  }, [phrases.length]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [showUserSettingsModal, setShowUserSettingsModal] = useState(false);
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [delegationTask, setDelegationTask] = useState<KanbanTaskData | null>(null);
  const [delegationEmail, setDelegationEmail] = useState('');
  const [delegationMessage, setDelegationMessage] = useState('');
  const [delegationLink, setDelegationLink] = useState('');
  const [delegations, setDelegations] = useState<{ sent: DelegationData[]; received: DelegationData[] }>({ sent: [], received: [] });
  const [delegationTab, setDelegationTab] = useState<'create' | 'received'>('create');
  const [showAccionesDelegarModal, setShowAccionesDelegarModal] = useState(false);

  const [userData, setUserData] = useState({ username: 'Brenda', email: '', avatar_url: '' });
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [medicamentos, setMedicamentos] = useState<Array<{

    id: number;
    nombre: string;
    hora: string;
    dosis: number;
    completado: boolean;
  }>>([
    { id: 1, nombre: 'Vitamina D', hora: '08:00', dosis: 1, completado: false },
    { id: 2, nombre: 'Omeprazol', hora: '20:00', dosis: 1, completado: false },
  ]);
  const [nuevoMedicamento, setNuevoMedicamento] = useState({ nombre: '', hora: '08:00', dosis: 1 });
  const [editandoMedicamento, setEditandoMedicamento] = useState<number | null>(null);
  const [facturas, setFacturas] = useState<FacturaData[]>([]);
  const [matrixItems, setMatrixItems] = useState<MatrixItemData[]>([]);
  const [savedRecordatorios, setSavedRecordatorios] = useState<RecordatorioData[]>([]);
  const [editingRecordatorio, setEditingRecordatorio] = useState<RecordatorioData | null>(null);
  const [fechasDayActive, setFechasDayActive] = useState<number>(16);
  const [showAiMissionModal, setShowAiMissionModal] = useState(false);
  const [selectedMissionText, setSelectedMissionText] = useState<string | null>(null);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockData[]>([]);
  const [objetivo, setObjetivo] = useState<ObjetivoSemanaData | null>(null);
  const [keepNota, setKeepNota] = useState<KeepNotaData | null>(null);
  const [misionHoy, setMisionHoy] = useState<MisionHoyData | null>(null);
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTaskData[]>([]);

  const [savingStatus, setSavingStatus] = useState<string>('');
  const [clima, setClima] = useState<{
    temp: number;
    sensacion: number;
    humedad: number;
    descripcion: string;
    icono: string;
    lugar: string;
    loading: boolean;
    error: string;
  }>({
    temp: 0, sensacion: 0, humedad: 0,
    descripcion: '', icono: '🌤️', lugar: '',
    loading: true, error: ''
  });
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
    const fetchClima = async (lat: number, lon: number) => {
      try {
        // Reverse geocoding con Nominatim
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=es`
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
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code&timezone=auto`
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
          error: ''
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
      setSavedRecordatorios(data);
    } catch (err) {
      console.error('Error fetching saved recordatorios:', err);
    }
  }, []);

  useEffect(() => {
    fetchSavedRecordatorios();
  }, [fetchSavedRecordatorios]);

  const medicamentosFromBackend = useMemo(() =>
    savedRecordatorios.filter(r => r.categoria === 'Medicamento'),
    [savedRecordatorios]
  );

  useEffect(() => {
    const fromBackend = medicamentosFromBackend.map(r => ({
      id: r.id,
      nombre: r.titulo,
      hora: new Date(r.fecha_hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
      dosis: 1,
      completado: r.tomado,
    }));
    if (fromBackend.length > 0) {
      setMedicamentos(fromBackend);
    }
  }, [medicamentosFromBackend]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await authService.getCurrentUser();
        setUserData({
          username: data.username,
          email: data.email,
          avatar_url: data.avatar_url || `https://ui-avatars.com/api/?name=${data.username}&background=f4d2d2&color=000`
        });
        setNewUsername(data.username);
        setNewAvatarUrl(data.avatar_url || '');
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };
    fetchUserData();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getAll();
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // 1 min
    return () => clearInterval(interval);
  }, []);

  const handleUpdateProfile = async () => {

    try {
      const updated = await authService.updateProfile({
        username: newUsername,
        avatar_url: newAvatarUrl
      });
      setUserData({
        ...userData,
        username: updated.username,
        avatar_url: updated.avatar_url || `//api/?name=${updated.username}&background=f4d2d2&color=000`
      });
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
        const [ruedaCompletaRes, tbRes, objRes, keepRes, misRes, factRes, matrixRes, kanbanRes] = await Promise.all([
          ruedaService.getCompleta().catch(() => []),
          timeBlockService.getAll().catch(() => []),
          objetivoSemanaService.get().catch(() => null),
          keepNotaService.get().catch(() => null),
          misionHoyService.get().catch(() => null),
          billService.getAll().catch(() => []),
          matrixService.getAll().catch(() => []),
          kanbanService.getAll().catch(() => [])
        ]);

        setRuedaCompleta(ruedaCompletaRes);
        setTimeBlocks(Array.isArray(tbRes) ? tbRes : []);
        setObjetivo(Array.isArray(objRes) ? objRes[0] : objRes);
        setKeepNota(Array.isArray(keepRes) ? keepRes[0] : keepRes);
        setMisionHoy(Array.isArray(misRes) ? misRes[0] : misRes);
        setFacturas(Array.isArray(factRes) ? factRes : []);
        setMatrixItems(Array.isArray(matrixRes) ? matrixRes : []);
        setKanbanTasks(Array.isArray(kanbanRes) ? kanbanRes : []);

      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };
    fetchData();
  }, []);

  const refreshKanbanTasks = async () => {
    try {
      const data = await kanbanService.getAll();
      setKanbanTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error refreshing kanban tasks:', err);
    }
  };

  const showSaving = () => {

    setSavingStatus('Guardando...');
    setTimeout(() => setSavingStatus(''), 1500);
  };

  const handleTimeBlockBlur = async (hora: number, value: string) => {
    const block = timeBlocks.find((t: TimeBlockData) => t.hora === hora);
    if (block && block.tarea === value) return; // Sin cambios
    try {
      if (block) {
        await timeBlockService.update(block.id, { tarea: value });
      } else {
        const newBlock = await timeBlockService.create({ hora, tarea: value, estado: false });
        setTimeBlocks(prev => [...prev, newBlock]);
      }
      showSaving();
    } catch (e) {
      console.error("Error saving timeblock", e);
    }
  };

  const handleTimeBlockStatus = async (hora: number, estado: boolean) => {
    const block = timeBlocks.find((t: TimeBlockData) => t.hora === hora);
    try {
      if (block) {
        await timeBlockService.update(block.id, { estado });
        // update local state so it doesn't revert
        setTimeBlocks((prev: TimeBlockData[]) => prev.map((t: TimeBlockData) => t.id === block.id ? { ...t, estado } : t));
      } else {
        const newBlock = await timeBlockService.create({ hora, tarea: '', estado });
        setTimeBlocks((prev: TimeBlockData[]) => [...prev, newBlock]);
      }
      showSaving();
    } catch (e) {
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

  const defaultHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23];

  return (
    <div className="min-h-screen bg-[#e8eef2] bg-cover bg-center bg-no-repeat bg-blend-soft-light text-[#2d2f33] font-sans flex flex-col items-center py-4 px-2 sm:py-6 sm:px-4 relative overflow-auto">
      {/* Indicador de Auto-guardado global */}
      {savingStatus && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-1.5 rounded-full shadow-lg text-xs font-bold z-50 animate-bounce">
          {savingStatus}
        </div>
      )}
      {/* Background blobs for pastel feel */}
      <div className="fixed top-[0%] left-[-5%] w-[40%] h-[40%] bg-green-200/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 z-0 pointer-events-none"></div>
      <div className="fixed bottom-[-5%] left-[10%] w-[30%] h-[30%] bg-blue-200/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 z-0 pointer-events-none"></div>
      <div className="fixed top-[5%] right-[-5%] w-[40%] h-[40%] bg-pink-200/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 z-0 pointer-events-none"></div>
      <div className="fixed bottom-[10%] right-[10%] w-[35%] h-[35%] bg-yellow-100/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 z-0 pointer-events-none"></div>

      {/* TOP HEADER */}
      <header className="w-full max-w-[1240px] flex items-center justify-between mb-4 z-50 relative px-4 text-gray-600 mx-auto">

        {/* LEFT SECTION: Modo Oscuro y Notificaciones */}
       
        {/* CENTER SECTION: Logo Ancla Visual */}
       

        {/* RIGHT SECTION: Workspace y Usuario */}
        
      </header>
      {/* MAIN CONTENT AREA */}
      <main className="w-full max-w-[1240px] bg-white/25 backdrop-blur-3xl border border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.05)] rounded-[3.5rem] p-8 z-10 flex flex-col xl:flex-row gap-5">

      <div className="absolute left-1/2 -top-1 -translate-x-1/2 pointer-events-none -ml-6 mt-7">
          <img
            src="/focusia-logo.png"
            alt="Focusia"
            className="h-10 md:h-12 object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.1)] pointer-events-auto hover:scale-110 transition-transform duration-300"
          />
        </div> 




      <div className="absolute top-6 right-8 flex items-center gap-2 sm:gap-4 z-20">
    
   

    {/* User Menu */}
    <div className="relative">
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className="flex items-center gap-1.5 bg-white/40 backdrop-blur-md rounded-full px-3 py-1.5 hover:bg-white/60 transition-colors shadow-sm active:scale-95"
      >
        <div className="w-7 h-7 rounded-full overflow-hidden shadow-sm border-2 border-white">
          <img src={userData.avatar_url} alt="profile" className="w-full h-full object-cover" />
        </div>
        <span className="font-bold text-xs text-gray-800 hidden sm:block">{userData.username}</span>
      </button>

      {/* Dropdown Usuario */}
      {showUserMenu && (
        <div className="absolute top-full mt-2 right-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-4 w-48 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-2">
            <button
              onClick={() => {
                setShowUserSettingsModal(true);
                setShowUserMenu(false);
              }}
              className="w-full text-left p-2 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              <span className="text-sm">Perfil</span>
            </button>
            <button
              onClick={onLogout}
              className="w-full text-left p-2 rounded-xl hover:bg-red-50 transition-colors flex items-center gap-2 text-red-600"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
      
        <div className="absolute top-6 left-8 flex items-center gap-3 z-20">
    {/* Botón Modo Oscuro */}
    <button
      onClick={() => setIsDarkMode(!isDarkMode)}
      className="flex items-center justify-center w-8 h-8 rounded-full bg-[#292e34]/90 shadow-sm border border-gray-600 hover:bg-[#3a3f47] transition-all active:scale-95"
      title={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
    >
      {isDarkMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-white" />}
    </button>

    {/* Centro de Notificaciones */}
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 transition-all border border-black/40 shadow-sm relative group active:scale-95"
        title="Notificaciones"
      >
        <Bell className="w-4 h-4 text-white" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Dropdown de notificaciones */}
      {showNotifications && (
        <div className="absolute top-full mt-2 left-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-4 w-80 z-50 animate-in fade-in slide-in-from-top-2">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Notificaciones</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {/* ... Contenido de notificaciones ... */}
          </div>
        </div>
      )}
    </div>
  </div>
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-4 w-full xl:w-[32%]">
          {/* Top of Left: Pills & Foco */}
          <div className="flex gap-4">
             <div className="flex gap-4">
  <div className="bg-white/40 backdrop-blur-sm border border-white/20 rounded-xl p-3 flex flex-col gap-6 w-[140px] shadow-[0_4px_10px_rgba(0,0,0,0.02)] mt-10">
    {/* 1. COACHING */}
    <ActionButton 
      label="COACHING" 
      color="bg-gradient-to-r from-[#3533cd] to-[#040817] text-white py-2 rounded-xl text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full" 
      
    />
    {/* 2. TRIBU (Movido a la segunda posición) */}
    <ActionButton 
      label="TRIBU" 
      color="bg-gradient-to-r from-[#3533cd] to-[#040817] text-white py-2 rounded-xl text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full" 
      
    />
    {/* 3. GRATITUD (Movido a la tercera posición) */}
    <ActionButton 
      label="GRATITUD" 
      color="bg-gradient-to-r from-[#3533cd] to-[#040817] text-white py-2 rounded-xl text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full" 
      
    />
  </div>
</div>
            <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl p-3 flex flex-col gap-3 w-[250px] shadow-[0_8px_32px_rgba(31,38,135,0.03)] -ml-2">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setShowInicioModal(true)}
                  className="bg-gradient-to-r from-[#000000]  to-[#3533cd] text-white py-2 rounded-xl text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full"
                >
                  INICIO
                </button>
                <button
                  onClick={() => setShowRuedaVideoModal(true)}
                  className="bg-gradient-to-r from-[#000000]  to-[#3533cd] text-white py-2 rounded-xl text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full"
                  >
                   RUEDA
                </button>
                <button
                  onClick={() => setShowMatrizVideoModal(true)}
                  className="bg-gradient-to-r from-[#000000]  to-[#3533cd] text-white py-2 rounded-xl text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full"
                >
                  MATRIZ
                </button>
              </div>
              <div
  onClick={() => setShowRuedaVideoModal(true)}
  className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col flex-1 cursor-pointer hover:shadow-md  border border-black-200/40 transition-shadow  "
>
  {/* BARRA HEADER OSCURA DE LA TARJETA */}
  <div className="bg-gradient-to-r from-[#2b44ff] via-[#0b153a] to-[#040817] text-white text-center py-1.5  rounded-md text-[10px] sm:text-xs font-bold tracking-widest uppercase">
    RUEDA DE LA VIDA
  </div>

  {/* CONTENIDO INTERNO: GRÁFICO + CATEGORÍAS */}
  <div className="p-3 sm:p-4 flex items-center justify-between gap-4 flex-1 bg-white">
    
    {/* LADO IZQUIERDO: EL GRÁFICO SVG EXACTO DE LA RUEDA SEGMENTADA */}
    <div className="w-[110px] h-[110px] shrink-0 relative flex items-center justify-center">
  <svg
    viewBox="0 0 100 100"
    className="w-full h-full transform -rotate-22.5" // Rotación base original para alinear los quesitos
  >
    {/* ─── 🎨 SEGMENTOS DE COLORES ORIGINALES ─── */}
    {/* Segmento 1 - Vino Tinto (Salud) */}
    <path d="M 50 50 L 50 2 A 48 48 0 0 1 83.94 16.06 Z" fill="#911d33" stroke="#fff" strokeWidth="1.5" />
    {/* Segmento 2 - Azul Oscuro (Familia) */}
    <path d="M 50 50 L 83.94 16.06 A 48 48 0 0 1 98 50 Z" fill="#0c5a75" stroke="#fff" strokeWidth="1.5" />
    {/* Segmento 3 - Azul Claro (Trabajo / Dinero) */}
    <path d="M 50 50 L 98 50 A 48 48 0 0 1 83.94 83.94 Z" fill="#00a3e0" stroke="#fff" strokeWidth="1.5" />
    {/* Segmento 4 - Turquesa (Social / Amigos) */}
    <path d="M 50 50 L 83.94 83.94 A 48 48 0 0 1 50 98 Z" fill="#4cd2e4" stroke="#fff" strokeWidth="1.5" />
    {/* Segmento 5 - Verde Menta (Espiritual) */}
    <path d="M 50 50 L 50 98 A 48 48 0 0 1 16.06 83.94 Z" fill="#4fd1a5" stroke="#fff" strokeWidth="1.5" />
    {/* Segmento 6 - Amarillo Pastel (Amor) */}
    <path d="M 50 50 L 16.06 83.94 A 48 48 0 0 1 2 50 Z" fill="#fcd34d" stroke="#fff" strokeWidth="1.5" />
    {/* Segmento 7 - Naranja Claro (Mente / Ideas) */}
    <path d="M 50 50 L 2 50 A 48 48 0 0 1 16.06 16.06 Z" fill="#f97316" stroke="#fff" strokeWidth="1.5" />
    {/* Segmento 8 - Coral / Rosado (Profesión / Éxito) */}
    <path d="M 50 50 L 16.06 16.06 A 48 48 0 0 1 50 2 Z" fill="#f43f5e" stroke="#fff" strokeWidth="1.5" />

    {/* ─── 🛠️ ICONOS CORREGIDOS Y CENTRADOS MILIMÉTRICAMENTE ─── */}

    {/* 💓 1. SALUD (Vino Tinto - Centro Superior Derecho) */}
    {/* Ubicación calculada: x=69, y=23 */}
   <g transform="translate(72, 19) rotate(22.5)" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-4.5 -2.5 a 2.2 2.2 0 0 1 4.4 0 l 0.1 0.1 l 0.1 -0.1 a 2.2 2.2 0 0 1 4.4 0 c 0 2.5 -4.5 5.5 -4.5 5.5 s -4.5 -3 -4.5 -5.5 Z" fill="white" strokeWidth="0" />
      <path d="M-5 1.5 l 2 0 l 1 -2 l 1.5 3.5 l 1 -2.5 l 1.5 1 l 2 0" />
    </g>

    {/* 👨‍👩‍👧 2. FAMILIA (Azul Oscuro - Lateral Superior Derecho) */}
    {/* Ubicación calculada: x=77, y=41 */}
   <g transform="translate(82, 39) rotate(22.5)" fill="white">
      <circle cx="-2" cy="-2" r="1.8" />
      <path d="M -5.5 3 a 2.5 2.5 0 0 1 5 0 l 0 1.5 l -5 0 Z" />
      <circle cx="2.5" cy="-1" r="1.4" />
      <path d="M 0 3 a 2 2 0 0 1 4 0 l 0 1.5 l -4 0 Z" />
    </g>

    {/* 💰 3. FINANZAS / MONEDAS (Azul Claro - Lateral Inferior Derecho) */}
    {/* Ubicación calculada: x=70, y=60 */}
    <g transform="translate(74, 63) rotate(22.5)" fill="white" stroke="white" strokeWidth="0.6">
      <ellipse cx="-2" cy="-1" rx="3.2" ry="1.2" />
      <path d="M -5.2 -1 v 2.2 c 0 0.8 1.5 1.2 3.2 1.2 s 3.2 -0.4 3.2 -1.2 v -2.2" />
      <ellipse cx="2.5" cy="2" rx="2.5" ry="1" />
      <path d="M 0 2 v 2.2 c 0 0.6 1.2 1 2.5 1 s 2.5 -0.4 2.5 -1 v -2.2" />
    </g>

    {/* 💬 4. AMIGOS / SOCIAL (Turquesa - Centro Inferior Derecho) */}
    {/* Ubicación calculada: x=58, y=71 */}
    <g transform="translate(60, 77) rotate(22.5)" fill="white">
      <path d="M -4 -3 c 0 -2.2 2.2 -4 5 -4 s 5 1.8 5 4 c 0 1.3 -0.8 2.4 -2.2 3.1 l 0.7 2.2 l -2.5 -1.2 c -0.3 0 -0.7 0.1 -1 0.1 c -2.8 0 -5 -1.8 -5 -4 Z" />
      <circle cx="-1.5" cy="-3" r="0.6" fill="#4cd2e4" />
      <circle cx="1" cy="-3" r="0.6" fill="#4cd2e4" />
      <circle cx="3.5" cy="-3" r="0.6" fill="#4cd2e4" />
    </g>

    {/* 🌸 5. ESPIRITUAL / LOTO (Verde Menta - Centro Inferior Izquierdo) */}
    {/* Ubicación calculada: x=39, y=70 */}
    <g transform="translate(37, 76) rotate(22.5)" fill="white">
      <path d="M 0 -4.5 C 1.5 -2 2.5 -0.5 0 2.5 C -2.5 -0.5 -1.5 -2 0 -4.5 Z" />
      <path d="M 0 -1 C 2 0 4.5 1 3.5 3 C 1 3.5 -0.5 2 0 -1 Z" />
      <path d="M 0 -1 C -2 0 -4.5 1 -3.5 3 C -1 3.5 0.5 2 0 -1 Z" />
    </g>

    {/* 💝 6. AMOR (Amarillo Pastel - Lateral Inferior Izquierdo) */}
    {/* Ubicación calculada: x=25, y=55 */}
   <g transform="translate(19, 58) rotate(22.5)" fill="white">
      <path d="M 0 3.5 l -3.3 -3.3 a 2.3 2.3 0 0 1 0 -3.2 a 2.3 2.3 0 0 1 3.3 0 a 2.3 2.3 0 0 1 3.3 0 a 2.3 2.3 0 0 1 0 3.2 Z" />
    </g>

    {/* 💡 7. INTELECTUAL (Naranja) -> Se movió más a la izquierda y arriba */}
    <g transform="translate(22, 33) rotate(22.5)" fill="white">
      <path d="M 0 -4.5 c -2.4 0 -4.2 1.8 -4.2 4.2 c 0 1.5 0.8 2.8 2 3.5 l 0.5 1.8 l 3.4 0 l 0.5 -1.8 c 1.2 -0.7 2 -2 2 -3.5 c 0 -2.4 -1.8 -4.2 -4.2 -4.2 Z" />
      <rect x="-1.5" y="5.5" width="3" height="1" rx="0.3" fill="white" />
      <line x1="0" y1="-5.5" x2="0" y2="-7" stroke="white" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="-4.5" y1="-3" x2="-5.8" y2="-3.5" stroke="white" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="4.5" y1="-3" x2="5.8" y2="-3.5" stroke="white" strokeWidth="0.8" strokeLinecap="round" />
    </g>

    {/* 📈 8. PROFESIÓN (Coral) -> Se movió más hacia arriba */}
    <g transform="translate(37, 16) rotate(22.5)" fill="white">
      <rect x="-4.5" y="1" width="2" height="3" rx="0.3" />
      <rect x="-1.5" y="-1.5" width="2" height="5.5" rx="0.3" />
      <rect x="1.5" y="-4" width="2" height="8" rx="0.3" />
      <path d="M -4.5 -1.5 l 3 -2.5 l 2.5 1.5 l 3.5 -3.5" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" />
      <path d="M 2.5 -6 l 2 0 l 0 2" fill="none" stroke="white" strokeWidth="1" strokeLinejoin="round" />
    </g>
  </svg>

  {/* CÍRCULO CENTRAL BLANCO CON TEXTO */}
  <div className="w-11 h-11 bg-white rounded-full absolute shadow-[0_2px_6px_rgba(0,0,0,0.1)] flex items-center justify-center z-10 border border-slate-100">
    <span className="text-[7px] text-[#1e293b] font-black uppercase tracking-tighter text-center leading-none select-none">
      Wheel<br /><span className="text-slate-500 font-bold">of life</span>
    </span>
  </div>
</div>
                  <div className="flex flex-col gap-1 flex-1">
                    {ruedaCompleta.slice(0, 3).map((cat) => (
                      <div key={cat.id} className="bg-gradient-to-r from-[#ffe29f] to-[#ffa3a3] text-slate-800 text-[9px] sm:text-[10px] py-1 px-3 rounded-md text-center font-bold tracking-widest uppercase shadow-sm border border-black-200/40 transition-transform hover:scale-[1.03]">
                         {cat.nombre.substring(0, 6)} 
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <br></br>

          {/* Middle of Left */}
          <div className="flex gap-4 ">
            <DynamicKanbanBacklog />
        
  <div className="bg-white/60 backdrop-blur-sm  rounded-2xl  flex flex-col   w-[200px] h-[200px] shadow-[0_0_0px_rgb(255, 255, 255)] -ml-2 -mt-8">
  
  {/* 🎯 TARJETA INTERNA BLANCA DE OBJETIVOS */}
  <div className="bg-white shadow-[0_2px_4px_rgb(247, 243, 243)] overflow-hidden flex flex-col min-h-[200px] w-full rounded-md ">
    
    {/* BARRA HEADER COMPLETA (Fusión perfecta en los bordes superiores) */}
    <div className="bg-gradient-to-r from-[#2b44ff] via-[#0b153a] to-[#040817] text-white text-center py-1.5 text-[10px] sm:text-xs font-black tracking-widest uppercase rounded-md select-none w-[200px]">
      OBJETIVO SEMANAL
    </div>
    

    {/* CUERPO INTERNO CON INPUTS COMPLETAMENTE INTEGRADOS */}
    <div className="bg-gradient-to-r from-[#A70EEE] via-[#7028E2] to-[#193EC4] text-white text-center py-1.5 text-[10px] sm:text-xs font-black tracking-widest uppercase rounded-md select-nonep-3.5 space-y-3 bg-white flex-1 flex flex-col justify-center mt-2">
      
      {/* Input Objetivo Primario */}
      <div className="w-full">
        <textarea
        className="w-full flex-1 bg-transparent text-[11px] font-medium text-slate-700 italic placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed scrollbar-hide"
          placeholder="Escriba aquí el objetivo primario..."
          rows={6}
          defaultValue={objetivo?.texto1 || ''} 
          onBlur={(e) => handleObjetivoBlur('texto1', e.target.value)} 
        />
      </div>

     
      

    </div>

  </div>
            </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-2xl flex flex-col h-[250px] shadow-[0_0_0px_rgb(255,255,255)] mt-44 -ml-54 ">
            <FechasImportantesCard
              dayActive={fechasDayActive}
              recordatorios={savedRecordatorios}
              onDayClick={(dia) => {
                setFechasDayActive(dia);
                setShowRecordatorioModal(true);
              }}
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

          {/* Bottom Left - Acciones por Delegar */}
          <AccionesPorDelegarInline />

        </div>
        
        </div>

        {/* CENTER COLUMN */}
<div className="flex flex-col gap-3 w-full xl:w-[32%] relative items-center">
          <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl p-3 flex flex-col gap-3 w-[250px] shadow-[0_8px_32px_rgba(31,38,135,0.03)] mt-12">
            <p className="text-[14px] font-semibold text-[#1e293b] text-center leading-tight">
              {phrases[currentPhraseIndex]}
            </p>
          </div>
          {/* Tabs */}
<div className="flex justify-between items-center gap-2 w-full max-w-[500px] mx-auto my-2 ml-4">
  
  {/* BOTÓN ANUAL */}
  <button 
    onClick={() => setShowMetaAnualModal(true)} 
    className="flex-1 bg-gradient-to-r from-[#2b44ff] via-[#0b153a] to-[#040817] text-white py-1.5 px-3 rounded-lg text-[10px] sm:text-xs font-black tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98]"
  >
    Anual
  </button>

  {/* BOTÓN MENSUAL */}
  <button 
    onClick={() => setShowMetaMensualModal(true)} 
    className="flex-1 bg-gradient-to-r from-[#2b44ff] via-[#0b153a] to-[#040817] text-white py-1.5 px-3 rounded-lg text-[10px] sm:text-xs font-black tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98]"
  >
    Mensual
  </button>

  {/* BOTÓN SEMANAL */}
  <button 
    onClick={() => setShowMetaSemanalModal(true)} 
    className="flex-1 bg-gradient-to-l from-[#2b44ff] via-[#0b153a] to-[#040817] text-white py-1.5 px-3 rounded-lg text-[10px] sm:text-xs font-black tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98]"
  >
    Semanal
  </button>

  {/* BOTÓN DIARIA */}
  <button 
    onClick={() => setShowMetaDiariaModal(true)} 
    className="flex-1 bg-gradient-to-l from-[#2b44ff] via-[#0b153a] to-[#040817] text-white py-1.5 px-3 rounded-lg text-[10px] sm:text-xs font-black tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98]"
  >
    Diaria
  </button>

        </div>
          {/* Time Blocking Table */}
        <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl p-3 flex flex-col w-full h-[530px] shadow-[0_8px_32px_rgba(31,38,135,0.03)] overflow-hidden ml-10">
  
  {/* 👇 SOLUCIÓN: Agrupamos estos dos elementos en un bloque compacto sin GAP */}
  <div className="w-full  flex flex-col overflow-hidden rounded-xl border border-slate-200/60 shadow-xs">
    
    {/* BARRA HEADER DEL TIME BLOCKING */}
    <div className="bg-gradient-to-r from-[#0E12EE] via-[#A70EEE] to-[#193EC4] text-white text-center py-1.5 text-[10px] sm:text-xs font-black tracking-widest uppercase rounded-md select-nonep-3.5 space-y-3 bg-white flex-1 flex flex-col justify-center mt-2">
      TIME BLOCKING
    </div>
  {/* CONTENEDOR CON SCROLL DE LA TABLA */}
  <div className="overflow-y-auto max-h-[520px] bg-white/40 scrollbar-hide rounded-b-xl">
      <table className="w-full text-[11px] border-collapse table-fixed">
        
        <thead className="sticky top-0 z-20 bg-white/90 backdrop-blur-md shadow-2xs">
          <tr>
            <th className="w-20 p-2 border-b border-slate-100">
              <div className="w-full bg-gradient-to-r from-[#ffe29f] to-[#fecaca] text-slate-800 text-[10px] py-1.5 px-1 rounded-lg font-black tracking-wider uppercase border border-orange-200/40 text-center">
                TIME
              </div>
            </th>
            <th className="p-2 border-b border-slate-100">
              <div className="w-full bg-gradient-to-r from-[#fecaca] to-[#ffa3a3] text-slate-800 text-[10px] py-1.5 px-2 rounded-lg font-black tracking-wider uppercase border border-red-200/40 text-center">
                WORK IN PROGRESS
              </div>
            </th>
            <th className="w-24 p-2 border-b border-slate-100">
              <div className="w-full bg-gradient-to-r from-[#ffa3a3] to-[#fca5a5] text-slate-800 text-[10px] py-1.5 px-1 rounded-lg font-black tracking-wider uppercase border border-red-300/40 text-center">
                STATUS
              </div>
            </th>
          </tr>
        </thead>

      {/* CUERPO DE HORARIOS (FILAS) */}
      <tbody>
  {defaultHours.map((h, i) => {
    const block = timeBlocks.find((t: TimeBlockData) => t.hora === h);
    const statusText = block?.estado === true ? 'Done' : (block?.estado as unknown as string) === 'doing' ? 'Doing' : '';

    return (
      <tr 
        key={h} 
        /* 🌟 CAMBIO: Se aplica bg-slate-50/40 de forma base para simular el fondo gris tenue de la tabla */
        className="hover:bg-white/60 bg-slate-50/40 transition-colors h-[36px]"
      >
        
        {/* CELDA 1: INDICADOR HORARIO */}
        <td className="py-1 text-center font-bold text-slate-700 w-20">
          <span className="inline-block px-2 py-0.5 border border-slate-200 rounded-md text-[10px] bg-white shadow-3xs select-none">
            {h < 10 ? `0${h}:00` : `${h}:00`}
          </span>
        </td>

        {/* CELDA 2: INPUT DENTRO DE RECUADRO BLANCO SOFT UI */}
        <td className="py-1 px-2.5">
          {/* 🌟 SOLUCIÓN: Este div genera el recuadro blanco flotante con sombra y microborde gris */}
          <div className="w-full bg-white border border-slate-200/70 rounded-md px-2 py-0.5 shadow-3xs flex items-center transition-all focus-within:border-indigo-500/50">
            <input
              type="text"
              className={`w-full bg-transparent outline-none text-[11px] text-slate-700 placeholder:text-slate-400 placeholder:italic ${
                statusText === 'Done' ? 'line-through text-slate-400 italic' : 'font-medium'
              }`}
              placeholder="Escriba aquí..."
              defaultValue={block?.tarea || ''}
              onBlur={(e) => handleTimeBlockBlur(h, e.target.value)}
            />
          </div>
        </td>

        {/* CELDA 3: ESTADOS DINÁMICOS */}
        <td className="w-24 py-1 px-2 text-center">
          {statusText === 'Done' && (
            <span className="block w-full rounded-md text-[9px] py-0.5 font-bold bg-slate-100 text-slate-500 border border-slate-200 shadow-3xs select-none">
              Done
            </span>
          )}
          {statusText === 'Doing' && (
            <span className="block w-full rounded-md text-[9px] py-0.5 font-black bg-white text-slate-900 border border-slate-200/60 shadow-xs animate-pulse select-none">
              Doing
            </span>
          )}
          {statusText === '' && (
            <span className="block w-full h-4 bg-transparent" />
          )}
        </td>

      </tr>
    );
  })}
</tbody>

    </table>
  </div>
        </div>
          </div>

          <CategoriasMenu />
          <CardAyudaIA onSubmit={() => setShowAiMissionModal(true)} />
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-4 w-full xl:w-[36%] z-10">
          
          {/* Bloque Superior: Botones Cursos/RRSS y Notas */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col w-[250px] pr-3">
              <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl p-3 flex flex-col gap-3 w-[250px] shadow-[0_8px_32px_rgba(31,38,135,0.03)] ml-2 h-[240px]">
                <div className="p-1 flex gap-1 flex justify-between items-center gap-1  max-w-md -ml-1 w-[80px]">
                  <ActionButton label="CURSOS" color="bg-gradient-to-r from-[#000000]  to-[#3533cd] text-white py-2 rounded-xl text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full" />
                  <ActionButton label="RRSS" color="bg-gradient-to-r from-[#000000]  to-[#3533cd] text-white py-2 rounded-xl text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full" />
                  <ActionButton label="CUENTAS" color="bg-gradient-to-r from-[#000000]  to-[#3533cd] text-white py-2 rounded-xl text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full"  onClick={() => setShowBillModal(true)} />
                </div>
                <BlockDeNotas />
              </div>
            </div>

            <div className="bg-white/40 backdrop-blur-sm border border-white/20 rounded-xl p-3 flex flex-col gap-6 w-[140px] shadow-[0_4px_10px_rgba(0,0,0,0.02)] mt-10 ml-4">
              <ActionButton label="MEDICAMENTOS" color="bg-gradient-to-r from-[#3533cd] to-[#040817] text-white py-2 rounded-xl text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full" variant="modern"  onClick={() => setShowMedicamentosModal(true)} />
              <ActionButton label="CUMPLEAÑOS" color="bg-gradient-to-r from-[#3533cd] to-[#040817] text-white py-2 rounded-xl text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full" variant="modern" />
              <ActionButton label="FOCUS" color="bg-gradient-to-r from-[#3533cd] to-[#040817] text-white py-2 rounded-xl text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md transition hover:brightness-110 active:scale-[0.98] w-full" variant="modern" />
            </div>
          </div>

          {/* Bloque Calendario */}
          <div className="flex flex-col items-start w-full mb-4 ml-2">
            <CalendarWidget />
          </div>

          {/* Bloque Medio: Misión */}
          <div className="flex flex-col items-start w-full mb-8 ml-2">
            <MiMisionHoy mision={selectedMissionText} avatarUrl={userData.avatar_url} />
          </div>

          {/* Bloque Hora de Oro Familiar */}
          <div className="flex flex-col items-start w-[230px] h-[600px] -mt-127 ml-45 rounded-md">
            <HoraDeOroFamiliar />
          </div>

          {/* Bloque Clima */}
          <div className="flex flex-col items-start w-full h-[250px] mb-4">
            <ClimaComuna
              temp={clima.temp}
              descripcion={clima.descripcion}
              lugar={clima.lugar}
              loading={clima.loading}
              error={clima.error}
              icono={clima.icono}
              humedad={clima.humedad}
              sensacion={clima.sensacion}
            />
          </div>
   </div>
      </main>

      {/* Modal: Acciones por Delegar */}
      {showDelegarModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={() => setShowDelegarModal(false)}
        >
          <div
            className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 w-full max-w-2xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#1e3a5f] to-[#3a5f8a]">
              <h2 className="text-lg font-bold uppercase text-white">Mi Agenda & Matriz de Tareas</h2>

              <button
                onClick={() => setShowDelegarModal(false)}
                className="p-2 rounded-full hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
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
            className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#0d9488] to-[#14b8a6]">
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  name="titulo"
                  required
                  defaultValue={editingRecordatorio?.titulo || ''}
                  placeholder="Ej: Cumpleaños de mamá"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a5c5ea] bg-white/50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  name="fecha"
                  required
                  defaultValue={editingRecordatorio ? new Date(editingRecordatorio.fecha_hora).toISOString().slice(0, 16) : ''}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a5c5ea] bg-white/50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Categoría</label>
                <select
                  name="categoria"
                  required
                  defaultValue={editingRecordatorio?.categoria || ''}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a5c5ea] bg-white/50"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Medicamento">💊 Medicamento</option>
                  <option value="Cumpleaños">🎂 Cumpleaños</option>
                  <option value="HoraOro">⭐ Hora de Oro</option>
                  <option value="Otro">📅 Otro</option>
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

      <AiMissionAssistant
        isOpen={showAiMissionModal}
        onClose={() => setShowAiMissionModal(false)}
        metaAnual={metaAnual}
        metaMensual={metaMensual}
        metaSemanal={metaSemanal}
        metaDiaria={metaDiaria}
        onSelectMission={(mission) => {
          setSelectedMissionText(mission);
          setShowAiMissionModal(false);
        }}
      />

      {/* Modal: Inicio / Cómo funciona */}
      {showInicioModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          onClick={() => setShowInicioModal(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/50 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Info className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Bienvenida a Focusia</h2>
                  <p className="text-xs opacity-80 font-medium">Tu tablero personal de alto rendimiento</p>
                </div>
              </div>
              <button
                onClick={() => setShowInicioModal(false)}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#0d9488]">
                    <CheckCircle2 className="w-5 h-5" />
                    <h3 className="font-bold uppercase text-sm">Vida</h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Visualiza el equilibrio de tu vida en tiempo real. Haz clic en el gráfico central para actualizar tus puntajes y ajustar tu foco mensual.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#3b82f6]">
                    <CheckCircle2 className="w-5 h-5" />
                    <h3 className="font-bold uppercase text-sm">Time Blocking</h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Organiza tu día hora por hora. Define tus "Work in Progress" y marca el estado de cumplimiento para mantener la disciplina.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#d97706]">
                    <CheckCircle2 className="w-5 h-5" />
                    <h3 className="font-bold uppercase text-sm">Delegación Kanban</h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Gestiona tareas que no requieren tu atención directa. Usa el tablero Kanban para arrastrar y soltar prioridades.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#ef4444]">
                    <CheckCircle2 className="w-5 h-5" />
                    <h3 className="font-bold uppercase text-sm">Salud y Medicación</h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Configura recordatorios críticos. El sistema te notificará visualmente cuando sea momento de tomar tus medicamentos.
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-6 border border-gray-200">
                <h4 className="font-black uppercase text-xs text-gray-400 mb-4 tracking-widest text-center">Fórmula del éxito</h4>
                <div className="flex justify-around items-center gap-4 text-center">
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-gray-800">100%</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Enfoque</div>
                  </div>
                  <div className="w-[1px] h-8 bg-gray-300"></div>
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-gray-800">Auto</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Guardado</div>
                  </div>
                  <div className="w-[1px] h-8 bg-gray-300"></div>
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-gray-800">Cloud</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Sincronizado</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-center">
              <button
                onClick={() => setShowInicioModal(false)}
                className="bg-[#1e3a5f] text-white px-12 py-3 rounded-2xl font-bold uppercase tracking-widest hover:bg-[#2d4a6f] transition-all hover:scale-105 shadow-lg"
              >
                Comenzar ahora
              </button>
            </div>
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
            className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 w-full max-w-2xl max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#059669] to-[#0d9488]">
              <h2 className="text-lg font-bold uppercase text-white">Mi Rueda de la Vida</h2>
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
          onClick={() => setShowRuedaVideoModal(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#059669] to-[#0d9488]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Play className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-bold uppercase text-white">Rueda de la Vida</h2>
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
              <h3 className="text-xl font-bold text-gray-800 mb-2">Mira el video instructivo</h3>
              <p className="text-sm text-gray-500 mb-6">Aprende cómo elaborar tu Rueda de la Vida en pocos minutos</p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowRuedaVideoModal(false);
                    setShowRuedaModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#059669] text-white font-bold hover:bg-[#047857] transition-colors"
                >
                  <span>Ir al formulario</span>
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
            className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#0d9488] to-[#14b8a6]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold uppercase text-white">Metas Anuales</h2>
              </div>
              <button onClick={() => setShowMetaAnualModal(false)} className="p-2 rounded-full hover:bg-white/30 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
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
                    <span className="text-[10px] bg-[#0d9488]/20 text-[#0d9488] px-2 py-0.5 rounded-full font-medium">+500 XP</span>
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
                      placeholder="Escribe tu meta..."
                      className="flex-1 text-sm bg-transparent border-none outline-none"
                      autoFocus
                    />
                    <button onClick={handleSaveMeta} className="text-[#0d9488] font-bold text-sm">Guardar</button>
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
            className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#7c3aed] to-[#a855f7]">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold uppercase text-white">Metas Mensuales</h2>
              </div>
              <button onClick={() => setShowMetaMensualModal(false)} className="p-2 rounded-full hover:bg-white/30 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
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
                      placeholder="Escribe tu meta..."
                      className="flex-1 text-sm bg-transparent border-none outline-none"
                      autoFocus
                    />
                    <button onClick={handleSaveMeta} className="text-[#7c3aed] font-bold text-sm">Guardar</button>
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
            className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#d97706] to-[#f59e0b]">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold uppercase text-white">Metas Semanales</h2>
              </div>
              <button onClick={() => setShowMetaSemanalModal(false)} className="p-2 rounded-full hover:bg-white/30 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
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
                      placeholder="Escribe tu meta..."
                      className="flex-1 text-sm bg-transparent border-none outline-none"
                      autoFocus
                    />
                    <button onClick={handleSaveMeta} className="text-[#d97706] font-bold text-sm">Guardar</button>
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

      {/* Modal: Meta Diaria */}
      {showMetaDiariaModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={() => setShowMetaDiariaModal(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#059669] to-[#10b981]">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold uppercase text-white">Metas Diarias</h2>
              </div>
              <button onClick={() => setShowMetaDiariaModal(false)} className="p-2 rounded-full hover:bg-white/30 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {metaDiaria.map((meta, index) => (
                  <div key={index} className="flex items-center gap-3 bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-white/40">
                    <button
                      onClick={() => {
                        setXpStats((prev: XPStats) => ({ ...prev, tasksCompleted: prev.tasksCompleted + 1 }));
                        addXP(XP_CONFIG.DAILY_GOAL, 'Meta diaria completada', BADGES[0].condition);
                        setMetaDiaria(metaDiaria.filter((_: string, i: number) => i !== index));
                      }}
                      className="w-6 h-6 rounded-full border-2 border-[#059669] flex items-center justify-center hover:bg-[#059669]/20 transition-colors flex-shrink-0"
                    >
                      <Check className="w-4 h-4 text-[#059669]" />
                    </button>
                    <span className="flex-1 text-sm text-gray-700">{meta}</span>
                    <span className="text-[10px] bg-[#059669]/20 text-[#059669] px-2 py-0.5 rounded-full font-medium">+{XP_CONFIG.DAILY_GOAL} XP</span>
                    <button onClick={() => handleEditMeta('diaria', index, meta)} className="text-gray-400 hover:text-[#059669] transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteMeta('diaria', index)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {editingMetaType === 'diaria' && (
                  <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-[#059669]">
                    <input
                      type="text"
                      value={newMetaText}
                      onChange={(e) => setNewMetaText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveMeta()}
                      placeholder="Escribe tu meta..."
                      className="flex-1 text-sm bg-transparent border-none outline-none"
                      autoFocus
                    />
                    <button onClick={handleSaveMeta} className="text-[#059669] font-bold text-sm">Guardar</button>
                    <button onClick={() => { setEditingMetaType(null); setNewMetaText(''); }} className="text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => handleAddMeta('diaria')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-[#059669] hover:text-[#059669] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Agregar meta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Checklist de Facturas / Cuentas */}
      {showBillModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          onClick={() => setShowBillModal(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/50 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Checklist de Cuentas</h2>
                  <p className="text-xs opacity-80 font-medium">Control mensual de facturas y pagos</p>
                </div>
              </div>
              <button
                onClick={() => setShowBillModal(false)}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Checklist Section */}
              <div className="flex-1 p-6 overflow-y-auto border-r border-gray-100">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Facturas Pendientes</h3>
                {facturas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                    <CheckSquare className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm">No hay facturas registradas</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {facturas.map((fact) => (
                      <div
                        key={fact.id}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${fact.pagado
                            ? 'bg-green-50 border-green-100 opacity-60'
                            : 'bg-white border-gray-100 shadow-sm'
                          }`}
                      >
                        <button
                          onClick={async () => {
                            try {
                              const updated = await billService.update(fact.id, { pagado: !fact.pagado });
                              setFacturas(prev => prev.map(f => f.id === fact.id ? updated : f));
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${fact.pagado
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-200 hover:border-[#6366f1]'
                            }`}
                        >
                          {fact.pagado && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${fact.pagado ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                            {fact.nombre}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            Vence: {new Date(fact.fecha_vencimiento).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-black ${fact.pagado ? 'text-green-600' : 'text-[#6366f1]'}`}>
                            ${fact.monto.toLocaleString()}
                          </p>
                          <button
                            onClick={async () => {
                              if (confirm('¿Eliminar esta factura?')) {
                                try {
                                  await billService.delete(fact.id);
                                  setFacturas(prev => prev.filter(f => f.id !== fact.id));
                                } catch (e) {
                                  console.error(e);
                                }
                              }
                            }}
                            className="text-[9px] text-red-300 hover:text-red-500 uppercase font-bold"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Section */}
              <div className="w-full md:w-72 bg-gray-50 p-6">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Nueva Factura</h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const data = {
                      nombre: formData.get('nombre') as string,
                      monto: parseFloat(formData.get('monto') as string),
                      fecha_vencimiento: formData.get('fecha') as string,
                      pagado: false
                    };
                    try {
                      const res = await billService.create(data);
                      setFacturas(prev => [...prev, res].sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()));
                      (e.target as HTMLFormElement).reset();
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nombre</label>
                    <input name="nombre" type="text" required placeholder="Luz, Arriendo, etc." className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Monto ($)</label>
                    <input name="monto" type="number" step="0.01" required placeholder="0.00" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Vencimiento</label>
                    <input name="fecha" type="date" required className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]" />
                  </div>
                  <button type="submit" className="w-full bg-[#6366f1] text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-[#4f46e5] transition-all active:scale-95">
                    Registrar Cobro
                  </button>
                </form>

                <div className="mt-8 p-4 bg-[#6366f1]/10 rounded-2xl border border-[#6366f1]/20">
                  <div className="flex items-center gap-2 mb-1 text-[#6366f1]">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase">Total Pendiente</span>
                  </div>
                  <p className="text-xl font-black text-[#6366f1]">
                    ${facturas.filter(f => !f.pagado).reduce((sum, f) => sum + f.monto, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Video instructivo de la Matriz de Eisenhower */}
      {showMatrizVideoModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
          onClick={() => setShowMatrizVideoModal(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Play className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-bold uppercase text-white">Matriz Eisenhower</h2>
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
              <h3 className="text-xl font-bold text-gray-800 mb-2">Aprende a Priorizar</h3>
              <p className="text-sm text-gray-500 mb-6">Descubre cómo separar lo urgente de lo importante para maximizar tu productividad.</p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowMatrizVideoModal(false);
                    setShowMatrizFormModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#1e3a5f] text-white font-bold hover:bg-[#2d4a6f] transition-colors"
                >
                  <span>Realizar mi Matriz</span>
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
            className="bg-[#f8fafc] rounded-[2.5rem] shadow-2xl border border-white/50 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 bg-white border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-[#1e3a5f] p-2 rounded-xl text-white">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-gray-800">Mi Matriz de Prioridades</h2>
                  <p className="text-xs text-gray-400 font-medium tracking-tight uppercase">Sistema de Gestión del Tiempo de Eisenhower</p>
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
                    <div className="bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Crítico</div>
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
                    <input name="task" placeholder="Nueva tarea clave..." className="flex-1 bg-white/70 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-red-400 outline-none" />
                    <button type="submit" className="bg-red-600 text-white p-2 rounded-xl hover:bg-red-700 transition-colors"><Plus className="w-4 h-4" /></button>
                  </form>
                </div>

                {/* Cuadrante 2: SCHEDULE (No Urgente, Importante) */}
                <div className="bg-gradient-to-br from-blue-50/50 to-blue-100/30 rounded-3xl p-5 border border-blue-100 flex flex-col min-h-[250px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">2. AGENDAR (Visión)</h3>
                    <div className="bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Crecimiento</div>
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
                    <input name="task" placeholder="Agendar meta..." className="flex-1 bg-white/70 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-400 outline-none" />
                    <button type="submit" className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" /></button>
                  </form>
                </div>

                {/* Cuadrante 3: DELEGATE (Urgente, No Importante) */}
                <div className="bg-gradient-to-br from-orange-50/50 to-orange-100/30 rounded-3xl p-5 border border-orange-100 flex flex-col min-h-[250px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[11px] font-bold text-orange-600 uppercase tracking-widest">3. DELEGAR (Interrupciones)</h3>
                    <div className="bg-orange-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Interferencias</div>
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
                    <input name="task" placeholder="¿Quién puede ayudar?..." className="flex-1 bg-white/70 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-orange-400 outline-none" />
                    <button type="submit" className="bg-orange-600 text-white p-2 rounded-xl hover:bg-orange-700 transition-colors"><Plus className="w-4 h-4" /></button>
                  </form>
                </div>

                {/* Cuadrante 4: ELIMINATE (No Urgente, No Importante) */}
                <div className="bg-gradient-to-br from-gray-100/50 to-gray-200/30 rounded-3xl p-5 border border-gray-200 flex flex-col min-h-[250px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">4. ELIMINAR (Distracciones)</h3>
                    <div className="bg-gray-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Basura</div>
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
                    <input name="task" placeholder="Tarea a evitar..." className="flex-1 bg-white/70 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-gray-400 outline-none" />
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

      {/* Modal: Medicamentos */}
      {showMedicamentosModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={() => setShowMedicamentosModal(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#ef4444] to-[#dc2626]">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold uppercase text-white">Mis Medicamentos</h2>
              </div>
              <button onClick={() => setShowMedicamentosModal(false)} className="p-2 rounded-full hover:bg-white/30 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {/* Formulario para agregar medicamento */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Agregar medicamento
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={nuevoMedicamento.nombre}
                    onChange={(e) => setNuevoMedicamento({ ...nuevoMedicamento, nombre: e.target.value })}
                    placeholder="Nombre del medicamento"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#ef4444] text-sm"
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Hora</label>
                      <input
                        type="time"
                        value={nuevoMedicamento.hora}
                        onChange={(e) => setNuevoMedicamento({ ...nuevoMedicamento, hora: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#ef4444] text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Dosis por día</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={nuevoMedicamento.dosis}
                        onChange={(e) => setNuevoMedicamento({ ...nuevoMedicamento, dosis: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#ef4444] text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (nuevoMedicamento.nombre.trim()) {
                        const now = new Date();
                        const [h, m] = nuevoMedicamento.hora.split(':');
                        const fecha = new Date(now.getFullYear(), now.getMonth(), now.getDate(), +h, +m);
                        try {
                          const saved = await recordatorioService.create({
                            titulo: nuevoMedicamento.nombre,
                            fecha_hora: fecha.toISOString(),
                            categoria: 'Medicamento',
                            activo: true,
                            tomado: false,
                          });
                          setMedicamentos([...medicamentos, {
                            id: saved.id,
                            nombre: saved.titulo,
                            hora: nuevoMedicamento.hora,
                            dosis: nuevoMedicamento.dosis,
                            completado: false,
                          }]);
                          setNuevoMedicamento({ nombre: '', hora: '08:00', dosis: 1 });
                          fetchSavedRecordatorios();
                        } catch (err) {
                          console.error('Error saving medication:', err);
                        }
                      }
                    }}
                    className="w-full py-2 bg-[#ef4444] text-white rounded-xl font-bold text-sm hover:bg-[#dc2626] transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Agregar
                  </button>
                </div>
              </div>

              {/* Lista de medicamentos */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-700">Medicamentos ({medicamentos.length})</h3>
                {medicamentos.length === 0 ? (
                  <p className="text-center text-gray-400 py-4 text-sm">No hay medicamentos agregados</p>
                ) : (
                  medicamentos.map((med) => (
                    <div key={med.id} className={`bg-white rounded-xl p-3 border ${med.completado ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={async () => {
                              const wasCompleted = med.completado;
                              setMedicamentos(medicamentos.map(m =>
                                m.id === med.id ? { ...m, completado: !m.completado } : m
                              ));
                              try {
                                if (!wasCompleted) {
                                  await recordatorioService.marcarTomado(med.id);
                                  setXpStats((prev: XPStats) => ({ ...prev, medicationsTaken: prev.medicationsTaken + 1 }));
                                  addXP(XP_CONFIG.MEDICATION_TAKEN, 'Medicamento tomado');
                                  fetchSavedRecordatorios();
                                }
                              } catch (err) {
                                console.error('Error updating medication:', err);
                              }
                            }}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${med.completado ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-[#ef4444]'
                            }`}
                          >
                            {med.completado && <Check className="w-4 h-4 text-white" />}
                          </button>
                          <div>
                            <p className={`font-semibold text-sm ${med.completado ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                              {med.nombre}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {med.hora}
                              </span>
                              <span className="flex items-center gap-1">
                                <Pill className="w-3 h-3" /> {med.dosis}x/día
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            setMedicamentos(medicamentos.filter(m => m.id !== med.id));
                            try {
                              await recordatorioService.delete(med.id);
                              fetchSavedRecordatorios();
                            } catch (err) {
                              console.error('Error deleting medication:', err);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowMedicamentosModal(false)}
                className="w-full py-2 bg-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {xpPopUp && (
        <div className="fixed bottom-24 right-6 z-[100] animate-[slideInRight_0.3s_ease-out]">
          <div className="bg-gradient-to-r from-[#7c3aed] to-[#059669] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-white rounded-3xl p-8 max-w-sm mx-4 text-center shadow-2xl animate-[scaleIn_0.5s_ease-out]">
            <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-[pulse_1s_infinite]">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">¡LEVEL UP!</h2>
            <p className="text-5xl font-black bg-gradient-to-r from-[#7c3aed] to-[#0d9488] bg-clip-text text-transparent mb-4">
              Nivel {levelUpData.level}
            </p>
            {levelUpData.newBadge && (
              <div className="bg-yellow-100 rounded-xl p-4 mb-4">
                <p className="text-xs text-yellow-600 font-medium mb-1">Nueva insignia desbloqueada:</p>
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
                <h2 className="text-xl font-bold text-white">Crear Workspace</h2>
              </div>
              <button onClick={() => setShowCreateWorkspaceModal(false)} className="p-2 rounded-full hover:bg-white/20 transition-colors">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre del workspace</label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Ej: Proyecto Personal, Trabajo..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Descripción (opcional)</label>
                <textarea
                  value={newWorkspaceDescription}
                  onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                  placeholder="Describe tu workspace..."
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
                  <p className="text-xs text-white/80">Configuración del workspace</p>
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
                        placeholder="Email del usuario"
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] text-sm"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] text-sm"
                      >
                        <option value="member">Miembro</option>
                        <option value="admin">Admin</option>
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
                    <p className="text-xs text-gray-600">Comparte este enlace de invitación:</p>
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
                            <option value="admin">Admin</option>
                            <option value="member">Miembro</option>
                            <option value="viewer">Viewer</option>
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
          <div className="bg-white rounded-2xl shadow-2xl border border-white/50 p-4 max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#7c3aed] to-[#059669] rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-800">Invitaciones pendientes</p>
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
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4"
          onClick={() => setShowUserSettingsModal(false)}
        >
          <div 
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-800 to-gray-900">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-xl">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Ajustes de Perfil</h2>
                  <p className="text-xs text-white/60">Gestiona tu identidad en Focusia</p>
                </div>
              </div>
              <button onClick={() => setShowUserSettingsModal(false)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 shadow-lg">
                    <img 
                      src={newAvatarUrl || `https://ui-avatars.com/api/?name=${newUsername}&background=f4d2d2&color=000`} 
                      alt="Avatar Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 font-medium">Vista previa del avatar</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Elige un avatar</label>
                <div className="grid grid-cols-6 gap-2">
                  {['Ashley','conrad','John','Lia','Monroe','Sophya'].map((name) => {
                    const avatarPath = `/avartars/${name}.jpeg`;
                    return (
                      <button
                        key={name}
                        onClick={() => setNewAvatarUrl(avatarPath)}
                        className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${
                          newAvatarUrl === avatarPath ? 'border-gray-900 ring-2 ring-gray-900/20' : 'border-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <img src={avatarPath} alt={name} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Nombre de usuario</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">URL de foto de perfil (Avatar)</label>
                  <input
                    type="text"
                    value={newAvatarUrl}
                    onChange={(e) => setNewAvatarUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                    placeholder="https://ejemplo.com/mifoto.jpg"
                  />
                </div>
                
                <button
                  onClick={handleUpdateProfile}
                  className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95"
                >
                  Guardar Cambios
                </button>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3">Zona de Peligro</h3>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full py-3 border-2 border-red-100 text-red-500 font-bold rounded-2xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Darme de baja / Eliminar cuenta
                </button>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
              <p className="text-[10px] text-gray-400 font-medium italic">Correo electrónico: {userData.email}</p>
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
            className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#d97706] to-[#f59e0b]">
              <h2 className="text-lg font-bold uppercase text-white">Acciones por Delegar</h2>
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
                      <span className="font-bold text-gray-700 flex-1">{task.titulo}</span>
                      <button
                        onClick={() => {
                          setShowAccionesDelegarModal(false);
                          openDelegationModal(task);
                        }}
                        className="shrink-0 p-2 bg-[#d97706] text-white rounded-lg hover:bg-[#b45309] transition-colors"
                        title="Delegar por email"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                {kanbanTasks.filter(t => t.columna === 'Delegar').length === 0 && (
                  <p className="text-sm text-gray-400 text-center italic py-4">No hay tareas para delegar</p>
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
                  <h2 className="text-xl font-bold text-white">Delegar Tarea</h2>
                  <p className="text-xs text-white/80">Asigna esta tarea a otro usuario</p>
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
                    <p className="text-xs text-orange-600 font-medium mb-1">Tarea a delegar:</p>
                    <p className="font-bold text-gray-800">{delegationTask.titulo}</p>
                  </div>

                  {workspaceMembers.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Miembros del workspace:</p>
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
                    <label className="text-sm font-medium text-gray-700 mb-1 block">O ingresa un email:</label>
                    <input
                      type="email"
                      value={delegationEmail}
                      onChange={(e) => setDelegationEmail(e.target.value)}
                      placeholder="email@ejemplo.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#d97706] text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Mensaje (opcional):</label>
                    <textarea
                      value={delegationMessage}
                      onChange={(e) => setDelegationMessage(e.target.value)}
                      placeholder="Agrega un mensaje para el destinatario..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#d97706] text-sm resize-none"
                    />
                  </div>

                  {delegationLink ? (
                    <div className="bg-green-50 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-medium text-green-700">¡Enlace de delegación creado!</p>
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
                      <p className="text-gray-500">No hay tareas delegadas para ti</p>
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
          <div className="bg-white rounded-2xl shadow-2xl border border-white/50 p-4 max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#d97706] to-[#f59e0b] rounded-xl flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-800">Tareas delegadas</p>
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
    </div>

  );
};

export default Dashboard;
export const FechasImportantesCard: React.FC<FechasImportantesProps> = ({ dayActive = new Date().getDate(), recordatorios, onDayClick, onAddRecordatorio, onEditRecordatorio, onDeleteRecordatorio }) => {
  const ahora = new Date();
  const añoActual = ahora.getFullYear();
  const mesActual = ahora.getMonth();

  const nombreMeses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

  const diasSemana = [
    { label: 'SUN', isSunday: true, isSaturday: false },
    { label: 'MON', isSunday: false, isSaturday: false },
    { label: 'TUE', isSunday: false, isSaturday: false },
    { label: 'WED', isSunday: false, isSaturday: false },
    { label: 'THU', isSunday: false, isSaturday: false },
    { label: 'FRI', isSunday: false, isSaturday: false },
    { label: 'SAT', isSunday: false, isSaturday: true },
  ];

  const primerDia = new Date(añoActual, mesActual, 1);
  const diasEnMes = new Date(añoActual, mesActual + 1, 0).getDate();
  const diaSemanaInicio = primerDia.getDay();

  const paddingInicial = Array.from({ length: diaSemanaInicio }, (_, i) => i);
  const diasDelMes = Array.from({ length: diasEnMes }, (_, index) => index + 1);

  const recordatoriosPorDia = useMemo(() => {
    const map: Record<number, RecordatorioData[]> = {};
    if (recordatorios) {
      recordatorios.forEach(r => {
        const d = new Date(r.fecha_hora);
        if (d.getMonth() === mesActual && d.getFullYear() === añoActual) {
          const dia = d.getDate();
          if (!map[dia]) map[dia] = [];
          map[dia].push(r);
        }
      });
    }
    return map;
  }, [recordatorios, mesActual, añoActual]);

  const recordatoriosHoy = recordatoriosPorDia[dayActive] || [];

  return (
   
    <div className="bg-white shadow-[0_2px_4px_rgb(247,243,243)] flex flex-col h-full w-[200px] p-1.5 overflow-hidden">
  {/* TÍTULO PRINCIPAL */}
  <div className="bg-gradient-to-r from-[#2b44ff] via-[#0b153a] to-[#040817] text-white text-center py-1.5 text-[10px] sm:text-xs font-black tracking-widest uppercase rounded-md select-none w-full">
    FECHAS IMPORTANTES
  </div>
  
  {/* 1️⃣ RECUADRO EXTERIOR (Señalado por la flecha inferior en la imagen) */}
  <div className="p-1.5 flex-1 flex flex-col overflow-hidden border border-slate-300/80 rounded-xl bg-slate-50/30 w-full">
    
    {/* 2️⃣ RECUADRO INTERIOR MARCADO (Señalado por la flecha superior en la imagen) */}
    <div className="border border-slate-800 rounded-lg p-2 flex-1 flex flex-col bg-white w-full overflow-hidden">
      
      {/* CONTENEDOR DEL ENCABEZADO (AÑO, MES Y BOTÓN +) */}
      <div className="flex justify-between items-center text-slate-800 font-black text-[10px] mb-2 tracking-wider select-none w-full">
        
        {/* 🗓️ BADGE DEL AÑO */}
        <div className="bg-gradient-to-r from-[#fecaca] to-[#ffa3a3] border border-slate-200/80 rounded-md px-1.5 py-0.5 shadow-3xs font-black text-slate-700 shrink-0">
          {añoActual}
        </div>

        {/* 🔄 CONTENEDOR DEL MES Y EL BOTÓN (+) */}
        <div className="flex items-center gap-1 font-black text-slate-800 shrink-0">
          <span className="tracking-widest text-[11px]">{nombreMeses[mesActual]}</span>
          
          {/* BOTÓN MÁS (+) */}
          <button
            type="button"
            onClick={() => onAddRecordatorio?.(dayActive)}
            className="w-3.5 h-3.5 rounded-md bg-white border border-slate-200 shadow-3xs text-slate-700 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all"
            title="Añadir recordatorio"
          >
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* CUERPO DEL CALENDARIO */}
      <div className="w-full bg-white flex-1 flex flex-col justify-between overflow-hidden">
        
        {/* CABECERA DE DÍAS (GRID DE 7 COLUMNAS) */}
        <div className="w-full border-t border-slate-100 pt-1.5">
          <div className="grid grid-cols-7 text-[8px] font-black text-center mb-1 select-none w-full">
            {diasSemana.map((dia) => (
              <span 
                key={dia.label} 
                className={`tracking-wider ${
                  dia.isSunday 
                    ? 'text-rose-400 font-black' 
                    : dia.isSaturday 
                    ? 'text-indigo-400 font-black' 
                    : 'text-slate-400'
                }`}
              >
                {dia.label}
              </span>
            ))}
          </div>

          {/* MATRIZ DE NÚMEROS DEL MES */}
          <div className="grid grid-cols-7 text-[10px] font-bold text-center gap-y-0.05 text-slate-700 w-full overflow-hidden">
            {paddingInicial.map((_, idx) => (
              <span key={`blank-${idx}`} className="block h-4" />
            ))}

            {diasDelMes.map((dia) => {
              const celdaIndex = (dia + paddingInicial.length) % 7;
              const esDomingo = celdaIndex === 1;
              const esSabado = celdaIndex === 0;
              const esDiaSeleccionado = dia === dayActive;
              const tieneRecordatorio = !!recordatoriosPorDia[dia];

              return (
                <div 
                  key={dia} 
                  className="h-4 flex items-center justify-center relative cursor-pointer w-full" 
                  onClick={() => onDayClick?.(dia)}
                >
                  {esDiaSeleccionado ? (
                    <span className="w-4 h-4 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-black text-[9px] shadow-3xs select-none">
                      {dia}
                    </span>
                  ) : (
                    <span className={`text-[9px] 
                      ${esDomingo ? 'text-rose-500 font-black' : ''} 
                      ${esSabado ? 'text-slate-900 font-black' : ''} 
                      ${!esDomingo && !esSabado ? 'font-medium hover:text-slate-900 transition-colors' : ''}
                    `}>
                      {dia}
                    </span>
                  )}

                  {tieneRecordatorio && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2">
                      <div className="w-1 h-1 rounded-full bg-rose-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SECCIÓN INFERIOR DE RECORDATORIOS */}
        {recordatorios && recordatorios.length > 0 && (
          <div className="pt-1 border-t border-slate-100 space-y-0.5 mt-1 shrink-0 overflow-y-auto max-h-[50px] scrollbar-hide">
            {recordatorios.map(r => {
              const fecha = new Date(r.fecha_hora);
              const dia = fecha.getDate();
              return (
                <div key={r.id} className="flex items-center gap-1 px-1 group">
                  <span className="text-[8px] font-bold text-indigo-500 shrink-0 w-3 text-right">{dia}</span>
                  <span className="text-[8px] font-medium text-slate-700 truncate flex-1">{r.titulo}</span>
                  <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditRecordatorio?.(r); }}
                      className="w-3 h-3 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Editar"
                    >
                      <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteRecordatorio?.(r.id); }}
                      className="w-3 h-3 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                      title="Eliminar"
                    >
                      <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div> {/* FIN DEL RECUADRO INTERIOR */}
  </div> {/* FIN DEL RECUADRO EXTERIOR */}
</div>
     
  );
};

const AccionesPorDelegarInline: React.FC = () => {
  const [acciones, setAcciones] = useState([
    { id: 1, accion: '', responsable: '' },
    { id: 2, accion: '', responsable: '' },
    { id: 3, accion: '', responsable: '' },
  ]);

  const handleInputChange = (id: number, field: 'accion' | 'responsable', value: string) => {
    setAcciones(
      acciones.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  return (
    <div className="bg-white rounded-md border-2 border-gray-100 shadow-md overflow-hidden max-w-[300px] h-[200px] mx-auto -ml-106 mt-110">
      <div className="bg-gradient-to-r from-[#2b44ff] via-[#0b153a] to-[#040817] text-white text-center py-1.5 text-[10px] sm:text-xs font-black tracking-widest uppercase rounded-md select-none w-[300px]">
        ACCIONES POR DELEGAR
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-1/2 p-2 border-b border-slate-100">
              <div className="w-full bg-gradient-to-r from-[#ffe29f] to-[#fecaca] text-slate-800 text-[10px] py-1.5 px-1 rounded-lg font-black tracking-wider uppercase border border-orange-200/40 text-center">ACCIÓN</div>
            </th>
            <th className="w-1/2 p-2 border-b border-slate-100">
              <div className="w-full bg-gradient-to-r from-[#ffe29f] to-[#fecaca] text-slate-800 text-[10px] py-1.5 px-1 rounded-lg font-black tracking-wider uppercase border border-orange-200/40 text-center">RESPONSABLE</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {acciones.map((item) => (
            <tr key={item.id}>
              <td className="p-1">
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded text-[10px] p-1 h-6 focus:outline-none focus:border-orange-300"
                  placeholder="Escriba aquí"
                  value={item.accion}
                  onChange={(e) => handleInputChange(item.id, 'accion', e.target.value)}
                />
              </td>
              <td className="p-1">
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded text-[10px] p-1 h-6 focus:outline-none focus:border-orange-300"
                  placeholder="Nombre"
                  value={item.responsable}
                  onChange={(e) => handleInputChange(item.id, 'responsable', e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const CategoriasMenu: React.FC = () => {
  const [activeTab, setActiveTab] = useState('SALUD');

  const categorias = [
    { id: 'humor', label: 'HUMOR', esPrimario: false },
    { id: 'salud', label: 'SALUD', esPrimario: true },
    { id: 'hobbyes', label: 'HOBBYES', esPrimario: false },
    { id: 'viajes', label: 'VIAJES', esPrimario: false },
    { id: 'diversion', label: 'DIVERSIÓN', esPrimario: true },
    { id: 'reflexion', label: 'REFLEXIÓN', esPrimario: false },
  ];

  return (
    <div className=" flex justify-between items-center gap-1  max-w-2xl mx-auto w-full mt-40 -ml-14">
      {categorias.slice(0, 3).map((cat) => (
        <button
          key={cat.id}
          onClick={() => setActiveTab(cat.label)}
          className={`text-[9px] px-4 py-2 rounded-lg font-black uppercase flex-1 transition-colors duration-200 ${
            cat.esPrimario
              ? 'bg-gradient-to-r from-[#040817] via-[#0b153a] to-[#2b44ff] text-white'
              : 'bg-gradient-to-r from-[#040817] via-[#0b153a] to-[#2b44ff] text-white'
          }`}
        >
          {cat.label}
        </button>
      ))}
      <div className="flex-shrink-0 p-1.5 mx-1 flex items-center justify-center">
        <img
          src='public/focusia-logo.png'
          alt="F"
          className="w-12 h-12 "
        />
      </div>
      {categorias.slice(3).map((cat) => (
        <button
          key={cat.id}
          onClick={() => setActiveTab(cat.label)}
          className={`text-[9px] px-4 py-2 rounded-lg font-black uppercase flex-1 transition-colors duration-200 ${
            cat.esPrimario
              ? 'bg-gradient-to-r from-[#040817] via-[#0b153a] to-[#2b44ff] text-white'
              : 'bg-gradient-to-r from-[#040817] via-[#0b153a] to-[#2b44ff] text-white'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
};

const DynamicKanbanBacklog: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rowCount, setRowCount] = useState(10);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const containerHeight = entry.contentRect.height;
        const rowHeight = 28;
        const calculatedRows = Math.floor(containerHeight / rowHeight);
        setRowCount(Math.max(5, calculatedRows));
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="w-[210px] h-[450px] bg-white/60 backdrop-blur-sm border border-white/30 rounded-md p-0 shadow-[0_8px_32px_rgba(31,38,135,0.03)] -mt-8 -ml-2 flex flex-col overflow-hidden">
      <div className="bg-gradient-to-r from-[#2b44ff] via-[#0b153a] to-[#040817] text-white text-center py-1.5 text-[10px] sm:text-xs font-black tracking-widest uppercase rounded-md select-none w-full">
        KANBAN BACKLOG
      </div>
      <div className="p-3 pb-2 flex gap-2 shrink-0">
        <span className="w-full bg-gradient-to-r from-[#ffe29f] to-[#fecaca] text-slate-800 text-[9px] py-1 px-1 rounded-lg font-black tracking-wider uppercase shadow-xs border border-orange-200/40 select-none text-center">
          Acción
        </span>
        <span className="w-full bg-gradient-to-r from-[#ffe29f] to-[#fecaca] text-slate-800 text-[9px] py-1 px-1 rounded-lg font-black tracking-wider uppercase shadow-xs border border-orange-200/40 select-none text-center">
          Matriz
        </span>
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden px-2 pb-2 space-y-1">
        {[...Array(rowCount)].map((_, i) => (
          <div key={i} className="flex items-center gap-1 h-6 ">
            <input
              type="text"
              placeholder="Escriba aquí"
              className="flex-1 text-[10px] h-5  bg-transparent border border-slate-700 rounded-md outline-none placeholder:text-gray-400"
            />
            <div className="flex gap-0.5 border border-black-200 rounded-md px-1 py-0.5">
              {['H', 'P', 'D', 'B'].map(l => (
                <span
                  key={l}
                  className="w-3 h-3 flex items-center justify-center bg-gray-800 text-white text-[6px] rounded-full shrink-0"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CardAyudaIA: React.FC<{ onSubmit?: () => void }> = ({ onSubmit }) => {
  const [pregunta, setPregunta] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && pregunta.trim() !== '') {
      setPregunta('');
      onSubmit?.();
    }
  };

  return (
    <div className="bg-white p-5 rounded-md border border-indigo-200 shadow-sm flex flex-col items-center -mt-40 w-[500px]  ml-10">
      <div className="text-[11px] font-black uppercase text-gray-800 mb-2 select-none">
        ¿Necesitas Ayuda?
      </div>
      <input
        type="text"
        value={pregunta}
        onChange={(e) => setPregunta(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full border-none border-b border-dotted border-gray-400 text-center text-xs focus:ring-0 italic text-gray-500 py-1 bg-transparent placeholder-gray-400/70 outline-none"
        placeholder="Pregúntale a la IA ..................................................................................................."
      />
    </div>
  );
};

const BlockDeNotas: React.FC = () => {
  const [lineas, setLineas] = useState<Record<number, string>>({});
  const [rowCount, setRowCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!containerRef.current) return;

    const calculateRows = () => {
      const containerHeight = containerRef.current!.clientHeight;
      const rowHeightWithGap = 22;
      const paddingCompensation = 8;
      const calculatedRows = Math.floor((containerHeight - paddingCompensation) / rowHeightWithGap);
      setRowCount(Math.max(1, calculatedRows));
    };

    const resizeObserver = new ResizeObserver(() => {
      calculateRows();
    });

    resizeObserver.observe(containerRef.current);
    calculateRows();

    return () => resizeObserver.disconnect();
  }, []);

  const handleLineChange = (index: number, value: string) => {
    setLineas((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  return (
    <div className="bg-white flex flex-col flex-1 h-full min-h-[160px]">
      <div className="bg-gradient-to-r from-[#030616] via-[#0b1442] to-[#512bd4] text-white text-center py-1.5 font-bold text-xs uppercase tracking-widest border-b border-black/20 rounded-md select-none shrink-0">
        BLOCK DE NOTAS
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden px-2 pb-2 pt-1.5 space-y-1.5 relative"
      >
        {[...Array(rowCount)].map((_, index) => (
          <div
            key={index}
            className="w-full bg-[#f4f5f8] rounded-md h-4 flex items-center border border-transparent focus-within:border-slate-200 transition-all shrink-0"
          >
            <input
              type="text"
              value={lineas[index] || ''}
              onChange={(e) => handleLineChange(index, e.target.value)}
              placeholder="Escriba aquí"
              className="w-full bg-transparent border-none outline-none focus:ring-0 text-slate-700 italic text-[10px] font-normal placeholder-gray-400 px-2"
            />
          </div>
        ))}
        <div className="absolute bottom-0 right-0 w-[65px] h-[65px] pointer-events-none z-10 flex items-center justify-center">
          <img
            alt="Bulb"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDdxe_ps6FSLi8QbnwjEBRbjdfat6rX39n0ca23r229_cQIAgkBI5LVy4DXIBKVM27BP8mg3hfIJBAMjusej41wZ-PcTILlGH_ScXB8H0UNTezYI49xjrf6_febZLKIkMHtX5GpoGjsV9TIK31S3HI2CiwlaJcEdqvqg87oMo8ozjbh_MsjLylh_Zh-cxx8iWUDLVU7sYu7dAoNxgAidG-okpCTa3mxMT2X1inV6wCU_SAJ7GhLKPfzDM7Z2XfJ61brhoviOhrgyQY"
            className="w-full h-full object-contain select-none filter drop-shadow-sm"
          />
        </div>
      </div>
    </div>
  );
};

function HoraDeOroFamiliar(): React.ReactElement {
  const goldHours = [
    "LUNES", "LUNES", "MARTES", "MARTES", "MIERCOLES", "MIERCOLES",
    "JUEVES", "JUEVES", "VIERNES", "VIERNES", "SÁBADO", "SÁBADO",
    "DOMINGO", "DOMINGO"
  ];

  const [acciones, setAcciones] = useState<Record<number, string>>({});

  const handleInputChange = (index: number, value: string) => {
    setAcciones((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  return (
    <div className="bg-white  border-2 border-gray-100 card-shadow overflow-hidden w-full max-w-md select-none rounded-md">
      <div className="bg-[#0b153a] text-white text-center py-2.5 font-black text-xs uppercase tracking-widest w-full rounded-md">
        HORA DE ORO FAMILIAR
      </div>
      <div className="grid grid-cols-[1fr_60px] gap-1.5 text-[10px] font-black text-center text-slate-800 px-2 py-1 bg-transparent select-none">
  
  {/* 🏷️ BOTÓN: ACCIÓN */}
  <div className="bg-gradient-to-r from-[#ffe4a0] via-[#ff9b9b] to-[#ff7a7a] py-1 uppercase tracking-wider rounded-md border border-black/80 shadow-sm flex items-center justify-center">
    ACCIÓN
  </div>
  
  {/* 🏷️ BOTÓN: DÍAS */}
  <div className="bg-gradient-to-r from-[#ffe4a0] to-[#ff7a7a] py-1 uppercase tracking-wider rounded-md border border-black/80 shadow-sm flex items-center justify-center">
    DÍAS
  </div>

</div>
      <div className="p-1.5 space-y-1 max-h-[380px] overflow-y-auto">
        {goldHours.map((day, index) => (
          <div key={index} className="flex gap-1 items-center">
            <input
              type="text"
              value={acciones[index] || ''}
              onChange={(e) => handleInputChange(index, e.target.value)}
              placeholder="Escriba aquí"
              className="flex-1 border border-gray-200 rounded-md text-[10px] px-2 h-6 focus:ring-0 focus:border-indigo-300 outline-none placeholder:text-gray-400 font-medium text-slate-700"
            />
            <span className="text-[8px] font-black border border-gray-300 bg-slate-50 text-slate-600 rounded-md py-1 w-14 text-center uppercase shrink-0 tracking-tighter">
              {day}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClimaComuna({ temp, descripcion, lugar, loading, error, icono, humedad, sensacion }: {
  temp: number; descripcion: string; lugar: string;
  loading: boolean; error: string; icono: string;
  humedad: number; sensacion: number;
}): React.ReactElement {
  return (
  <div className="bg-white rounded-md border-2 border-gray-100 shadow-md overflow-hidden max-w-[300px] h-[200px] mx-auto ml-20 -mt-33">
    <div className="bg-white rounded-md border-2 border-gray-100 card-shadow overflow-hidden w-full max-w-sm select-none gap-2 flex flex-col"> 
      <div className="bg-gradient-to-r from-[#2b44ff] via-[#0b153a] to-[#040817] text-white text-center py-1.5 text-[10px] sm:text-xs font-black tracking-widest uppercase rounded-md select-none w-[300px]">
        CLIMA EN MI COMUNA
      </div>
      
      <div className="p-3 text-[10px] font-medium text-slate-700">
        {loading ? (
          <div className="flex items-center gap-2 justify-center py-2">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Obteniendo clima...</span>
          </div>
        ) : error ? (
          <div className="text-center py-2">
            <span className="text-[9px] text-red-400 font-medium">{error}</span>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-1/2 p-1 border-b border-slate-100">
                  <div className="w-full bg-gradient-to-r from-[#ffe29f] to-[#fecaca] text-slate-800 text-[10px] py-1.5 px-1 rounded-lg font-black tracking-wider uppercase border border-orange-200/40 text-center">TIEMPO</div>
                </th>
                <th className="w-1/2 p-1 border-b border-slate-100">
                  <div className="w-full bg-gradient-to-r from-[#ffe29f] to-[#fecaca] text-slate-800 text-[10px] py-1.5 px-1 rounded-lg font-black tracking-wider uppercase border border-orange-200/40 text-center">DETALLE</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-1">
                  <span className="font-black text-slate-900">{icono}</span> {descripcion}
                </td>
                <td className="p-1 text-gray-400 italic">Ahora</td>
              </tr>
              <tr>
                <td className="p-1">
                  <span className="font-black text-slate-900">{temp}°C</span> Temperatura
                </td>
                <td className="p-1 text-gray-400 italic">Actual</td>
              </tr>
              <tr>
                <td className="p-1">
                  <span className="font-black text-slate-900">{humedad}%</span> Humedad
                </td>
                <td className="p-1 text-gray-400 italic">{lugar}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  </div>
  );
}

function MiMisionHoy({ mision, avatarUrl }: { mision: string | null; avatarUrl: string | undefined }): React.ReactElement {
  const misionText = mision || 'Terminar carpeta Wireframe del proyecto';
  const avatarSrc = avatarUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuD_9bAoe76XpMkvgcAUyoqOsMCBddvrJ_uiX4k2mz8_CRRQiM9Md4m5eUA3lT-XhkFdJFFaduIIKsqjINp3-VbYi88LAsvyYzyd7zxO0NNBFX5yFOd5gvVkk5UrelYNZYJrCQZOE9x0bxRawElR3OKkIZg7Z6DeXMUQeuO4WG7F5ONIflSQUQBqNpJSAy8Jjo0YJT_k7YR2OEnQa2OkgxtYtWC5HzpiynKxW4YrQ8_YobAlpdwXp6pGTfYcvewsgX1B43G5LpnOuis";

  return (
    <div className="bg-white gap-1 rounded-md border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden w-[170px] flex flex-col select-none">
      <div className="bg-[#1e2540] text-white text-center py-2 font-black text-[10px] uppercase tracking-wider w-full shrink-0 rounded-md">
        MI MISIÓN DE HOY
      </div>
      <div className="bg-gradient-to-br from-[#ffa1a1] via-[#ffccd5] to-[#ffe3a8] flex-1 flex flex-col justify-between items-center relative min-h-[175px] pt-4 overflow-hidden">
        <p className="text-center font-bold text-slate-800 text-[12px] leading-snug italic px-3 z-10 tracking-tight">
          &ldquo;{misionText}&rdquo;
        </p>
        <div className="w-full h-[110px] mt-auto flex items-end justify-center z-0 relative">
          <img
            alt="Profile"
            className="w-[90%] h-full object-contain object-bottom select-none pointer-events-none filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)]"
            src={avatarSrc}
          />
        </div>
      </div>
    </div>
  );
}

function CalendarWidget(): React.ReactElement {
  const ahora = new Date();
  const año = ahora.getFullYear();
  const nombreMeses = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const mes = nombreMeses[ahora.getMonth()];
  const dia = ahora.getDate();

  return (
    <div className="bg-white rounded-md gap-1  border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden w-[170px] select-none flex flex-col">
      <div className="bg-[#0b0f19] px-3 py-1.5 flex items-center justify-center gap-1.5 border-b border-white/5 shrink-0 rounded-md">
        <div className="w-4 h-4 bg-white/10 rounded flex items-center justify-center text-[10px]">📅</div>
        <span className="text-white font-black text-[13px] tracking-wide">{año}</span>
      </div>
      
      <div className="bg-gradient-to-br from-[#3b0717] via-[#1e0b36] to-[#0f172a] p-3 flex flex-col items-center justify-center flex-1 min-h-[175px]">
        <div className="w-[115px] bg-white rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col items-center relative pt-1.5">
          <div className="absolute top-0 flex gap-2 justify-center w-full -mt-0.5 z-10">
            <span className="w-[3px] h-[7px] bg-slate-300 rounded-full block opacity-80"></span>
            <span className="w-[3px] h-[7px] bg-slate-300 rounded-full block opacity-80"></span>
            <span className="w-[3px] h-[7px] bg-slate-300 rounded-full block opacity-80"></span>
            <span className="w-[3px] h-[7px] bg-slate-300 rounded-full block opacity-80"></span>
          </div>
          <div className="w-full bg-[#3b82f6] text-center py-0.5">
            <span className="text-white font-extrabold text-[11px] tracking-wide block">{mes}</span>
          </div>
          <div className="bg-white w-full py-2 flex items-center justify-center">
            <span className="text-[#111827] text-[42px] font-black tracking-tighter block leading-none py-1">{dia}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
