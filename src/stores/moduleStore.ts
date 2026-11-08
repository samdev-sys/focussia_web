import { create } from 'zustand';

export type ActiveModule =
  | 'kanban'
  | 'redes'
  | 'configuracion'
  | 'gratitud'
  | 'cumpleanos'
  | 'cuentas'
  | 'hora-oro'
  | 'suplementos'
  | 'focus'
  | 'coaching'
  | 'tribu'
  | 'cursos'
  | 'anual'
  | 'calendario'
  | 'reportes'
  | 'delegar'
  | null;

interface ModuleState {
  activeModule: ActiveModule;
  openModule: (module: Exclude<ActiveModule, null>) => void;
  closeModule: () => void;
  isOpen: (module: Exclude<ActiveModule, null>) => boolean;
}

export const useModuleStore = create<ModuleState>((set, get) => ({
  activeModule: null,
  openModule: (module) => set({ activeModule: module }),
  closeModule: () => set({ activeModule: null }),
  isOpen: (module) => get().activeModule === module,
}));
