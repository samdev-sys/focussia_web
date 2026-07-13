import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle, Target, Calendar } from 'lucide-react';
import { metaAnualService, objetivoMensualService, MetaAnualData, ObjetivoMensualData } from '../services/api';

interface MetaAnualFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const MetaAnualForm: React.FC<MetaAnualFormProps> = ({ isOpen, onClose }) => {
  const [metas, setMetas] = useState<MetaAnualData[]>([]);
  const [objetivos, setObjetivos] = useState<ObjetivoMensualData[]>([]);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarDatos();
    }
  }, [isOpen]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [metasData, objetivosData] = await Promise.all([
        metaAnualService.getAll(),
        objetivoMensualService.getAll(),
      ]);
      setMetas(metasData);
      setObjetivos(objetivosData);
    } catch (err) {
      console.error('Error loading goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    try {
      if (editId) {
        await metaAnualService.update(editId, { titulo, descripcion, fecha_inicio: fechaInicio, fecha_fin: fechaFin });
      } else {
        await metaAnualService.create({ titulo, descripcion, fecha_inicio: fechaInicio, fecha_fin: fechaFin, aprobada: false });
      }
      resetForm();
      await cargarDatos();
    } catch (err) {
      console.error('Error saving goal:', err);
    }
  };

  const handleToggleAprobar = async (meta: MetaAnualData) => {
    try {
      await metaAnualService.update(meta.id, { aprobada: !meta.aprobada });
      await cargarDatos();
    } catch (err) {
      console.error('Error toggling approval:', err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await metaAnualService.delete(id);
      await cargarDatos();
    } catch (err) {
      console.error('Error deleting goal:', err);
    }
  };

  const handleEdit = (meta: MetaAnualData) => {
    setEditId(meta.id);
    setTitulo(meta.titulo);
    setDescripcion(meta.descripcion);
    setFechaInicio(meta.fecha_inicio);
    setFechaFin(meta.fecha_fin);
  };

  const resetForm = () => {
    setEditId(null);
    setTitulo('');
    setDescripcion('');
    setFechaInicio('');
    setFechaFin('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-md shadow-2xl border border-white/50 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-emerald-600 to-teal-500 shrink-0">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold uppercase text-white">Gran Meta Anual</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/30 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-3 bg-white/60 rounded-xl p-4 border border-white/50">
            <h3 className="text-sm font-bold text-gray-700">
              {editId ? 'Editar Meta Anual' : 'Nueva Meta Anual'}
            </h3>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título de tu gran meta (ej: Crear mi negocio online)"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white text-sm"
              required
            />
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción detallada..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white text-sm resize-none"
              rows={3}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium">Fecha Inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Fecha Fin</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white text-sm"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-sm hover:opacity-90 transition-opacity"
              >
                {editId ? 'Guardar Cambios' : 'Crear Meta Anual'}
              </button>
              {editId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="py-2 px-4 rounded-lg bg-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {loading ? (
            <div className="text-center py-8 text-sm text-gray-500">Cargando...</div>
          ) : (
            <div className="space-y-3">
              {metas.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-4">
                  Aún no tienes metas anuales. Crea tu primera meta para empezar.
                </p>
              )}
              {metas.map((meta) => (
                <div
                  key={meta.id}
                  className={`bg-white/60 rounded-xl p-4 border transition-all ${
                    meta.aprobada ? 'border-emerald-400 shadow-md' : 'border-white/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-800">{meta.titulo}</h4>
                        {meta.aprobada && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                            Aprobada
                          </span>
                        )}
                      </div>
                      {meta.descripcion && (
                        <p className="text-xs text-gray-500 mt-1">{meta.descripcion}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {meta.fecha_inicio} → {meta.fecha_fin}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleAprobar(meta)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          meta.aprobada
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-gray-100 text-gray-400 hover:text-emerald-600'
                        }`}
                        title={meta.aprobada ? 'Desaprobar' : 'Aprobar meta'}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(meta)}
                        className="p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button
                        onClick={() => handleDelete(meta.id)}
                        className="p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
