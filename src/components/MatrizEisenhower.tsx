import React, { useState, useEffect, useRef } from 'react';
import {
  X, Play, CheckCircle, ArrowRight, ArrowLeft, AlertTriangle,
  Clock, Star, Users, Trash2, RotateCcw,
} from 'lucide-react';
import { matrizProgressService } from '../services/api';

interface MatrizEisenhowerProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

const QUADRANTS = [
  { key: 'hacer', label: 'Hacer', color: 'from-red-500 to-red-600', bg: 'bg-red-50 border-red-200', icon: <AlertTriangle className="w-5 h-5" />, desc: 'Urgente e Importante. Acción inmediata.' },
  { key: 'planificar', label: 'Planificar', color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50 border-blue-200', icon: <Star className="w-5 h-5" />, desc: 'No Urgente pero Importante. Programa tiempo.' },
  { key: 'delegar', label: 'Delegar', color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50 border-amber-200', icon: <Users className="w-5 h-5" />, desc: 'Urgente pero No Importante. Delega a otros.' },
  { key: 'eliminar', label: 'Eliminar', color: 'from-gray-500 to-gray-600', bg: 'bg-gray-50 border-gray-200', icon: <Trash2 className="w-5 h-5" />, desc: 'No Urgente y No Importante. Elimínalo.' },
];

const TRIVIA_QUESTIONS = [
  { text: 'Responder un correo urgente de tu jefe', correct: 'hacer' },
  { text: 'Planificar tu proyecto a largo plazo', correct: 'planificar' },
  { text: 'Agendar una cita con el dentista', correct: 'delegar' },
  { text: 'Ver redes sociales sin un propósito claro', correct: 'eliminar' },
];

export default function MatrizEisenhower({ isOpen, onClose, onContinue }: MatrizEisenhowerProps) {
  const [step, setStep] = useState<'intro' | 'explorar' | 'trivia' | 'resultado'>('intro');
  const [videoPlayed, setVideoPlayed] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [selectedQuadrant, setSelectedQuadrant] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen) {
      matrizProgressService.getProgress().then(p => {
        if (p.status === 'COMPLETADO') {
          setCompleted(true);
        }
        if (p.video_watched) {
          setVideoPlayed(true);
          setVideoProgress(100);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setVideoProgress(Math.min(progress, 100));
    }
  };

  const handleVideoEnded = () => {
    setVideoPlayed(true);
    setVideoProgress(100);
    matrizProgressService.updateProgress({ video_watched: true }).catch(() => {});
  };

  const handleQuadrantClick = (key: string) => {
    setSelectedQuadrant(selectedQuadrant === key ? null : key);
  };

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    setShowFeedback(true);
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (answer === TRIVIA_QUESTIONS[currentQuestion].correct) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
      setShowFeedback(false);
      setSelectedAnswer(null);
      if (currentQuestion < TRIVIA_QUESTIONS.length - 1) {
        setCurrentQuestion(prev => prev + 1);
      } else {
        setStep('resultado');
        matrizProgressService.updateProgress({
          status: 'COMPLETADO',
          practice_score: score + (answer === TRIVIA_QUESTIONS[currentQuestion].correct ? 1 : 0),
          completed_at: new Date().toISOString(),
        }).catch(() => {});
      }
    }, 2000);
  };

  const handleRetry = () => {
    setStep('trivia');
    setCurrentQuestion(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setScore(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">

        {/* Step 1: Intro */}
        {step === 'intro' && (
          <>
            <div className="bg-gradient-to-r from-[#2b44ff] via-[#0b153a] to-[#040817] p-4 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold uppercase">La Matriz de Eisenhower</h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">¿Sabes distinguir lo urgente de lo importante?</h3>
              <p className="text-sm text-gray-500">Mira este video rápido para entender la lógica estratégica.</p>
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-black aspect-video flex items-center justify-center relative">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={handleVideoEnded}
                  controls
                  playsInline
                >
                  <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
                </video>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all" style={{ width: `${videoProgress}%` }} />
              </div>
              <button
                onClick={() => setStep('explorar')}
                disabled={!videoPlayed}
                className="w-full py-3 bg-gradient-to-r from-[#2b44ff] to-[#0b153a] text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Siguiente <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* Step 2: Explorar Matriz */}
        {step === 'explorar' && (
          <>
            <div className="bg-gradient-to-r from-[#2b44ff] via-[#0b153a] to-[#040817] p-4 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold uppercase">Explora la Matriz</h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-xs text-gray-500 text-center">Toca cada cuadrante para entenderlo</p>
              <div className="grid grid-cols-2 gap-2">
                {QUADRANTS.map(q => (
                  <button
                    key={q.key}
                    onClick={() => handleQuadrantClick(q.key)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${q.bg} ${selectedQuadrant === q.key ? 'ring-2 ring-offset-2 ring-indigo-400 scale-[1.02]' : 'hover:scale-[1.01]'}`}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${q.color} flex items-center justify-center text-white mb-2`}>
                      {q.icon}
                    </div>
                    <span className="text-sm font-bold text-gray-800 block">{q.label}</span>
                    {selectedQuadrant === q.key && (
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{q.desc}</p>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep('trivia')}
                className="w-full py-3 bg-gradient-to-r from-[#2b44ff] to-[#0b153a] text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                ¡Vamos a practicar! <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* Step 3: Trivia */}
        {step === 'trivia' && (
          <>
            <div className="bg-gradient-to-r from-[#2b44ff] via-[#0b153a] to-[#040817] p-4 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold uppercase">Práctica</h2>
                <span className="text-xs opacity-70">{currentQuestion + 1}/{TRIVIA_QUESTIONS.length}</span>
              </div>
              <div className="flex gap-1 mt-2">
                {TRIVIA_QUESTIONS.map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= currentQuestion ? 'bg-white' : 'bg-white/30'}`} />
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm font-semibold text-gray-800 text-center">
                  ¿Dónde clasificarías esta situación?
                </p>
                <p className="text-base font-bold text-gray-900 text-center mt-2">
                  "{TRIVIA_QUESTIONS[currentQuestion].text}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {QUADRANTS.map(q => {
                  const isCorrect = q.key === TRIVIA_QUESTIONS[currentQuestion].correct;
                  const isSelected = selectedAnswer === q.key;
                  let borderClass = 'border-gray-200';
                  if (showFeedback && isSelected && isCorrect) borderClass = 'border-green-400 bg-green-50';
                  else if (showFeedback && isSelected && !isCorrect) borderClass = 'border-red-400 bg-red-50';
                  else if (showFeedback && isCorrect) borderClass = 'border-green-300';

                  return (
                    <button
                      key={q.key}
                      onClick={() => !showFeedback && handleAnswer(q.key)}
                      disabled={showFeedback}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${borderClass} ${!showFeedback ? 'hover:scale-[1.02] cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${q.color} flex items-center justify-center text-white mb-1`}>
                        {q.icon}
                      </div>
                      <span className="text-xs font-bold text-gray-800">{q.label}</span>
                    </button>
                  );
                })}
              </div>

              {showFeedback && (
                <div className={`p-3 rounded-xl text-center text-sm font-medium ${
                  selectedAnswer === TRIVIA_QUESTIONS[currentQuestion].correct
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {selectedAnswer === TRIVIA_QUESTIONS[currentQuestion].correct ? (
                    <span className="flex items-center justify-center gap-1"><CheckCircle className="w-4 h-4" /> ¡Correcto!</span>
                  ) : (
                    <span>La respuesta correcta era: <strong>{QUADRANTS.find(q => q.key === TRIVIA_QUESTIONS[currentQuestion].correct)?.label}</strong></span>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Step 4: Resultado */}
        {step === 'resultado' && (
          <>
            <div className="bg-gradient-to-r from-[#2b44ff] via-[#0b153a] to-[#040817] p-4 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold uppercase">¡Completado!</h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">¡Buen trabajo!</h3>
              <p className="text-sm text-gray-500">
                Acertaste <strong>{score}</strong> de <strong>{TRIVIA_QUESTIONS.length}</strong> ejemplos.
              </p>
              {score < TRIVIA_QUESTIONS.length && (
                <button
                  onClick={handleRetry}
                  className="flex items-center justify-center gap-1 mx-auto text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <RotateCcw className="w-4 h-4" /> Intentar de nuevo
                </button>
              )}
              <button
                onClick={() => { onContinue(); onClose(); }}
                className="w-full py-3 bg-gradient-to-r from-[#2b44ff] to-[#0b153a] text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                Continuar con mi planificación <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
