import React from 'react';

interface ActionButtonProps {
  label: string;
  color?: string;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'modern' | 'minimal' | 'dark';
  icon?: React.ReactNode;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ 
  label, 
  color = "bg-pink-100",
  onClick,
  className = "",
  variant = "default",
  icon
}) => {
  // Definimos los estilos base por variante
  const baseClasses = {
    default: `${color} border-2 border-black px-4 py-1 text-xs font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 active:shadow-none transition-all`,
    modern: `${color} text-white py-2 rounded-2xl text-[10px] sm:text-xs font-bold uppercase shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-white/40 transition hover:scale-[1.02]`,
    minimal: `${color} border border-gray-300 px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors`,
    // Optimizada con paddings (py-2.5 px-4), texto responsivo idéntico al dashboard y transiciones suaves
    dark: "bg-gradient-to-b from-[#0b153a] to-[#040817] text-white py-2.5 px-4 rounded-xl text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md border border-slate-900/50 hover:brightness-110 active:scale-[0.99] transition-all"
  };

  // Si es la variante dark, ignoramos el 'color' plano por defecto de las otras variantes 
  // para evitar que un 'bg-pink-100' pise el degradado oscuro.
  const selectedClass = baseClasses[variant];

  return (
    <button 
      onClick={onClick}
      className={`${selectedClass} ${className} flex items-center justify-center gap-2确定 whitespace-nowrap`}
    >
      {icon}
      {label}
    </button>
  );
};

export default ActionButton;