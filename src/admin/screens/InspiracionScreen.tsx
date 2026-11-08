import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Save, ExternalLink, Search, Play } from 'lucide-react';
import { adminApi, adminService, leerError, type InspiracionRecurso } from '../lib/adminApi';
import {
  Button, Card, PageHeader, Field, Input, Select, Modal, Aviso,
  Cargando, Vacio, Checkbox, MediaField, useConfirmacion, useCarga,
} from '../components/ui';

const CATEGORIAS: [InspiracionRecurso['categoria'], string][] = [
  ['humor', 'Humor'],
  ['salud', 'Salud'],
  ['hobbies', 'Hobbies'],
  ['viajes', 'Viajes'],
  ['diversion', 'Diversión'],
  ['reflexion', 'Reflexión'],
];

const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIAS);

/**
 * Centro de Inspiración (Doc 26). Catálogo de recursos audiovisuales alojados en
 * YouTube: Focusia no almacena videos, solo administra la referencia y la miniatura.
 * Incorporar nuevos videos no requiere cambios de código.
 */
export default function InspiracionScreen() {
  const [editando, setEditando] = useState<InspiracionRecurso | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCat, setFiltroCat] = useState<'todas' | InspiracionRecurso['categoria']>('todas');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const { datos, cargando, error, recargar } = useCarga(() => adminService.listarInspiracion(), []);
  const confirmar = useConfirmacion();

  const lista = datos ?? [];

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return lista.filter((r) => {
      if (filtroCat !== 'todas' && r.categoria !== filtroCat) return false;
      if (filtroEstado === 'activos' && !r.activo) return false;
      if (filtroEstado === 'inactivos' && r.activo) return false;
      if (!q) return true;
      return r.titulo.toLowerCase().includes(q) || r.youtube_url.toLowerCase().includes(q);
    });
  }, [lista, busqueda, filtroCat, filtroEstado]);

  if (cargando) return <Cargando texto="Cargando recursos de inspiración…" />;
  if (error) {
    return (
      <>
        <PageHeader titulo="Centro de Inspiración" descripcion="Catálogo de recursos audiovisuales." />
        <Aviso tipo="error">{error}</Aviso>
      </>
    );
  }

  const activos = lista.filter((r) => r.activo).length;

  return (
    <>
      <PageHeader
        titulo="Centro de Inspiración"
        descripcion="Videos alojados en YouTube, administrados aquí y reproducidos dentro de Focusia. Agregar recursos no requiere cambios de código."
        acciones={
          <Button onClick={() => setEditando(nuevoRecurso(lista, filtroCat))}>
            <Plus className="w-3.5 h-3.5" />
            Nuevo recurso
          </Button>
        }
      />

      {lista.length === 0 && (
        <div className="mb-5">
          <Aviso tipo="error">Todavía no hay recursos. El módulo aparecerá vacío para los usuarios.</Aviso>
        </div>
      )}

      {lista.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por título o enlace"
              className="pl-9"
            />
          </div>
          <Select value={filtroCat} onChange={(e) => setFiltroCat(e.target.value as typeof filtroCat)} className="w-auto min-w-[150px]">
            <option value="todas">Todas las categorías ({lista.length})</option>
            {CATEGORIAS.map(([id, label]) => (
              <option key={id} value={id}>{label} ({lista.filter((r) => r.categoria === id).length})</option>
            ))}
          </Select>
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-white/5 p-1">
            {([
              ['todos', `Todos`],
              ['activos', `Activos (${activos})`],
              ['inactivos', `Inactivos (${lista.length - activos})`],
            ] as [typeof filtroEstado, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFiltroEstado(id)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                  filtroEstado === id
                    ? 'bg-white dark:bg-[#14142e] text-slate-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtrados.map((r) => (
          <Card
            key={r.id}
            titulo={r.titulo}
            descripcion={CAT_LABEL[r.categoria] || r.categoria_label}
            acciones={
              <>
                <Button variant="suave" onClick={() => setEditando(r)}>
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </Button>
                <Button
                  variant="danger"
                  onClick={() =>
                    confirmar.pedir(
                      `Eliminar “${r.titulo}”`,
                      'El recurso desaparece del Centro de Inspiración.',
                      async () => { await adminService.borrarInspiracion(r.id); recargar(); },
                    )
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            }
          >
            <div className="space-y-3">
              {r.miniatura_resuelta ? (
                <div className="relative w-full h-28 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5">
                  <img src={r.miniatura_resuelta} alt="" className="w-full h-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <span className="w-8 h-8 rounded-full bg-white/90 text-[#6236FF] flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />
                    </span>
                  </span>
                </div>
              ) : (
                <div className="w-full h-28 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400">
                  <Play className="w-6 h-6" />
                </div>
              )}

              <a
                href={r.youtube_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline truncate"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                <span className="truncate">{r.youtube_url}</span>
              </a>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-white/10 text-[10px]">
                <span className={`font-bold px-2 py-0.5 rounded-full ${r.activo ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'}`}>
                  {r.activo ? 'Activo' : 'Inactivo'}
                </span>
                <span className="text-gray-400">orden {r.orden}</span>
                <span className="text-gray-400 truncate">{CAT_LABEL[r.categoria] || r.categoria}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {lista.length > 0 && filtrados.length === 0 && <Vacio>No hay recursos que coincidan con ese filtro.</Vacio>}
      {lista.length === 0 && <Vacio>El catálogo está vacío.</Vacio>}

      {editando && (
        <EditorRecurso
          recurso={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); recargar(); }}
        />
      )}
      {confirmar.dialogo}
    </>
  );
}

function nuevoRecurso(lista: InspiracionRecurso[], filtroCat: string): InspiracionRecurso {
  const categoria = (CATEGORIAS.some(([id]) => id === filtroCat) ? filtroCat : 'humor') as InspiracionRecurso['categoria'];
  const maxOrden = lista.filter((r) => r.categoria === categoria).reduce((m, r) => Math.max(m, r.orden), 0);
  return {
    id: 0, categoria, categoria_label: CAT_LABEL[categoria] || categoria, titulo: '',
    miniatura_url: '', miniatura_file: null, miniatura_file_url: '', miniatura_resuelta: '',
    youtube_url: '', youtube_video_id: '', orden: maxOrden + 1, activo: true, creado: '', actualizado: '',
  };
}

function EditorRecurso({ recurso, onCerrar, onGuardado }: {
  recurso: InspiracionRecurso; onCerrar: () => void; onGuardado: () => void;
}) {
  const esNuevo = recurso.id === 0;
  const [form, setForm] = useState({
    categoria: recurso.categoria as string,
    titulo: recurso.titulo,
    miniatura_url: recurso.miniatura_url,
    youtube_url: recurso.youtube_url,
    orden: recurso.orden,
    activo: recurso.activo,
  });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const datos = new FormData();
      datos.set('categoria', form.categoria);
      datos.set('titulo', form.titulo);
      datos.set('miniatura_url', form.miniatura_url);
      datos.set('youtube_url', form.youtube_url);
      datos.set('orden', String(form.orden));
      datos.set('activo', String(form.activo));
      if (archivo) datos.set('miniatura_file', archivo);

      if (esNuevo) await adminApi.post('/api/admin/inspiracion/', datos);
      else await adminApi.patch(`/api/admin/inspiracion/${recurso.id}/`, datos);
      onGuardado();
    } catch (e) {
      setError(leerError(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={esNuevo ? 'Nuevo recurso de inspiración' : recurso.titulo}
      descripcion="El video se reproduce desde YouTube dentro de Focusia; no se almacena en el sistema."
      pie={
        <>
          <Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
          <Button onClick={guardar} cargando={guardando}><Save className="w-3.5 h-3.5" />Guardar</Button>
        </>
      }
    >
      {error && <Aviso tipo="error">{error}</Aviso>}

      <div className="grid sm:grid-cols-2 gap-3">
        <Field etiqueta="Categoría" requerido>
          <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
            {CATEGORIAS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </Select>
        </Field>
        <Field etiqueta="Orden de visualización" ayuda="Menor = aparece primero dentro de la categoría.">
          <Input type="number" min={0} value={form.orden} onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })} />
        </Field>
      </div>

      <Field etiqueta="Título" requerido>
        <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Título del recurso" />
      </Field>

      <Field etiqueta="Link oficial de YouTube" requerido ayuda="El video se reproduce incrustado en Focusia, sin abrir YouTube.">
        <Input type="url" value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
      </Field>

      <MediaField
        etiqueta="Miniatura"
        url={form.miniatura_url}
        archivo={archivo}
        urlResuelta={recurso.miniatura_resuelta}
        onUrl={(v) => setForm({ ...form, miniatura_url: v })}
        onArchivo={setArchivo}
        ayuda="Opcional. Si no se define, se usa la miniatura de YouTube. Si hay URL, gana la URL sobre el archivo."
      />

      <Checkbox
        etiqueta="Activo"
        ayuda="Si lo desactivas, el recurso se conserva pero deja de mostrarse en la app."
        checked={form.activo}
        onChange={(v) => setForm({ ...form, activo: v })}
      />
    </Modal>
  );
}
