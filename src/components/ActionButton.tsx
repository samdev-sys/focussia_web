import React from 'react';

interface ActionButtonProps {
  label: string;
  color?: string;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'modern' | 'minimal';
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
  const baseClasses = {
    default: `${color} border-2 border-black px-4 py-1 text-xs font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 active:shadow-none transition-all`,
    modern: `${color} text-white py-2 rounded-2xl text-[10px] sm:text-xs font-bold uppercase shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-white/40 transition hover:scale-[1.02]`,
    minimal: `${color} border border-gray-300 px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors`
  };

  return (
    <button 
      onClick={onClick}
      className={`${baseClasses[variant]} ${className} flex items-center justify-center gap-2 whitespace-nowrap`}
    >
      {icon}
      {label}
    </button>
  );
};

export default ActionButton;
