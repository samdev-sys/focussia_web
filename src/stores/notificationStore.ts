import { create } from 'zustand';

interface Notification {
  id: number | string;
  titulo?: string;
  mensaje?: string;
  leida?: boolean;
  fecha?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  markAllRead: () => void;
  addNotification: (notification: Notification) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) => {
    const list = Array.isArray(notifications)
      ? notifications
      : Array.isArray((notifications as any)?.results)
        ? (notifications as any).results
        : [];
    set({
      notifications: list,
      unreadCount: list.filter((n: any) => !(n.leida ?? n.is_read)).length,
    });
  },
  markAllRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, leida: true })),
    unreadCount: 0,
  })),
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + (notification.leida ? 0 : 1),
  })),
}));
