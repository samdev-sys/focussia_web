import React, { useState } from 'react';
import { useOnboarding, INTENSITY_OPTIONS, CHANNEL_OPTIONS, TONE_OPTIONS, AVATAR_OPTIONS } from '../hooks/useOnboarding';
import { ArrowRight, ArrowLeft, Check, User, Target, MessageSquare, Zap, Brain, Sparkles, Loader2 } from 'lucide-react';

const stepComponents = {
  1: WelcomeStep,
  2: NameStep,
  3: AvatarStep,
  4: IntensityStep,
  5: ChannelsStep,
  6: ToneStep,
  7: ConfirmStep,
};

interface OnboardingStepProps {
  profile: any;
  updateProfile: (updates: any) => void;
  nextStep: () => void;
  prevStep: () => void;
}

function WelcomeStep({ nextStep }: OnboardingStepProps) {
  return (
    <div className="text-center space-y-8">
      <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
        <Sparkles className="w-12 h-12 text-white" />
      </div>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Bienvenido a Focusia</h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md mx-auto">
          Tu sistema de dirección estratégica personal. Configuraremos tu IA compañera en 7 pasos rápidos.
        </p>
      </div>
      <button
        onClick={nextStep}
        className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
      >
        Comenzar
      </button>
    </div>
  );
}

function NameStep({ profile, updateProfile, nextStep, prevStep }: OnboardingStepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">¿Cómo te llamas?</h2>
      <input
        type="text"
        value={profile.full_name}
        onChange={e => updateProfile({ full_name: e.target.value })}
        placeholder="Tu nombre completo"
        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        autoFocus
      />
      <div className="flex gap-3">
        <button onClick={prevStep} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          <ArrowLeft className="inline mr-1" /> Atrás
        </button>
        <button
          onClick={nextStep}
          disabled={!profile.full_name?.trim()}
          className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Siguiente <ArrowRight className="inline ml-1" />
        </button>
      </div>
    </div>
  );
}

