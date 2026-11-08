import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  
  activeModal: string | null;
  openModal: (modal: string) => void;
  closeModal: () => void;
  
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // Global panels/modals
  showUserMenu: boolean;
  setShowUserMenu: (open: boolean) => void;
  toggleUserMenu: () => void;

  showNotifications: boolean;
  setShowNotifications: (open: boolean) => void;
  toggleNotifications: () => void;

  showNotificationsPanel: boolean;
  setShowNotificationsPanel: (open: boolean) => void;

  showUserSettingsModal: boolean;
  setShowUserSettingsModal: (open: boolean) => void;

  showAgentSettings: boolean;
  setShowAgentSettings: (open: boolean) => void;

  showAyuda: boolean;
  setShowAyuda: (open: boolean) => void;

  showHelpChat: boolean;
  setShowHelpChat: (open: boolean) => void;

  showConfigPanel: boolean;
  setShowConfigPanel: (open: boolean) => void;

  showDelegationModal: boolean;
  setShowDelegationModal: (open: boolean) => void;

  showInviteModal: boolean;
  setShowInviteModal: (open: boolean) => void;

  showInviteLink: boolean;
  setShowInviteLink: (open: boolean) => void;

  showWorkspaceSelector: boolean;
  setShowWorkspaceSelector: (open: boolean) => void;

  showCreateWorkspaceModal: boolean;
  setShowCreateWorkspaceModal: (open: boolean) => void;

  showWorkspaceSettingsModal: boolean;
  setShowWorkspaceSettingsModal: (open: boolean) => void;

  showBuzonPropuestas: boolean;
  setShowBuzonPropuestas: (open: boolean) => void;

  showRecordatorioModal: boolean;
  setShowRecordatorioModal: (open: boolean) => void;

  showAccionesDelegarModal: boolean;
  setShowAccionesDelegarModal: (open: boolean) => void;

  showRuedaModal: boolean;
  setShowRuedaModal: (open: boolean) => void;

  showMatrizFormModal: boolean;
  setShowMatrizFormModal: (open: boolean) => void;

  showGranMetaAnual: boolean;
  setShowGranMetaAnual: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  activeModal: null,
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
  
  theme: 'light',
  setTheme: (theme) => set({ theme }),

  showUserMenu: false,
  setShowUserMenu: (open) => set({ showUserMenu: open }),
  toggleUserMenu: () => set((state) => ({ showUserMenu: !state.showUserMenu })),

  showNotifications: false,
  setShowNotifications: (open) => set({ showNotifications: open }),
  toggleNotifications: () => set((state) => ({ showNotifications: !state.showNotifications })),

  showNotificationsPanel: false,
  setShowNotificationsPanel: (open) => set({ showNotificationsPanel: open }),

  showUserSettingsModal: false,
  setShowUserSettingsModal: (open) => set({ showUserSettingsModal: open }),

  showAgentSettings: false,
  setShowAgentSettings: (open) => set({ showAgentSettings: open }),

  showAyuda: false,
  setShowAyuda: (open) => set({ showAyuda: open }),

  showHelpChat: false,
  setShowHelpChat: (open) => set({ showHelpChat: open }),

  showConfigPanel: false,
  setShowConfigPanel: (open) => set({ showConfigPanel: open }),

  showBuzonPropuestas: false,
  setShowBuzonPropuestas: (open) => set({ showBuzonPropuestas: open }),

  showRecordatorioModal: false,
  setShowRecordatorioModal: (open) => set({ showRecordatorioModal: open }),

  showDelegationModal: false,
  setShowDelegationModal: (open) => set({ showDelegationModal: open }),

  showInviteModal: false,
  setShowInviteModal: (open) => set({ showInviteModal: open }),

  showInviteLink: false,
  setShowInviteLink: (open) => set({ showInviteLink: open }),

  showWorkspaceSelector: false,
  setShowWorkspaceSelector: (open) => set({ showWorkspaceSelector: open }),

  showCreateWorkspaceModal: false,
  setShowCreateWorkspaceModal: (open) => set({ showCreateWorkspaceModal: open }),

  showWorkspaceSettingsModal: false,
  setShowWorkspaceSettingsModal: (open) => set({ showWorkspaceSettingsModal: open }),

  showAccionesDelegarModal: false,
  setShowAccionesDelegarModal: (open) => set({ showAccionesDelegarModal: open }),

  showRuedaModal: false,
  setShowRuedaModal: (open) => set({ showRuedaModal: open }),

  showMatrizFormModal: false,
  setShowMatrizFormModal: (open) => set({ showMatrizFormModal: open }),

  showGranMetaAnual: false,
  setShowGranMetaAnual: (open) => set({ showGranMetaAnual: open }),
}));
