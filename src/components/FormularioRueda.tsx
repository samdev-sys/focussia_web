import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Loader2, Save } from 'lucide-react';

interface CategoriaRueda {
  id: number;
  nombre: string;
  icono: string;
  puntaje: number;
}

interface FormularioRuedaProps {
  onClose: () => void;
  onSaved?: () => void;
}

export const FormularioRueda: React.FC<FormularioRuedaProps> = ({ onClose, onSaved }) => {
  const [categorias, setCategorias] = useState<CategoriaRueda[]>([]);
  const [puntajes, setPuntajes] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/rueda-vida-completa/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        setCategorias(data);
        
        const initial: Record<number, number> = {};
        data.forEach((cat: CategoriaRueda) => {
          initial[cat.id] = cat.puntaje;
        });
        setPuntajes(initial);
      } catch (err) {
        console.error('Error fetching rueda data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSliderChange = (id: number, value: number) => {
    setPuntajes(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      await fetch('http://localhost:8000/api/rueda-vida-completa/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ puntajes })
      });
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error saving rueda:', err);
    } finally {
      setSaving(false);
    }
  };

  const getColor = (value: number) => {
    if (value <= 3) return 'text-red-500';
    if (value <= 5) return 'text-yellow-500';
    if (value <= 7) return 'text-blue-500';
    return 'text-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#0d9488]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categorias.map(cat => (
          <div key={cat.id} className="bg-white/40 backdrop-blur-md rounded-xl p-4 border border-white/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">{cat.icono}</span>
              <span className="font-bold text-gray-800">{cat.nombre}</span>
              <span className={`font-black text-xl ${getColor(puntajes[cat.id] || 5)}`}>
                {puntajes[cat.id] || 5}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={puntajes[cat.id] || 5}
              onChange={(e) => handleSliderChange(cat.id, parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0d9488]"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex gap-3 pt-4">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0d9488] text-white font-bold hover:bg-[#0f766e] transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Guardar
        </button>
      </div>
    </div>
  );
};

export default FormularioRueda;