function AvatarStep({ profile, updateProfile, nextStep, prevStep }: OnboardingStepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Elige tu Avatar</h2>
      <p className="text-gray-600 dark:text-gray-400">Tu IA usará esta imagen para identificarse contigo</p>
      <div className="grid grid-cols-3 gap-4">
        {AVATAR_OPTIONS.map(avatar => (
          <button
            key={avatar.id}
            onClick={() => updateProfile({ avatar_id: avatar.id })}
            className={`relative aspect-square rounded-2xl overflow-hidden border-4 transition-all ${
              profile.avatar_id === avatar.id
                ? 'border-purple-500 scale-105 shadow-lg shadow-purple-500/25'
                : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <img
              src={avatar.file}
              alt={avatar.label}
              className="w-full h-full object-cover"
            />
            {profile.avatar_id === avatar.id && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Check className="w-8 h-8 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={prevStep} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          <ArrowLeft className="inline mr-1" /> Atrás
        </button>
        <button onClick={nextStep} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors">
          Siguiente <ArrowRight className="inline ml-1" />
        </button>
      </div>
    </div>
  );
}

function IntensityStep({ profile, updateProfile, nextStep, prevStep }: OnboardingStepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nivel de Intensidad de la IA</h2>
      <p className="text-gray-600 dark:text-gray-400">¿Qué tan exigente quieres que sea tu acompañante?</p>
      <div className="space-y-3">
        {INTENSITY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => updateProfile({ intensity_level: opt.value })}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              profile.intensity_level === opt.value
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">{opt.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">{opt.label}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{opt.description}</p>
              </div>
              {profile.intensity_level === opt.value && <Check className="w-6 h-6 text-purple-500" />}
            </div>
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={prevStep} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          <ArrowLeft className="inline mr-1" /> Atrás
        </button>
        <button onClick={nextStep} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors">
          Siguiente <ArrowRight className="inline ml-1" />
        </button>
      </div>
    </div>
  );
}

function ChannelsStep({ profile, updateProfile, nextStep, prevStep }: OnboardingStepProps) {
  const toggleChannel = (channel: any) => {
    const current = profile.allowed_channels || [];
    if (current.includes(channel)) {
      updateProfile({ allowed_channels: current.filter((c: any) => c !== channel) });
    } else {
      updateProfile({ allowed_channels: [...current, channel] });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Canales de Notificación</h2>
      <p className="text-gray-600 dark:text-gray-400">Selecciona cómo quieres recibir avisos de tu IA (mínimo 1)</p>
      <div className="space-y-3">
        {CHANNEL_OPTIONS.map(opt => (
          <label
            key={opt.value}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              profile.allowed_channels?.includes(opt.value)
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <input
              type="checkbox"
              checked={profile.allowed_channels?.includes(opt.value)}
              onChange={() => toggleChannel(opt.value)}
              className="w-5 h-5 accent-purple-600 rounded border-gray-300"
            />
            <span className="text-2xl">{opt.icon}</span>
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">{opt.label}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{opt.description}</p>
            </div>
          </label>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={prevStep} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          <ArrowLeft className="inline mr-1" /> Atrás
        </button>
        <button
          onClick={nextStep}
          disabled={!profile.allowed_channels?.length}
          className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Siguiente <ArrowRight className="inline ml-1" />
        </button>
      </div>
    </div>
  );
}

function ToneStep({ profile, updateProfile, nextStep, prevStep }: OnboardingStepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tono de tu Avatar</h2>
      <p className="text-gray-600 dark:text-gray-400">Define la personalidad de tu IA acompañante</p>
      <div className="space-y-3">
        {TONE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => updateProfile({ avatar_tone: opt.value })}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              profile.avatar_tone === opt.value
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">{opt.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">{opt.label}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{opt.description}</p>
              </div>
              {profile.avatar_tone === opt.value && <Check className="w-6 h-6 text-purple-500" />}
            </div>
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={prevStep} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          <ArrowLeft className="inline mr-1" /> Atrás
        </button>
        <button onClick={nextStep} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors">
          Siguiente <ArrowRight className="inline ml-1" />
        </button>
      </div>
    </div>
  );
}

function ConfirmStep({ profile, updateProfile, nextStep, prevStep }: OnboardingStepProps) {
  const intensity = INTENSITY_OPTIONS.find(i => i.value === profile.intensity_level);
  const tone = TONE_OPTIONS.find(t => t.value === profile.avatar_tone);
  const avatar = AVATAR_OPTIONS.find(a => a.id === profile.avatar_id);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Confirmar Configuración</h2>
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <img src={avatar?.file} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{profile.full_name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Tu nombre</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Intensidad</p>
            <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              {intensity?.icon} {intensity?.label}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Tono</p>
            <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              {tone?.icon} {tone?.label}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Canales</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {profile.allowed_channels?.join(', ')}
            </p>
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={prevStep} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          <ArrowLeft className="inline mr-1" /> Atrás
        </button>
        <button onClick={nextStep} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors">
          Finalizar <ArrowRight className="inline ml-1" />
        </button>
      </div>
    </div>
  );
}

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const {
    currentStep,
    totalSteps,
    profile,
    updateProfile,
    nextStep,
    prevStep,
    submitOnboarding,
    loading,
    error,
    completed,
    progress,
  } = useOnboarding();

  const handleFinish = async () => {
    const success = await submitOnboarding();
    if (success) {
      onComplete();
    }
  };

  if (completed) return null;

  const StepComponent = stepComponents[currentStep as keyof typeof stepComponents];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-800">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Paso {currentStep} de {totalSteps}
            </span>
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <StepComponent
          profile={profile}
          updateProfile={updateProfile}
          nextStep={currentStep === totalSteps ? handleFinish : nextStep}
          prevStep={prevStep}
        />
      </div>
    </div>
  );
};

export default OnboardingFlow;