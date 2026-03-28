import React, { useState, useEffect } from 'react';
import { 
  workspaceService, invitationService, delegationService, authService, notificationService, kanbanService, recordatorioService, ruedaVidaService, ruedaService, timeBlockService, objetivoSemanaService, keepNotaService, misionHoyService, billService, matrixService,
  InvitationData, DelegationData, NotificationData, WorkspaceData, WorkspaceMemberData, RuedaVidaData, RuedaCategoria, TimeBlockData, ObjetivoSemanaData, KeepNotaData, MisionHoyData, RecordatorioData, FacturaData, MatrixItemData, KanbanTaskData
} from './services/api';


import { KanbanBoard } from './components/KanbanBoard';
import { NotificationToast } from './components/NotificationToast';
import { FormularioRueda } from './components/FormularioRueda';
import { X, Moon, Sun, LogOut, User, Plus, ArrowRight, Calendar, Edit3, Info, CheckCircle2, Play, ChevronRight, Target, TrendingUp, CalendarDays, CheckCircle, CreditCard, Landmark, Receipt, AlertCircle, CheckSquare, Pill, Clock, Edit, Check, Zap, Trophy, Star, Shield, Flame, Users, Settings, Mail, Copy, Crown, ShieldCheck, UserPlus, Trash2, Send, Briefcase, Bell, MessageSquare } from 'lucide-react';


