import { create } from 'zustand';

interface KanbanState {
  activeView: 'kanban' | 'diaria' | 'semanal' | 'mensual' | 'anual';
  setActiveView: (view: 'kanban' | 'diaria' | 'semanal' | 'mensual' | 'anual') => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

export const useKanbanStore = create<KanbanState>((set) => ({
  activeView: 'kanban',
  setActiveView: (view) => set({ activeView: view }),
  refreshTrigger: 0,
  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
}));
