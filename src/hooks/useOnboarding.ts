import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import type { UserProfile, IntensityLevel, AvatarTone, AllowedChannel, AvatarId } from '../types/focusia';

interface OnboardingStep {
  id: number;
  title: string;
  component: string;
}

const STEPS: OnboardingStep[] = [
  { id: 1, title: 'Bienvenida', component: 'Welcome' },
  { id: 2, title: 'Tu Nombre', component: 'Name' },
  { id: 3, title: 'Avatar', component: 'Avatar' },
  { id: 4, title: 'Intensidad IA', component: 'Intensity' },
  { id: 5, title: 'Canales', component: 'Channels' },
  { id: 6, title: 'Tono Avatar', component: 'Tone' },
  { id: 7, title: 'Confirmación', component: 'Confirm' },
];

export function useOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    full_name: '',
    avatar_id: 1,
    intensity_level: 'EQUILIBRADA' as IntensityLevel,
    allowed_channels: ['APP'] as AllowedChannel[],
    avatar_tone: 'ADAPTIVE' as AvatarTone,
    onboarding_status: 'INICIADO',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const nextStep = useCallback(() => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= STEPS.length) {
      setCurrentStep(step);
    }
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  const submitOnboarding = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/users/onboarding/', {
        ...profile,
        onboarding_status: 'COMPLETADO',
      });
      
      setCompleted(true);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al completar onboarding');
      return false;
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const resetOnboarding = useCallback(() => {
    setCurrentStep(1);
    setProfile({
      full_name: '',
      avatar_id: 1,
      intensity_level: 'EQUILIBRADA',
      allowed_channels: ['APP'],
      avatar_tone: 'ADAPTIVE',
      onboarding_status: 'INICIADO',
    });
    setCompleted(false);
    setError(null);
  }, []);

  const progress = (currentStep / STEPS.length) * 100;

  return {
    currentStep,
    totalSteps: STEPS.length,
    steps: STEPS,
    profile,
    updateProfile,
    nextStep,
    prevStep,
    goToStep,
    submitOnboarding,
    resetOnboarding,
    loading,
    error,
    completed,
    progress,
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === STEPS.length,
  };
}

export const INTENSITY_OPTIONS: { value: IntensityLevel; label: string; description: string; icon: string }[] = [
  { value: 'SUAVE', label: 'Suave', description: 'Acompañamiento gentil, recordatorios sutiles', icon: '🌿' },
  { value: 'EQUILIBRADA', label: 'Equilibrada', description: 'Balance entre apoyo y exigencia', icon: '⚖️' },
  { value: 'EXIGENTE', label: 'Exigente', description: 'Alta presión, rendición de cuentas estricta', icon: '🔥' },
];

export const CHANNEL_OPTIONS: { value: AllowedChannel; label: string; description: string; icon: string }[] = [
  { value: 'APP', label: 'En la App', description: 'Notificaciones internas', icon: '📱' },
  { value: 'PUSH', label: 'Push Móvil', description: 'Notificaciones push al dispositivo', icon: '🔔' },
  { value: 'WHATSAPP_SIM', label: 'WhatsApp Simulado', description: 'Mensajes estilo chat', icon: '💬' },
  { value: 'CRITICAL_CALL', label: 'Llamada Crítica', description: 'Solo para emergencias', icon: '📞' },
];

export const TONE_OPTIONS: { value: AvatarTone; label: string; description: string; icon: string }[] = [
  { value: 'MOTIVATOR', label: 'Motivador', description: 'Ánimo y refuerzo positivo', icon: '🌟' },
  { value: 'STRATEGIC', label: 'Estratégico', description: 'Enfoque en planificación y análisis', icon: '🎯' },
  { value: 'DEMANDING', label: 'Exigente', description: 'Directo, sin rodeos, alta exigencia', icon: '⚡' },
  { value: 'ADAPTIVE', label: 'Adaptativo', description: 'Cambia según tu contexto y progreso', icon: '🧠' },
];

export const AVATAR_OPTIONS: { id: AvatarId; label: string; gender: 'M' | 'F'; file: string }[] = [
  { id: 1, label: 'Avatar 1', gender: 'M', file: '/avatars/avatar1.jpg' },
  { id: 2, label: 'Avatar 2', gender: 'M', file: '/avatars/avatar2.jpg' },
  { id: 3, label: 'Avatar 3', gender: 'M', file: '/avatars/avatar3.jpg' },
  { id: 4, label: 'Avatar 4', gender: 'F', file: '/avatars/avatar4.jpg' },
  { id: 5, label: 'Avatar 5', gender: 'F', file: '/avatars/avatar5.jpg' },
  { id: 6, label: 'Avatar 6', gender: 'F', file: '/avatars/avatar6.jpg' },
];