interface DashboardProps {
  onLogout: () => void;
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

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [rueda, setRueda] = useState<RuedaVidaData | null>(null);
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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showUserSettingsModal, setShowUserSettingsModal] = useState(false);
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [delegationTask, setDelegationTask] = useState<KanbanTaskData | null>(null);
  const [delegationEmail, setDelegationEmail] = useState('');
  const [delegationMessage, setDelegationMessage] = useState('');
  const [delegationLink, setDelegationLink] = useState('');
  const [delegations, setDelegations] = useState<{ sent: any[]; received: any[] }>({ sent: [], received: [] });
  const [delegationTab, setDelegationTab] = useState<'create' | 'received'>('create');

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
  const [recordatorios, setRecordatorios] = useState<RecordatorioData[]>([]);
  const [takenMedications, setTakenMedications] = useState<Set<number>>(new Set());
  const [activeNotification, setActiveNotification] = useState<RecordatorioData | null>(null);
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

  const [xpStats, setXpStats] = useState(() => {
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
          setMetaAnual(metaAnual.map((m, i) => i === editingMetaIndex ? newMetaText.trim() : m));
        }
      } else if (editingMetaType === 'mensual') {
        if (editingMetaIndex === -1) {
          setMetaMensual([...metaMensual, newMetaText.trim()]);
        } else {
          setMetaMensual(metaMensual.map((m, i) => i === editingMetaIndex ? newMetaText.trim() : m));
        }
      } else if (editingMetaType === 'semanal') {
        if (editingMetaIndex === -1) {
          setMetaSemanal([...metaSemanal, newMetaText.trim()]);
        } else {
          setMetaSemanal(metaSemanal.map((m, i) => i === editingMetaIndex ? newMetaText.trim() : m));
        }
      } else if (editingMetaType === 'diaria') {
        if (editingMetaIndex === -1) {
          setMetaDiaria([...metaDiaria, newMetaText.trim()]);
        } else {
          setMetaDiaria(metaDiaria.map((m, i) => i === editingMetaIndex ? newMetaText.trim() : m));
        }
      }
    }
    setEditingMetaType(null);
    setEditingMetaIndex(null);
    setNewMetaText('');
  };

  const handleDeleteMeta = (type: string, index: number) => {
    if (type === 'anual') setMetaAnual(metaAnual.filter((_, i) => i !== index));
    else if (type === 'mensual') setMetaMensual(metaMensual.filter((_, i) => i !== index));
    else if (type === 'semanal') setMetaSemanal(metaSemanal.filter((_, i) => i !== index));
    else if (type === 'diaria') setMetaDiaria(metaDiaria.filter((_, i) => i !== index));
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
        setClima(prev => ({ ...prev, loading: false, error: 'Sin datos' }));
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchClima(pos.coords.latitude, pos.coords.longitude),
        () => setClima(prev => ({ ...prev, loading: false, error: 'Permiso denegado' }))
      );
    } else {
      setClima(prev => ({ ...prev, loading: false, error: 'No disponible' }));
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
      setPendingInvitations(pendingInvitations.filter(i => i.token !== token));
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
        setWorkspaceMembers(members);
      } catch (err) {
        console.error('Error loading workspace members for delegation:', err);
      }
    }
    setShowDelegationModal(true);
  };

  const fetchRecordatorios = async () => {
    try {
      const data = await recordatorioService.getAll();
      setRecordatorios(data);
    } catch (err) {
      console.error('Error fetching recordatorios:', err);
    }
  };

  const checkReminders = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    recordatorios.forEach(rec => {
      if (!rec.activo) return;
      if (takenMedications.has(rec.id)) return;

      const recDate = new Date(rec.fecha_hora);
      const recDateStr = recDate.toISOString().split('T')[0];

      if (recDateStr === today) {
        const recMinutes = recDate.getHours() * 60 + recDate.getMinutes();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        if (Math.abs(recMinutes - nowMinutes) <= 1) {
          setActiveNotification(rec);
        }
      }
    });
  };

  const handleMarkTaken = async (id: number) => {
    try {
      await recordatorioService.update(id, { activo: false });
      setTakenMedications(prev => new Set([...prev, id]));
      setActiveNotification(null);
    } catch (err) {
      console.error('Error marking medication as taken:', err);
    }
  };

  useEffect(() => {
    fetchRecordatorios();

    const interval = setInterval(() => {
      fetchRecordatorios();
      checkReminders();
    }, 60000);

    checkReminders();

    return () => clearInterval(interval);
  }, [recordatorios.length]);

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
        avatar_url: updated.avatar_url || `https://ui-avatars.com/api/?name=${updated.username}&background=f4d2d2&color=000`
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
        const [ruedaRes, ruedaCompletaRes, tbRes, objRes, keepRes, misRes, factRes, matrixRes, kanbanRes] = await Promise.all([
          ruedaVidaService.get().catch(() => null),
          ruedaService.getCompleta().catch(() => []),
          timeBlockService.getAll().catch(() => []),
          objetivoSemanaService.get().catch(() => null),
          keepNotaService.get().catch(() => null),
          misionHoyService.get().catch(() => null),
          billService.getAll().catch(() => []),
          matrixService.getAll().catch(() => []),
          kanbanService.getAll().catch(() => [])
        ]);

        setRueda(Array.isArray(ruedaRes) ? ruedaRes[0] : ruedaRes);
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
    const block = timeBlocks.find(t => t.hora === hora);
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
    const block = timeBlocks.find(t => t.hora === hora);
    try {
      if (block) {
        await timeBlockService.update(block.id, { estado });
        // update local state so it doesn't revert
        setTimeBlocks(prev => prev.map(t => t.id === block.id ? { ...t, estado } : t));
      } else {
        const newBlock = await timeBlockService.create({ hora, tarea: '', estado });
        setTimeBlocks(prev => [...prev, newBlock]);
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
    const total = ruedaCompleta.reduce((sum, cat) => sum + cat.puntaje, 0);
    if (total === 0) return fallback;

    let currentDeg = 0;
    const gradientParts: string[] = [];

    ruedaCompleta.forEach((cat, index) => {
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
      <header className="w-full max-w-[1240px] flex items-center justify-end mb-4 z-50 relative px-4 text-gray-600">
        <div className="flex-1 flex justify-end items-center gap-2 sm:gap-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[#292e34]/90 shadow-sm border border-gray-600 hover:bg-[#3a3f47] transition-colors"
            title={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-yellow-400" />
            ) : (
              <Moon className="w-4 h-4 text-white" />
            )}
          </button>

          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-all relative border border-white/40 shadow-sm"
              title="Notificaciones"
            >
              <Bell className="w-4 h-4 text-white" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-[100]"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 top-full mt-3 w-80 bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/50 overflow-hidden z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Notificaciones</p>
                    <span className="text-[10px] text-gray-400 font-medium">{notifications.length} nuevas</span>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-10 text-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Bell className="w-5 h-5 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400 font-medium">No tienes notificaciones</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {notifications.map(notif => (
                          <div 
                            key={notif.id}
                            className="p-4 hover:bg-gray-50 transition-colors flex gap-3 group"
                          >
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                              notif.type === 'invitation' ? 'bg-purple-100 text-purple-600' :
                              notif.type === 'delegation' ? 'bg-amber-100 text-amber-600' :
                              'bg-blue-100 text-blue-600'
                            }`}>
                              {notif.type === 'invitation' ? <Briefcase className="w-5 h-5" /> :
                               notif.type === 'delegation' ? <MessageSquare className="w-5 h-5" /> :
                               <Clock className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-800 leading-tight mb-0.5">{notif.title}</p>
                              <p className="text-xs text-gray-500 line-clamp-2">{notif.message}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] text-gray-400">{new Date(notif.created_at).toLocaleDateString()}</span>
                                <button className="text-[10px] font-bold text-[#7c3aed] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                  Ver detalles <ChevronRight className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="p-3 bg-gray-50 border-t border-gray-100">
                      <button className="w-full py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors">
                        Marcar todas como leídas
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          
          {/* Workspace Selector */}

          <div className="relative">
            <button
              onClick={() => setShowWorkspaceSelector(!showWorkspaceSelector)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#7c3aed] to-[#059669] text-white px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity shadow-md"
            >
              <Briefcase className="w-4 h-4" />
              <span className="font-bold text-xs max-w-[120px] truncate">
                {currentWorkspace?.name || 'Mi Workspace'}
              </span>
              {pendingInvitations.length > 0 && (
                <span className="w-5 h-5 bg-yellow-400 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingInvitations.length}
                </span>
              )}
            </button>

            {showWorkspaceSelector && (
              <>
                <div
                  className="fixed inset-0 z-[60]"
                  onClick={() => setShowWorkspaceSelector(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-72 bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 overflow-hidden z-[70]">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-[#7c3aed]/10 to-[#0d9488]/10">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Workspaces</p>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    {workspaces.map(ws => (
                      <button
                        key={ws.id}
                        onClick={() => {
                          setCurrentWorkspace(ws);
                          loadWorkspaceMembers(ws.id);
                          setShowWorkspaceSelector(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                          currentWorkspace?.id === ws.id ? 'bg-[#7c3aed]/10' : ''
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          ws.my_role === 'owner' ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                          ws.my_role === 'admin' ? 'bg-gradient-to-br from-purple-400 to-pink-500' :
                          'bg-gradient-to-br from-teal-400 to-cyan-500'
                        }`}>
                          <Briefcase className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-sm text-gray-800">{ws.name}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              ws.my_role === 'owner' ? 'bg-yellow-100 text-yellow-700' :
                              ws.my_role === 'admin' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {ws.my_role === 'owner' ? 'Dueño' : ws.my_role === 'admin' ? 'Admin' : 'Miembro'}
                            </span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Users className="w-3 h-3" /> {ws.members_count}
                            </span>
                          </div>
                        </div>
                        {currentWorkspace?.id === ws.id && (
                          <Check className="w-5 h-5 text-[#7c3aed]" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-gray-100 p-2">
                    <button
                      onClick={() => {
                        setShowWorkspaceSelector(false);
                        setShowCreateWorkspaceModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#7c3aed] hover:bg-[#7c3aed]/10 rounded-xl transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Crear workspace
                    </button>
                    {currentWorkspace && (currentWorkspace.my_role === 'owner' || currentWorkspace.my_role === 'admin') && (
                      <button
                        onClick={() => {
                          setShowWorkspaceSelector(false);
                          setShowWorkspaceSettingsModal(true);
                          loadWorkspaceMembers(currentWorkspace.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Configuración
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 hover:bg-white/20 rounded-full px-2 py-1 transition-colors"
            >
              <div className="w-7 h-7 rounded-full overflow-hidden shadow-sm border-2 border-white">
                <img src={userData.avatar_url} alt="profile" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-xs text-gray-800">{userData.username}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>


            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-[60]"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-72 bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 overflow-hidden z-[70]">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-[#7c3aed]/10 to-[#0d9488]/10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden shadow-sm border-2 border-[#7c3aed]">
                        <img src={userData.avatar_url} alt="profile" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-800">{userData.username}</p>
                        <div className="flex items-center gap-2 mt-0.5">

                          <div className="flex items-center gap-1 bg-[#7c3aed]/20 px-2 py-0.5 rounded-full">
                            <Zap className="w-3 h-3 text-[#7c3aed]" />
                            <span className="text-xs font-bold text-[#7c3aed]">Nivel {getLevelFromXP(xpStats.totalXP).level}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          {xpStats.totalXP} XP
                        </span>
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-500" />
                          {xpStats.streak} días
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#7c3aed] to-[#0d9488] rounded-full transition-all duration-500"
                          style={{ width: `${getLevelFromXP(xpStats.totalXP).progress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 text-right">
                        {getLevelFromXP(xpStats.totalXP).currentXP}/{getLevelFromXP(xpStats.totalXP).nextLevelXP} para nivel {getLevelFromXP(xpStats.totalXP).level + 1}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between bg-[#059669]/10 px-3 py-1.5 rounded-xl">
                      <span className="text-[10px] text-[#059669] font-medium">XP de hoy:</span>
                      <span className="text-xs font-bold text-[#059669]">+{xpStats.todayXP} XP</span>
                    </div>
                  </div>

                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Insignias</p>
                    <div className="flex gap-2 flex-wrap">
                      {BADGES.map(badge => {
                        const isUnlocked = xpStats.unlockedBadges.includes(badge.id);
                        return (
                          <div
                            key={badge.id}
                            className={`relative group flex items-center justify-center w-10 h-10 rounded-xl ${isUnlocked
                                ? 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg'
                                : 'bg-gray-100 opacity-50'
                              }`}
                            title={isUnlocked ? badge.name : `Bloqueada - ${badge.desc}`}
                          >
                            <badge.icon className={`w-5 h-5 ${isUnlocked ? 'text-white' : 'text-gray-400'}`} />
                            {!isUnlocked && (
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                {badge.desc}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="px-2 py-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowUserSettingsModal(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all rounded-xl"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                      Ajustes de usuario
                    </button>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 transition-all rounded-xl"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          <button className="text-gray-600 relative ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span className="absolute -top-0.5 -right-0.5 w-[7px] h-[7px] bg-red-400 rounded-full border border-white"></span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="w-full max-w-[1240px] bg-white/20 backdrop-blur-2xl border border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.05)] rounded-[2.5rem] p-5 sm:p-7 z-10 flex flex-col xl:flex-row gap-5">

        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-4 w-full xl:w-[32%]">
          {/* Top of Left: Pills & Foco */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-2.5 w-[30%]">
              <button className="bg-[#0d9488] text-white py-2 rounded-2xl text-[10px] sm:text-xs font-bold uppercase shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-white/40 transition hover:scale-[1.02] whitespace-nowrap">COACHING</button>
              <button className="bg-[#7c3aed] text-white py-2 rounded-2xl text-[10px] sm:text-xs font-bold uppercase shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-white/40 transition hover:scale-[1.02] whitespace-nowrap">GRATITUD</button>
              <button className="bg-[#059669] text-white py-2 rounded-2xl text-[10px] sm:text-xs font-bold uppercase shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-white/40 transition hover:scale-[1.02] whitespace-nowrap">TRIBU</button>
            </div>
            <div className="flex flex-col gap-2.5 flex-1">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setShowInicioModal(true)}
                  className="bg-[#1e3a5f] text-white py-1.5 px-2 rounded-2xl text-[10px] font-bold uppercase shadow-md flex-1 transition hover:bg-[#2d4a6f]"
                >
                  INICIO
                </button>
                <button
                  onClick={() => setShowRuedaVideoModal(true)}
                  className="bg-[#059669] text-white py-1.5 px-2 rounded-2xl text-[10px] font-bold uppercase shadow-md flex-1 transition hover:bg-[#047857] flex items-center justify-center gap-1"
                >
                  <Play className="w-3 h-3" /> RUEDA
                </button>
                <button
                  onClick={() => setShowMatrizVideoModal(true)}
                  className="bg-[#1e3a5f] text-white py-1.5 px-2 rounded-2xl text-[10px] font-bold uppercase shadow-md flex-1 transition hover:bg-[#2d4a6f] flex items-center justify-center gap-1"
                >
                  <Play className="w-3 h-3" /> MATRIZ
                </button>
              </div>
              <div
                onClick={() => setShowRuedaVideoModal(true)}
                className="bg-gradient-to-br from-[#f0fdf4] to-[#ecfdf5] backdrop-blur-md rounded-3xl p-3 sm:p-4 shadow-sm border border-white/60 h-full flex flex-col justify-center relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-bold uppercase text-gray-800 leading-tight">FOCO DE MARZO SEGUN RUEDA DE LA VIDA</h3>
                  <button className="p-1 rounded-full hover:bg-white/50 transition-colors">
                    <Edit3 className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
                <div className="flex items-center gap-3 relative z-10 w-full">
                  <div className="w-[60px] h-[60px] shrink-0 rounded-full shadow-sm border-[6px] border-[#ede8db] relative overflow-hidden transition-all duration-500 ease-in-out" style={{ background: getConicGradient() }}>
                    <div className="w-5 h-5 bg-[#ede8db] rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="w-[4px] h-full bg-[#ede8db] absolute left-1/2 top-0 -translate-x-1/2"></div>
                    <div className="w-full h-[4px] bg-[#ede8db] absolute top-1/2 left-0 -translate-y-1/2"></div>
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    {ruedaCompleta.slice(0, 3).map((cat) => (
                      <div key={cat.id} className="bg-black text-white text-[9px] py-1 px-2 rounded-full text-center font-bold tracking-widest uppercase shadow-sm flex items-center justify-center gap-1">
                        {cat.icono} {cat.nombre.substring(0, 6)} ({cat.puntaje})
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle of Left */}
          <div className="flex gap-4">
            <button
              onClick={() => setShowRecordatorioModal(true)}
              className="flex-1 bg-white/40 backdrop-blur-md rounded-3xl p-4 shadow-sm border border-white/60 relative flex flex-col items-center pt-10 min-h-[200px] hover:bg-white/50 transition-colors cursor-pointer text-left"
            >
              <div className="absolute -top-4 bg-[#0d9488] text-white px-4 py-2 rounded-2xl text-[9px] sm:text-[10px] font-black leading-tight text-center uppercase shadow-sm w-[90%] border border-white/50 scale-105">
                RECORDATORIO<br />FECHAS IMPORTANTES
              </div>
              <div className="w-full flex-1 flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-2 bg-white/30 backdrop-blur-sm rounded-xl p-2">
                  <span className="text-[10px] font-bold text-[#0d9488]">🎂</span>
                  <span className="text-[10px] text-gray-700">Cumpleaños de mamá - 15 Marzo</span>
                </div>
                <div className="flex items-center gap-2 bg-white/30 backdrop-blur-sm rounded-xl p-2">
                  <span className="text-[10px] font-bold text-[#0d9488]">💊</span>
                  <span className="text-[10px] text-gray-700">Control médico - 20 Marzo</span>
                </div>
                <div className="flex items-center gap-2 bg-white/30 backdrop-blur-sm rounded-xl p-2">
                  <span className="text-[10px] font-bold text-[#0d9488]">📅</span>
                  <span className="text-[10px] text-gray-700">Reunión importante - 25 Marzo</span>
                </div>
              </div>
              <div className="mt-auto pt-2 flex justify-center">
                <span className="text-[9px] text-[#0d9488] flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Agregar recordatorio
                </span>
              </div>
            </button>
            <div className="flex-1 flex flex-col gap-3">
              <div className="bg-white/40 backdrop-blur-md rounded-[1.5rem] p-3 shadow-sm border border-white/60 flex-1 flex flex-col items-center justify-start pt-3">
                <h3 className="text-[10px] font-bold text-center uppercase text-gray-800 mb-1">OBJETIVO DE LA SEMANA</h3>
                <div className="w-full space-y-2 mt-1 px-2">
                  <input type="text" className="w-full bg-transparent border-b-[1.5px] border-gray-400 focus:outline-none focus:border-gray-600 text-[10px] text-gray-800 pb-0.5" defaultValue={objetivo?.texto1 || ''} onBlur={(e) => handleObjetivoBlur('texto1', e.target.value)} />
                  <input type="text" className="w-full bg-transparent border-b-[1.5px] border-gray-400 focus:outline-none focus:border-gray-600 text-[10px] text-gray-800 pb-0.5" defaultValue={objetivo?.texto2 || ''} onBlur={(e) => handleObjetivoBlur('texto2', e.target.value)} />
                  <input type="text" className="w-[60%] mx-auto block bg-transparent border-b-[1.5px] border-gray-400 focus:outline-none focus:border-gray-600 text-[10px] text-gray-800 pb-0.5" defaultValue={objetivo?.texto3 || ''} onBlur={(e) => handleObjetivoBlur('texto3', e.target.value)} />
                </div>
              </div>
              <div className="mt-3">
                <div
                  onClick={() => setShowDelegarModal(true)}
                  className="bg-white/50 backdrop-blur-md rounded-[1.5rem] p-4 border border-white/60 hover:bg-white/60 transition-all cursor-pointer shadow-sm group"
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h4 className="text-[9px] font-black uppercase text-gray-600 tracking-[0.15em] mb-0">Kanban Backlog</h4>
                    <div className="bg-[#1e3a5f]/10 px-2 py-0.5 rounded-full">
                      <span className="text-[8px] font-bold text-[#1e3a5f]">{kanbanTasks.filter(t => t.columna === 'Agenda' || t.columna === 'Backlog').length} Pendientes</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {kanbanTasks
                      .filter(t => t.columna === 'Agenda' || t.columna === 'Backlog')
                      .slice(0, 3)
                      .map((task) => (
                        <div key={task.id} className="bg-white/70 backdrop-blur-sm rounded-xl p-2.5 text-[10px] text-gray-800 border border-white/40 shadow-sm flex flex-col gap-1 group-hover:translate-x-1 transition-transform">
                          <span className="font-bold line-clamp-1">{task.titulo}</span>
                          {task.fecha_hora && (
                            <div className="flex items-center gap-1 text-[8px] text-[#4f46e5] font-bold">
                              <Clock className="w-2 h-2" />
                              <span>{new Date(task.fecha_hora).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    {kanbanTasks.filter(t => t.columna === 'Agenda' || t.columna === 'Backlog').length === 0 && (
                      <div className="text-[9px] text-gray-400 text-center italic py-4 bg-white/30 rounded-xl border border-dashed border-gray-400/30">
                        No hay tareas pendientes
                      </div>
                    )}
                    {kanbanTasks.filter(t => t.columna === 'Agenda' || t.columna === 'Backlog').length > 3 && (
                      <p className="text-[8px] text-[#1e3a5f] font-bold text-center mt-2 uppercase tracking-tighter">+ Ver todas</p>
                    )}
                  </div>
                </div>
              </div>


            </div>
          </div>

          {/* Bottom Left - Acciones por Delegar */}
          <div className="mt-auto pt-6 w-full">
            <div 
              className="w-full bg-[#fef3c7]/50 backdrop-blur-md rounded-3xl p-4 shadow-sm border border-white/60 group"
            >
              <div className="bg-[#d97706] text-white px-4 py-1.5 rounded-2xl text-[10px] font-bold text-center uppercase shadow-sm border border-white/50 mb-3 transition-colors">
                ACCIONES POR DELEGAR
              </div>

              <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                {kanbanTasks
                  .filter(t => t.columna === 'Delegar')
                  .map(task => (
                    <div key={task.id} className="bg-white/60 p-2 rounded-xl text-[9px] border border-white/40 flex items-center justify-between gap-2 hover:bg-white/80 transition-colors">
                      <span className="font-bold text-gray-700 truncate flex-1">{task.titulo}</span>
                      <button
                        onClick={() => openDelegationModal(task)}
                        className="shrink-0 p-1 bg-[#d97706] text-white rounded-lg hover:bg-[#b45309] transition-colors"
                        title="Delegar por email"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                {kanbanTasks.filter(t => t.columna === 'Delegar').length === 0 && (
                  <p className="text-[8px] text-gray-400 text-center italic py-2">No hay tareas para delegar</p>
                )}
              </div>
              <button
                onClick={() => {
                  setDelegationTab('received');
                  setShowDelegationModal(true);
                }}
                className="mt-2 w-full py-2 bg-[#d97706] text-white text-[10px] font-bold rounded-xl hover:bg-[#b45309] transition-colors flex items-center justify-center gap-1"
              >
                <Send className="w-3 h-3" />
                Ver Delegaciones
              </button>
            </div>
          </div>

        </div>

        {/* CENTER COLUMN */}
        <div className="flex flex-col gap-3 w-full xl:w-[32%] relative items-center">
          {/* Logo Area */}
          <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-white/60 p-3 w-full flex justify-center mt-[-5px]">
            <img
              src="/focusia-logo.png"
              alt="Focusia"
              className="h-16 object-contain drop-shadow-sm"
            />
          </div>

          {/* Tabs */}
          <div className="bg-[#f1f5f9]/60 backdrop-blur-md rounded-full px-2 py-1.5 shadow-sm border border-white/80 flex items-center justify-center w-[98%] max-w-[320px] gap-2">
            <button onClick={() => setShowMetaAnualModal(true)} className="text-[10px] font-bold uppercase px-2 py-1 rounded-full hover:bg-white/50 transition-colors text-gray-800 tracking-wide">ANUAL</button>
            <button onClick={() => setShowMetaMensualModal(true)} className="text-[10px] font-bold uppercase px-2 py-1 rounded-full hover:bg-white/50 transition-colors text-gray-800 tracking-wide border-x border-gray-400/50">MENSUAL</button>
            <button onClick={() => setShowMetaSemanalModal(true)} className="text-[10px] font-bold uppercase px-2 py-1 rounded-full hover:bg-white/50 transition-colors text-gray-800 tracking-wide border-r border-gray-400/50">SEMANAL</button>
            <button onClick={() => setShowMetaDiariaModal(true)} className="text-[10px] font-bold uppercase px-2 py-1 rounded-full hover:bg-white/50 transition-colors text-gray-800 tracking-wide">DIARIA</button>
          </div>

          {/* Time Blocking Table */}
          <div className="bg-gradient-to-b from-[#f8fafc]/80 to-[#f1f5f9]/80 backdrop-blur-xl rounded-[2rem] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-white/70 w-full overflow-hidden flex flex-col flex-1 mb-1 relative">
            <div className="px-5 py-2.5 flex justify-between items-center z-10">
              <h3 className="text-[13px] font-black uppercase tracking-widest text-[#0f172a]">TIME BLOCKING</h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a2b3c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>

            <div className="px-1.5 pb-1.5 h-full">
              <div className="w-full bg-[#0d9488] backdrop-blur-md rounded-2xl shadow-inner h-[100%] border border-[#0f766e] overflow-hidden">
                <table className="w-full text-[10px] text-white table-fixed border-collapse h-full">
                  <thead>
                    <tr className="border-b border-[#8daacd]">
                      <th className="font-semibold uppercase w-12 py-1 text-center border-r border-[#8daacd] text-[9px]">TIME</th>
                      <th className="font-semibold uppercase py-1 text-center border-r border-[#8daacd] text-[9px]">WORK IN PROGRESS</th>
                      <th className="font-semibold uppercase w-14 py-1 text-center text-[9px]">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defaultHours.map((h, i) => {
                      const block = timeBlocks.find(t => t.hora === h);
                      return (
                        <tr key={h} className={`border-b border-t border-[#0f766e] ${i % 2 === 0 ? 'bg-[#0d7377]' : 'bg-[#0f8a84]'} h-[20px] sm:h-[22px]`}>
                          <td className="text-center font-medium border-r border-white/20">{h}:00</td>
                          <td className="border-r border-white/20 px-2">
                            <input
                              type="text"
                              className="w-full bg-transparent text-white outline-none placeholder-white/40"
                              placeholder="..."
                              defaultValue={block?.tarea || ''}
                              onBlur={(e) => handleTimeBlockBlur(h, e.target.value)}
                            />
                          </td>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              className="accent-blue-200 cursor-pointer"
                              checked={block?.estado || false}
                              onChange={(e) => handleTimeBlockStatus(h, e.target.checked)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom Pills */}
          <div className="flex flex-wrap justify-center gap-1.5 mt-2">
            {['HUMOR', 'EJERCICIOS', 'HOBBIES', 'VIAJES', 'DIVERSIÓN', 'REFLEXIÓN'].map(item => (
              <button key={item} className="bg-[#f59e0b] text-white px-2.5 py-1.5 rounded-full text-[9px] font-bold uppercase shadow-sm border border-white/60 transition hover:bg-[#d97706] hover:scale-105 whitespace-nowrap">
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-4 w-full xl:w-[36%]">
          {/* Top of Right */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-3 w-[65%] pr-3">
              <div className="flex gap-1.5">
                <button className="bg-[#3b82f6] text-white py-2 px-2 flex-1 rounded-2xl text-[10px] font-black uppercase shadow-sm border border-white/40 transition hover:scale-[1.02]">CURSOS</button>
                <button className="bg-[#ec4899] text-white py-2 px-2 flex-1 rounded-2xl text-[10px] font-black uppercase shadow-sm border border-white/40 transition hover:scale-[1.02]">RRSS</button>
                <button
                  onClick={() => setShowBillModal(true)}
                  className="bg-[#6366f1] text-white py-2 px-2 flex-1 rounded-2xl text-[10px] font-black uppercase shadow-sm border border-white/40 transition hover:scale-[1.02] flex items-center justify-center gap-1"
                >
                  <CreditCard className="w-3 h-3" /> CUENTAS
                </button>
              </div>
              <div className="bg-gradient-to-br from-[#fef9c3]/80 to-[#fef3c7]/80 backdrop-blur-xl rounded-[2rem] p-4 shadow-sm border border-white/60 h-[170px] flex flex-col items-center pt-3">
                <h3 className="text-[12px] font-black uppercase text-gray-800 tracking-widest text-center mt-2 mb-2">KEEP BLOCK DE NOTAS</h3>
                <textarea
                  className="w-full flex-1 bg-transparent resize-none border-none outline-none text-[10px] text-gray-800 placeholder-gray-400"
                  placeholder="Escribe tus notas aquí..."
                  defaultValue={keepNota?.contenido || ''}
                  onBlur={handleKeepNotaBlur}
                ></textarea>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 w-[33%] pl-1">
              <button
                onClick={() => setShowMedicamentosModal(true)}
                className="bg-[#ef4444] text-white py-2.5 rounded-2xl text-[10px] font-bold uppercase shadow-sm border border-white/40 transition hover:scale-[1.02] whitespace-nowrap flex items-center justify-center gap-1"
              >
                <Pill className="w-3 h-3" /> MEDICAMENTOS
              </button>
              <button className="bg-[#8b5cf6] text-white py-2.5 rounded-2xl text-[10px] font-bold uppercase shadow-sm border border-white/40 transition hover:scale-[1.02] whitespace-nowrap">CUMPLEAÑOS</button>
              <div className="h-[25px]"></div>
              <button className="bg-[#059669] text-white py-2.5 rounded-2xl text-[11px] font-bold uppercase shadow-sm border border-white/40 transition hover:scale-[1.02] whitespace-nowrap">FOCUS</button>
            </div>
          </div>

          {/* Middle of Right */}
          <div className="flex gap-3 min-h-[190px]">
            <div className="flex flex-col gap-3 w-[55%]">
              <div className="bg-[#f0fdf4] backdrop-blur-xl rounded-[1.5rem] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-white/80 flex flex-col items-center justify-center relative w-[85%] ml-2">
                <div className="absolute top-2 right-2 text-gray-800"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg></div>
                <h3 className="text-xl font-black uppercase text-gray-900 leading-[1] mt-1">{currentDate.dia} {currentDate.numero}</h3>
                <h3 className="text-xl font-black uppercase text-gray-900 leading-[1] my-[2px]">{currentDate.mes}</h3>
                <h3 className="text-[19px] font-black text-gray-900 leading-[1]">{currentDate.anio}</h3>
              </div>
              <div className="flex flex-col gap-1.5 items-center w-full mt-2 pr-4">
                <h3 className="text-[10px] font-bold uppercase text-gray-800 text-center w-full shrink-0">MI MISIÓN DE HOYES:</h3>
                <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden shadow-sm border border-white/60 mb-2 mt-1">
                  <img src={misionHoy?.imagen_url || "https://images.unsplash.com/photo-1542596594-649edbc13630?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"} alt="mission" className="w-full h-full object-cover transform scale-110 object-top" />
                </div>
              </div>
            </div>

            <div className="w-[45%] bg-gradient-to-b from-[#fef3c7]/90 via-[#fde68a]/80 to-[#fcd34d]/70 backdrop-blur-xl rounded-[2rem] p-4 shadow-sm border border-white/80 flex flex-col items-center pt-6">
              <h3 className="text-[11px] font-bold uppercase text-center text-gray-800 leading-tight">LA HORA DE ORO<br />FAMILIAR</h3>
            </div>
          </div>

          {/* Bottom Right - Clima */}
          <div className="w-full flex justify-end">
            <div className="bg-gradient-to-r from-[#7dd3fc]/70 to-[#38bdf8]/70 backdrop-blur-md rounded-[1.5rem] px-4 py-2.5 shadow-sm border border-white/60 w-[90%] mt-auto relative overflow-hidden flex items-center gap-3 mr-1">
              {clima.loading ? (
                <div className="flex items-center gap-2 w-full justify-center">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] text-gray-500">Obteniendo clima...</span>
                </div>
              ) : clima.error ? (
                <div className="flex flex-col items-center w-full">
                  <span className="text-[10px] font-bold uppercase text-gray-500">CLIMA EN MI COMUNA</span>
                  <span className="text-[9px] text-red-400">{clima.error}</span>
                </div>
              ) : (
                <>
                  <span className="text-3xl leading-none">{clima.icono}</span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[9px] font-bold uppercase text-blue-700 truncate">{clima.lugar}</span>
                    <span className="text-[10px] text-gray-600">{clima.descripcion}</span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[22px] font-black text-gray-800 leading-none">{clima.temp}°</span>
                    <span className="text-[9px] text-gray-500">💧 {clima.humedad}%</span>
                  </div>
                </>
              )}
            </div>
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
          onClick={() => setShowRecordatorioModal(false)}
        >
          <div
            className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-[#0d9488] to-[#14b8a6]">
              <h2 className="text-lg font-bold uppercase text-white">Nuevo Recordatorio</h2>
              <button
                onClick={() => setShowRecordatorioModal(false)}
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
                  recordatorioService.create({
                    titulo,
                    fecha_hora: fecha,
                    categoria,
                    activo: true
                  }).then(() => {
                    setShowRecordatorioModal(false);
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
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a5c5ea] bg-white/50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Categoría</label>
                <select
                  name="categoria"
                  required
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
                  onClick={() => setShowRecordatorioModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-xl bg-[#0d9488] text-white font-bold hover:bg-[#0f766e] transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    <h3 className="font-bold uppercase text-sm">Rueda de la Vida</h3>
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
                  ruedaService.getCompleta().then(setRuedaCompleta);
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
              <p className="text-sm text-gray-500 mb-6">Aprende cómo填写 tu Rueda de la Vida en pocos minutos</p>

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
                        setXpStats(prev => ({ ...prev, tasksCompleted: prev.tasksCompleted + 1 }));
                        addXP(500, 'Meta anual completada');
                        setMetaAnual(metaAnual.filter((_, i) => i !== index));
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
                        setXpStats(prev => ({ ...prev, tasksCompleted: prev.tasksCompleted + 1 }));
                        addXP(XP_CONFIG.MONTHLY_GOAL, 'Meta mensual completada');
                        setMetaMensual(metaMensual.filter((_, i) => i !== index));
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
                        setXpStats(prev => ({ ...prev, tasksCompleted: prev.tasksCompleted + 1 }));
                        addXP(XP_CONFIG.WEEKLY_GOAL, 'Meta semanal completada');
                        setMetaSemanal(metaSemanal.filter((_, i) => i !== index));
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
                        setXpStats(prev => ({ ...prev, tasksCompleted: prev.tasksCompleted + 1 }));
                        addXP(XP_CONFIG.DAILY_GOAL, 'Meta diaria completada', BADGES[0].condition);
                        setMetaDiaria(metaDiaria.filter((_, i) => i !== index));
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                {/* Cuadrante 1: DO (Urgente e Importante) */}
                <div className="bg-red-50/50 rounded-3xl p-5 border border-red-100 flex flex-col min-h-[250px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black text-red-600 uppercase tracking-widest">1. HACER (Urgente)</h3>
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
                <div className="bg-blue-50/50 rounded-3xl p-5 border border-blue-100 flex flex-col min-h-[250px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest">2. AGENDAR (Visión)</h3>
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
                <div className="bg-orange-50/50 rounded-3xl p-5 border border-orange-100 flex flex-col min-h-[250px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black text-orange-600 uppercase tracking-widest">3. DELEGAR (Interrupciones)</h3>
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
                <div className="bg-gray-100/50 rounded-3xl p-5 border border-gray-200 flex flex-col min-h-[250px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">4. ELIMINAR (Distracciones)</h3>
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
      {activeNotification && (
        <NotificationToast
          recordatorio={activeNotification}
          onClose={() => setActiveNotification(null)}
          onMarkTaken={() => handleMarkTaken(activeNotification.id)}
          showMarkTaken={activeNotification.categoria === 'Medicamento'}
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
                    onClick={() => {
                      if (nuevoMedicamento.nombre.trim()) {
                        setMedicamentos([...medicamentos, {
                          id: Date.now(),
                          nombre: nuevoMedicamento.nombre,
                          hora: nuevoMedicamento.hora,
                          dosis: nuevoMedicamento.dosis,
                          completado: false
                        }]);
                        setNuevoMedicamento({ nombre: '', hora: '08:00', dosis: 1 });
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
                            onClick={() => {
                              const wasCompleted = med.completado;
                              setMedicamentos(medicamentos.map(m =>
                                m.id === med.id ? { ...m, completado: !m.completado } : m
                              ));
                              if (!wasCompleted) {
                                setXpStats(prev => ({ ...prev, medicationsTaken: prev.medicationsTaken + 1 }));
                                addXP(XP_CONFIG.MEDICATION_TAKEN, 'Medicamento tomado');
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
                          onClick={() => setMedicamentos(medicamentos.filter(m => m.id !== med.id))}
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
                      onClick={() => setPendingInvitations(pendingInvitations.filter(i => i.id !== inv.id))}
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
