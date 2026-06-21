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
  const baseClasses = {
    default: `${color} border-2 border-black px-4 py-1 text-xs font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 active:shadow-none transition-all dark:bg-gradient-to-r dark:from-[#E54EB7] dark:via-[#FCD06B] dark:to-[#FF7E36] dark:text-white dark:border-orange-400 dark:shadow-[2px_2px_0px_0px_rgba(255,126,54,0.5)]`,
    modern: `${color} text-white py-2 rounded-2xl text-[10px] sm:text-xs font-bold uppercase shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-white/40 transition hover:scale-[1.02] dark:bg-gradient-to-r dark:from-[#E54EB7] dark:via-[#FCD06B] dark:to-[#FF7E36] dark:border-orange-400/50`,
    minimal: `${color} border border-gray-300 px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors dark:bg-gradient-to-r dark:from-[#E54EB7] dark:via-[#FCD06B] dark:to-[#FF7E36] dark:text-white dark:border-orange-400`,
    dark: "bg-gradient-to-b from-[#0b153a] to-[#040817] text-white py-2.5 px-4 rounded-xl text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md border border-slate-900/50 hover:brightness-110 active:scale-[0.99] transition-all dark:bg-gradient-to-r dark:from-[#E54EB7] dark:via-[#FCD06B] dark:to-[#FF7E36] dark:border-orange-400"
  };

  const selectedClass = baseClasses[variant];

  return (
    <button 
      onClick={onClick}
      className={`${selectedClass} ${className} flex items-center justify-center gap-2 whitespace-nowrap`}
    >
      {icon}
      {label}
    </button>
  );
};

export default ActionButton;