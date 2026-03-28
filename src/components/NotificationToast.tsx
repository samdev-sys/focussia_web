import React, { useEffect } from 'react';
import { X, Bell, Pill, Cake, Star, Check } from 'lucide-react';
import { RecordatorioData } from '../services/api';

interface NotificationToastProps {
  recordatorio: RecordatorioData;
  onClose: () => void;
  onMarkTaken?: () => void;
  showMarkTaken?: boolean;
}

const getIcon = (categoria: string) => {
  switch (categoria) {
    case 'Medicamento':
      return <Pill className="w-6 h-6 text-white" />;
    case 'Cumpleaños':
      return <Cake className="w-6 h-6 text-white" />;
    case 'HoraOro':
      return <Star className="w-6 h-6 text-white" />;
    default:
      return <Bell className="w-6 h-6 text-white" />;
  }
};

const getCategoryColor = (categoria: string) => {
  switch (categoria) {
    case 'Medicamento':
      return 'from-red-400 to-pink-500';
    case 'Cumpleaños':
      return 'from-purple-400 to-pink-500';
    case 'HoraOro':
      return 'from-yellow-400 to-orange-500';
    default:
      return 'from-blue-400 to-cyan-500';
  }
};

export const NotificationToast: React.FC<NotificationToastProps> = ({ 
  recordatorio, 
  onClose,
  onMarkTaken,
  showMarkTaken = false
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 10000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] animate-slide-in">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden w-80">
        <div className={`bg-gradient-to-r ${getCategoryColor(recordatorio.categoria)} p-3 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            {getIcon(recordatorio.categoria)}
            <span className="text-white font-bold text-sm uppercase">{recordatorio.categoria}</span>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          <h3 className="font-bold text-gray-800 text-lg mb-1">{recordatorio.titulo}</h3>
          <p className="text-sm text-gray-500 mb-3">{formatDate(recordatorio.fecha_hora)}</p>
          {showMarkTaken && onMarkTaken && (
            <button
              onClick={onMarkTaken}
              className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl transition-colors"
            >
              <Check className="w-4 h-4" />
              Marcar como tomado
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;
